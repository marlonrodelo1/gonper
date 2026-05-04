'use server';

import { db } from '@/lib/db';
import { salones } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

type CurrentSalon = { id: string; slug?: string } | null;

const TIPOS_NEGOCIO = ['barberia', 'peluqueria', 'estetica', 'manicura', 'otro'] as const;
const TIMEZONES = [
  'Europe/Madrid',
  'Atlantic/Canary',
  'Europe/Lisbon',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Rome',
  'Europe/Amsterdam',
] as const;
const GENEROS = ['femenino', 'masculino', 'neutro'] as const;
const TONOS = ['profesional', 'cercano', 'desenfadado'] as const;

async function requireSalon(): Promise<{ id: string; slug: string | null }> {
  const salon = (await getCurrentSalon()) as CurrentSalon;
  if (!salon || !salon.id) {
    redirect(
      '/panel/config?error=' + encodeURIComponent('No se pudo identificar el salón'),
    );
  }
  return { id: salon.id, slug: salon.slug ?? null };
}

function revalidarWebPublica(slug: string | null) {
  if (slug) revalidatePath(`/s/${slug}`);
}

function redirectError(path: string, msg: string): never {
  redirect(`${path}?error=${encodeURIComponent(msg)}`);
}

export async function actualizarDatosSalon(formData: FormData) {
  const salon = await requireSalon();

  const nombre = String(formData.get('nombre') || '').trim();
  const tipoNegocio = String(formData.get('tipo_negocio') || '').trim();
  const direccionRaw = String(formData.get('direccion') || '').trim();
  const telefonoRaw = String(formData.get('telefono') || '').trim();
  const emailRaw = String(formData.get('email') || '').trim();
  const timezoneRaw = String(formData.get('timezone') || '').trim();

  if (!nombre || nombre.length > 120) {
    redirectError('/panel/config', 'El nombre es obligatorio (máx. 120 caracteres)');
  }
  if (!TIPOS_NEGOCIO.includes(tipoNegocio as (typeof TIPOS_NEGOCIO)[number])) {
    redirectError('/panel/config', 'Tipo de negocio inválido');
  }

  const timezone = TIMEZONES.includes(timezoneRaw as (typeof TIMEZONES)[number])
    ? timezoneRaw
    : 'Europe/Madrid';

  try {
    const result = await db
      .update(salones)
      .set({
        nombre,
        tipoNegocio,
        direccion: direccionRaw === '' ? null : direccionRaw,
        telefono: telefonoRaw === '' ? null : telefonoRaw,
        email: emailRaw === '' ? null : emailRaw,
        timezone,
        updatedAt: new Date(),
      })
      .where(eq(salones.id, salon.id))
      .returning({ id: salones.id });

    if (result.length === 0) {
      redirectError('/panel/config', 'No autorizado');
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    redirectError('/panel/config', msg);
  }

  revalidatePath('/panel/config');
  revalidatePath('/panel/config/reservas');
  revalidatePath('/panel', 'layout');
  revalidarWebPublica(salon.slug);
  redirect('/panel/config?ok=1');
}

export async function actualizarAgente(formData: FormData) {
  const salon = await requireSalon();

  const agenteNombre = String(formData.get('agente_nombre') || '').trim();
  const agenteGenero = String(formData.get('agente_genero') || '').trim();
  const agenteTono = String(formData.get('agente_tono') || '').trim();
  const bienvenidaRaw = String(formData.get('agente_bienvenida') || '').trim();

  if (!agenteNombre || agenteNombre.length > 60) {
    redirectError(
      '/panel/config/agente',
      'El nombre del agente es obligatorio (máx. 60 caracteres)',
    );
  }
  if (!GENEROS.includes(agenteGenero as (typeof GENEROS)[number])) {
    redirectError('/panel/config/agente', 'Género inválido');
  }
  if (!TONOS.includes(agenteTono as (typeof TONOS)[number])) {
    redirectError('/panel/config/agente', 'Tono inválido');
  }
  if (bienvenidaRaw.length > 280) {
    redirectError(
      '/panel/config/agente',
      'El mensaje de bienvenida no puede superar 280 caracteres',
    );
  }

  try {
    const result = await db
      .update(salones)
      .set({
        agenteNombre,
        agenteGenero,
        agenteTono,
        agenteBienvenida: bienvenidaRaw === '' ? null : bienvenidaRaw,
        updatedAt: new Date(),
      })
      .where(eq(salones.id, salon.id))
      .returning({ id: salones.id });

    if (result.length === 0) {
      redirectError('/panel/config/agente', 'No autorizado');
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    redirectError('/panel/config/agente', msg);
  }

  revalidatePath('/panel/config/agente');
  revalidatePath('/panel', 'layout');
  revalidarWebPublica(salon.slug);
  redirect('/panel/config/agente?ok=1');
}
