'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { enviarEmailBienvenida } from '@/lib/email/resend';
import { checkRateLimit } from '@/lib/api/rate-limit';
import {
  HORARIOS_DEFAULT,
  SERVICIOS_POR_TIPO,
} from '@/lib/admin/salon-seeds';

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

  // Rate limit por IP: máximo 5 signups/día/IP. Bloquea creación masiva
  // de cuentas falsas (alguien intentando saturar Supabase auth o crear
  // miles de salones).
  const hForRl = await headers();
  const ipForRl = (hForRl.get('x-forwarded-for') || '')
    .split(',')[0]
    ?.trim() || hForRl.get('x-real-ip') || 'unknown';
  const rl = await checkRateLimit('ip', `signup:${ipForRl}`, 5);
  if (!rl.ok) {
    redirect(
      '/signup?error=' +
        encodeURIComponent(
          'Demasiados intentos hoy desde tu conexión. Vuelve mañana.',
        ),
    );
  }

  const admin = createAdminClient();

  // 1. Crear usuario YA confirmado vía admin (no depende de email confirmation).
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    const msg = createError?.message || 'Error al registrar';
    if (msg.toLowerCase().includes('already')) {
      redirect('/signup?error=' + encodeURIComponent('Ya existe una cuenta con ese email. Inicia sesión.'));
    }
    redirect('/signup?error=' + encodeURIComponent(msg));
  }
  const newUser = created.user;

  // 2. Verificar slug libre antes de crear el salón (mejor mensaje al usuario).
  const { data: existingSlug } = await admin
    .from('salones')
    .select('id')
    .eq('slug', salonSlug)
    .maybeSingle();
  if (existingSlug) {
    // Limpieza: borrar el user recién creado si el slug colisiona.
    await admin.auth.admin.deleteUser(newUser.id).catch(() => {});
    redirect('/signup?error=' + encodeURIComponent(`El slug "${salonSlug}" ya está en uso. Prueba con otro.`));
  }

  // 3. Crear el salón con trial de 7 días sin tarjeta. Se accede al panel
  // inmediatamente; el upgrade a Stripe se hace desde /panel/config/suscripcion.
  const trialUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: salon, error: salonError } = await admin
    .from('salones')
    .insert({
      slug: salonSlug,
      nombre: salonNombre,
      tipo_negocio: tipoNegocio,
      email,
      plan: 'trial',
      trial_until: trialUntil,
    })
    .select()
    .single();

  if (salonError || !salon) {
    await admin.auth.admin.deleteUser(newUser.id).catch(() => {});
    redirect('/signup?error=' + encodeURIComponent('Error creando salón: ' + (salonError?.message || 'desconocido')));
  }

  // 4. Vincular user con el salón.
  const { error: linkError } = await admin
    .from('usuarios_salon')
    .insert({ salon_id: salon.id, auth_user_id: newUser.id, rol: 'dueno' });

  if (linkError) {
    redirect('/signup?error=' + encodeURIComponent('Error vinculando user: ' + linkError.message));
  }

  // 5. Iniciar sesión inmediatamente y redirigir al panel.
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    redirect('/login?error=' + encodeURIComponent('Cuenta creada. Inicia sesión.'));
  }

  // ----- Seeds: servicios, horarios, profesional (no abortan si fallan) -----
  try {
    const servicios = SERVICIOS_POR_TIPO[tipoNegocio] ?? SERVICIOS_POR_TIPO.otro;
    await admin.from('servicios').insert(
      servicios.map((s) => ({
        salon_id: salon.id,
        nombre: s.nombre,
        duracion_min: s.duracion_min,
        precio_eur: s.precio_eur,
        orden: s.orden,
        es_default: true,
      })),
    );
  } catch (err) {
    console.warn('[signup:seed] servicios:', err);
  }

  try {
    await admin.from('horarios').insert(
      HORARIOS_DEFAULT.map((h) => ({
        salon_id: salon.id,
        dia_semana: h.dia_semana,
        inicio: h.inicio,
        fin: h.fin,
        es_default: true,
      })),
    );
  } catch (err) {
    console.warn('[signup:seed] horarios:', err);
  }

  try {
    await admin.from('profesionales').insert({
      salon_id: salon.id,
      nombre: salonNombre,
      color_hex: '#8B9D7A',
      orden: 0,
      es_default: true,
    });
  } catch (err) {
    console.warn('[signup:seed] profesional:', err);
  }

  // ----- Email de bienvenida (no bloquea redirect) -----
  try {
    await enviarEmailBienvenida({ to: email, salonNombre, salonSlug });
  } catch (err) {
    console.warn('[signup:email]:', err);
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
