'use server';

import { db } from '@/lib/db';
import { cierres } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

type CurrentSalon = { id: string } | null;

async function requireSalon(): Promise<{ id: string }> {
  const salon = (await getCurrentSalon()) as CurrentSalon;
  if (!salon || !salon.id) {
    redirect(
      '/panel/config/cierres?error=' +
        encodeURIComponent('No se pudo identificar el salón'),
    );
  }
  return salon;
}

function redirectError(msg: string): never {
  redirect('/panel/config/cierres?error=' + encodeURIComponent(msg));
}

function parseFecha(v: FormDataEntryValue | null): Date | null {
  if (typeof v !== 'string' || v.trim() === '') return null;
  // datetime-local llega como 'YYYY-MM-DDTHH:mm'
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function agregarCierre(formData: FormData) {
  const salon = await requireSalon();

  const inicio = parseFecha(formData.get('fecha_inicio'));
  const fin = parseFecha(formData.get('fecha_fin'));
  const motivoRaw = String(formData.get('motivo') || '').trim();
  const motivo = motivoRaw === '' ? null : motivoRaw;

  if (!inicio) redirectError('Fecha de inicio inválida');
  if (!fin) redirectError('Fecha de fin inválida');
  if (fin <= inicio) {
    redirectError('La fecha de fin debe ser posterior a la de inicio');
  }
  if (motivo && motivo.length > 200) {
    redirectError('El motivo no puede superar los 200 caracteres');
  }

  await db.insert(cierres).values({
    salonId: salon.id,
    fechaInicio: inicio,
    fechaFin: fin,
    motivo,
  });

  revalidatePath('/panel/config/cierres');
  redirect('/panel/config/cierres');
}

export async function eliminarCierre(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (!id) redirectError('ID inválido');

  const salon = await requireSalon();

  const [existente] = await db
    .select({ id: cierres.id, salonId: cierres.salonId })
    .from(cierres)
    .where(eq(cierres.id, id))
    .limit(1);

  if (!existente || existente.salonId !== salon.id) {
    redirectError('No autorizado');
  }

  await db
    .delete(cierres)
    .where(and(eq(cierres.id, id), eq(cierres.salonId, salon.id)));

  revalidatePath('/panel/config/cierres');
}
