import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

import { db } from '@/lib/db';
import { salones } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getStripe } from '@/lib/stripe/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Stripe redirige aquí con `?session_id=cs_...` tras completar el Checkout.
 * Sincronizamos plan/customer/subscription en BD por si el webhook llega tarde,
 * y mandamos al panel con `?welcome=1` para arrancar el tour de onboarding.
 *
 * Idempotente con `/api/stripe/webhook`: si el webhook ya actualizó la fila,
 * el UPDATE simplemente repite los mismos valores.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get('session_id');
  const h = await headers();
  const host = h.get('host') ?? '';
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const baseUrl = `${proto}://${host}`;

  if (!sessionId) {
    return NextResponse.redirect(`${baseUrl}/panel/hoy`);
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    const salonId = session.metadata?.salon_id;
    const plan = (session.metadata?.plan as 'basico' | undefined) ?? 'basico';
    const customerId =
      typeof session.customer === 'string'
        ? session.customer
        : (session.customer?.id ?? null);
    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : (session.subscription?.id ?? null);

    if (salonId && subscriptionId) {
      // Stripe gestiona el trial → no usamos trial_until en BD.
      await db
        .update(salones)
        .set({
          plan,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          trialUntil: null,
        })
        .where(eq(salones.id, salonId));
    }
  } catch (err) {
    console.error('[checkout/return] error syncing session:', err);
    // No bloqueamos al usuario: el webhook acabará completando.
  }

  return NextResponse.redirect(`${baseUrl}/panel/hoy?welcome=1`);
}
