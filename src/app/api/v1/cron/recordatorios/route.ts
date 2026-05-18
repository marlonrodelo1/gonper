import { NextResponse } from 'next/server';
import { eq, inArray, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { salones } from '@/lib/db/schema';
import { requireApiToken } from '@/lib/api/auth';
import { notificarDuenoRecordatorioCita } from '@/lib/telegram/notify';
import { buildWhatsAppLink } from '@/lib/whatsapp/numero';
import { enviarRecordatorioCita } from '@/lib/email/resend';

/**
 * POST /api/v1/cron/recordatorios
 *
 * Disparado por el systemd timer del VPS cada 5 minutos. Procesa DOS
 * ventanas de recordatorio independientes:
 *
 *   - Ventana EMAIL (cliente, ~2h antes): citas pendientes cuyo inicio
 *     cae en [now+110min, now+130min] sin recordatorio_email_enviado_at.
 *     Por cada una manda email vía Resend al cliente (si tiene email).
 *
 *   - Ventana TELEGRAM (dueño, ~1h antes): citas pendientes cuyo inicio
 *     cae en [now+50min, now+70min] sin recordatorio_telegram_enviado_at.
 *     Por cada una manda Telegram al dueño con botón inline "Recordar por
 *     WhatsApp" que abre wa.me/<tel>?text=... ya rellenado.
 *
 * Ambos UPDATE son atómicos vía CTE con FOR UPDATE SKIP LOCKED. Las dos
 * ventanas se marcan en columnas diferentes, así que son independientes
 * (si el email falla, el Telegram igual se envía a su hora; y viceversa).
 */
export async function POST(request: Request) {
  const authError = requireApiToken(request);
  if (authError) return authError;

  try {
    const [emailResult, telegramResult] = await Promise.all([
      procesarVentanaEmail(),
      procesarVentanaTelegram(),
    ]);

    return NextResponse.json({
      email: { procesados: emailResult.procesados, enviados: emailResult.enviados },
      telegram: { procesados: telegramResult.procesados, enviados: telegramResult.enviados },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ============================================================
// Ventana EMAIL — cliente, 2h antes
// ============================================================

type EmailRow = {
  cita_id: string;
  inicio: Date | string;
  salon_slug: string;
  salon_nombre: string;
  salon_timezone: string;
  servicio_nombre: string;
  servicio_duracion_min: number;
  profesional_nombre: string;
  cliente_nombre: string;
  cliente_email: string | null;
};

async function procesarVentanaEmail(): Promise<{
  procesados: number;
  enviados: number;
}> {
  const result = await db.execute(sql`
    with marcadas as (
      update citas
      set recordatorio_email_enviado_at = now(),
          updated_at = now()
      where id in (
        select id from citas
        where estado = 'pendiente'
          and recordatorio_email_enviado_at is null
          and inicio between now() + interval '110 minutes'
                         and now() + interval '130 minutes'
        for update skip locked
      )
      returning id, salon_id, cliente_id, profesional_id, servicio_id, inicio
    )
    select
      m.id              as cita_id,
      m.inicio          as inicio,
      s.slug            as salon_slug,
      s.nombre          as salon_nombre,
      s.timezone        as salon_timezone,
      srv.nombre        as servicio_nombre,
      srv.duracion_min  as servicio_duracion_min,
      prof.nombre       as profesional_nombre,
      cli.nombre        as cliente_nombre,
      cli.email         as cliente_email
    from marcadas m
    join salones s         on s.id = m.salon_id
    join servicios srv     on srv.id = m.servicio_id
    join profesionales prof on prof.id = m.profesional_id
    join clientes cli      on cli.id = m.cliente_id
    order by m.inicio asc
  `);

  const rows = (Array.isArray(result)
    ? result
    : (result as { rows?: EmailRow[] }).rows ?? []) as EmailRow[];

  if (rows.length === 0) return { procesados: 0, enviados: 0 };

  const envios = await Promise.allSettled(
    rows
      .filter((r) => !!r.cliente_email)
      .map(async (r) => {
        const inicioIso =
          r.inicio instanceof Date ? r.inicio.toISOString() : String(r.inicio);
        const res = await enviarRecordatorioCita({
          to: r.cliente_email!,
          citaId: r.cita_id,
          clienteNombre: r.cliente_nombre,
          salonNombre: r.salon_nombre,
          salonSlug: r.salon_slug,
          servicioNombre: r.servicio_nombre,
          duracionMin: r.servicio_duracion_min,
          profesionalNombre: r.profesional_nombre,
          inicioIso,
          timezone: r.salon_timezone,
        });
        return res.ok;
      }),
  );

  const enviados = envios.filter(
    (e) => e.status === 'fulfilled' && e.value === true,
  ).length;

  return { procesados: rows.length, enviados };
}

// ============================================================
// Ventana TELEGRAM — dueño, 1h antes
// ============================================================

type TelegramRow = {
  cita_id: string;
  inicio: Date | string;
  salon_id: string;
  salon_nombre: string;
  salon_timezone: string;
  servicio_nombre: string;
  profesional_nombre: string;
  cliente_nombre: string;
  cliente_telefono: string | null;
  cliente_whatsapp_phone: string | null;
};

async function procesarVentanaTelegram(): Promise<{
  procesados: number;
  enviados: number;
}> {
  const result = await db.execute(sql`
    with marcadas as (
      update citas
      set recordatorio_telegram_enviado_at = now(),
          updated_at = now()
      where id in (
        select id from citas
        where estado = 'pendiente'
          and recordatorio_telegram_enviado_at is null
          and inicio between now() + interval '50 minutes'
                         and now() + interval '70 minutes'
        for update skip locked
      )
      returning id, salon_id, cliente_id, profesional_id, servicio_id, inicio
    )
    select
      m.id            as cita_id,
      m.inicio        as inicio,
      s.id            as salon_id,
      s.nombre        as salon_nombre,
      s.timezone      as salon_timezone,
      srv.nombre      as servicio_nombre,
      prof.nombre     as profesional_nombre,
      cli.nombre      as cliente_nombre,
      cli.telefono    as cliente_telefono,
      cli.whatsapp_phone as cliente_whatsapp_phone
    from marcadas m
    join salones s         on s.id = m.salon_id
    join servicios srv     on srv.id = m.servicio_id
    join profesionales prof on prof.id = m.profesional_id
    join clientes cli      on cli.id = m.cliente_id
    order by m.inicio asc
  `);

  const rows = (Array.isArray(result)
    ? result
    : (result as { rows?: TelegramRow[] }).rows ?? []) as TelegramRow[];

  if (rows.length === 0) return { procesados: 0, enviados: 0 };

  // Resolvemos bot_token + chat_id por salonId en una sola query
  // para minimizar latencia (en vez de 1 query por cita).
  const salonIds = Array.from(new Set(rows.map((r) => r.salon_id)));
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

  const envios = await Promise.allSettled(
    rows.map(async (r) => {
      const auth = salonAuth.get(r.salon_id);
      if (!auth?.botToken || !auth.duenoChatId) return false;

      const inicioIso =
        r.inicio instanceof Date ? r.inicio.toISOString() : String(r.inicio);

      const primerNombre = r.cliente_nombre.split(' ')[0] ?? r.cliente_nombre;
      const hora = new Intl.DateTimeFormat('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: r.salon_timezone,
      }).format(new Date(inicioIso));
      const mensajeWa =
        `Hola ${primerNombre}! 👋 Te recuerdo que tienes tu reserva en ` +
        `${r.salon_nombre} hoy a las ${hora} para ${r.servicio_nombre} ` +
        `con ${r.profesional_nombre}. ¡Te esperamos!`;
      const whatsappLink = buildWhatsAppLink(
        r.cliente_whatsapp_phone ?? r.cliente_telefono,
        mensajeWa,
      );

      const ok = await notificarDuenoRecordatorioCita({
        botToken: auth.botToken,
        duenoChatId: auth.duenoChatId,
        salonNombre: r.salon_nombre,
        clienteNombre: r.cliente_nombre,
        servicioNombre: r.servicio_nombre,
        profesionalNombre: r.profesional_nombre,
        inicioIso,
        timezone: r.salon_timezone,
        whatsappLink,
      });
      return ok;
    }),
  );

  const enviados = envios.filter(
    (e) => e.status === 'fulfilled' && e.value === true,
  ).length;

  return { procesados: rows.length, enviados };
}
