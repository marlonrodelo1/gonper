'use server';

import { db } from '@/lib/db';
import { comparativasAntesDespues } from '@/lib/db/schema';
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
const LIMITE_BYTES = 5 * 1024 * 1024;

const PANEL_PATH = '/panel/galeria/antes-despues';

function extDeMime(mime: string): string {
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/avif') return 'avif';
  return 'bin';
}

function errorRedirect(msg: string): never {
  redirect(`${PANEL_PATH}?error=${encodeURIComponent(msg)}`);
}

async function requireSalon(): Promise<{ id: string; slug: string | null }> {
  const salon = (await getCurrentSalon()) as CurrentSalon;
  if (!salon || !salon.id) {
    errorRedirect('No se pudo identificar el salón');
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

async function subirArchivo(
  salonId: string,
  file: File,
): Promise<{ url: string }> {
  if (!MIME_PERMITIDOS.has(file.type)) {
    errorRedirect('Formato no permitido. Usa JPG, PNG, WEBP o AVIF.');
  }
  if (file.size > LIMITE_BYTES) {
    errorRedirect('Imagen demasiado grande (máx. 5 MB).');
  }
  const ext = extDeMime(file.type);
  const path = `${salonId}/comparativas/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const admin = createAdminClient();
  const upload = await admin.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (upload.error) {
    errorRedirect('Error subiendo: ' + upload.error.message);
  }
  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  if (!data.publicUrl) {
    errorRedirect('No se pudo obtener URL pública');
  }
  return { url: data.publicUrl };
}

export async function crearComparativa(formData: FormData) {
  const salon = await requireSalon();

  const antesFile = formData.get('antes');
  const despuesFile = formData.get('despues');
  if (
    !(antesFile instanceof File) ||
    antesFile.size === 0 ||
    !(despuesFile instanceof File) ||
    despuesFile.size === 0
  ) {
    errorRedirect('Tienes que subir las dos imágenes (antes y después)');
  }

  const descripcionRaw = String(formData.get('descripcion') || '').trim();
  const ordenRaw = formData.get('orden');
  const orden =
    ordenRaw === null || ordenRaw === '' ? 0 : Number(ordenRaw);
  const activa =
    formData.get('activa') === 'on' || formData.get('activa') === 'true';

  const [{ url: antesUrl }, { url: despuesUrl }] = await Promise.all([
    subirArchivo(salon.id, antesFile),
    subirArchivo(salon.id, despuesFile),
  ]);

  await db.insert(comparativasAntesDespues).values({
    salonId: salon.id,
    antesUrl,
    despuesUrl,
    descripcion: descripcionRaw === '' ? null : descripcionRaw,
    orden: Number.isFinite(orden) && Number.isInteger(orden) ? orden : 0,
    activa,
  });

  revalidatePath(PANEL_PATH);
  revalidarWebPublica(salon.slug);
  redirect(PANEL_PATH);
}

export async function eliminarComparativa(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (!id) errorRedirect('ID inválido');

  const salon = await requireSalon();

  const [existente] = await db
    .select()
    .from(comparativasAntesDespues)
    .where(eq(comparativasAntesDespues.id, id))
    .limit(1);

  if (!existente || existente.salonId !== salon.id) {
    errorRedirect('No autorizado');
  }

  // Borrar archivos del Storage
  const admin = createAdminClient();
  const paths: string[] = [];
  for (const url of [existente.antesUrl, existente.despuesUrl]) {
    const p = pathFromPublicUrl(url);
    if (p && p.startsWith(`${salon.id}/`)) paths.push(p);
  }
  if (paths.length > 0) {
    await admin.storage.from(BUCKET).remove(paths).catch(() => {});
  }

  await db
    .delete(comparativasAntesDespues)
    .where(
      and(
        eq(comparativasAntesDespues.id, id),
        eq(comparativasAntesDespues.salonId, salon.id),
      ),
    );

  revalidatePath(PANEL_PATH);
  revalidarWebPublica(salon.slug);
}

export async function toggleComparativaActiva(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (!id) errorRedirect('ID inválido');

  const salon = await requireSalon();

  const [existente] = await db
    .select({
      id: comparativasAntesDespues.id,
      salonId: comparativasAntesDespues.salonId,
      activa: comparativasAntesDespues.activa,
    })
    .from(comparativasAntesDespues)
    .where(eq(comparativasAntesDespues.id, id))
    .limit(1);

  if (!existente || existente.salonId !== salon.id) {
    errorRedirect('No autorizado');
  }

  await db
    .update(comparativasAntesDespues)
    .set({ activa: !existente.activa, updatedAt: new Date() })
    .where(
      and(
        eq(comparativasAntesDespues.id, id),
        eq(comparativasAntesDespues.salonId, salon.id),
      ),
    );

  revalidatePath(PANEL_PATH);
  revalidarWebPublica(salon.slug);
}
