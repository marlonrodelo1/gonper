'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { productos, productosSalon } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';

type CurrentSalon = { id?: string; slug?: string } | null;

async function requireSalon(): Promise<{ id: string; slug: string | null }> {
  const salon = (await getCurrentSalon()) as CurrentSalon;
  if (!salon || !salon.id) {
    redirect(
      '/panel/catalogo?error=' +
        encodeURIComponent('No se pudo identificar el salón'),
    );
  }
  return { id: salon.id, slug: salon.slug ?? null };
}

/**
 * Toggle producto en la tienda pública del salón actual (modelo
 * dropshipping). El salón no toca precio ni stock — solo activa/desactiva.
 *
 * - Sin row en productos_salon → insert con activo=true.
 * - Con row existente → invertir el flag `activo`. Mantenemos el row para
 *   conservar `activado_at` original como histórico.
 */
export async function toggleProductoEnMiTienda(formData: FormData) {
  const salon = await requireSalon();
  const productoId = String(formData.get('producto_id') ?? '');
  if (!/^[0-9a-f-]{36}$/.test(productoId)) {
    redirect(
      '/panel/catalogo?error=' + encodeURIComponent('Producto inválido'),
    );
  }

  const [prod] = await db
    .select({ id: productos.id, marcaId: productos.marcaId, activo: productos.activo })
    .from(productos)
    .where(eq(productos.id, productoId))
    .limit(1);
  if (!prod || !prod.activo) {
    redirect(
      '/panel/catalogo?error=' +
        encodeURIComponent('El producto ya no está disponible'),
    );
  }

  const [existing] = await db
    .select({ id: productosSalon.id, activo: productosSalon.activo })
    .from(productosSalon)
    .where(
      and(
        eq(productosSalon.salonId, salon.id),
        eq(productosSalon.productoId, productoId),
      ),
    )
    .limit(1);

  const now = new Date();

  if (!existing) {
    await db.insert(productosSalon).values({
      salonId: salon.id,
      productoId,
      activo: true,
      activadoAt: now,
      desactivadoAt: null,
    });
  } else {
    const nuevoActivo = !existing.activo;
    await db
      .update(productosSalon)
      .set({
        activo: nuevoActivo,
        activadoAt: nuevoActivo ? now : existing.activo ? undefined : now,
        desactivadoAt: nuevoActivo ? null : now,
        updatedAt: now,
      })
      .where(eq(productosSalon.id, existing.id));
  }

  revalidatePath('/panel/catalogo');
  if (salon.slug) revalidatePath(`/s/${salon.slug}/tienda`);

  const returnTo = String(formData.get('return_to') ?? '/panel/catalogo');
  redirect(returnTo);
}
