import 'server-only';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { salones } from '@/lib/db/schema';
import { getStripe } from './client';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://gestori.es';

/**
 * Stripe Connect helpers para que los salones cobren ventas B2C a sus
 * clientes finales con split automático (margen al salón, comisión a
 * Gestori vía `application_fee_amount`).
 *
 * Modelo: Connect Express. Stripe se encarga del KYC (DNI, IBAN, etc.).
 * Cuando el salón completa onboarding, Stripe nos avisa por webhook
 * `account.updated` con `charges_enabled=true && details_submitted=true`.
 */

/**
 * Asegura que el salón tiene una cuenta Connect Express. Si ya tiene,
 * devuelve su id. Si no, crea una nueva y la guarda en la fila.
 */
export async function ensureConnectAccount(args: {
  salonId: string;
  salonEmail: string | null;
  salonNombre: string;
}): Promise<{ accountId: string }> {
  const [salon] = await db
    .select({
      id: salones.id,
      stripeConnectAccountId: salones.stripeConnectAccountId,
    })
    .from(salones)
    .where(eq(salones.id, args.salonId))
    .limit(1);

  if (!salon) throw new Error('Salón no existe');
  if (salon.stripeConnectAccountId) {
    return { accountId: salon.stripeConnectAccountId };
  }

  const stripe = getStripe();
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'ES',
    email: args.salonEmail ?? undefined,
    business_type: 'company',
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_profile: {
      name: args.salonNombre,
      product_description: 'Venta de productos de belleza y cosmética en salón',
    },
    metadata: {
      salon_id: args.salonId,
    },
  });

  await db
    .update(salones)
    .set({
      stripeConnectAccountId: account.id,
      stripeConnectOnboarded: false,
    })
    .where(eq(salones.id, args.salonId));

  return { accountId: account.id };
}

/**
 * Genera un link de onboarding para que el salón complete los datos KYC
 * en Stripe. El link caduca en unos minutos — hay que generar uno nuevo
 * cada vez que se quiera reintentar.
 */
export async function createOnboardingLink(args: {
  accountId: string;
}): Promise<{ url: string }> {
  const stripe = getStripe();
  const link = await stripe.accountLinks.create({
    account: args.accountId,
    refresh_url: `${SITE_URL}/panel/cuenta?connect=refresh`,
    return_url: `${SITE_URL}/panel/cuenta?connect=ok`,
    type: 'account_onboarding',
  });
  return { url: link.url };
}

/**
 * Devuelve un link al dashboard Express del salón (ver pagos, payouts).
 */
export async function createDashboardLink(args: {
  accountId: string;
}): Promise<{ url: string }> {
  const stripe = getStripe();
  const link = await stripe.accounts.createLoginLink(args.accountId);
  return { url: link.url };
}

/**
 * Sincroniza el flag `stripe_connect_onboarded` con el estado real de
 * la cuenta en Stripe (charges_enabled && details_submitted).
 */
export async function syncConnectAccountStatus(args: {
  accountId: string;
}): Promise<{ onboarded: boolean; salonId: string | null }> {
  const stripe = getStripe();
  const account = await stripe.accounts.retrieve(args.accountId);
  const onboarded =
    Boolean(account.charges_enabled) && Boolean(account.details_submitted);

  const [updated] = await db
    .update(salones)
    .set({ stripeConnectOnboarded: onboarded })
    .where(eq(salones.stripeConnectAccountId, args.accountId))
    .returning({ id: salones.id });

  return { onboarded, salonId: updated?.id ?? null };
}
