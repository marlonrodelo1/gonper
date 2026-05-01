'use server';

import { db } from '@/lib/db';
import { galeriaImagenes } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

type CurrentSalon = { id: string } | null;

function errorRedirect(id: string | null, msg: string): never {
  const url = `/panel/galeria/${id ? id + '/editar' : 'nuevo'}?error=${encodeURIComponent(msg)}`;
  redirect(url);
}

function parseFormData(formData: FormData) {
  const url = String(formData.get('url') || '').trim();
  const altRaw = String(formData.get('alt') || '').trim();
  const tagRaw = String(formData.get('tag') || '').trim();
  const tituloRaw = String(formData.get('titulo') || '').trim();
  const ordenRaw = formData.get('orden');
  const orden = ordenRaw === null || ordenRaw === '' ? 0 : Number(ordenRaw);
  const activa = formData.get('activa') === 'on' || formData.get('activa') === 'true';

  return {
    url,
    alt: altRaw === '' ? null : altRaw,
    tag: tagRaw === '' ? null : tagRaw,
    titulo: tituloRaw === '' ? null : tituloRaw,
    orden,
    activa,
  };
}

function validar(data: ReturnType<typeof parseFormData>): string | null {
  if (!data.url) return 'La URL de la imagen es obligatoria';
  try {
    const u = new URL(data.url);
    if (!['http:', 'https:'].includes(u.protocol)) {
      return 'La URL debe empezar por http:// o https://';
    }
  } catch {
    return 'La URL no es válida';
  }
  if (!Number.isFinite(data.orden) || !Number.isInteger(data.orden)) {
    return 'El orden debe ser un número entero';
  }
  return null;
}

async function requireSalon(): Promise<{ id: string }> {
  const salon = (await getCurrentSalon()) as CurrentSalon;
  if (!salon || !salon.id) {
    redirect('/panel/galeria?error=' + encodeURIComponent('No se pudo identificar el salón'));
  }
  return salon;
}

export async function crearImagen(formData: FormData) {
  const data = parseFormData(formData);
  const err = validar(data);
  if (err) errorRedirect(null, err);

  const salon = await requireSalon();

  await db.insert(galeriaImagenes).values({
    salonId: salon.id,
    url: data.url,
    alt: data.alt,
    tag: data.tag,
    titulo: data.titulo,
    orden: data.orden,
    activa: data.activa,
  });

  revalidatePath('/panel/galeria');
  redirect('/panel/galeria');
}

export async function actualizarImagen(id: string, formData: FormData) {
  const data = parseFormData(formData);
  const err = validar(data);
  if (err) errorRedirect(id, err);

  const salon = await requireSalon();

  const [existente] = await db
    .select({ id: galeriaImagenes.id, salonId: galeriaImagenes.salonId })
    .from(galeriaImagenes)
    .where(eq(galeriaImagenes.id, id))
    .limit(1);

  if (!existente || existente.salonId !== salon.id) {
    redirect('/panel/galeria?error=' + encodeURIComponent('No autorizado'));
  }

  await db
    .update(galeriaImagenes)
    .set({
      url: data.url,
      alt: data.alt,
      tag: data.tag,
      titulo: data.titulo,
      orden: data.orden,
      activa: data.activa,
    })
    .where(and(eq(galeriaImagenes.id, id), eq(galeriaImagenes.salonId, salon.id)));

  revalidatePath('/panel/galeria');
  redirect('/panel/galeria');
}

export async function toggleImagenActiva(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (!id) {
    redirect('/panel/galeria?error=' + encodeURIComponent('ID inválido'));
  }

  const salon = await requireSalon();

  const [existente] = await db
    .select({
      id: galeriaImagenes.id,
      salonId: galeriaImagenes.salonId,
      activa: galeriaImagenes.activa,
    })
    .from(galeriaImagenes)
    .where(eq(galeriaImagenes.id, id))
    .limit(1);

  if (!existente || existente.salonId !== salon.id) {
    redirect('/panel/galeria?error=' + encodeURIComponent('No autorizado'));
  }

  await db
    .update(galeriaImagenes)
    .set({ activa: !existente.activa })
    .where(and(eq(galeriaImagenes.id, id), eq(galeriaImagenes.salonId, salon.id)));

  revalidatePath('/panel/galeria');
}

export async function eliminarImagen(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (!id) {
    redirect('/panel/galeria?error=' + encodeURIComponent('ID inválido'));
  }

  const salon = await requireSalon();

  const [existente] = await db
    .select({ id: galeriaImagenes.id, salonId: galeriaImagenes.salonId })
    .from(galeriaImagenes)
    .where(eq(galeriaImagenes.id, id))
    .limit(1);

  if (!existente || existente.salonId !== salon.id) {
    redirect('/panel/galeria?error=' + encodeURIComponent('No autorizado'));
  }

  await db
    .delete(galeriaImagenes)
    .where(and(eq(galeriaImagenes.id, id), eq(galeriaImagenes.salonId, salon.id)));

  revalidatePath('/panel/galeria');
}
