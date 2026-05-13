import { NextResponse } from 'next/server';
import { and, eq, gte, lte } from 'drizzle-orm';

import { db } from '@/lib/db';
import { salones, trialAvisosEnviados, usuariosSalon } from '@/lib/db/schema';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  enviarRecordatorioTrialAcaba,
  enviarTrialVencido,
} from '@/lib/email/resend';
import { captureException } from '@/lib/observability/sentry';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/trial-recordatorios
 *
 * Cron unificado que invoca n8n cada día. Manda 3 tipos de aviso al dueño
 * cuyo salón está en `plan='trial'` con `trial_until` (trial 7 días):
 *   - 2d:      faltan ~2 días para vencer (día 5 desde signup).
 *   - vispera: trial vence hoy (día 7 desde signup).
 *   - vencido: trial vencido y aún no ha activado tarjeta (día 8+).
 *
 * La tabla `trial_avisos_enviados` con UNIQUE(salon_id, tipo) garantiza
 * idempotencia — no se manda dos veces el mismo aviso.
 */
export async function POST(request: Request) {
  const expected = process.env.INTERNAL_API_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: 'INTERNAL_API_TOKEN not configured' },
      { status: 500 },
    );
  }
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (token !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ahora = new Date();
  // Ventanas de candidatos para cada aviso. Usamos rangos generosos para
  // tolerar que el cron corra una vez al día y no exactamente a la hora
  // del registro.
  const ventana = (offsetDiasMin: number, offsetDiasMax: number) => ({
    desde: new Date(ahora.getTime() + offsetDiasMin * 24 * 60 * 60 * 1000),
    hasta: new Date(ahora.getTime() + offsetDiasMax * 24 * 60 * 60 * 1000),
  });

  const tipos: { tipo: '2d' | 'vispera' | 'vencido'; rango: { desde: Date; hasta: Date }; dias: number }[] = [
    { tipo: '2d', rango: ventana(1, 3), dias: 2 },        // día 5 desde signup
    { tipo: 'vispera', rango: ventana(0, 1), dias: 1 },   // día 7 desde signup
    // Vencido: trial_until ya pasó (entre -60 días y ahora). Limitamos a 60d
    // hacia atrás para no spammear cuentas viejas que ya nadie usa.
    { tipo: 'vencido', rango: ventana(-60, 0), dias: 0 }, // día 8+
  ];

  const supabase = createAdminClient();
  const stats = { processed: 0, emailed: 0, skipped: 0, errors: 0 };

  try {
    for (const { tipo, rango, dias } of tipos) {
      const candidatos = await db
        .select({
          id: salones.id,
          nombre: salones.nombre,
          plan: salones.plan,
          trialUntil: salones.trialUntil,
        })
        .from(salones)
        .where(
          and(
            eq(salones.plan, 'trial'),
            gte(salones.trialUntil, rango.desde),
            lte(salones.trialUntil, rango.hasta),
          ),
        );

      for (const salon of candidatos) {
        stats.processed += 1;

        // Idempotencia: insertar fila marca el aviso. Si ya existía
        // (UNIQUE constraint), saltamos sin tocar email.
        try {
          await db.insert(trialAvisosEnviados).values({
            salonId: salon.id,
            tipo,
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message.toLowerCase() : '';
          if (msg.includes('unique') || msg.includes('duplicate')) {
            stats.skipped += 1;
            continue;
          }
          stats.errors += 1;
          await captureException(e, {
            cron: 'trial-recordatorios',
            phase: 'insert_aviso',
            tipo,
            salonId: salon.id,
          });
          continue;
        }

        try {
          const dueno = await db
            .select({ authUserId: usuariosSalon.authUserId })
            .from(usuariosSalon)
            .where(
              and(
                eq(usuariosSalon.salonId, salon.id),
                eq(usuariosSalon.rol, 'dueno'),
              ),
            )
            .limit(1);
          const authUserId = dueno[0]?.authUserId;
          if (!authUserId) {
            stats.skipped += 1;
            continue;
          }

          const { data: userData, error: userError } =
            await supabase.auth.admin.getUserById(authUserId);
          if (userError || !userData?.user?.email) {
            stats.errors += 1;
            continue;
          }

          const result =
            tipo === 'vencido'
              ? await enviarTrialVencido({
                  to: userData.user.email,
                  salonNombre: salon.nombre,
                })
              : await enviarRecordatorioTrialAcaba({
                  to: userData.user.email,
                  salonNombre: salon.nombre,
                  diasRestantes: dias,
                });

          if (result.ok) stats.emailed += 1;
          else stats.errors += 1;
        } catch (err) {
          stats.errors += 1;
          await captureException(err, {
            cron: 'trial-recordatorios',
            tipo,
            salonId: salon.id,
          });
        }
      }
    }

    return NextResponse.json({ ok: true, ...stats });
  } catch (err) {
    await captureException(err, { cron: 'trial-recordatorios' });
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
