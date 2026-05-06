import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/lib/db';
import { citas, clientes, profesionales, salones, servicios } from '@/lib/db/schema';
import { notificarDuenoRespuestaCita } from '@/lib/telegram/notify';
import type { AccionCita } from './token';

export type SourceRespuesta = 'email' | 'telegram' | 'whatsapp' | 'web';

export type ResponderError =
  | 'no_encontrada'
  | 'estado_invalido'
  | 'pasada';

export interface ResponderOk {
  ok: true;
  accion: AccionCita;
  estado: 'confirmada' | 'cancelada';
  salon: { slug: string; nombre: string };
  cliente: { nombre: string };
  servicio: { nombre: string };
  profesional: { nombre: string };
  inicio: Date;
  timezone: string;
}

export interface ResponderFail {
  ok: false;
  error: ResponderError;
}

/**
 * Aplica la respuesta del cliente sobre una cita: confirmar o cancelar.
 *
 * Reglas:
 * - Sólo se permite responder si la cita está en estado 'pendiente' o
 *   'confirmada'. Estados terminales ('cancelada', 'no_show', 'completada')
 *   no se modifican.
 * - Si la cita ya pasó, no se puede responder.
 * - El UPDATE es condicional para evitar carreras.
 * - Tras el cambio, se intenta notificar al dueño por Telegram (best-effort).
 */
export async function responderCita(input: {
  citaId: string;
  accion: AccionCita;
  source: SourceRespuesta;
}): Promise<ResponderOk | ResponderFail> {
  const nuevoEstado = input.accion === 'confirmar' ? 'confirmada' : 'cancelada';

  const [row] = await db
    .select({
      cita: citas,
      salon: salones,
      cliente: clientes,
      servicio: servicios,
      profesional: profesionales,
    })
    .from(citas)
    .innerJoin(salones, eq(citas.salonId, salones.id))
    .innerJoin(clientes, eq(citas.clienteId, clientes.id))
    .innerJoin(servicios, eq(citas.servicioId, servicios.id))
    .innerJoin(profesionales, eq(citas.profesionalId, profesionales.id))
    .where(eq(citas.id, input.citaId))
    .limit(1);

  if (!row) return { ok: false, error: 'no_encontrada' };

  if (row.cita.inicio.getTime() < Date.now()) {
    return { ok: false, error: 'pasada' };
  }

  // UPDATE condicional: sólo si estado actual es pendiente o confirmada y, en
  // caso de confirmar, no estaba ya en cancelada/no_show.
  const estadosOrigenValidos: ('pendiente' | 'confirmada')[] =
    input.accion === 'confirmar' ? ['pendiente'] : ['pendiente', 'confirmada'];

  const updated = await db
    .update(citas)
    .set({ estado: nuevoEstado, updatedAt: new Date() })
    .where(
      and(eq(citas.id, input.citaId), inArray(citas.estado, estadosOrigenValidos)),
    )
    .returning({ id: citas.id });

  if (updated.length === 0) {
    return { ok: false, error: 'estado_invalido' };
  }

  const tz = row.salon.timezone ?? 'Europe/Madrid';

  // Best-effort: notificar al dueño
  await notificarDuenoRespuestaCita({
    botToken: row.salon.telegramBotToken,
    duenoChatId: row.salon.telegramChatIdDueno,
    salonNombre: row.salon.nombre,
    clienteNombre: row.cliente.nombre,
    servicioNombre: row.servicio.nombre,
    profesionalNombre: row.profesional.nombre,
    inicioIso: row.cita.inicio.toISOString(),
    timezone: tz,
    accion: input.accion,
    source: input.source,
  });

  return {
    ok: true,
    accion: input.accion,
    estado: nuevoEstado,
    salon: { slug: row.salon.slug, nombre: row.salon.nombre },
    cliente: { nombre: row.cliente.nombre },
    servicio: { nombre: row.servicio.nombre },
    profesional: { nombre: row.profesional.nombre },
    inicio: row.cita.inicio,
    timezone: tz,
  };
}
