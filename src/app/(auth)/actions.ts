'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function login(formData: FormData) {
  const email = String(formData.get('email') || '');
  const password = String(formData.get('password') || '');
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath('/', 'layout');
  redirect('/panel/hoy');
}

export async function signup(formData: FormData) {
  const email = String(formData.get('email') || '');
  const password = String(formData.get('password') || '');
  const salonNombre = String(formData.get('salon_nombre') || '').trim();
  const salonSlug = String(formData.get('salon_slug') || '').trim().toLowerCase();
  const tipoNegocio = String(formData.get('tipo_negocio') || 'otro');

  if (!email || !password || password.length < 8) {
    redirect('/signup?error=' + encodeURIComponent('Email y password (mín 8 chars) requeridos'));
  }
  if (!salonNombre || !salonSlug) {
    redirect('/signup?error=' + encodeURIComponent('Nombre y slug del salón requeridos'));
  }
  if (!/^[a-z0-9-]+$/.test(salonSlug)) {
    redirect('/signup?error=' + encodeURIComponent('Slug solo puede contener a-z, 0-9 y guiones'));
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
  if (authError || !authData.user) {
    redirect('/signup?error=' + encodeURIComponent(authError?.message || 'Error al registrar'));
  }

  const admin = createAdminClient();
  const { data: salon, error: salonError } = await admin
    .from('salones')
    .insert({
      slug: salonSlug,
      nombre: salonNombre,
      tipo_negocio: tipoNegocio,
      plan: 'trial',
      trial_until: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (salonError) {
    redirect('/signup?error=' + encodeURIComponent('Error creando salón: ' + salonError.message));
  }

  const { error: linkError } = await admin
    .from('usuarios_salon')
    .insert({ salon_id: salon.id, auth_user_id: authData.user.id, rol: 'dueno' });

  if (linkError) {
    redirect('/signup?error=' + encodeURIComponent('Error vinculando user: ' + linkError.message));
  }

  revalidatePath('/', 'layout');
  redirect('/panel/hoy');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}
