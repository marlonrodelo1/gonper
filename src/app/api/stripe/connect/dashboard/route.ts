import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { salones, usuariosSalon } from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/server';
import { createDashboardLink } from '@/lib/stripe/connect';

/**
 * POST /api/stripe/connect/dashboard
 *
 * Devuelve una URL para que el salón entre a su dashboard Stripe Express
 * (ver pagos, payouts, datos de cuenta). Solo funciona si ya está
 * onboarded.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const [vinculo] = await db
    .select({
      accountId: salones.stripeConnectAccountId,
      onboarded: salones.stripeConnectOnboarded,
    })
    .from(usuariosSalon)
    .innerJoin(salones, eq(salones.id, usuariosSalon.salonId))
    .where(eq(usuariosSalon.authUserId, user.id))
    .limit(1);

  if (!vinculo?.accountId || !vinculo.onboarded) {
    return NextResponse.json(
      { error: 'connect_no_disponible' },
      { status: 400 },
    );
  }

  try {
    const { url } = await createDashboardLink({ accountId: vinculo.accountId });
    return NextResponse.json({ url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    console.error('[stripe/connect/dashboard]', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
