'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { enviarEmailBienvenida } from '@/lib/email/resend';
import { getStripe, PLANES } from '@/lib/stripe/client';
import { checkRateLimit } from '@/lib/api/rate-limit';

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

async function buildBaseUrl() {
  const h = await headers();
  const host = h.get('host') ?? '';
  const proto = h.get('x-forwarded-proto') ?? 'https';
  return `${proto}://${host}`;
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

  // 3. Crear el salón. plan='trial' y trial_until null hasta que pase Checkout
  // (ahora el trial real lo gestiona Stripe, no el campo trial_until).
  const { data: salon, error: salonError } = await admin
    .from('salones')
    .insert({
      slug: salonSlug,
      nombre: salonNombre,
      tipo_negocio: tipoNegocio,
      email,
      plan: 'trial',
      trial_until: null,
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

  // 5. Iniciar sesión inmediatamente para que la cookie esté lista cuando vuelva
  // de Stripe Checkout.
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

  // ----- Crear Stripe Customer + Checkout Session con trial 7d -----
  // Si algo falla aquí, NO abortamos: dejamos al user en /panel/config/suscripcion
  // con un mensaje para que reintente. El salón ya existe.
  const plan = PLANES.basico;
  if (!plan.priceId) {
    redirect('/panel/config/suscripcion?error=' +
      encodeURIComponent('Plan no configurado en Stripe. Configúralo desde aquí.'));
  }

  let checkoutUrl: string | null = null;
  try {
    const stripe = getStripe();
    const baseUrl = await buildBaseUrl();

    const customer = await stripe.customers.create({
      email,
      name: salonNombre,
      metadata: { salon_id: salon.id },
    });

    await admin
      .from('salones')
      .update({ stripe_customer_id: customer.id })
      .eq('id', salon.id);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customer.id,
      line_items: [{ price: plan.priceId, quantity: 1 }],
      // trial_period_days fuerza 7 días gratis con cobro 0 €.
      // payment_method_collection: 'always' obliga a guardar tarjeta aunque haya trial.
      subscription_data: {
        trial_period_days: 7,
        metadata: { salon_id: salon.id, plan: 'basico' },
      },
      payment_method_collection: 'always',
      success_url: `${baseUrl}/api/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/panel/config/suscripcion?canceled=1`,
      metadata: { salon_id: salon.id, plan: 'basico' },
      allow_promotion_codes: true,
      locale: 'es',
    });

    checkoutUrl = session.url;
  } catch (err) {
    console.error('[signup:stripe] error creando checkout:', err);
    redirect('/panel/config/suscripcion?error=' +
      encodeURIComponent('No se pudo abrir el pago. Pulsa "Suscribirme" para reintentar.'));
  }

  revalidatePath('/', 'layout');
  if (!checkoutUrl) {
    redirect('/panel/config/suscripcion?error=' +
      encodeURIComponent('Stripe no devolvió URL'));
  }
  redirect(checkoutUrl);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}
