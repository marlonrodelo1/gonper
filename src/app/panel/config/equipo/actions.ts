'use server';

import { db } from '@/lib/db';
import { profesionales } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { createAdminClient } from '@/lib/supabase/admin';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

type CurrentSalon = { id: string; slug?: string } | null;

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const BUCKET = 'salon-assets';
const MIME_PERMITIDOS = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
]);
const LIMITE_FOTO_BYTES = 3 * 1024 * 1024; // 3 MB para fotos de perfil

function extDeMime(mime: string): string {
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/avif') return 'avif';
  return 'bin';
}

function pathFromPublicUrl(url: string): string | null {
  const marker = `/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

async function subirFotoPerfil(
  salonId: string,
  file: File,
): Promise<string> {
  if (!MIME_PERMITIDOS.has(file.type)) {
    redirect(
      '/panel/config/equipo?error=' +
        encodeURIComponent('Formato no permitido. Usa JPG, PNG, WEBP o AVIF.'),
    );
  }
  if (file.size > LIMITE_FOTO_BYTES) {
    redirect(
      '/panel/config/equipo?error=' +
        encodeURIComponent('Imagen demasiado grande (máx. 3 MB).'),
    );
  }
  const ext = extDeMime(file.type);
  const path = `${salonId}/equipo/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const admin = createAdminClient();
  const upload = await admin.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (upload.error) {
    redirect(
      '/panel/config/equipo?error=' +
        encodeURIComponent('Error subiendo foto: ' + upload.error.message),
    );
  }
  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  if (!data.publicUrl) {
    redirect(
      '/panel/config/equipo?error=' +
        encodeURIComponent('No se pudo obtener URL pública'),
    );
  }
  return data.publicUrl;
}

async function borrarFotoSiPropia(salonId: string, urlActual: string | null) {
  if (!urlActual) return;
  const path = pathFromPublicUrl(urlActual);
  if (!path || !path.startsWith(`${salonId}/`)) return;
  const admin = createAdminClient();
  await admin.storage.from(BUCKET).remove([path]).catch(() => {});
}

function errorRedirect(id: string | null, msg: string): never {
  const url = `/panel/config/equipo/${id ? id + '/editar' : 'nuevo'}?error=${encodeURIComponent(msg)}`;
  redirect(url);
}

function parseFormData(formData: FormData) {
  const nombre = String(formData.get('nombre') || '').trim();
  const colorHexRaw = String(formData.get('color_hex') || '').trim();
  const colorHex = HEX_RE.test(colorHexRaw) ? colorHexRaw : '#3b82f6';
  const ordenRaw = formData.get('orden');
  const ordenNum = ordenRaw == null ? 0 : Number(ordenRaw);
  const orden =
    Number.isFinite(ordenNum) && Number.isInteger(ordenNum) ? ordenNum : 0;
  return { nombre, colorHex, orden };
}

function validar(data: ReturnType<typeof parseFormData>): string | null {
  if (!data.nombre || data.nombre.length > 50) {
    return 'El nombre es obligatorio (máx. 50 caracteres)';
  }
  return null;
}

async function requireSalon(): Promise<{ id: string; slug: string | null }> {
  const salon = (await getCurrentSalon()) as CurrentSalon;
  if (!salon || !salon.id) {
    redirect(
      '/panel/config/equipo?error=' +
        encodeURIComponent('No se pudo identificar el salón'),
    );
  }
  return { id: salon.id, slug: salon.slug ?? null };
}

function revalidarWebPublica(slug: string | null) {
  if (slug) revalidatePath(`/s/${slug}`);
}

export async function crearProfesional(formData: FormData) {
  const data = parseFormData(formData);
  const err = validar(data);
  if (err) errorRedirect(null, err);

  const salon = await requireSalon();

  // Foto opcional: si llega archivo, lo subimos a Storage.
  let fotoUrl: string | null = null;
  const file = formData.get('foto');
  if (file instanceof File && file.size > 0) {
    fotoUrl = await subirFotoPerfil(salon.id, file);
  }

  await db.insert(profesionales).values({
    salonId: salon.id,
    nombre: data.nombre,
    colorHex: data.colorHex,
    fotoUrl,
    orden: data.orden,
  });

  revalidatePath('/panel/config/equipo');
  revalidatePath('/panel/config/reservas');
  revalidarWebPublica(salon.slug);
  redirect('/panel/config/equipo');
}

export async function actualizarProfesional(id: string, formData: FormData) {
  const data = parseFormData(formData);
  const err = validar(data);
  if (err) errorRedirect(id, err);

  const salon = await requireSalon();

  const [existente] = await db
    .select({
      id: profesionales.id,
      salonId: profesionales.salonId,
      fotoUrl: profesionales.fotoUrl,
    })
    .from(profesionales)
    .where(eq(profesionales.id, id))
    .limit(1);

  if (!existente || existente.salonId !== salon.id) {
    redirect(
      '/panel/config/equipo?error=' + encodeURIComponent('No autorizado'),
    );
  }

  // Foto opcional. Tres casos:
  //  - llega archivo nuevo → subimos y borramos el anterior si era nuestro
  //  - checkbox "quitar foto" → eliminamos referencia y el archivo en Storage
  //  - sin cambios → mantenemos
  let fotoUrlNueva: string | null | undefined = undefined;
  const quitar =
    formData.get('quitar_foto') === 'on' ||
    formData.get('quitar_foto') === 'true';
  const file = formData.get('foto');

  if (file instanceof File && file.size > 0) {
    fotoUrlNueva = await subirFotoPerfil(salon.id, file);
    await borrarFotoSiPropia(salon.id, existente.fotoUrl);
  } else if (quitar) {
    await borrarFotoSiPropia(salon.id, existente.fotoUrl);
    fotoUrlNueva = null;
  }

  await db
    .update(profesionales)
    .set({
      nombre: data.nombre,
      colorHex: data.colorHex,
      ...(fotoUrlNueva !== undefined ? { fotoUrl: fotoUrlNueva } : {}),
      orden: data.orden,
    })
    .where(
      and(eq(profesionales.id, id), eq(profesionales.salonId, salon.id)),
    );

  revalidatePath('/panel/config/equipo');
  revalidatePath('/panel/config/reservas');
  revalidarWebPublica(salon.slug);
  redirect('/panel/config/equipo');
}

export async function toggleProfesionalActivo(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (!id) {
    redirect(
      '/panel/config/equipo?error=' + encodeURIComponent('ID inválido'),
    );
  }

  const salon = await requireSalon();

  const [existente] = await db
    .select({
      id: profesionales.id,
      salonId: profesionales.salonId,
      activo: profesionales.activo,
    })
    .from(profesionales)
    .where(eq(profesionales.id, id))
    .limit(1);

  if (!existente || existente.salonId !== salon.id) {
    redirect(
      '/panel/config/equipo?error=' + encodeURIComponent('No autorizado'),
    );
  }

  await db
    .update(profesionales)
    .set({ activo: !existente.activo })
    .where(
      and(eq(profesionales.id, id), eq(profesionales.salonId, salon.id)),
    );

  revalidatePath('/panel/config/equipo');
  revalidatePath('/panel/config/reservas');
  revalidarWebPublica(salon.slug);
}

export async function eliminarProfesional(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (!id) {
    redirect(
      '/panel/config/equipo?error=' + encodeURIComponent('ID inválido'),
    );
  }

  const salon = await requireSalon();

  const [existente] = await db
    .select({
      id: profesionales.id,
      salonId: profesionales.salonId,
      fotoUrl: profesionales.fotoUrl,
    })
    .from(profesionales)
    .where(eq(profesionales.id, id))
    .limit(1);

  if (!existente || existente.salonId !== salon.id) {
    redirect(
      '/panel/config/equipo?error=' + encodeURIComponent('No autorizado'),
    );
  }

  try {
    await db
      .delete(profesionales)
      .where(
        and(eq(profesionales.id, id), eq(profesionales.salonId, salon.id)),
      );
    // Borramos foto del Storage solo si la BD eliminó OK.
    await borrarFotoSiPropia(salon.id, existente.fotoUrl);
  } catch {
    redirect(
      '/panel/config/equipo?error=' +
        encodeURIComponent(
          'No se puede eliminar: tiene citas asociadas. Considera desactivarlo.',
        ),
    );
  }

  revalidatePath('/panel/config/equipo');
  revalidatePath('/panel/config/reservas');
  revalidarWebPublica(salon.slug);
}
