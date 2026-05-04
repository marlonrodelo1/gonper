'use server';

import { db } from '@/lib/db';
import { galeriaImagenes } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { createAdminClient } from '@/lib/supabase/admin';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

type CurrentSalon = { id: string; slug?: string } | null;

const BUCKET = 'salon-assets';
const MIME_PERMITIDOS = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
]);
const LIMITE_BYTES = 5 * 1024 * 1024; // 5 MB por foto

function extDeMime(mime: string): string {
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/avif') return 'avif';
  return 'bin';
}

function errorRedirect(id: string | null, msg: string): never {
  const url = `/panel/galeria/${id ? id + '/editar' : 'nuevo'}?error=${encodeURIComponent(msg)}`;
  redirect(url);
}

async function requireSalon(): Promise<{ id: string; slug: string | null }> {
  const salon = (await getCurrentSalon()) as CurrentSalon;
  if (!salon || !salon.id) {
    redirect('/panel/galeria?error=' + encodeURIComponent('No se pudo identificar el salón'));
  }
  return { id: salon.id, slug: salon.slug ?? null };
}

function revalidarWebPublica(slug: string | null) {
  if (slug) revalidatePath(`/s/${slug}`);
}

function pathFromPublicUrl(url: string): string | null {
  const marker = `/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

function parseMeta(formData: FormData) {
  const altRaw = String(formData.get('alt') || '').trim();
  const tagRaw = String(formData.get('tag') || '').trim();
  const tituloRaw = String(formData.get('titulo') || '').trim();
  const ordenRaw = formData.get('orden');
  const orden = ordenRaw === null || ordenRaw === '' ? 0 : Number(ordenRaw);
  const activa = formData.get('activa') === 'on' || formData.get('activa') === 'true';
  return {
    alt: altRaw === '' ? null : altRaw,
    tag: tagRaw === '' ? null : tagRaw,
    titulo: tituloRaw === '' ? null : tituloRaw,
    orden: Number.isFinite(orden) && Number.isInteger(orden) ? orden : 0,
    activa,
  };
}

async function subirArchivo(
  salonId: string,
  file: File,
): Promise<{ url: string; path: string }> {
  if (!MIME_PERMITIDOS.has(file.type)) {
    errorRedirect(null, 'Formato no permitido. Usa JPG, PNG, WEBP o AVIF.');
  }
  if (file.size > LIMITE_BYTES) {
    errorRedirect(null, 'Imagen demasiado grande (máx. 5 MB).');
  }
  const ext = extDeMime(file.type);
  const path = `${salonId}/galeria/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const admin = createAdminClient();
  const upload = await admin.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (upload.error) {
    errorRedirect(null, 'Error subiendo: ' + upload.error.message);
  }
  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  if (!data.publicUrl) {
    errorRedirect(null, 'No se pudo obtener URL pública');
  }
  return { url: data.publicUrl, path };
}

export async function crearImagen(formData: FormData) {
  const salon = await requireSalon();
  const meta = parseMeta(formData);

  const file = formData.get('archivo');
  if (!(file instanceof File) || file.size === 0) {
    errorRedirect(null, 'Selecciona una imagen');
  }
  const { url } = await subirArchivo(salon.id, file);

  await db.insert(galeriaImagenes).values({
    salonId: salon.id,
    url,
    alt: meta.alt,
    tag: meta.tag,
    titulo: meta.titulo,
    orden: meta.orden,
    activa: meta.activa,
  });

  revalidatePath('/panel/galeria');
  revalidarWebPublica(salon.slug);
  redirect('/panel/galeria');
}

export async function actualizarImagen(id: string, formData: FormData) {
  const salon = await requireSalon();
  const meta = parseMeta(formData);

  const [existente] = await db
    .select()
    .from(galeriaImagenes)
    .where(eq(galeriaImagenes.id, id))
    .limit(1);

  if (!existente || existente.salonId !== salon.id) {
    redirect('/panel/galeria?error=' + encodeURIComponent('No autorizado'));
  }

  // Si llega un archivo nuevo, subimos y borramos el anterior. Si no,
  // sólo actualizamos metadata.
  let nuevaUrl: string | null = null;
  const file = formData.get('archivo');
  if (file instanceof File && file.size > 0) {
    const { url } = await subirArchivo(salon.id, file);
    nuevaUrl = url;
    const prevPath = pathFromPublicUrl(existente.url);
    if (prevPath && prevPath.startsWith(`${salon.id}/`)) {
      const admin = createAdminClient();
      await admin.storage.from(BUCKET).remove([prevPath]).catch(() => {});
    }
  }

  await db
    .update(galeriaImagenes)
    .set({
      ...(nuevaUrl ? { url: nuevaUrl } : {}),
      alt: meta.alt,
      tag: meta.tag,
      titulo: meta.titulo,
      orden: meta.orden,
      activa: meta.activa,
    })
    .where(and(eq(galeriaImagenes.id, id), eq(galeriaImagenes.salonId, salon.id)));

  revalidatePath('/panel/galeria');
  revalidarWebPublica(salon.slug);
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
  revalidarWebPublica(salon.slug);
}

export async function eliminarImagen(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (!id) {
    redirect('/panel/galeria?error=' + encodeURIComponent('ID inválido'));
  }

  const salon = await requireSalon();

  const [existente] = await db
    .select()
    .from(galeriaImagenes)
    .where(eq(galeriaImagenes.id, id))
    .limit(1);

  if (!existente || existente.salonId !== salon.id) {
    redirect('/panel/galeria?error=' + encodeURIComponent('No autorizado'));
  }

  // Borrar el archivo del Storage si pertenece a nuestro bucket.
  const prevPath = pathFromPublicUrl(existente.url);
  if (prevPath && prevPath.startsWith(`${salon.id}/`)) {
    const admin = createAdminClient();
    await admin.storage.from(BUCKET).remove([prevPath]).catch(() => {});
  }

  await db
    .delete(galeriaImagenes)
    .where(and(eq(galeriaImagenes.id, id), eq(galeriaImagenes.salonId, salon.id)));

  revalidatePath('/panel/galeria');
  revalidarWebPublica(salon.slug);
}
