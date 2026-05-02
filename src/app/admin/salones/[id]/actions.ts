'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { db } from '@/lib/db';
import { salones } from '@/lib/db/schema';
import { createAdminClient } from '@/lib/supabase/admin';

function revalidateSalon(id: string) {
  revalidatePath('/admin/salones');
  revalidatePath(`/admin/salones/${id}`);
}

export async function suspenderSalon(formData: FormData) {
  await requireSuperAdmin();
  const id = String(formData.get('salonId') ?? '');
  if (!id) return;
  await db.update(salones).set({ activo: false }).where(eq(salones.id, id));
  revalidateSalon(id);
}

export async function reactivarSalon(formData: FormData) {
  await requireSuperAdmin();
  const id = String(formData.get('salonId') ?? '');
  if (!id) return;
  await db.update(salones).set({ activo: true }).where(eq(salones.id, id));
  revalidateSalon(id);
}

export async function forzarPlanBasico(formData: FormData) {
  await requireSuperAdmin();
  const id = String(formData.get('salonId') ?? '');
  if (!id) return;
  await db
    .update(salones)
    .set({ plan: 'basico', trialUntil: null })
    .where(eq(salones.id, id));
  revalidateSalon(id);
}

export async function cancelarSuscripcion(formData: FormData) {
  await requireSuperAdmin();
  const id = String(formData.get('salonId') ?? '');
  if (!id) return;
  await db
    .update(salones)
    .set({ plan: 'cancelado' })
    .where(eq(salones.id, id));
  revalidateSalon(id);
}

export async function borrarSalon(formData: FormData) {
  await requireSuperAdmin();
  const id = String(formData.get('salonId') ?? '');
  if (!id) return;

  // Usamos admin client para asegurar que el cascade funciona y saltar RLS.
  const admin = createAdminClient();
  const { error } = await admin.from('salones').delete().eq('id', id);
  if (error) {
    redirect(
      `/admin/salones/${id}?error=` +
        encodeURIComponent('No se pudo borrar: ' + error.message),
    );
  }
  revalidatePath('/admin/salones');
  redirect('/admin/salones');
}
