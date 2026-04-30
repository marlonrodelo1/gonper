import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { requireApiToken } from '@/lib/api/auth';

/**
 * POST /api/v1/cron/recordatorios
 *
 * Pensado para que n8n lo invoque cada 5 minutos. Marca como "recordatorio
 * enviado" todas las citas pendientes cuyo inicio cae en la ventana
 * [now+50min, now+70min] y devuelve la info necesaria para componer el
 * mensaje (cliente, telegram_id, servicio, salón, hora).
 *
 * El UPDATE es atómico via CTE con FOR UPDATE SKIP LOCKED para evitar que
 * dos invocaciones simultáneas envíen el mismo recordatorio dos veces.
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
            and inicio between now() + interval '50 minutes'
                           and now() + interval '70 minutes'
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
        s.telegram_bot_token as salon_telegram_bot_token,
        srv.id          as servicio_id,
        srv.nombre      as servicio_nombre,
        srv.duracion_min as servicio_duracion_min,
        prof.id         as profesional_id,
        prof.nombre     as profesional_nombre,
        cli.id          as cliente_id,
        cli.nombre      as cliente_nombre,
        cli.telefono    as cliente_telefono,
        cli.telegram_id as cliente_telegram_id
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
      salon_telegram_bot_token: string | null;
      servicio_id: string;
      servicio_nombre: string;
      servicio_duracion_min: number;
      profesional_id: string;
      profesional_nombre: string;
      cliente_id: string;
      cliente_nombre: string;
      cliente_telefono: string | null;
      cliente_telegram_id: string | bigint | null;
    };

    // postgres-js devuelve el array directamente en `result` (driver postgres).
    // Drizzle lo expone como un objeto array-like. Aceptamos ambos para robustez.
    const rows = (Array.isArray(result) ? result : (result as { rows?: Row[] }).rows ?? []) as Row[];

    const recordatorios = rows.map((r) => {
      const inicioIso =
        r.inicio instanceof Date ? r.inicio.toISOString() : String(r.inicio);
      const finIso = r.fin instanceof Date ? r.fin.toISOString() : String(r.fin);
      const tg = r.cliente_telegram_id;
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
          telegramBotToken: r.salon_telegram_bot_token,
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
          telegramId:
            tg === null || tg === undefined
              ? null
              : typeof tg === 'bigint'
                ? tg.toString()
                : String(tg),
        },
      };
    });

    return NextResponse.json({ recordatorios });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
