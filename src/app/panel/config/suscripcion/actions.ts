'use server';

import { getStripe, PLANES } from '@/lib/stripe/client';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { db } from '@/lib/db';
import { salones } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

type SalonRow = Record<string, unknown>;

function pick<T = unknown>(row: SalonRow, ...keys: string[]): T | undefined {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null) return v as T;
  }
  return undefined;
}

async function buildBaseUrl() {
  const h = await headers();
  const host = h.get('host') ?? '';
  const proto = h.get('x-forwarded-proto') ?? 'https';
  return `${proto}://${host}`;
}

export async function crearCheckout(planId: 'basico') {
  const salonRaw = (await getCurrentSalon()) as SalonRow | null;
  if (!salonRaw) {
    redirect(
      '/panel/config/suscripcion?error=' +
        encodeURIComponent('No se encontró tu salón'),
    );
  }

  const plan = PLANES[planId];
  if (!plan?.priceId) {
    redirect(
      '/panel/config/suscripcion?error=' +
        encodeURIComponent('Plan no configurado en Stripe'),
    );
  }

  const salonId = pick<string>(salonRaw, 'id');
  const salonNombre = pick<string>(salonRaw, 'nombre');
  const salonEmail = pick<string>(salonRaw, 'email');
  if (!salonId) {
    redirect(
      '/panel/config/suscripcion?error=' +
        encodeURIComponent('Salón sin id'),
    );
  }

  const stripe = getStripe();
  const baseUrl = await buildBaseUrl();

  let customerId =
    pick<string>(salonRaw, 'stripe_customer_id', 'stripeCustomerId') ?? null;
  const subscriptionId =
    pick<string>(salonRaw, 'stripe_subscription_id', 'stripeSubscriptionId') ??
    null;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: salonEmail ?? undefined,
      name: salonNombre,
      metadata: { salon_id: salonId },
    });
    customerId = customer.id;
    await db
      .update(salones)
      .set({ stripeCustomerId: customer.id })
      .where(eq(salones.id, salonId));
  }

  // Si el salón aún no tuvo nunca suscripción (primer pago), incluimos trial
  // 7 días con tarjeta obligatoria. Si ya la tuvo, no se reaplica.
  const aplicarTrial = !subscriptionId;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: plan.priceId, quantity: 1 }],
    success_url: `${baseUrl}/api/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/panel/config/suscripcion?canceled=1`,
    metadata: { salon_id: salonId, plan: planId },
    payment_method_collection: 'always',
    subscription_data: {
      ...(aplicarTrial ? { trial_period_days: 7 } : {}),
      metadata: { salon_id: salonId, plan: planId },
    },
    allow_promotion_codes: true,
    locale: 'es',
  });

  if (!session.url) {
    redirect(
      '/panel/config/suscripcion?error=' +
        encodeURIComponent('Stripe no devolvió URL'),
    );
  }
  redirect(session.url);
}

export async function abrirPortalCliente() {
  const salonRaw = (await getCurrentSalon()) as SalonRow | null;
  if (!salonRaw) {
    redirect(
      '/panel/config/suscripcion?error=' +
        encodeURIComponent('No se encontró tu salón'),
    );
  }
  const customerId = pick<string>(
    salonRaw,
    'stripe_customer_id',
    'stripeCustomerId',
  );
  if (!customerId) {
    redirect(
      '/panel/config/suscripcion?error=' +
        encodeURIComponent('No tienes suscripción activa'),
    );
  }

  const stripe = getStripe();
  const baseUrl = await buildBaseUrl();

  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${baseUrl}/panel/config/suscripcion`,
  });
  redirect(portal.url);
}
