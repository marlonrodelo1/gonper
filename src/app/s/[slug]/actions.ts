'use server';

import { and, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';

import { db } from '@/lib/db';
import {
  citas,
  clientes,
  profesionales,
  resenas,
  salones,
  servicios,
} from '@/lib/db/schema';
import { calcularSlots } from '@/lib/agenda/slots';
import { notificarDuenoNuevaCita } from '@/lib/telegram/notify';
import { revalidatePath } from 'next/cache';

function fail(slug: string, msg: string): never {
  redirect(`/s/${slug}/reservar?error=${encodeURIComponent(msg)}`);
}

function failBack(slug: string, qs: string, msg: string): never {
  const sep = qs ? '&' : '';
  redirect(`/s/${slug}/reservar?${qs}${sep}error=${encodeURIComponent(msg)}`);
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function crearReservaWeb(formData: FormData) {
  const slug = String(formData.get('slug') || '').trim();
  if (!slug) redirect('/');

  const slotIso = String(formData.get('slot') || '').trim();
  const servicioId = String(formData.get('servicio_id') || '').trim();
  const profesionalId = String(formData.get('profesional_id') || '').trim();
  const nombre = String(formData.get('nombre') || '').trim();
  const telefono = String(formData.get('telefono') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const notasRaw = String(formData.get('notas') || '').trim();
  const notas = notasRaw === '' ? null : notasRaw;
  const enviarEmail = formData.get('enviar_email') !== null;

  // Validaciones básicas
  if (!slotIso || !servicioId || !profesionalId) {
    fail(slug, 'Faltan datos de la reserva');
  }
  if (!nombre || nombre.length > 120) {
    fail(slug, 'El nombre es obligatorio');
  }
  if (!telefono || telefono.length > 30) {
    fail(slug, 'El teléfono es obligatorio');
  }
  // Email es OPCIONAL — el form dice "Email (opcional)" y el cliente solo
  // necesita teléfono para reservar (los recordatorios pueden ir por
  // WhatsApp/Telegram). Si lo da, validamos que sea bien formado y bajo
  // el límite; si no, seguimos sin email.
  if (email && (!isValidEmail(email) || email.length > 200)) {
    fail(slug, 'El email no es válido');
  }

  const slotDate = new Date(slotIso);
  if (isNaN(slotDate.getTime())) {
    fail(slug, 'Hora no válida');
  }

  // Cargar salón
  const [salon] = await db
    .select()
    .from(salones)
    .where(eq(salones.slug, slug))
    .limit(1);

  if (!salon || !salon.activo) {
    fail(slug, 'El salón no está disponible');
  }

  // Cargar servicio + profesional con ownership
  const [servicio] = await db
    .select()
    .from(servicios)
    .where(and(eq(servicios.id, servicioId), eq(servicios.salonId, salon.id)))
    .limit(1);

  if (!servicio || !servicio.activo) {
    fail(slug, 'El servicio no está disponible');
  }

  const [profesional] = await db
    .select()
    .from(profesionales)
    .where(
      and(
        eq(profesionales.id, profesionalId),
        eq(profesionales.salonId, salon.id),
      ),
    )
    .limit(1);

  if (!profesional || !profesional.activo) {
    fail(slug, 'El profesional no está disponible');
  }

  // No permitir reservas en el pasado
  if (slotDate.getTime() <= Date.now()) {
    fail(slug, 'Esa hora ya ha pasado');
  }

  // Validar que el slot sigue libre
  const tz = salon.timezone ?? 'Europe/Madrid';
  const slotsLibres = await calcularSlots({
    salonId: salon.id,
    profesionalId: profesional.id,
    duracionMin: servicio.duracionMin,
    fecha: slotDate,
    timezone: tz,
  });

  const slotMs = slotDate.getTime();
  const slotSigueLibre = slotsLibres.some((s) => s.getTime() === slotMs);
  if (!slotSigueLibre) {
    const qs = new URLSearchParams({
      servicio: servicio.id,
      profesional: profesional.id,
      fecha: new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(slotDate),
    }).toString();
    failBack(slug, qs, 'Ese hueco ya no está disponible. Elige otra hora.');
  }

  const fin = new Date(slotMs + servicio.duracionMin * 60_000);

  // Buscar o crear cliente por (salon_id, telefono)
  let clienteId: string;
  const [clienteExistente] = await db
    .select({ id: clientes.id })
    .from(clientes)
    .where(
      and(eq(clientes.salonId, salon.id), eq(clientes.telefono, telefono)),
    )
    .limit(1);

  if (clienteExistente) {
    clienteId = clienteExistente.id;
    await db
      .update(clientes)
      .set({
        nombre,
        ...(email ? { email } : {}),
        updatedAt: new Date(),
      })
      .where(eq(clientes.id, clienteId));
  } else {
    const [nuevoCliente] = await db
      .insert(clientes)
      .values({
        salonId: salon.id,
        nombre,
        telefono,
        email: email || null,
      })
      .returning({ id: clientes.id });
    clienteId = nuevoCliente.id;
  }

  // Insertar cita
  let citaId: string;
  try {
    const [cita] = await db
      .insert(citas)
      .values({
        salonId: salon.id,
        clienteId,
        profesionalId: profesional.id,
        servicioId: servicio.id,
        inicio: slotDate,
        fin,
        precioEur: servicio.precioEur,
        estado: 'pendiente',
        origen: 'web',
        notas,
      })
      .returning({ id: citas.id });
    citaId = cita.id;
  } catch (err: unknown) {
    // 23505 = unique_violation (índice no-solape)
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code?: unknown }).code)
        : '';
    if (code === '23505') {
      const qs = new URLSearchParams({
        servicio: servicio.id,
        profesional: profesional.id,
        fecha: new Intl.DateTimeFormat('en-CA', {
          timeZone: tz,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(slotDate),
      }).toString();
      failBack(slug, qs, 'Otra persona acaba de reservar esa hora. Elige otra.');
    }
    console.error('[crearReservaWeb] Error insertando cita:', err);
    fail(slug, 'No se pudo crear la reserva. Inténtalo de nuevo.');
  }

  // Notificar al dueño por Telegram (best-effort, no bloquea la reserva)
  await notificarDuenoNuevaCita({
    botToken: salon.telegramBotToken,
    duenoChatId: salon.telegramChatIdDueno,
    salonNombre: salon.nombre,
    clienteNombre: nombre,
    servicioNombre: servicio.nombre,
    profesionalNombre: profesional.nombre,
    inicioIso: slotDate.toISOString(),
    precioEur: servicio.precioEur,
    origen: 'web',
    timezone: tz,
  });

  // Enviar email de confirmación (best-effort, ignorar fallo)
  let emailEnviado = false;
  if (email && enviarEmail) {
    try {
      const { enviarConfirmacionReserva } = await import('@/lib/email/resend');
      const result = await enviarConfirmacionReserva({
        to: email,
        citaId,
        clienteNombre: nombre,
        salonNombre: salon.nombre,
        salonSlug: slug,
        salonDireccion: salon.direccion ?? null,
        salonTelefono: salon.telefono ?? null,
        inicioIso: slotDate.toISOString(),
        servicioNombre: servicio.nombre,
        duracionMin: servicio.duracionMin,
        profesionalNombre: profesional.nombre,
        precioEur: servicio.precioEur,
        timezone: tz,
      });
      emailEnviado = result.ok;
      if (!result.ok) {
        console.error('[crearReservaWeb] Email confirmación falló:', result.error);
      }
    } catch (err) {
      console.error('[crearReservaWeb] Email no enviado:', err);
    }
  }

  const successQs = new URLSearchParams({ cita: citaId });
  if (emailEnviado && email) successQs.set('email', email);
  redirect(`/s/${slug}/reservar/exito?${successQs.toString()}`);
}

// ============================================
// Reseñas públicas — un cliente del salón comparte su experiencia.
// Las dejamos en estado `aprobada=false` para que el dueño modere desde
// /panel/resenas antes de que salgan en la web pública.
// ============================================
function failResena(slug: string, qs: URLSearchParams, msg: string): never {
  qs.set('error', msg);
  redirect(`/s/${slug}/resena?${qs.toString()}`);
}

export async function crearResenaPublica(formData: FormData) {
  const slug = String(formData.get('slug') || '').trim();
  if (!slug) redirect('/');

  // Honeypot — si un bot rellena este campo, lo descartamos en silencio.
  const honey = String(formData.get('website') || '').trim();
  if (honey) {
    redirect(`/s/${slug}/resena/gracias`);
  }

  const nombre = String(formData.get('nombre') || '').trim();
  const ratingRaw = Number(formData.get('rating') || 0);
  const textoRaw = String(formData.get('texto') || '').trim();

  const qsBack = new URLSearchParams();
  if (nombre) qsBack.set('nombre', nombre);
  if (ratingRaw) qsBack.set('rating', String(ratingRaw));
  if (textoRaw) qsBack.set('texto', textoRaw);

  if (!nombre || nombre.length > 120) {
    failResena(slug, qsBack, 'Tu nombre es obligatorio (máx. 120 caracteres)');
  }
  if (
    !Number.isFinite(ratingRaw) ||
    !Number.isInteger(ratingRaw) ||
    ratingRaw < 1 ||
    ratingRaw > 5
  ) {
    failResena(slug, qsBack, 'Elige una valoración de 1 a 5 estrellas');
  }
  if (textoRaw.length > 2000) {
    failResena(slug, qsBack, 'El texto es demasiado largo (máx. 2000 caracteres)');
  }

  const [salon] = await db
    .select({ id: salones.id, activo: salones.activo })
    .from(salones)
    .where(eq(salones.slug, slug))
    .limit(1);

  if (!salon || !salon.activo) {
    redirect('/');
  }

  await db.insert(resenas).values({
    salonId: salon.id,
    autorNombre: nombre,
    rating: ratingRaw,
    texto: textoRaw === '' ? null : textoRaw,
    fuente: 'web',
    aprobada: false, // El dueño aprueba desde /panel/resenas
    destacada: false,
  });

  revalidatePath('/panel/resenas');
  redirect(`/s/${slug}/resena/gracias`);
}
