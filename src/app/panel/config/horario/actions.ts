'use server';

import { db } from '@/lib/db';
import { horarios } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

type CurrentSalon = { id: string; slug?: string } | null;

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

async function requireSalon(): Promise<{ id: string; slug: string | null }> {
  const salon = (await getCurrentSalon()) as CurrentSalon;
  if (!salon || !salon.id) {
    redirect(
      '/panel/config/horario?error=' +
        encodeURIComponent('No se pudo identificar el salón'),
    );
  }
  return { id: salon.id, slug: salon.slug ?? null };
}

function revalidarWebPublica(slug: string | null) {
  if (slug) revalidatePath(`/s/${slug}`);
}

function redirectError(msg: string): never {
  redirect('/panel/config/horario?error=' + encodeURIComponent(msg));
}

export async function agregarTramo(formData: FormData) {
  const salon = await requireSalon();

  const diaRaw = formData.get('dia_semana');
  const inicio = String(formData.get('inicio') || '').trim();
  const fin = String(formData.get('fin') || '').trim();

  const diaNum = Number(diaRaw);
  if (!Number.isInteger(diaNum) || diaNum < 0 || diaNum > 6) {
    redirectError('Día de la semana inválido');
  }
  if (!TIME_RE.test(inicio) || !TIME_RE.test(fin)) {
    redirectError('Horas inválidas (formato HH:mm)');
  }
  if (fin <= inicio) {
    redirectError('La hora de fin debe ser posterior a la de inicio');
  }

  // Drizzle `time` espera 'HH:mm:ss' o 'HH:mm'
  const inicioVal = `${inicio}:00`;
  const finVal = `${fin}:00`;

  await db.insert(horarios).values({
    salonId: salon.id,
    diaSemana: diaNum,
    inicio: inicioVal,
    fin: finVal,
  });

  revalidatePath('/panel/config/horario');
  revalidatePath('/panel/config/reservas');
  revalidarWebPublica(salon.slug);
  redirect('/panel/config/horario');
}

export async function eliminarTramo(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (!id) redirectError('ID inválido');

  const salon = await requireSalon();

  const [existente] = await db
    .select({ id: horarios.id, salonId: horarios.salonId })
    .from(horarios)
    .where(eq(horarios.id, id))
    .limit(1);

  if (!existente || existente.salonId !== salon.id) {
    redirectError('No autorizado');
  }

  await db
    .delete(horarios)
    .where(and(eq(horarios.id, id), eq(horarios.salonId, salon.id)));

  revalidatePath('/panel/config/horario');
  revalidatePath('/panel/config/reservas');
  revalidarWebPublica(salon.slug);
}
