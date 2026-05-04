'use server';

import { db } from '@/lib/db';
import { servicios } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

type CurrentSalon = { id: string; slug?: string } | null;

function errorRedirect(id: string | null, msg: string): never {
  const url = `/panel/servicios/${id ? id + '/editar' : 'nuevo'}?error=${encodeURIComponent(msg)}`;
  redirect(url);
}

function parseFormData(formData: FormData) {
  const nombre = String(formData.get('nombre') || '').trim();
  const descripcionRaw = String(formData.get('descripcion') || '').trim();
  const descripcion = descripcionRaw === '' ? null : descripcionRaw;
  const duracionMin = Number(formData.get('duracion_min') || 0);
  const precioEur = Number(formData.get('precio_eur') || 0);
  return { nombre, descripcion, duracionMin, precioEur };
}

function validar(
  data: ReturnType<typeof parseFormData>,
): string | null {
  if (!data.nombre || data.nombre.length > 80) {
    return 'El nombre es obligatorio (máx. 80 caracteres)';
  }
  if (
    !Number.isFinite(data.duracionMin) ||
    !Number.isInteger(data.duracionMin) ||
    data.duracionMin < 1 ||
    data.duracionMin > 480
  ) {
    return 'La duración debe estar entre 1 y 480 minutos';
  }
  if (!Number.isFinite(data.precioEur) || data.precioEur < 0) {
    return 'El precio debe ser un número mayor o igual a 0';
  }
  return null;
}

async function requireSalon(): Promise<{ id: string; slug: string | null }> {
  const salon = (await getCurrentSalon()) as CurrentSalon;
  if (!salon || !salon.id) {
    redirect('/panel/servicios?error=' + encodeURIComponent('No se pudo identificar el salón'));
  }
  return { id: salon.id, slug: salon.slug ?? null };
}

function revalidarWebPublica(slug: string | null) {
  if (slug) revalidatePath(`/s/${slug}`);
}

export async function crearServicio(formData: FormData) {
  const data = parseFormData(formData);
  const err = validar(data);
  if (err) errorRedirect(null, err);

  const salon = await requireSalon();

  await db.insert(servicios).values({
    salonId: salon.id,
    nombre: data.nombre,
    descripcion: data.descripcion,
    duracionMin: data.duracionMin,
    precioEur: data.precioEur.toFixed(2),
  });

  revalidatePath('/panel/servicios');
  revalidatePath('/panel/config/reservas');
  revalidarWebPublica(salon.slug);
  redirect('/panel/servicios');
}

export async function actualizarServicio(id: string, formData: FormData) {
  const data = parseFormData(formData);
  const err = validar(data);
  if (err) errorRedirect(id, err);

  const salon = await requireSalon();

  // Ownership check
  const [existente] = await db
    .select({ id: servicios.id, salonId: servicios.salonId })
    .from(servicios)
    .where(eq(servicios.id, id))
    .limit(1);

  if (!existente || existente.salonId !== salon.id) {
    redirect('/panel/servicios?error=' + encodeURIComponent('No autorizado'));
  }

  await db
    .update(servicios)
    .set({
      nombre: data.nombre,
      descripcion: data.descripcion,
      duracionMin: data.duracionMin,
      precioEur: data.precioEur.toFixed(2),
    })
    .where(and(eq(servicios.id, id), eq(servicios.salonId, salon.id)));

  revalidatePath('/panel/servicios');
  revalidatePath('/panel/config/reservas');
  revalidarWebPublica(salon.slug);
  redirect('/panel/servicios');
}

export async function toggleServicioActivo(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (!id) {
    redirect('/panel/servicios?error=' + encodeURIComponent('ID inválido'));
  }

  const salon = await requireSalon();

  const [existente] = await db
    .select({ id: servicios.id, salonId: servicios.salonId, activo: servicios.activo })
    .from(servicios)
    .where(eq(servicios.id, id))
    .limit(1);

  if (!existente || existente.salonId !== salon.id) {
    redirect('/panel/servicios?error=' + encodeURIComponent('No autorizado'));
  }

  await db
    .update(servicios)
    .set({ activo: !existente.activo })
    .where(and(eq(servicios.id, id), eq(servicios.salonId, salon.id)));

  revalidatePath('/panel/servicios');
  revalidatePath('/panel/config/reservas');
  revalidarWebPublica(salon.slug);
}

export async function eliminarServicio(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (!id) {
    redirect('/panel/servicios?error=' + encodeURIComponent('ID inválido'));
  }

  const salon = await requireSalon();

  const [existente] = await db
    .select({ id: servicios.id, salonId: servicios.salonId })
    .from(servicios)
    .where(eq(servicios.id, id))
    .limit(1);

  if (!existente || existente.salonId !== salon.id) {
    redirect('/panel/servicios?error=' + encodeURIComponent('No autorizado'));
  }

  await db
    .delete(servicios)
    .where(and(eq(servicios.id, id), eq(servicios.salonId, salon.id)));

  revalidatePath('/panel/servicios');
  revalidatePath('/panel/config/reservas');
  revalidarWebPublica(salon.slug);
}
