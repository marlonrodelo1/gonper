'use server';

import { and, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { db } from '@/lib/db';
import {
  stockSalon,
  ventasB2c,
  ventasB2cItems,
} from '@/lib/db/schema';
import { getStripe } from '@/lib/stripe/client';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';

function redirectError(ventaId: string | null, msg: string): never {
  if (ventaId) {
    redirect(`/panel/ventas/${ventaId}?error=${encodeURIComponent(msg)}`);
  }
  redirect(`/panel/ventas?error=${encodeURIComponent(msg)}`);
}

async function requireVenta(formData: FormData) {
  const salonRaw = (await getCurrentSalon()) as { id?: string } | null;
  if (!salonRaw?.id) redirectError(null, 'Sin sesión');

  const ventaId = String(formData.get('venta_id') || '');
  if (!/^[0-9a-f-]{36}$/.test(ventaId)) redirectError(null, 'Id inválido');

  const [venta] = await db
    .select()
    .from(ventasB2c)
    .where(and(eq(ventasB2c.id, ventaId), eq(ventasB2c.salonId, salonRaw.id)))
    .limit(1);
  if (!venta) redirectError(ventaId, 'Venta no encontrada');
  return { venta, ventaId };
}

/**
 * Marca una venta en efectivo como pagada (el cliente pagó al recoger/recibir).
 * Solo aplica a ventas `pendiente_pago_efectivo`.
 */
export async function marcarPagadaEfectivo(formData: FormData) {
  const { venta, ventaId } = await requireVenta(formData);
  if (venta.estado !== 'pendiente_pago_efectivo') {
    redirectError(ventaId, 'Esta acción solo aplica a ventas en efectivo pendientes');
  }
  await db
    .update(ventasB2c)
    .set({ estado: 'pagada', pagadoAt: new Date() })
    .where(eq(ventasB2c.id, ventaId));

  revalidatePath('/panel/ventas');
  revalidatePath(`/panel/ventas/${ventaId}`);
  redirect(`/panel/ventas/${ventaId}?ok=1`);
}

export async function marcarListaRecogida(formData: FormData) {
  const { venta, ventaId } = await requireVenta(formData);
  if (venta.estado !== 'pagada') {
    redirectError(ventaId, 'La venta no está en estado pagada');
  }
  await db
    .update(ventasB2c)
    .set({ estado: 'lista_recogida', listaRecogidaAt: new Date() })
    .where(eq(ventasB2c.id, ventaId));

  // Disparar notificación al cliente (best-effort via n8n)
  const url = process.env.N8N_VENTA_B2C_LISTA_WEBHOOK_URL;
  if (url) {
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ venta_id: ventaId }),
    }).catch(() => {});
  }

  revalidatePath('/panel/ventas');
  revalidatePath(`/panel/ventas/${ventaId}`);
  redirect(`/panel/ventas/${ventaId}?ok=1`);
}

export async function marcarRecogida(formData: FormData) {
  const { venta, ventaId } = await requireVenta(formData);
  if (venta.estado !== 'lista_recogida') {
    redirectError(ventaId, 'La venta debe estar lista para marcarla recogida');
  }
  await db
    .update(ventasB2c)
    .set({ estado: 'recogida', recogidaAt: new Date() })
    .where(eq(ventasB2c.id, ventaId));

  revalidatePath('/panel/ventas');
  revalidatePath(`/panel/ventas/${ventaId}`);
  redirect(`/panel/ventas/${ventaId}?ok=1`);
}

/**
 * Reembolsa la venta vía Stripe y devuelve el stock al salón.
 * Solo se permite si la venta está pagada o lista_recogida (no recogida).
 */
export async function reembolsarVenta(formData: FormData) {
  const { venta, ventaId } = await requireVenta(formData);
  if (venta.estado === 'recogida') {
    redirectError(ventaId, 'No se puede reembolsar una venta ya recogida');
  }
  if (venta.estado !== 'pagada' && venta.estado !== 'lista_recogida') {
    redirectError(ventaId, 'Estado no reembolsable');
  }
  if (!venta.stripePaymentIntentId) {
    redirectError(ventaId, 'Sin PaymentIntent — no se puede reembolsar');
  }

  // Crear reembolso Stripe (revierte el cobro al cliente y revierte el
  // application_fee/transfer en Connect).
  try {
    const stripe = getStripe();
    await stripe.refunds.create({
      payment_intent: venta.stripePaymentIntentId,
      reverse_transfer: true,
      refund_application_fee: true,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error reembolsando';
    redirectError(ventaId, msg);
  }

  // Marcar venta y devolver stock
  const items = await db
    .select()
    .from(ventasB2cItems)
    .where(eq(ventasB2cItems.ventaId, ventaId));

  await db.transaction(async (tx) => {
    await tx
      .update(ventasB2c)
      .set({ estado: 'reembolsada', reembolsadaAt: new Date() })
      .where(eq(ventasB2c.id, ventaId));

    for (const it of items) {
      await tx
        .update(stockSalon)
        .set({
          cantidadDisponible: sql`${stockSalon.cantidadDisponible} + ${it.cantidad}`,
        })
        .where(
          and(
            eq(stockSalon.salonId, venta.salonId),
            eq(stockSalon.productoId, it.productoId),
          ),
        );
    }
  });

  revalidatePath('/panel/ventas');
  revalidatePath(`/panel/ventas/${ventaId}`);
  revalidatePath('/panel/stock');
  redirect(`/panel/ventas/${ventaId}?ok=1`);
}
