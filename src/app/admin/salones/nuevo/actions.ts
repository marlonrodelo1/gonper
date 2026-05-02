'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { createAdminClient } from '@/lib/supabase/admin';

const schema = z.object({
  nombre: z.string().min(1, 'Nombre requerido').max(120),
  slug: z
    .string()
    .min(1, 'Slug requerido')
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Slug solo a-z, 0-9 y guiones'),
  tipo_negocio: z.enum(['barberia', 'peluqueria', 'estetica', 'manicura', 'otro']),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Password mínimo 8 caracteres'),
  agente_nombre: z.string().min(1).max(60),
});

export async function crearSalonManual(formData: FormData) {
  await requireSuperAdmin();

  const raw = {
    nombre: String(formData.get('nombre') ?? '').trim(),
    slug: String(formData.get('slug') ?? '').trim().toLowerCase(),
    tipo_negocio: String(formData.get('tipo_negocio') ?? 'otro'),
    email: String(formData.get('email') ?? '').trim().toLowerCase(),
    password: String(formData.get('password') ?? ''),
    agente_nombre: String(formData.get('agente_nombre') ?? 'Juanita').trim(),
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Datos inválidos';
    redirect('/admin/salones/nuevo?error=' + encodeURIComponent(msg));
  }
  const data = parsed.data;

  const admin = createAdminClient();

  // 1. Crear user en Supabase auth
  const { data: created, error: authError } = await admin.auth.admin.createUser(
    {
      email: data.email,
      password: data.password,
      email_confirm: true,
    },
  );
  if (authError || !created.user) {
    redirect(
      '/admin/salones/nuevo?error=' +
        encodeURIComponent(
          'Error creando usuario: ' + (authError?.message ?? 'desconocido'),
        ),
    );
  }
  const authUserId = created.user.id;

  // 2. Insertar salón
  const trialUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: salon, error: salonError } = await admin
    .from('salones')
    .insert({
      slug: data.slug,
      nombre: data.nombre,
      tipo_negocio: data.tipo_negocio,
      plan: 'trial',
      trial_until: trialUntil,
      agente_nombre: data.agente_nombre,
    })
    .select('id')
    .single();

  if (salonError || !salon) {
    // rollback user
    await admin.auth.admin.deleteUser(authUserId).catch(() => {});
    redirect(
      '/admin/salones/nuevo?error=' +
        encodeURIComponent(
          'Error creando salón: ' + (salonError?.message ?? 'desconocido'),
        ),
    );
  }

  // 3. Vincular dueño
  const { error: linkError } = await admin
    .from('usuarios_salon')
    .insert({ salon_id: salon.id, auth_user_id: authUserId, rol: 'dueno' });

  if (linkError) {
    // rollback salón + user
    await admin.from('salones').delete().eq('id', salon.id).then(() => {});
    await admin.auth.admin.deleteUser(authUserId).catch(() => {});
    redirect(
      '/admin/salones/nuevo?error=' +
        encodeURIComponent('Error vinculando dueño: ' + linkError.message),
    );
  }

  revalidatePath('/admin/salones');
  redirect(`/admin/salones/${salon.id}`);
}
