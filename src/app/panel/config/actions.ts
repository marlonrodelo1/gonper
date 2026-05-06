'use server';

import { db } from '@/lib/db';
import { salones } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { createAdminClient } from '@/lib/supabase/admin';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

type CurrentSalon = { id: string; slug?: string } | null;

const TIPOS_NEGOCIO = ['barberia', 'peluqueria', 'estetica', 'manicura', 'otro'] as const;
const TIMEZONES = [
  'Europe/Madrid',
  'Atlantic/Canary',
  'Europe/Lisbon',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Rome',
  'Europe/Amsterdam',
] as const;
const GENEROS = ['femenino', 'masculino', 'neutro'] as const;
const TONOS = ['profesional', 'cercano', 'desenfadado'] as const;

async function requireSalon(): Promise<{ id: string; slug: string | null }> {
  const salon = (await getCurrentSalon()) as CurrentSalon;
  if (!salon || !salon.id) {
    redirect(
      '/panel/config?error=' + encodeURIComponent('No se pudo identificar el salón'),
    );
  }
  return { id: salon.id, slug: salon.slug ?? null };
}

function revalidarWebPublica(slug: string | null) {
  if (slug) revalidatePath(`/s/${slug}`);
}

function redirectError(path: string, msg: string): never {
  redirect(`${path}?error=${encodeURIComponent(msg)}`);
}

export async function actualizarDatosSalon(formData: FormData) {
  const salon = await requireSalon();

  const nombre = String(formData.get('nombre') || '').trim();
  const tipoNegocio = String(formData.get('tipo_negocio') || '').trim();
  const direccionRaw = String(formData.get('direccion') || '').trim();
  const telefonoRaw = String(formData.get('telefono') || '').trim();
  const emailRaw = String(formData.get('email') || '').trim();
  const timezoneRaw = String(formData.get('timezone') || '').trim();

  if (!nombre || nombre.length > 120) {
    redirectError('/panel/config', 'El nombre es obligatorio (máx. 120 caracteres)');
  }
  if (!TIPOS_NEGOCIO.includes(tipoNegocio as (typeof TIPOS_NEGOCIO)[number])) {
    redirectError('/panel/config', 'Tipo de negocio inválido');
  }

  const timezone = TIMEZONES.includes(timezoneRaw as (typeof TIMEZONES)[number])
    ? timezoneRaw
    : 'Europe/Madrid';

  try {
    const result = await db
      .update(salones)
      .set({
        nombre,
        tipoNegocio,
        direccion: direccionRaw === '' ? null : direccionRaw,
        telefono: telefonoRaw === '' ? null : telefonoRaw,
        email: emailRaw === '' ? null : emailRaw,
        timezone,
        updatedAt: new Date(),
      })
      .where(eq(salones.id, salon.id))
      .returning({ id: salones.id });

    if (result.length === 0) {
      redirectError('/panel/config', 'No autorizado');
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    redirectError('/panel/config', msg);
  }

  revalidatePath('/panel/config');
  revalidatePath('/panel/config/reservas');
  revalidatePath('/panel', 'layout');
  revalidarWebPublica(salon.slug);
  redirect('/panel/config?ok=1');
}

const AVATAR_BUCKET = 'salon-assets';
const AVATAR_MIME_OK = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif']);
const AVATAR_MAX_BYTES = 3 * 1024 * 1024; // 3 MB

const INSTRUCCIONES_MAX = 1500;
const BIENVENIDA_MAX = 280;

function avatarExt(mime: string): string {
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/avif') return 'avif';
  return 'bin';
}

function pathFromAssetUrl(url: string): string | null {
  const marker = `/${AVATAR_BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  return url.slice(i + marker.length);
}

async function subirAvatarAgente(salonId: string, file: File): Promise<string> {
  if (!AVATAR_MIME_OK.has(file.type)) {
    redirectError('/panel/config/agente', 'Imagen no válida (usa JPG, PNG, WEBP o AVIF)');
  }
  if (file.size > AVATAR_MAX_BYTES) {
    redirectError('/panel/config/agente', 'La imagen del avatar debe pesar menos de 3 MB');
  }
  const path = `${salonId}/agente/avatar-${Date.now()}.${avatarExt(file.type)}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const admin = createAdminClient();
  const upload = await admin.storage.from(AVATAR_BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (upload.error) {
    redirectError('/panel/config/agente', 'Error subiendo avatar: ' + upload.error.message);
  }
  const { data } = admin.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  if (!data.publicUrl) {
    redirectError('/panel/config/agente', 'No se pudo obtener URL del avatar');
  }
  return data.publicUrl;
}

export async function actualizarAgente(formData: FormData) {
  const salon = await requireSalon();

  const agenteNombre = String(formData.get('agente_nombre') || '').trim();
  const agenteGenero = String(formData.get('agente_genero') || '').trim();
  const agenteTono = String(formData.get('agente_tono') || '').trim();
  const bienvenidaRaw = String(formData.get('agente_bienvenida') || '').trim();
  const instruccionesRaw = String(formData.get('agente_instrucciones') || '').trim();
  const eliminarAvatar = formData.get('eliminar_avatar') === 'on';

  if (!agenteNombre || agenteNombre.length > 60) {
    redirectError(
      '/panel/config/agente',
      'El nombre del agente es obligatorio (máx. 60 caracteres)',
    );
  }
  if (!GENEROS.includes(agenteGenero as (typeof GENEROS)[number])) {
    redirectError('/panel/config/agente', 'Género inválido');
  }
  if (!TONOS.includes(agenteTono as (typeof TONOS)[number])) {
    redirectError('/panel/config/agente', 'Tono inválido');
  }
  if (bienvenidaRaw.length > BIENVENIDA_MAX) {
    redirectError(
      '/panel/config/agente',
      `El mensaje de bienvenida no puede superar ${BIENVENIDA_MAX} caracteres`,
    );
  }
  if (instruccionesRaw.length > INSTRUCCIONES_MAX) {
    redirectError(
      '/panel/config/agente',
      `Las instrucciones no pueden superar ${INSTRUCCIONES_MAX} caracteres`,
    );
  }

  // Avatar: subir nuevo, eliminar, o mantener
  let avatarUrlUpdate: string | null | undefined = undefined;

  // Estado actual para borrar archivo viejo si lo cambiamos/quitamos
  const [actual] = await db
    .select({ avatarActual: salones.agenteAvatarUrl })
    .from(salones)
    .where(eq(salones.id, salon.id))
    .limit(1);

  const avatarFile = formData.get('agente_avatar');
  if (avatarFile instanceof File && avatarFile.size > 0) {
    const url = await subirAvatarAgente(salon.id, avatarFile);
    avatarUrlUpdate = url;
    if (actual?.avatarActual) {
      const prevPath = pathFromAssetUrl(actual.avatarActual);
      if (prevPath && prevPath.startsWith(`${salon.id}/`)) {
        const admin = createAdminClient();
        await admin.storage.from(AVATAR_BUCKET).remove([prevPath]).catch(() => {});
      }
    }
  } else if (eliminarAvatar && actual?.avatarActual) {
    const prevPath = pathFromAssetUrl(actual.avatarActual);
    if (prevPath && prevPath.startsWith(`${salon.id}/`)) {
      const admin = createAdminClient();
      await admin.storage.from(AVATAR_BUCKET).remove([prevPath]).catch(() => {});
    }
    avatarUrlUpdate = null;
  }

  try {
    const result = await db
      .update(salones)
      .set({
        agenteNombre,
        agenteGenero,
        agenteTono,
        agenteBienvenida: bienvenidaRaw === '' ? null : bienvenidaRaw,
        agenteInstrucciones: instruccionesRaw === '' ? null : instruccionesRaw,
        ...(avatarUrlUpdate !== undefined ? { agenteAvatarUrl: avatarUrlUpdate } : {}),
        updatedAt: new Date(),
      })
      .where(eq(salones.id, salon.id))
      .returning({ id: salones.id });

    if (result.length === 0) {
      redirectError('/panel/config/agente', 'No autorizado');
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    redirectError('/panel/config/agente', msg);
  }

  revalidatePath('/panel/config/agente');
  revalidatePath('/panel', 'layout');
  revalidarWebPublica(salon.slug);
  redirect('/panel/config/agente?ok=1');
}
