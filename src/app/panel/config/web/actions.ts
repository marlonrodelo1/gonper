'use server';

import { db } from '@/lib/db';
import { salones } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { createAdminClient } from '@/lib/supabase/admin';
import { eq } from 'drizzle-orm';
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

const LIMITES_BYTES: Record<'logo' | 'banner', number> = {
  logo: 2 * 1024 * 1024, // 2 MB
  banner: 5 * 1024 * 1024, // 5 MB
};

function extDeMime(mime: string): string {
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/avif') return 'avif';
  return 'bin';
}

async function requireSalon(): Promise<{ id: string; slug: string | null }> {
  const salon = (await getCurrentSalon()) as CurrentSalon;
  if (!salon || !salon.id) {
    redirect(
      '/panel/config/web?error=' +
        encodeURIComponent('No se pudo identificar el salón'),
    );
  }
  return { id: salon.id, slug: salon.slug ?? null };
}

function redirectError(msg: string): never {
  redirect('/panel/config/web?error=' + encodeURIComponent(msg));
}

function revalidarWebPublica(slug: string | null) {
  if (slug) revalidatePath(`/s/${slug}`);
}

/**
 * Sube logo o banner del salón a Supabase Storage (bucket público
 * `salon-assets`) y guarda la URL en `salones.{logo_url|banner_url}`.
 *
 * Validación:
 *  - tipo MIME debe ser imagen permitida
 *  - tamaño máx 2 MB (logo) / 5 MB (banner)
 *  - el archivo no puede estar vacío
 *
 * Path en bucket: `{salon_id}/{tipo}-{timestamp}.{ext}` para evitar
 * caché stale entre subidas y permitir purga futura por salón.
 */
export async function subirAssetSalon(formData: FormData) {
  const salon = await requireSalon();

  const tipoRaw = String(formData.get('tipo') || '');
  if (tipoRaw !== 'logo' && tipoRaw !== 'banner') {
    redirectError('Tipo inválido (logo o banner)');
  }
  const tipo = tipoRaw as 'logo' | 'banner';

  const file = formData.get('archivo');
  if (!(file instanceof File) || file.size === 0) {
    redirectError('Selecciona un archivo de imagen');
  }
  if (!MIME_PERMITIDOS.has(file.type)) {
    redirectError(
      'Formato no permitido. Usa JPG, PNG, WEBP o AVIF.',
    );
  }
  if (file.size > LIMITES_BYTES[tipo]) {
    const maxMb = LIMITES_BYTES[tipo] / (1024 * 1024);
    redirectError(
      `Imagen demasiado grande (máx. ${maxMb} MB para ${tipo})`,
    );
  }

  const ext = extDeMime(file.type);
  const path = `${salon.id}/${tipo}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const admin = createAdminClient();
  const upload = await admin.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (upload.error) {
    redirectError('Error subiendo archivo: ' + upload.error.message);
  }

  const { data: urlPub } = admin.storage.from(BUCKET).getPublicUrl(path);
  const url = urlPub.publicUrl;
  if (!url) {
    redirectError('No se pudo obtener la URL pública');
  }

  // Borramos el anterior (si lo hay) para no acumular basura.
  const [salonRow] = await db
    .select({ logoUrl: salones.logoUrl, bannerUrl: salones.bannerUrl })
    .from(salones)
    .where(eq(salones.id, salon.id))
    .limit(1);

  const anterior = tipo === 'logo' ? salonRow?.logoUrl : salonRow?.bannerUrl;
  if (anterior) {
    const prevPath = anterior.split(`/${BUCKET}/`)[1];
    if (prevPath && prevPath.startsWith(`${salon.id}/`)) {
      await admin.storage.from(BUCKET).remove([prevPath]).catch(() => {});
    }
  }

  await db
    .update(salones)
    .set(tipo === 'logo' ? { logoUrl: url } : { bannerUrl: url })
    .where(eq(salones.id, salon.id));

  revalidatePath('/panel/config/web');
  revalidatePath('/panel/config/reservas');
  revalidarWebPublica(salon.slug);
  redirect('/panel/config/web?ok=1');
}

export async function eliminarAssetSalon(formData: FormData) {
  const tipoRaw = String(formData.get('tipo') || '');
  if (tipoRaw !== 'logo' && tipoRaw !== 'banner') {
    redirectError('Tipo inválido');
  }
  const tipo = tipoRaw as 'logo' | 'banner';

  const salon = await requireSalon();
  const admin = createAdminClient();

  const [salonRow] = await db
    .select({ logoUrl: salones.logoUrl, bannerUrl: salones.bannerUrl })
    .from(salones)
    .where(eq(salones.id, salon.id))
    .limit(1);

  const actual = tipo === 'logo' ? salonRow?.logoUrl : salonRow?.bannerUrl;
  if (actual) {
    const prevPath = actual.split(`/${BUCKET}/`)[1];
    if (prevPath && prevPath.startsWith(`${salon.id}/`)) {
      await admin.storage.from(BUCKET).remove([prevPath]).catch(() => {});
    }
  }

  await db
    .update(salones)
    .set(tipo === 'logo' ? { logoUrl: null } : { bannerUrl: null })
    .where(eq(salones.id, salon.id));

  revalidatePath('/panel/config/web');
  revalidatePath('/panel/config/reservas');
  revalidarWebPublica(salon.slug);
  redirect('/panel/config/web?ok=1');
}
