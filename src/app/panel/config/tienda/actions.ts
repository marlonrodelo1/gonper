'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { db } from '@/lib/db';
import { salones } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';

function redirectError(msg: string): never {
  redirect(`/panel/config/tienda?error=${encodeURIComponent(msg)}`);
}

async function requireSalon(): Promise<{
  id: string;
  slug: string;
}> {
  const salon = (await getCurrentSalon()) as
    | { id?: string; slug?: string }
    | null;
  if (!salon?.id) redirectError('No se pudo identificar el salón');
  return { id: salon!.id!, slug: salon!.slug ?? '' };
}

export async function actualizarConfigTienda(formData: FormData) {
  const salon = await requireSalon();
  const costeRaw = String(formData.get('coste_envio_eur') || '').trim();
  const zonaRaw = String(formData.get('zona_envio') || '').trim();

  let costeEnvio: string | null = null;
  if (costeRaw !== '') {
    const n = Number(costeRaw);
    if (!Number.isFinite(n) || n < 0 || n > 9999) {
      redirectError('Coste de envío inválido');
    }
    costeEnvio = n.toFixed(2);
  }

  await db
    .update(salones)
    .set({
      tiendaCosteEnvioEur: costeEnvio,
      tiendaZonaEnvio: zonaRaw || null,
    })
    .where(eq(salones.id, salon.id));

  revalidatePath('/panel/config/tienda');
  if (salon.slug) revalidatePath(`/s/${salon.slug}/tienda`);
  redirect('/panel/config/tienda?ok=1');
}

export async function toggleMetodoPagoOnline(formData: FormData) {
  const salon = await requireSalon();
  const activar = String(formData.get('activar') || 'false') === 'true';

  // Si se activa, verificar que el salón tenga Stripe Connect onboarded
  if (activar) {
    const [row] = await db
      .select({ onboarded: salones.stripeConnectOnboarded })
      .from(salones)
      .where(eq(salones.id, salon.id))
      .limit(1);
    if (!row?.onboarded) {
      redirectError('Conecta Stripe Connect antes de activar el pago online');
    }
  }

  await db
    .update(salones)
    .set({ tiendaAceptaPagoOnline: activar })
    .where(eq(salones.id, salon.id));

  revalidatePath('/panel/config/tienda');
  if (salon.slug) revalidatePath(`/s/${salon.slug}/tienda`);
  redirect('/panel/config/tienda?ok=1');
}

export async function toggleMetodoPagoEfectivo(formData: FormData) {
  const salon = await requireSalon();
  const activar = String(formData.get('activar') || 'false') === 'true';

  await db
    .update(salones)
    .set({ tiendaAceptaEfectivo: activar })
    .where(eq(salones.id, salon.id));

  revalidatePath('/panel/config/tienda');
  if (salon.slug) revalidatePath(`/s/${salon.slug}/tienda`);
  redirect('/panel/config/tienda?ok=1');
}
