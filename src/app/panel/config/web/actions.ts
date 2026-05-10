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

/**
 * Toggle de visibilidad en el marketplace público (`/marketplace`).
 * Cuando está OFF el salón sigue funcionando con su web pública en
 * `/s/[slug]`, pero no aparece listado en el marketplace.
 */
export async function toggleMarketplaceVisible(formData: FormData) {
  const salon = await requireSalon();
  const visibleRaw = String(formData.get('visible') || 'false');
  const visible = visibleRaw === 'true';

  await db
    .update(salones)
    .set({ marketplaceVisible: visible })
    .where(eq(salones.id, salon.id));

  revalidatePath('/panel/config/web');
  revalidatePath('/marketplace');
  redirect('/panel/config/web?ok=1');
}

/**
 * Actualiza los datos públicos del salón usados por el marketplace:
 * dirección + geocoding (ciudad/provincia/lat/lng vía OpenStreetMap) y
 * descripción corta. Los campos de geocoding los rellena el componente
 * `<AddressAutocomplete />` cuando el dueño elige una sugerencia.
 */
export async function actualizarDatosMarketplace(formData: FormData) {
  const salon = await requireSalon();
  const direccionRaw = String(formData.get('direccion') || '').trim();
  const direccionFormateadaRaw = String(
    formData.get('direccion_formateada') || '',
  ).trim();
  const ciudadRaw = String(formData.get('ciudad') || '').trim();
  const provinciaRaw = String(formData.get('provincia') || '').trim();
  const descripcionRaw = String(formData.get('descripcion_corta') || '').trim();
  const latRaw = String(formData.get('lat') || '').trim();
  const lngRaw = String(formData.get('lng') || '').trim();
  const osmPlaceIdRaw = String(formData.get('osm_place_id') || '').trim();

  if (descripcionRaw.length > 160) {
    redirectError('La descripción corta no puede pasar de 160 caracteres');
  }

  // Validar que lat/lng son numéricas y están en rango si vienen.
  let lat: string | null = null;
  let lng: string | null = null;
  if (latRaw && lngRaw) {
    const latNum = Number(latRaw);
    const lngNum = Number(lngRaw);
    if (
      !Number.isFinite(latNum) ||
      !Number.isFinite(lngNum) ||
      latNum < -90 ||
      latNum > 90 ||
      lngNum < -180 ||
      lngNum > 180
    ) {
      redirectError('Coordenadas inválidas');
    }
    lat = latNum.toFixed(7);
    lng = lngNum.toFixed(7);
  }

  await db
    .update(salones)
    .set({
      direccion: direccionRaw || null,
      direccionFormateada: direccionFormateadaRaw || null,
      ciudad: ciudadRaw || null,
      provincia: provinciaRaw || null,
      descripcionCorta: descripcionRaw || null,
      lat,
      lng,
      osmPlaceId: osmPlaceIdRaw || null,
    })
    .where(eq(salones.id, salon.id));

  revalidatePath('/panel/config/web');
  revalidatePath('/marketplace');
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
