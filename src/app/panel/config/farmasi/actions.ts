'use server';

import { db } from '@/lib/db';
import { salones } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

type CurrentSalon = { id: string; slug: string } | null;

const FARMASI_PATH = '/panel/config/farmasi';
const HOY_PATH = '/panel/hoy';

/**
 * Mismo formato que `salones_farmasi_username_check` en BD: alfanumérico,
 * guiones bajos y medios, 3-50 chars. Lo validamos en backend para no
 * confiar en el HTML5 pattern.
 */
const USERNAME_RE = /^[a-zA-Z0-9_-]{3,50}$/;

async function requireSalon(): Promise<{ id: string; slug: string }> {
  const salon = (await getCurrentSalon()) as CurrentSalon;
  if (!salon || !salon.id || !salon.slug) {
    redirect(
      `${FARMASI_PATH}?error=${encodeURIComponent('No se pudo identificar el salón')}`,
    );
  }
  return { id: salon.id, slug: salon.slug };
}

function redirectError(msg: string): never {
  redirect(`${FARMASI_PATH}?error=${encodeURIComponent(msg)}`);
}

function isRedirectError(e: unknown): boolean {
  return (
    e instanceof Error &&
    typeof e.message === 'string' &&
    e.message.startsWith('NEXT_REDIRECT')
  );
}

/**
 * Activa o actualiza la tienda Farmasi del salón.
 * El username es el alias del salón en farmasi.es (ej. "juanjose" para la
 * URL `https://www.farmasi.es/juanjose`). El salón ya debe haberse dado
 * de alta como BI bajo el sponsor de Marlon.
 */
export async function activarFarmasi(formData: FormData) {
  const salon = await requireSalon();

  const usernameRaw = String(formData.get('farmasi_username') || '').trim();

  if (!usernameRaw) {
    redirectError('Pega tu nombre de usuario de Farmasi');
  }

  if (!USERNAME_RE.test(usernameRaw)) {
    redirectError(
      'El usuario solo puede tener letras, números, guiones y guiones bajos (3-50 caracteres)',
    );
  }

  try {
    const result = await db
      .update(salones)
      .set({
        farmasiUsername: usernameRaw,
        farmasiActivadoAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(salones.id, salon.id))
      .returning({ id: salones.id });

    if (result.length === 0) {
      redirectError('No autorizado');
    }
  } catch (e) {
    if (isRedirectError(e)) throw e;
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    redirectError(msg);
  }

  revalidatePath(FARMASI_PATH);
  revalidatePath(`/s/${salon.slug}`);
  redirect(`${FARMASI_PATH}?ok=1`);
}

/**
 * Desactiva la tienda Farmasi del salón. El botón "Visitar tienda" del
 * banner público desaparece y deja de promocionarse en el panel.
 */
export async function desactivarFarmasi() {
  const salon = await requireSalon();

  try {
    await db
      .update(salones)
      .set({
        farmasiUsername: null,
        farmasiActivadoAt: null,
        updatedAt: new Date(),
      })
      .where(eq(salones.id, salon.id));
  } catch (e) {
    if (isRedirectError(e)) throw e;
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    redirectError(msg);
  }

  revalidatePath(FARMASI_PATH);
  revalidatePath(`/s/${salon.slug}`);
  redirect(`${FARMASI_PATH}?ok=1`);
}

/**
 * Marca el banner promocional Farmasi como descartado en config_json del
 * salón para que no vuelva a aparecer en /panel/hoy. Usa jsonb_set para
 * fusionar la clave sin pisar otros valores.
 */
export async function descartarBannerFarmasi() {
  const salon = await requireSalon();

  try {
    await db
      .update(salones)
      .set({
        configJson: sql`jsonb_set(coalesce(${salones.configJson}, '{}'::jsonb), '{farmasiBannerDismissed}', 'true'::jsonb, true)`,
        updatedAt: new Date(),
      })
      .where(eq(salones.id, salon.id));
  } catch (e) {
    if (isRedirectError(e)) throw e;
  }

  revalidatePath(HOY_PATH);
  redirect(HOY_PATH);
}
