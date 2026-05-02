'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { enviarEmailBienvenida } from '@/lib/email/resend';

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

interface ServicioSeed {
  nombre: string;
  duracion_min: number;
  precio_eur: number;
  orden: number;
}

const SERVICIOS_POR_TIPO: Record<string, ServicioSeed[]> = {
  barberia: [
    { nombre: 'Corte de pelo', duracion_min: 30, precio_eur: 15, orden: 0 },
    { nombre: 'Corte + Barba', duracion_min: 45, precio_eur: 22, orden: 1 },
    { nombre: 'Arreglo de barba', duracion_min: 20, precio_eur: 10, orden: 2 },
  ],
  peluqueria: [
    { nombre: 'Corte mujer', duracion_min: 60, precio_eur: 30, orden: 0 },
    { nombre: 'Tinte', duracion_min: 90, precio_eur: 45, orden: 1 },
    { nombre: 'Mechas', duracion_min: 120, precio_eur: 60, orden: 2 },
  ],
  estetica: [
    { nombre: 'Limpieza facial', duracion_min: 60, precio_eur: 40, orden: 0 },
    { nombre: 'Masaje relajante', duracion_min: 60, precio_eur: 45, orden: 1 },
    { nombre: 'Depilación piernas', duracion_min: 45, precio_eur: 25, orden: 2 },
  ],
  manicura: [
    { nombre: 'Manicura básica', duracion_min: 45, precio_eur: 18, orden: 0 },
    { nombre: 'Manicura semipermanente', duracion_min: 60, precio_eur: 28, orden: 1 },
    { nombre: 'Pedicura', duracion_min: 60, precio_eur: 25, orden: 2 },
  ],
  otro: [
    { nombre: 'Servicio 1', duracion_min: 30, precio_eur: 20, orden: 0 },
  ],
};

interface HorarioSeed {
  dia_semana: number;
  inicio: string;
  fin: string;
}

// L-V mañana y tarde, sábado solo mañana
const HORARIOS_DEFAULT: HorarioSeed[] = [
  { dia_semana: 1, inicio: '09:00', fin: '13:00' },
  { dia_semana: 1, inicio: '16:00', fin: '20:00' },
  { dia_semana: 2, inicio: '09:00', fin: '13:00' },
  { dia_semana: 2, inicio: '16:00', fin: '20:00' },
  { dia_semana: 3, inicio: '09:00', fin: '13:00' },
  { dia_semana: 3, inicio: '16:00', fin: '20:00' },
  { dia_semana: 4, inicio: '09:00', fin: '13:00' },
  { dia_semana: 4, inicio: '16:00', fin: '20:00' },
  { dia_semana: 5, inicio: '09:00', fin: '13:00' },
  { dia_semana: 5, inicio: '16:00', fin: '20:00' },
  { dia_semana: 6, inicio: '09:00', fin: '14:00' },
];

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
      trial_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
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

  // ----- Seed: servicios, horarios, profesional -----
  // Errores aquí no abortan: el salón ya existe, sólo logueamos.
  try {
    const servicios = SERVICIOS_POR_TIPO[tipoNegocio] ?? SERVICIOS_POR_TIPO.otro;
    const { error: serviciosError } = await admin.from('servicios').insert(
      servicios.map((s) => ({
        salon_id: salon.id,
        nombre: s.nombre,
        duracion_min: s.duracion_min,
        precio_eur: s.precio_eur,
        orden: s.orden,
      })),
    );
    if (serviciosError) {
      console.warn('[signup:seed] servicios error:', serviciosError.message);
    }
  } catch (err) {
    console.warn('[signup:seed] servicios throw:', err);
  }

  try {
    const { error: horariosError } = await admin.from('horarios').insert(
      HORARIOS_DEFAULT.map((h) => ({
        salon_id: salon.id,
        dia_semana: h.dia_semana,
        inicio: h.inicio,
        fin: h.fin,
      })),
    );
    if (horariosError) {
      console.warn('[signup:seed] horarios error:', horariosError.message);
    }
  } catch (err) {
    console.warn('[signup:seed] horarios throw:', err);
  }

  try {
    const { error: profError } = await admin.from('profesionales').insert({
      salon_id: salon.id,
      nombre: salonNombre,
      color_hex: '#8B9D7A',
      orden: 0,
    });
    if (profError) {
      console.warn('[signup:seed] profesional error:', profError.message);
    }
  } catch (err) {
    console.warn('[signup:seed] profesional throw:', err);
  }

  // ----- Email de bienvenida (no bloquea redirect) -----
  try {
    await enviarEmailBienvenida({ to: email, salonNombre, salonSlug });
  } catch (err) {
    console.warn('[signup:email] enviarEmailBienvenida throw:', err);
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
