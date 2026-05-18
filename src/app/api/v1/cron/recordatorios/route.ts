import { NextResponse } from 'next/server';
import { eq, inArray, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { salones } from '@/lib/db/schema';
import { requireApiToken } from '@/lib/api/auth';
import { notificarDuenoRecordatorio2h } from '@/lib/telegram/notify';
import { buildWhatsAppLink } from '@/lib/whatsapp/numero';

/**
 * POST /api/v1/cron/recordatorios
 *
 * Pensado para que n8n lo invoque cada 5 minutos. Marca como "recordatorio
 * enviado" todas las citas pendientes cuyo inicio cae en la ventana
 * [now+110min, now+130min] (2h ± 10min) y devuelve la info necesaria para
 * componer el email (cliente, servicio, salón, hora).
 *
 * El UPDATE es atómico via CTE con FOR UPDATE SKIP LOCKED para evitar que
 * dos invocaciones simultáneas envíen el mismo recordatorio dos veces.
 *
 * NOTA: el bot Telegram para el cliente final se eliminó. Los recordatorios
 * al cliente se envían por email/WhatsApp (a partir del campo
 * `cliente.email` / `cliente.telefono` o `whatsapp_phone`).
 */
export async function POST(request: Request) {
  const authError = requireApiToken(request);
  if (authError) return authError;

  try {
    const result = await db.execute(sql`
      with marcadas as (
        update citas
        set recordatorio_enviado_at = now(),
            updated_at = now()
        where id in (
          select id from citas
          where estado = 'pendiente'
            and recordatorio_enviado_at is null
            and inicio between now() + interval '110 minutes'
                           and now() + interval '130 minutes'
          for update skip locked
        )
        returning id, salon_id, cliente_id, profesional_id, servicio_id,
                  inicio, fin, precio_eur, estado, origen, notas
      )
      select
        m.id            as cita_id,
        m.inicio        as inicio,
        m.fin           as fin,
        m.estado        as estado,
        m.origen        as origen,
        m.notas         as notas,
        s.id            as salon_id,
        s.slug          as salon_slug,
        s.nombre        as salon_nombre,
        s.timezone      as salon_timezone,
        srv.id          as servicio_id,
        srv.nombre      as servicio_nombre,
        srv.duracion_min as servicio_duracion_min,
        prof.id         as profesional_id,
        prof.nombre     as profesional_nombre,
        cli.id          as cliente_id,
        cli.nombre      as cliente_nombre,
        cli.telefono    as cliente_telefono,
        cli.email       as cliente_email,
        cli.whatsapp_phone as cliente_whatsapp_phone
      from marcadas m
      join salones s        on s.id = m.salon_id
      join servicios srv    on srv.id = m.servicio_id
      join profesionales prof on prof.id = m.profesional_id
      join clientes cli     on cli.id = m.cliente_id
      order by m.inicio asc
    `);

    type Row = {
      cita_id: string;
      inicio: Date | string;
      fin: Date | string;
      estado: string;
      origen: string;
      notas: string | null;
      salon_id: string;
      salon_slug: string;
      salon_nombre: string;
      salon_timezone: string;
      servicio_id: string;
      servicio_nombre: string;
      servicio_duracion_min: number;
      profesional_id: string;
      profesional_nombre: string;
      cliente_id: string;
      cliente_nombre: string;
      cliente_telefono: string | null;
      cliente_email: string | null;
      cliente_whatsapp_phone: string | null;
    };

    // postgres-js devuelve el array directamente en `result` (driver postgres).
    // Drizzle lo expone como un objeto array-like. Aceptamos ambos para robustez.
    const rows = (Array.isArray(result) ? result : (result as { rows?: Row[] }).rows ?? []) as Row[];

    const recordatorios = rows.map((r) => {
      const inicioIso =
        r.inicio instanceof Date ? r.inicio.toISOString() : String(r.inicio);
      const finIso = r.fin instanceof Date ? r.fin.toISOString() : String(r.fin);
      return {
        citaId: r.cita_id,
        inicio: inicioIso,
        fin: finIso,
        estado: r.estado,
        origen: r.origen,
        notas: r.notas,
        salon: {
          id: r.salon_id,
          slug: r.salon_slug,
          nombre: r.salon_nombre,
          timezone: r.salon_timezone,
        },
        servicio: {
          id: r.servicio_id,
          nombre: r.servicio_nombre,
          duracionMin: r.servicio_duracion_min,
        },
        profesional: {
          id: r.profesional_id,
          nombre: r.profesional_nombre,
        },
        cliente: {
          id: r.cliente_id,
          nombre: r.cliente_nombre,
          telefono: r.cliente_telefono,
          email: r.cliente_email,
          whatsappPhone: r.cliente_whatsapp_phone,
        },
      };
    });

    // ------------------------------------------------------------
    // Aviso al dueño por Telegram (best-effort, no bloquea respuesta).
    // Por cada cita marcada como "recordatorio enviado", mandamos al
    // dueño un mensaje Telegram con un botón inline "Recordar por
    // WhatsApp" que abre wa.me/<tel>?text=... ya rellenado.
    //
    // Resolvemos bot_token + chat_id por salonId en una sola query
    // (en vez de 1 por cita) para minimizar latencia del cron.
    // ------------------------------------------------------------
    if (recordatorios.length > 0) {
      const salonIds = Array.from(new Set(recordatorios.map((r) => r.salon.id)));
      const filasSalones = await db
        .select({
          id: salones.id,
          botToken: salones.telegramBotToken,
          duenoChatId: salones.telegramChatIdDueno,
        })
        .from(salones)
        .where(
          salonIds.length === 1
            ? eq(salones.id, salonIds[0])
            : inArray(salones.id, salonIds),
        );

      const salonAuth = new Map(
        filasSalones.map((s) => [
          s.id,
          { botToken: s.botToken, duenoChatId: s.duenoChatId },
        ]),
      );

      // Lanzamos los envíos en paralelo. Cada uno es best-effort —
      // notificarDuenoRecordatorio2h ya devuelve false en vez de lanzar.
      await Promise.allSettled(
        recordatorios.map(async (r) => {
          const auth = salonAuth.get(r.salon.id);
          if (!auth?.botToken || !auth.duenoChatId) return; // sin bot configurado

          const primerNombre =
            r.cliente.nombre.split(' ')[0] ?? r.cliente.nombre;
          const hora = new Intl.DateTimeFormat('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: r.salon.timezone,
          }).format(new Date(r.inicio));
          const mensajeWa =
            `Hola ${primerNombre}! 👋 Te recuerdo que tienes tu reserva en ` +
            `${r.salon.nombre} hoy a las ${hora} para ${r.servicio.nombre} ` +
            `con ${r.profesional.nombre}. ¡Te esperamos!`;
          const whatsappLink = buildWhatsAppLink(
            r.cliente.whatsappPhone ?? r.cliente.telefono,
            mensajeWa,
          );

          await notificarDuenoRecordatorio2h({
            botToken: auth.botToken,
            duenoChatId: auth.duenoChatId,
            salonNombre: r.salon.nombre,
            clienteNombre: r.cliente.nombre,
            servicioNombre: r.servicio.nombre,
            profesionalNombre: r.profesional.nombre,
            inicioIso: r.inicio,
            timezone: r.salon.timezone,
            whatsappLink,
          });
        }),
      );
    }

    return NextResponse.json({ recordatorios });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
