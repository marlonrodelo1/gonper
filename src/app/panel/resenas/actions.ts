'use server';

import { db } from '@/lib/db';
import { resenas } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

type CurrentSalon = { id: string; slug?: string } | null;

const FUENTES_VALIDAS = ['manual', 'google', 'telegram', 'web'] as const;
type Fuente = (typeof FUENTES_VALIDAS)[number];

function errorRedirect(id: string | null, msg: string): never {
  const url = `/panel/resenas/${id ? id + '/editar' : 'nuevo'}?error=${encodeURIComponent(msg)}`;
  redirect(url);
}

function parseFormData(formData: FormData) {
  const autorNombre = String(formData.get('autor_nombre') || '').trim();
  const rating = Number(formData.get('rating') || 0);
  const textoRaw = String(formData.get('texto') || '').trim();
  const fechaRaw = String(formData.get('fecha') || '').trim();
  const fuenteRaw = String(formData.get('fuente') || 'manual').trim();
  const aprobada = formData.get('aprobada') === 'on' || formData.get('aprobada') === 'true';
  const destacada = formData.get('destacada') === 'on' || formData.get('destacada') === 'true';

  return {
    autorNombre,
    rating,
    texto: textoRaw === '' ? null : textoRaw,
    fecha: fechaRaw === '' ? null : fechaRaw,
    fuente: (FUENTES_VALIDAS.includes(fuenteRaw as Fuente)
      ? fuenteRaw
      : 'manual') as Fuente,
    aprobada,
    destacada,
  };
}

function validar(data: ReturnType<typeof parseFormData>): string | null {
  if (!data.autorNombre || data.autorNombre.length > 120) {
    return 'El nombre del autor es obligatorio (máx. 120 caracteres)';
  }
  if (
    !Number.isFinite(data.rating) ||
    !Number.isInteger(data.rating) ||
    data.rating < 1 ||
    data.rating > 5
  ) {
    return 'La valoración debe estar entre 1 y 5';
  }
  return null;
}

async function requireSalon(): Promise<{ id: string; slug: string | null }> {
  const salon = (await getCurrentSalon()) as CurrentSalon;
  if (!salon || !salon.id) {
    redirect('/panel/resenas?error=' + encodeURIComponent('No se pudo identificar el salón'));
  }
  return { id: salon.id, slug: salon.slug ?? null };
}

function revalidarWebPublica(slug: string | null) {
  if (slug) revalidatePath(`/s/${slug}`);
}

export async function crearResena(formData: FormData) {
  const data = parseFormData(formData);
  const err = validar(data);
  if (err) errorRedirect(null, err);

  const salon = await requireSalon();

  await db.insert(resenas).values({
    salonId: salon.id,
    autorNombre: data.autorNombre,
    rating: data.rating,
    texto: data.texto,
    ...(data.fecha ? { fecha: data.fecha } : {}),
    fuente: data.fuente,
    aprobada: data.aprobada,
    destacada: data.destacada,
  });

  revalidatePath('/panel/resenas');
  revalidarWebPublica(salon.slug);
  redirect('/panel/resenas');
}

export async function actualizarResena(id: string, formData: FormData) {
  const data = parseFormData(formData);
  const err = validar(data);
  if (err) errorRedirect(id, err);

  const salon = await requireSalon();

  const [existente] = await db
    .select({ id: resenas.id, salonId: resenas.salonId })
    .from(resenas)
    .where(eq(resenas.id, id))
    .limit(1);

  if (!existente || existente.salonId !== salon.id) {
    redirect('/panel/resenas?error=' + encodeURIComponent('No autorizado'));
  }

  await db
    .update(resenas)
    .set({
      autorNombre: data.autorNombre,
      rating: data.rating,
      texto: data.texto,
      ...(data.fecha ? { fecha: data.fecha } : {}),
      fuente: data.fuente,
      aprobada: data.aprobada,
      destacada: data.destacada,
    })
    .where(and(eq(resenas.id, id), eq(resenas.salonId, salon.id)));

  revalidatePath('/panel/resenas');
  revalidarWebPublica(salon.slug);
  redirect('/panel/resenas');
}

export async function toggleResenaAprobada(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (!id) {
    redirect('/panel/resenas?error=' + encodeURIComponent('ID inválido'));
  }

  const salon = await requireSalon();

  const [existente] = await db
    .select({
      id: resenas.id,
      salonId: resenas.salonId,
      aprobada: resenas.aprobada,
    })
    .from(resenas)
    .where(eq(resenas.id, id))
    .limit(1);

  if (!existente || existente.salonId !== salon.id) {
    redirect('/panel/resenas?error=' + encodeURIComponent('No autorizado'));
  }

  await db
    .update(resenas)
    .set({ aprobada: !existente.aprobada })
    .where(and(eq(resenas.id, id), eq(resenas.salonId, salon.id)));

  revalidatePath('/panel/resenas');
  revalidarWebPublica(salon.slug);
}

export async function toggleResenaDestacada(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (!id) {
    redirect('/panel/resenas?error=' + encodeURIComponent('ID inválido'));
  }

  const salon = await requireSalon();

  const [existente] = await db
    .select({
      id: resenas.id,
      salonId: resenas.salonId,
      destacada: resenas.destacada,
    })
    .from(resenas)
    .where(eq(resenas.id, id))
    .limit(1);

  if (!existente || existente.salonId !== salon.id) {
    redirect('/panel/resenas?error=' + encodeURIComponent('No autorizado'));
  }

  await db
    .update(resenas)
    .set({ destacada: !existente.destacada })
    .where(and(eq(resenas.id, id), eq(resenas.salonId, salon.id)));

  revalidatePath('/panel/resenas');
  revalidarWebPublica(salon.slug);
}

export async function eliminarResena(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (!id) {
    redirect('/panel/resenas?error=' + encodeURIComponent('ID inválido'));
  }

  const salon = await requireSalon();

  const [existente] = await db
    .select({ id: resenas.id, salonId: resenas.salonId })
    .from(resenas)
    .where(eq(resenas.id, id))
    .limit(1);

  if (!existente || existente.salonId !== salon.id) {
    redirect('/panel/resenas?error=' + encodeURIComponent('No autorizado'));
  }

  await db
    .delete(resenas)
    .where(and(eq(resenas.id, id), eq(resenas.salonId, salon.id)));

  revalidatePath('/panel/resenas');
  revalidarWebPublica(salon.slug);
}
