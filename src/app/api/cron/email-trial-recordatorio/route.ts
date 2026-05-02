import { NextResponse } from 'next/server';
import { and, eq, gte, lte } from 'drizzle-orm';

import { db } from '@/lib/db';
import { salones, usuariosSalon } from '@/lib/db/schema';
import { createAdminClient } from '@/lib/supabase/admin';
import { enviarRecordatorioTrialAcaba } from '@/lib/email/resend';
import { captureException } from '@/lib/observability/sentry';

/**
 * POST /api/cron/email-trial-recordatorio
 *
 * Auth: header `Authorization: Bearer ${INTERNAL_API_TOKEN}`.
 * Busca salones en plan=trial cuyo `trial_until` cae entre now()+1día y
 * now()+2días, y envía el email de recordatorio al primer dueño.
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
  const desde = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
  const hasta = new Date(ahora.getTime() + 48 * 60 * 60 * 1000);

  const supabase = createAdminClient();

  let processed = 0;
  let emailed = 0;
  let errors = 0;

  try {
    const filas = await db
      .select({
        id: salones.id,
        nombre: salones.nombre,
        trialUntil: salones.trialUntil,
      })
      .from(salones)
      .where(
        and(
          eq(salones.plan, 'trial'),
          gte(salones.trialUntil, desde),
          lte(salones.trialUntil, hasta),
        ),
      );

    for (const salon of filas) {
      processed += 1;
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
          continue;
        }

        const { data: userData, error: userError } =
          await supabase.auth.admin.getUserById(authUserId);
        if (userError || !userData?.user?.email) {
          errors += 1;
          continue;
        }

        const result = await enviarRecordatorioTrialAcaba({
          to: userData.user.email,
          salonNombre: salon.nombre,
          diasRestantes: 2,
        });

        if (result.ok) {
          emailed += 1;
        } else {
          errors += 1;
        }
      } catch (err) {
        errors += 1;
        await captureException(err, {
          cron: 'email-trial-recordatorio',
          salonId: salon.id,
        });
      }
    }

    return NextResponse.json({ processed, emailed, errors });
  } catch (err) {
    await captureException(err, { cron: 'email-trial-recordatorio' });
    const msg = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
