'use server';

import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { db } from '@/lib/db';
import { stockSalon } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';

const ActualizarSchema = z.object({
  stock_id: z.string().uuid(),
  cantidad_disponible: z.number().int().min(0).max(99999),
  precio_publico_eur: z.number().min(0).max(9999).nullable(),
  activo_en_tienda_publica: z.boolean(),
});

function redirectError(msg: string): never {
  redirect(`/panel/stock?error=${encodeURIComponent(msg)}`);
}

/**
 * Actualiza un item del stock del salón. El dueño puede ajustar la
 * cantidad disponible (p. ej. tras un inventario), el precio público
 * (su PVP) y el switch de "Mostrar en tienda pública".
 */
export async function actualizarStockItem(formData: FormData) {
  const salonRaw = (await getCurrentSalon()) as { id?: string } | null;
  if (!salonRaw?.id) redirectError('No se pudo identificar el salón');

  const raw = {
    stock_id: String(formData.get('stock_id') || ''),
    cantidad_disponible: Number(formData.get('cantidad_disponible') || 0),
    precio_publico_eur:
      String(formData.get('precio_publico_eur') || '').trim() === ''
        ? null
        : Number(formData.get('precio_publico_eur')),
    activo_en_tienda_publica:
      formData.get('activo_en_tienda_publica') === 'on' ||
      formData.get('activo_en_tienda_publica') === 'true',
  };

  const parsed = ActualizarSchema.safeParse(raw);
  if (!parsed.success) {
    redirectError('Datos inválidos');
  }
  const d = parsed.data;

  // Si el dueño quiere activar el item en la tienda pero la cantidad es 0,
  // forzamos desactivar (no tiene sentido ofrecer sin stock).
  const activo =
    d.activo_en_tienda_publica && d.cantidad_disponible > 0 ? true : false;

  await db
    .update(stockSalon)
    .set({
      cantidadDisponible: d.cantidad_disponible,
      precioPublicoEur:
        d.precio_publico_eur !== null
          ? d.precio_publico_eur.toFixed(2)
          : null,
      activoEnTiendaPublica: activo,
    })
    .where(
      and(eq(stockSalon.id, d.stock_id), eq(stockSalon.salonId, salonRaw.id)),
    );

  revalidatePath('/panel/stock');
  // Revalidar la tienda pública del salón también (lo que se ve cambia).
  revalidatePath('/s/[slug]/tienda', 'page');
  redirect('/panel/stock?ok=1');
}

/**
 * Quita un item del stock — soft, marca cantidad=0 + desactiva.
 */
export async function quitarStockItem(formData: FormData) {
  const salonRaw = (await getCurrentSalon()) as { id?: string } | null;
  if (!salonRaw?.id) redirectError('No se pudo identificar el salón');

  const stockId = String(formData.get('stock_id') || '');
  if (!/^[0-9a-f-]{36}$/.test(stockId)) redirectError('Id inválido');

  await db
    .update(stockSalon)
    .set({
      cantidadDisponible: 0,
      activoEnTiendaPublica: false,
    })
    .where(
      and(eq(stockSalon.id, stockId), eq(stockSalon.salonId, salonRaw.id)),
    );

  revalidatePath('/panel/stock');
  revalidatePath('/s/[slug]/tienda', 'page');
  redirect('/panel/stock?ok=1');
}
