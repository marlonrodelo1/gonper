/**
 * Lógica compartida para crear una reserva pública (web pública del salón
 * y chat de la tienda). Encapsula:
 *  - Validación de salón / servicio / profesional / slot.
 *  - Reverificación del slot (race condition).
 *  - Buscar o crear cliente por email (chat) o teléfono (web).
 *  - Insertar la cita.
 *  - Enviar email de confirmación.
 *  - Notificar al dueño por Telegram.
 *
 * NO redirige ni mete server actions: devuelve un objeto con el resultado.
 */

import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  citas,
  clientes,
  profesionales,
  salones,
  servicios,
  type Salon,
} from '@/lib/db/schema';
import { calcularSlots } from '@/lib/agenda/slots';
import { notificarDuenoNuevaCita } from '@/lib/telegram/notify';

export type ReservaPublicaInput = {
  slug: string;
  servicioId: string;
  profesionalId?: string | null;
  inicioIso: string;
  clienteNombre: string;
  clienteEmail: string;
  clienteTelefono?: string | null;
  notas?: string | null;
  /** Si es 'chat_tienda' guardamos en notas el origen real (constraint solo permite 'web'/'manual'/'telegram'/'whatsapp'/'dueno'). */
  origen?: 'web' | 'chat_tienda';
};

export type ReservaPublicaError =
  | { code: 'SALON_NO_DISPONIBLE'; message: string }
  | { code: 'SERVICIO_NO_DISPONIBLE'; message: string }
  | { code: 'PROFESIONAL_NO_DISPONIBLE'; message: string }
  | { code: 'SIN_PROFESIONALES'; message: string }
  | { code: 'INICIO_INVALIDO'; message: string }
  | { code: 'INICIO_PASADO'; message: string }
  | { code: 'EMAIL_INVALIDO'; message: string }
  | { code: 'NOMBRE_INVALIDO'; message: string }
  | { code: 'SLOT_OCUPADO'; message: string }
  | { code: 'INTERNO'; message: string };

export type ReservaPublicaResultado =
  | {
      ok: true;
      citaId: string;
      inicioIso: string;
      finIso: string;
      servicioNombre: string;
      profesionalId: string;
      profesionalNombre: string;
      precioEur: string;
      duracionMin: number;
      emailEnviado: boolean;
      timezone: string;
    }
  | { ok: false; error: ReservaPublicaError };

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function crearReservaPublica(
  input: ReservaPublicaInput,
): Promise<ReservaPublicaResultado> {
  const nombre = (input.clienteNombre ?? '').trim();
  const email = (input.clienteEmail ?? '').trim().toLowerCase();
  const telefono = (input.clienteTelefono ?? '').trim();

  if (!nombre || nombre.length > 120) {
    return { ok: false, error: { code: 'NOMBRE_INVALIDO', message: 'El nombre es obligatorio' } };
  }
  if (!email || !isValidEmail(email) || email.length > 200) {
    return {
      ok: false,
      error: { code: 'EMAIL_INVALIDO', message: 'Email obligatorio y válido' },
    };
  }

  const inicio = new Date(input.inicioIso);
  if (Number.isNaN(inicio.getTime())) {
    return { ok: false, error: { code: 'INICIO_INVALIDO', message: 'Hora no válida' } };
  }
  if (inicio.getTime() <= Date.now()) {
    return {
      ok: false,
      error: { code: 'INICIO_PASADO', message: 'Esa hora ya ha pasado' },
    };
  }

  const [salon] = (await db
    .select()
    .from(salones)
    .where(eq(salones.slug, input.slug))
    .limit(1)) as Salon[];

  if (!salon || !salon.activo) {
    return {
      ok: false,
      error: { code: 'SALON_NO_DISPONIBLE', message: 'El salón no está disponible' },
    };
  }

  const tz = salon.timezone ?? 'Europe/Madrid';

  const [servicio] = await db
    .select()
    .from(servicios)
    .where(
      and(eq(servicios.id, input.servicioId), eq(servicios.salonId, salon.id)),
    )
    .limit(1);

  if (!servicio || !servicio.activo) {
    return {
      ok: false,
      error: { code: 'SERVICIO_NO_DISPONIBLE', message: 'El servicio no está disponible' },
    };
  }

  // Resolver profesional: el caller lo indica, o lo asignamos automáticamente
  // probando con todos los activos hasta encontrar uno con el slot libre.
  const profesionalesActivos = await db
    .select()
    .from(profesionales)
    .where(
      and(eq(profesionales.salonId, salon.id), eq(profesionales.activo, true)),
    )
    .orderBy(asc(profesionales.orden), asc(profesionales.nombre));

  if (profesionalesActivos.length === 0) {
    return {
      ok: false,
      error: { code: 'SIN_PROFESIONALES', message: 'No hay profesionales activos' },
    };
  }

  let candidatos = profesionalesActivos;
  if (input.profesionalId) {
    const filt = profesionalesActivos.filter((p) => p.id === input.profesionalId);
    if (filt.length === 0) {
      return {
        ok: false,
        error: {
          code: 'PROFESIONAL_NO_DISPONIBLE',
          message: 'El profesional no está disponible',
        },
      };
    }
    candidatos = filt;
  }

  // Buscar el primer profesional candidato que tenga ese slot libre (race-safe).
  let profesionalElegido: (typeof candidatos)[number] | null = null;
  const slotMs = inicio.getTime();
  for (const prof of candidatos) {
    const slots = await calcularSlots({
      salonId: salon.id,
      profesionalId: prof.id,
      duracionMin: servicio.duracionMin,
      fecha: inicio,
      timezone: tz,
    });
    if (slots.some((s) => s.getTime() === slotMs)) {
      profesionalElegido = prof;
      break;
    }
  }

  if (!profesionalElegido) {
    return {
      ok: false,
      error: { code: 'SLOT_OCUPADO', message: 'Ese hueco ya no está disponible' },
    };
  }

  const fin = new Date(slotMs + servicio.duracionMin * 60_000);

  // Buscar/crear cliente. En el flujo del chat el email es la clave (no
  // siempre hay teléfono); en el flujo /reservar la clave es teléfono.
  // Estrategia: si hay teléfono → buscar por (salon, telefono); si no,
  // buscar por (salon, email) — sin índice único; aceptamos un duplicado
  // marginal antes que rechazar al cliente.
  let clienteId: string | null = null;

  if (telefono) {
    const [c] = await db
      .select({ id: clientes.id })
      .from(clientes)
      .where(and(eq(clientes.salonId, salon.id), eq(clientes.telefono, telefono)))
      .limit(1);
    if (c) {
      clienteId = c.id;
      await db
        .update(clientes)
        .set({ nombre, email, updatedAt: new Date() })
        .where(eq(clientes.id, c.id));
    }
  }
  if (!clienteId) {
    // Buscar por email como segundo intento.
    const [c] = await db
      .select({ id: clientes.id })
      .from(clientes)
      .where(and(eq(clientes.salonId, salon.id), eq(clientes.email, email)))
      .limit(1);
    if (c) {
      clienteId = c.id;
      const updates: Record<string, unknown> = {
        nombre,
        updatedAt: new Date(),
      };
      if (telefono) updates.telefono = telefono;
      await db.update(clientes).set(updates).where(eq(clientes.id, c.id));
    }
  }
  if (!clienteId) {
    const [nuevo] = await db
      .insert(clientes)
      .values({
        salonId: salon.id,
        nombre,
        email,
        telefono: telefono || null,
      })
      .returning({ id: clientes.id });
    clienteId = nuevo.id;
  }

  // Insertar cita. El check constraint de `origen` solo admite
  // ('telegram','whatsapp','web','manual','dueno'); para el chat usamos 'web'
  // y dejamos rastro en `notas` para el dueño.
  const origenDb = 'web' as const;
  const notasFinal =
    input.origen === 'chat_tienda'
      ? [`[chat-tienda]`, input.notas ?? '']
          .filter(Boolean)
          .join(' ')
          .trim()
      : input.notas ?? null;

  let citaId: string;
  try {
    const [cita] = await db
      .insert(citas)
      .values({
        salonId: salon.id,
        clienteId,
        profesionalId: profesionalElegido.id,
        servicioId: servicio.id,
        inicio,
        fin,
        precioEur: servicio.precioEur,
        estado: 'pendiente',
        origen: origenDb,
        notas: notasFinal || null,
      })
      .returning({ id: citas.id });
    citaId = cita.id;
  } catch (err: unknown) {
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code?: unknown }).code)
        : '';
    if (code === '23505') {
      return {
        ok: false,
        error: { code: 'SLOT_OCUPADO', message: 'Otra persona acaba de reservar esa hora' },
      };
    }
    console.error('[crearReservaPublica] insert cita falló:', err);
    return { ok: false, error: { code: 'INTERNO', message: 'No se pudo crear la reserva' } };
  }

  // Email confirmación (best-effort).
  let emailEnviado = false;
  try {
    const { enviarConfirmacionReserva } = await import('@/lib/email/resend');
    const result = await enviarConfirmacionReserva({
      to: email,
      citaId,
      clienteNombre: nombre,
      salonNombre: salon.nombre,
      salonSlug: input.slug,
      salonDireccion: salon.direccion ?? null,
      salonTelefono: salon.telefono ?? null,
      inicioIso: inicio.toISOString(),
      servicioNombre: servicio.nombre,
      duracionMin: servicio.duracionMin,
      profesionalNombre: profesionalElegido.nombre,
      precioEur: servicio.precioEur,
      timezone: tz,
    });
    emailEnviado = result.ok;
    if (!result.ok) {
      console.error('[crearReservaPublica] email falló:', result.error);
    }
  } catch (err) {
    console.error('[crearReservaPublica] email throw:', err);
  }

  // Telegram al dueño (best-effort).
  await notificarDuenoNuevaCita({
    botToken: salon.telegramBotToken,
    duenoChatId: salon.telegramChatIdDueno,
    salonNombre: salon.nombre,
    clienteNombre: nombre,
    servicioNombre: servicio.nombre,
    profesionalNombre: profesionalElegido.nombre,
    inicioIso: inicio.toISOString(),
    precioEur: servicio.precioEur,
    origen: input.origen === 'chat_tienda' ? 'web' : 'web',
    timezone: tz,
  });

  return {
    ok: true,
    citaId,
    inicioIso: inicio.toISOString(),
    finIso: fin.toISOString(),
    servicioNombre: servicio.nombre,
    profesionalId: profesionalElegido.id,
    profesionalNombre: profesionalElegido.nombre,
    precioEur: String(servicio.precioEur),
    duracionMin: servicio.duracionMin,
    emailEnviado,
    timezone: tz,
  };
}
