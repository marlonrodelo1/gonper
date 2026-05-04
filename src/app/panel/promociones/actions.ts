'use server';

import { db } from '@/lib/db';
import { promociones } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

type CurrentSalon = { id: string; slug?: string } | null;

function errorRedirect(id: string | null, msg: string): never {
  const url = `/panel/promociones/${id ? id + '/editar' : 'nuevo'}?error=${encodeURIComponent(msg)}`;
  redirect(url);
}

function parseFormData(formData: FormData) {
  const titulo = String(formData.get('titulo') || '').trim();
  const tagRaw = String(formData.get('tag') || '').trim();
  const descripcionRaw = String(formData.get('descripcion') || '').trim();
  const descuentoLabelRaw = String(formData.get('descuento_label') || '').trim();
  const precioEurRaw = String(formData.get('precio_eur') || '').trim();
  const precioAnteriorEurRaw = String(formData.get('precio_anterior_eur') || '').trim();
  const validaHastaRaw = String(formData.get('valida_hasta') || '').trim();
  const activa = formData.get('activa') === 'on' || formData.get('activa') === 'true';
  const ordenRaw = formData.get('orden');
  const orden = ordenRaw === null || ordenRaw === '' ? 0 : Number(ordenRaw);

  return {
    titulo,
    tag: tagRaw === '' ? null : tagRaw,
    descripcion: descripcionRaw === '' ? null : descripcionRaw,
    descuentoLabel: descuentoLabelRaw === '' ? null : descuentoLabelRaw,
    precioEur: precioEurRaw === '' ? null : Number(precioEurRaw),
    precioAnteriorEur: precioAnteriorEurRaw === '' ? null : Number(precioAnteriorEurRaw),
    validaHasta: validaHastaRaw === '' ? null : validaHastaRaw,
    activa,
    orden,
  };
}

function validar(data: ReturnType<typeof parseFormData>): string | null {
  if (!data.titulo || data.titulo.length > 120) {
    return 'El título es obligatorio (máx. 120 caracteres)';
  }
  if (data.precioEur !== null && (!Number.isFinite(data.precioEur) || data.precioEur < 0)) {
    return 'El precio debe ser un número mayor o igual a 0';
  }
  if (
    data.precioAnteriorEur !== null &&
    (!Number.isFinite(data.precioAnteriorEur) || data.precioAnteriorEur < 0)
  ) {
    return 'El precio anterior debe ser un número mayor o igual a 0';
  }
  if (!Number.isFinite(data.orden) || !Number.isInteger(data.orden)) {
    return 'El orden debe ser un número entero';
  }
  return null;
}

async function requireSalon(): Promise<{ id: string; slug: string | null }> {
  const salon = (await getCurrentSalon()) as CurrentSalon;
  if (!salon || !salon.id) {
    redirect('/panel/promociones?error=' + encodeURIComponent('No se pudo identificar el salón'));
  }
  return { id: salon.id, slug: salon.slug ?? null };
}

function revalidarWebPublica(slug: string | null) {
  if (slug) revalidatePath(`/s/${slug}`);
}

export async function crearPromocion(formData: FormData) {
  const data = parseFormData(formData);
  const err = validar(data);
  if (err) errorRedirect(null, err);

  const salon = await requireSalon();

  await db.insert(promociones).values({
    salonId: salon.id,
    titulo: data.titulo,
    tag: data.tag,
    descripcion: data.descripcion,
    descuentoLabel: data.descuentoLabel,
    precioEur: data.precioEur !== null ? data.precioEur.toFixed(2) : null,
    precioAnteriorEur:
      data.precioAnteriorEur !== null ? data.precioAnteriorEur.toFixed(2) : null,
    validaHasta: data.validaHasta,
    activa: data.activa,
    orden: data.orden,
  });

  revalidatePath('/panel/promociones');
  revalidarWebPublica(salon.slug);
  redirect('/panel/promociones');
}

export async function actualizarPromocion(id: string, formData: FormData) {
  const data = parseFormData(formData);
  const err = validar(data);
  if (err) errorRedirect(id, err);

  const salon = await requireSalon();

  const [existente] = await db
    .select({ id: promociones.id, salonId: promociones.salonId })
    .from(promociones)
    .where(eq(promociones.id, id))
    .limit(1);

  if (!existente || existente.salonId !== salon.id) {
    redirect('/panel/promociones?error=' + encodeURIComponent('No autorizado'));
  }

  await db
    .update(promociones)
    .set({
      titulo: data.titulo,
      tag: data.tag,
      descripcion: data.descripcion,
      descuentoLabel: data.descuentoLabel,
      precioEur: data.precioEur !== null ? data.precioEur.toFixed(2) : null,
      precioAnteriorEur:
        data.precioAnteriorEur !== null ? data.precioAnteriorEur.toFixed(2) : null,
      validaHasta: data.validaHasta,
      activa: data.activa,
      orden: data.orden,
      updatedAt: new Date(),
    })
    .where(and(eq(promociones.id, id), eq(promociones.salonId, salon.id)));

  revalidatePath('/panel/promociones');
  revalidarWebPublica(salon.slug);
  redirect('/panel/promociones');
}

export async function togglePromocionActiva(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (!id) {
    redirect('/panel/promociones?error=' + encodeURIComponent('ID inválido'));
  }

  const salon = await requireSalon();

  const [existente] = await db
    .select({
      id: promociones.id,
      salonId: promociones.salonId,
      activa: promociones.activa,
    })
    .from(promociones)
    .where(eq(promociones.id, id))
    .limit(1);

  if (!existente || existente.salonId !== salon.id) {
    redirect('/panel/promociones?error=' + encodeURIComponent('No autorizado'));
  }

  await db
    .update(promociones)
    .set({ activa: !existente.activa, updatedAt: new Date() })
    .where(and(eq(promociones.id, id), eq(promociones.salonId, salon.id)));

  revalidatePath('/panel/promociones');
  revalidarWebPublica(salon.slug);
}

export async function eliminarPromocion(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (!id) {
    redirect('/panel/promociones?error=' + encodeURIComponent('ID inválido'));
  }

  const salon = await requireSalon();

  const [existente] = await db
    .select({ id: promociones.id, salonId: promociones.salonId })
    .from(promociones)
    .where(eq(promociones.id, id))
    .limit(1);

  if (!existente || existente.salonId !== salon.id) {
    redirect('/panel/promociones?error=' + encodeURIComponent('No autorizado'));
  }

  await db
    .delete(promociones)
    .where(and(eq(promociones.id, id), eq(promociones.salonId, salon.id)));

  revalidatePath('/panel/promociones');
  revalidarWebPublica(salon.slug);
}
