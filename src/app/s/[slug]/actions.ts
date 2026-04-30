'use server';

import { and, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';

import { db } from '@/lib/db';
import {
  citas,
  clientes,
  profesionales,
  salones,
  servicios,
} from '@/lib/db/schema';
import { calcularSlots } from '@/lib/agenda/slots';

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
  const emailRaw = String(formData.get('email') || '').trim();
  const email = emailRaw === '' ? null : emailRaw;
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
  if (email && (!isValidEmail(email) || email.length > 200)) {
    fail(slug, 'Email no válido');
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
        email,
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

  // Enviar email si procede (best-effort, ignorar fallo)
  let emailEnviado = false;
  if (email && enviarEmail) {
    try {
      const mod = (await import('@/lib/email/resend').catch(() => null)) as
        | {
            sendEmail?: (args: {
              to: string;
              template: string;
              data: Record<string, unknown>;
            }) => Promise<unknown>;
          }
        | null;
      if (mod?.sendEmail) {
        await mod.sendEmail({
          to: email,
          template: 'reservaConfirmada',
          data: {
            salonNombre: salon.nombre,
            salonDireccion: salon.direccion,
            salonTelefono: salon.telefono,
            clienteNombre: nombre,
            servicioNombre: servicio.nombre,
            profesionalNombre: profesional.nombre,
            inicio: slotDate.toISOString(),
            timezone: tz,
            precioEur: servicio.precioEur,
            slug,
          },
        });
        emailEnviado = true;
      }
    } catch (err) {
      console.error('[crearReservaWeb] Email no enviado:', err);
    }
  }

  const successQs = new URLSearchParams({ cita: citaId });
  if (emailEnviado && email) successQs.set('email', email);
  redirect(`/s/${slug}/reservar/exito?${successQs.toString()}`);
}
