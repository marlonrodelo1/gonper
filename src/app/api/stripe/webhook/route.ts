import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getStripe } from '@/lib/stripe/client';
import { db } from '@/lib/db';
import { salones, stripeEventsProcessed } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';

// Stripe firma el body raw — desactivar cualquier optimización de Next que altere el body.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Webhook de Stripe.
 *
 * Idempotencia: registramos cada event.id en `stripe_events_processed`
 * antes de procesarlo. Si Stripe reintenta (timeout/5xx en intento previo),
 * insert con PRIMARY KEY duplicada falla y devolvemos 200 sin tocar BD —
 * evitamos updates duplicados de plan/customer/subscription.
 */
export async function POST(req: Request) {
  const stripe = getStripe();
  const sig = (await headers()).get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook Error: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  // Idempotencia: intentamos insertar event_id; si ya existe, salimos.
  try {
    await db
      .insert(stripeEventsProcessed)
      .values({
        eventId: event.id,
        eventType: event.type,
      });
  } catch (err) {
    // 23505 = unique_violation → evento ya procesado, no es un error real.
    const code =
      err && typeof err === 'object' && 'code' in err
        ? (err as { code?: string }).code
        : undefined;
    if (code === '23505') {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error('[stripe webhook] error guardando event_id', err);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 },
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const salonId = session.metadata?.salon_id;
        const plan = session.metadata?.plan as 'basico' | undefined;
        if (salonId && plan) {
          await db
            .update(salones)
            .set({
              plan,
              stripeCustomerId:
                typeof session.customer === 'string'
                  ? session.customer
                  : (session.customer?.id ?? null),
              stripeSubscriptionId:
                typeof session.subscription === 'string'
                  ? session.subscription
                  : (session.subscription?.id ?? null),
              trialUntil: null,
            })
            .where(eq(salones.id, salonId));
        }
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const salonId = sub.metadata?.salon_id;
        const plan = sub.metadata?.plan as 'basico' | undefined;
        if (salonId && plan && sub.status === 'active') {
          await db
            .update(salones)
            .set({ plan, stripeSubscriptionId: sub.id })
            .where(eq(salones.id, salonId));
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const salonId = sub.metadata?.salon_id;
        if (salonId) {
          await db
            .update(salones)
            .set({ plan: 'cancelado' })
            .where(eq(salones.id, salonId));
        }
        break;
      }
    }
  } catch (err) {
    console.error('[stripe webhook] error procesando evento', event.type, err);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
