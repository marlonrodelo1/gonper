/**
 * Tools que el agente del chat público del salón puede invocar para
 * reservar dentro del propio chat (sin redirigir).
 *
 * - listar_servicios()
 * - listar_slots_disponibles({servicio_id, fecha})
 * - reservar_cita_publica({servicio_id, inicio_iso, cliente_nombre, cliente_email, cliente_telefono?, profesional_id?})
 *
 * El módulo se llama "chat-tienda" por legacy. Antes había una tool extra
 * `listar_productos_tienda` que se eliminó en el pivote 2026-05-18 a
 * Farmasi MLM. Las tools restantes son exclusivamente de agenda/reservas.
 */

import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { profesionales, salones, servicios } from '@/lib/db/schema';
import { calcularSlots } from '@/lib/agenda/slots';
import { crearReservaPublica } from '@/lib/reservas/publica';
import type { ToolFunction } from '@/lib/llm/deepseek-tools';

export const TOOLS_TIENDA: ToolFunction[] = [
  {
    type: 'function',
    function: {
      name: 'listar_servicios',
      description:
        'Devuelve los servicios activos del salón (id, nombre, precio en €, duración en minutos). Úsalo si el cliente pregunta qué servicios ofrecen, sus precios o duraciones.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'listar_slots_disponibles',
      description:
        'Devuelve los huecos disponibles para reservar un servicio en una fecha concreta. Devuelve un array de horas en formato ISO (UTC) y la versión legible local. Llámalo solo cuando el cliente quiera ver disponibilidad.',
      parameters: {
        type: 'object',
        properties: {
          servicio_id: {
            type: 'string',
            description: 'UUID del servicio (obtenido con listar_servicios).',
          },
          fecha: {
            type: 'string',
            description: 'Fecha en formato YYYY-MM-DD (zona horaria del salón).',
          },
        },
        required: ['servicio_id', 'fecha'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reservar_cita_publica',
      description:
        'Crea la cita en el salón. Solo llámalo cuando tengas TODOS los datos: servicio_id, inicio_iso (de listar_slots_disponibles), cliente_nombre, cliente_email. El teléfono es opcional. Si el slot ya no está libre, devuelve error y debes pedirle al cliente que elija otro hueco.',
      parameters: {
        type: 'object',
        properties: {
          servicio_id: { type: 'string', description: 'UUID del servicio.' },
          inicio_iso: {
            type: 'string',
            description: 'ISO UTC del slot exacto devuelto por listar_slots_disponibles.',
          },
          cliente_nombre: { type: 'string', description: 'Nombre del cliente.' },
          cliente_email: {
            type: 'string',
            description: 'Email del cliente (recibe la confirmación).',
          },
          cliente_telefono: {
            type: 'string',
            description: 'Teléfono opcional.',
          },
          profesional_id: {
            type: 'string',
            description:
              'Opcional: si el cliente pidió un profesional concreto, su UUID.',
          },
        },
        required: ['servicio_id', 'inicio_iso', 'cliente_nombre', 'cliente_email'],
      },
    },
  },
];

export type ToolEjecutada = {
  name: string;
  result: unknown;
  ui?:
    | { kind: 'slots'; servicio_id: string; servicio_nombre: string; fecha: string; timezone: string; slots: { iso: string; hora_local: string }[] }
    | { kind: 'reserva_ok'; cita_id: string; inicio_iso: string; servicio_nombre: string; profesional_nombre: string }
    | { kind: 'servicios'; servicios: { id: string; nombre: string; precio_eur: string; duracion_min: number }[] };
};

function formatHora(iso: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
    }).format(new Date(iso));
  } catch {
    return iso.slice(11, 16);
  }
}

export async function executeChatTiendaTool(args: {
  slug: string;
  toolName: string;
  toolArgs: Record<string, unknown>;
}): Promise<ToolEjecutada> {
  const { slug, toolName, toolArgs } = args;

  if (toolName === 'listar_servicios') {
    const [salon] = await db
      .select({ id: salones.id, activo: salones.activo })
      .from(salones)
      .where(eq(salones.slug, slug))
      .limit(1);
    if (!salon || !salon.activo) {
      return { name: toolName, result: { error: 'Salón no encontrado' } };
    }
    const lista = await db
      .select({
        id: servicios.id,
        nombre: servicios.nombre,
        descripcion: servicios.descripcion,
        precio_eur: servicios.precioEur,
        duracion_min: servicios.duracionMin,
      })
      .from(servicios)
      .where(and(eq(servicios.salonId, salon.id), eq(servicios.activo, true)))
      .orderBy(asc(servicios.orden), asc(servicios.createdAt))
      .limit(50);

    return {
      name: toolName,
      result: { servicios: lista },
      ui: {
        kind: 'servicios',
        servicios: lista.map((s) => ({
          id: s.id,
          nombre: s.nombre,
          precio_eur: String(s.precio_eur),
          duracion_min: s.duracion_min,
        })),
      },
    };
  }

  if (toolName === 'listar_slots_disponibles') {
    const servicio_id = String(toolArgs.servicio_id ?? '').trim();
    const fecha = String(toolArgs.fecha ?? '').trim();
    if (!/^[0-9a-f-]{36}$/i.test(servicio_id) || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return { name: toolName, result: { error: 'servicio_id o fecha inválidos' } };
    }

    const [salon] = await db
      .select({ id: salones.id, timezone: salones.timezone, activo: salones.activo })
      .from(salones)
      .where(eq(salones.slug, slug))
      .limit(1);
    if (!salon || !salon.activo) {
      return { name: toolName, result: { error: 'Salón no encontrado' } };
    }

    const [serv] = await db
      .select({
        id: servicios.id,
        nombre: servicios.nombre,
        duracionMin: servicios.duracionMin,
      })
      .from(servicios)
      .where(
        and(
          eq(servicios.id, servicio_id),
          eq(servicios.salonId, salon.id),
          eq(servicios.activo, true),
        ),
      )
      .limit(1);

    if (!serv) {
      return { name: toolName, result: { error: 'Servicio no disponible' } };
    }

    const profActivos = await db
      .select({ id: profesionales.id })
      .from(profesionales)
      .where(
        and(eq(profesionales.salonId, salon.id), eq(profesionales.activo, true)),
      );

    const fechaBase = new Date(`${fecha}T12:00:00.000Z`);
    const ahora = Date.now();
    const setSlots = new Set<string>();
    for (const p of profActivos) {
      const ss = await calcularSlots({
        salonId: salon.id,
        profesionalId: p.id,
        duracionMin: serv.duracionMin,
        fecha: fechaBase,
        timezone: salon.timezone,
      });
      for (const s of ss) {
        if (s.getTime() > ahora) setSlots.add(s.toISOString());
      }
    }
    const slotsOrdenados = Array.from(setSlots).sort();
    const enriched = slotsOrdenados.map((iso) => ({
      iso,
      hora_local: formatHora(iso, salon.timezone),
    }));

    return {
      name: toolName,
      result: {
        servicio_id: serv.id,
        servicio_nombre: serv.nombre,
        fecha,
        timezone: salon.timezone,
        slots: enriched,
        total: enriched.length,
      },
      ui:
        enriched.length > 0
          ? {
              kind: 'slots',
              servicio_id: serv.id,
              servicio_nombre: serv.nombre,
              fecha,
              timezone: salon.timezone,
              slots: enriched,
            }
          : undefined,
    };
  }

  if (toolName === 'reservar_cita_publica') {
    const servicio_id = String(toolArgs.servicio_id ?? '').trim();
    const inicio_iso = String(toolArgs.inicio_iso ?? '').trim();
    const cliente_nombre = String(toolArgs.cliente_nombre ?? '').trim();
    const cliente_email = String(toolArgs.cliente_email ?? '').trim();
    const cliente_telefono =
      typeof toolArgs.cliente_telefono === 'string'
        ? toolArgs.cliente_telefono.trim()
        : null;
    const profesional_id =
      typeof toolArgs.profesional_id === 'string' && toolArgs.profesional_id.trim()
        ? toolArgs.profesional_id.trim()
        : null;

    const result = await crearReservaPublica({
      slug,
      servicioId: servicio_id,
      profesionalId: profesional_id,
      inicioIso: inicio_iso,
      clienteNombre: cliente_nombre,
      clienteEmail: cliente_email,
      clienteTelefono: cliente_telefono,
      origen: 'chat_tienda',
    });

    if (!result.ok) {
      return {
        name: toolName,
        result: {
          ok: false,
          error: result.error.message,
          code: result.error.code,
        },
      };
    }

    return {
      name: toolName,
      result: {
        ok: true,
        cita_id: result.citaId,
        inicio_iso: result.inicioIso,
        servicio_nombre: result.servicioNombre,
        profesional_nombre: result.profesionalNombre,
        timezone: result.timezone,
        email_enviado: result.emailEnviado,
      },
      ui: {
        kind: 'reserva_ok',
        cita_id: result.citaId,
        inicio_iso: result.inicioIso,
        servicio_nombre: result.servicioNombre,
        profesional_nombre: result.profesionalNombre,
      },
    };
  }

  return { name: toolName, result: { error: `tool desconocida: ${toolName}` } };
}
