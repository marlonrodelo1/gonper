'use server';

import { db } from '@/lib/db';
import { profesionales } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

type CurrentSalon = { id: string; slug?: string } | null;

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function errorRedirect(id: string | null, msg: string): never {
  const url = `/panel/config/equipo/${id ? id + '/editar' : 'nuevo'}?error=${encodeURIComponent(msg)}`;
  redirect(url);
}

function parseFormData(formData: FormData) {
  const nombre = String(formData.get('nombre') || '').trim();
  const colorHexRaw = String(formData.get('color_hex') || '').trim();
  const colorHex = HEX_RE.test(colorHexRaw) ? colorHexRaw : '#3b82f6';
  const fotoUrlRaw = String(formData.get('foto_url') || '').trim();
  const fotoUrl = fotoUrlRaw === '' ? null : fotoUrlRaw;
  const ordenRaw = formData.get('orden');
  const ordenNum = ordenRaw == null ? 0 : Number(ordenRaw);
  const orden =
    Number.isFinite(ordenNum) && Number.isInteger(ordenNum) ? ordenNum : 0;
  return { nombre, colorHex, fotoUrl, orden };
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

  await db.insert(profesionales).values({
    salonId: salon.id,
    nombre: data.nombre,
    colorHex: data.colorHex,
    fotoUrl: data.fotoUrl,
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
    .select({ id: profesionales.id, salonId: profesionales.salonId })
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
    .set({
      nombre: data.nombre,
      colorHex: data.colorHex,
      fotoUrl: data.fotoUrl,
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
    .select({ id: profesionales.id, salonId: profesionales.salonId })
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
