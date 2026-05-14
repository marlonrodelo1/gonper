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

  // Calcular días de trial restantes desde `salones.trial_until`. Si el
  // dueño entra a meter tarjeta DURANTE el trial (caso ideal), pasamos
  // `trial_period_days` a Stripe para que NO le cobremos hoy: Stripe
  // guarda la tarjeta y hace el primer cargo el día que vence el trial.
  // Si el trial ya expiró (TrialBlocker abrió), cobro inmediato sin
  // trial_period_days.
  const trialUntilRaw = pick<string | Date>(
    salonRaw,
    'trial_until',
    'trialUntil',
  );
  let trialPeriodDays: number | undefined;
  if (trialUntilRaw) {
    const trialUntilMs = new Date(trialUntilRaw as string).getTime();
    if (Number.isFinite(trialUntilMs)) {
      const diasRestantes = Math.ceil(
        (trialUntilMs - Date.now()) / (24 * 60 * 60 * 1000),
      );
      // Stripe exige trial_period_days >= 1.
      if (diasRestantes >= 1) {
        // Stripe acepta hasta 730 días — cap defensivo.
        trialPeriodDays = Math.min(diasRestantes, 730);
      }
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: plan.priceId, quantity: 1 }],
    success_url: `${baseUrl}/api/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/panel/config/suscripcion?canceled=1`,
    metadata: { salon_id: salonId, plan: planId },
    payment_method_collection: 'always',
    subscription_data: {
      metadata: { salon_id: salonId, plan: planId },
      ...(trialPeriodDays ? { trial_period_days: trialPeriodDays } : {}),
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
