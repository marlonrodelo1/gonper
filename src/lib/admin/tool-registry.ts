/**
 * Registro central de tools admin.
 *
 * Cada tool declara su nombre, categoría, descripción y handler (que recibe
 * salonId + args validados con Zod). El dispatcher /api/v1/admin/tool y la
 * tool /help se basan en este registro, así que añadir una tool aquí basta
 * para que aparezca en ambos sitios.
 */

import { z } from 'zod';

import {
  cancelarCita,
  compartirTienda,
  crearCita,
  getCitasHoy,
  getCitasProximas,
  getIngresos,
  getNoShows,
  getTopClientes,
  marcarCita,
  moverCita,
} from './tools';

export type ToolCategoria =
  | 'citas'
  | 'clientes'
  | 'numeros'
  | 'crecimiento'
  | 'sistema';

export const CATEGORIA_LABEL: Record<ToolCategoria, string> = {
  citas: '📅 *Citas*',
  clientes: '👥 *Clientes*',
  numeros: '💰 *Números*',
  crecimiento: '🚀 *Crecimiento*',
  sistema: '⚙️ *Opciones*',
};

const CATEGORIA_ORDEN: ToolCategoria[] = [
  'citas',
  'clientes',
  'numeros',
  'crecimiento',
  'sistema',
];

/** Definición pública de una tool. */
export interface ToolDef<S extends z.ZodTypeAny = z.ZodTypeAny> {
  /** Nombre que el LLM usa para llamarla. */
  name: string;
  categoria: ToolCategoria;
  /** Descripción corta, se muestra en /help. */
  descripcion: string;
  /** Ejemplos de cómo el dueño le pediría esto al bot, en lenguaje natural. */
  ejemplos: string[];
  /** Schema Zod para validar args. */
  schema: S;
  /** Handler que recibe args ya validados. */
  handler: (salonId: string, args: z.infer<S>) => Promise<unknown>;
}

// Para que el array sea heterogéneo en los schemas pero homogéneo en runtime.
export type AnyToolDef = ToolDef<z.ZodTypeAny>;

function defineTool<S extends z.ZodTypeAny>(def: ToolDef<S>): AnyToolDef {
  return def as unknown as AnyToolDef;
}

// ============================================================
// REGISTRO DE TOOLS
// ============================================================
export const TOOLS: AnyToolDef[] = [
  // ---------- CITAS (lectura) ----------
  defineTool({
    name: 'citas_hoy',
    categoria: 'citas',
    descripcion: 'Listar citas de hoy.',
    ejemplos: ['"¿qué citas tengo hoy?"', '"agenda de hoy"'],
    schema: z.object({}).strict(),
    handler: (salonId) => getCitasHoy(salonId),
  }),
  defineTool({
    name: 'citas_proximas',
    categoria: 'citas',
    descripcion: 'Listar citas próximas (por defecto 7 días).',
    ejemplos: ['"citas de los próximos 3 días"', '"qué tengo esta semana"'],
    schema: z
      .object({
        dias: z.number().int().positive().max(60).optional(),
      })
      .strict(),
    handler: (salonId, args) => getCitasProximas(salonId, args.dias ?? 7),
  }),

  // ---------- CITAS (acción) ----------
  defineTool({
    name: 'crear_cita',
    categoria: 'citas',
    descripcion: 'Crear una cita rápida desde el chat.',
    ejemplos: [
      '"agenda a María mañana 16h corte"',
      '"crea cita con Juan el viernes 10:30, manicura"',
    ],
    schema: z
      .object({
        cliente_nombre: z.string().min(1).max(120),
        cliente_telefono: z.string().min(3).max(30).optional(),
        cliente_email: z.string().email().max(200).optional(),
        servicio_nombre: z.string().min(1).max(120),
        inicio_iso: z.string().min(10).max(40),
        profesional_nombre: z.string().min(1).max(120).optional(),
      })
      .strict(),
    handler: (salonId, args) => crearCita(salonId, args),
  }),
  defineTool({
    name: 'cancelar_cita',
    categoria: 'citas',
    descripcion: 'Cancelar una cita.',
    ejemplos: ['"cancela la cita de las 10h"'],
    schema: z
      .object({
        cita_id: z.string().uuid(),
        motivo: z.string().max(500).optional(),
      })
      .strict(),
    handler: (salonId, args) => cancelarCita(salonId, args.cita_id, args.motivo),
  }),
  defineTool({
    name: 'mover_cita',
    categoria: 'citas',
    descripcion: 'Mover una cita a otra hora.',
    ejemplos: ['"mueve la cita de María a las 18h"'],
    schema: z
      .object({
        cita_id: z.string().uuid(),
        nuevo_inicio_iso: z.string().min(10).max(40),
      })
      .strict(),
    handler: (salonId, args) => moverCita(salonId, args.cita_id, args.nuevo_inicio_iso),
  }),
  defineTool({
    name: 'marcar_cita',
    categoria: 'citas',
    descripcion: 'Marcar el estado de una cita (no_show / completada / confirmada).',
    ejemplos: [
      '"marca la cita de Ana como completada"',
      '"Pedro no vino, no_show"',
    ],
    schema: z
      .object({
        cita_id: z.string().uuid(),
        estado: z.enum(['no_show', 'completada', 'confirmada']),
      })
      .strict(),
    handler: (salonId, args) => marcarCita(salonId, args.cita_id, args.estado),
  }),

  // ---------- CLIENTES ----------
  defineTool({
    name: 'top_clientes',
    categoria: 'clientes',
    descripcion: 'Top clientes por número de citas.',
    ejemplos: ['"¿quiénes son mis 3 mejores clientes?"', '"top 10 clientes"'],
    schema: z
      .object({
        limite: z.number().int().positive().max(50).optional(),
      })
      .strict(),
    handler: (salonId, args) => getTopClientes(salonId, args.limite ?? 5),
  }),

  // ---------- NÚMEROS ----------
  defineTool({
    name: 'ingresos',
    categoria: 'numeros',
    descripcion: 'Ingresos del periodo (hoy, semana o mes).',
    ejemplos: ['"¿cuánto facturé hoy?"', '"ingresos del mes"'],
    schema: z
      .object({
        periodo: z.enum(['hoy', 'semana', 'mes']).optional(),
      })
      .strict(),
    handler: (salonId, args) => getIngresos(salonId, args.periodo ?? 'hoy'),
  }),
  defineTool({
    name: 'no_shows',
    categoria: 'numeros',
    descripcion: 'Lista de no-shows recientes.',
    ejemplos: ['"no-shows del mes"', '"quién me ha plantado últimamente"'],
    schema: z
      .object({
        dias: z.number().int().positive().max(365).optional(),
      })
      .strict(),
    handler: (salonId, args) => getNoShows(salonId, args.dias ?? 30),
  }),

  // ---------- CRECIMIENTO ----------
  defineTool({
    name: 'compartir_tienda',
    categoria: 'crecimiento',
    descripcion: 'Comparte tu link de reservas con clientes (WhatsApp, copy, QR).',
    ejemplos: [
      '"comparte mi link"',
      '"manda el link a +34611222333"',
      '"comparte tienda a María 611222333"',
    ],
    schema: z
      .object({
        numero_destino: z.string().min(3).max(30).optional(),
        mensaje_personalizado: z.string().max(300).optional(),
      })
      .strict(),
    handler: (salonId, args) => compartirTienda(salonId, args),
  }),

  // ---------- SISTEMA ----------
  defineTool({
    name: 'comando_help',
    categoria: 'sistema',
    descripcion: 'Lista todas las cosas que puedo hacer.',
    ejemplos: ['"/help"', '"qué puedes hacer"'],
    schema: z.object({}).strict(),
    handler: async () => ({ mensaje: renderHelp() }),
  }),
];

// ============================================================
// LOOKUPS
// ============================================================
const TOOLS_BY_NAME: Map<string, AnyToolDef> = new Map(
  TOOLS.map((t) => [t.name, t]),
);

export function getTool(name: string): AnyToolDef | undefined {
  return TOOLS_BY_NAME.get(name);
}

// ============================================================
// HELP DINÁMICO
// ============================================================
/**
 * Construye el texto de /help en Markdown a partir del registro. Si añades
 * una tool al array TOOLS, aparece aquí automáticamente.
 */
export function renderHelp(): string {
  const grupos = new Map<ToolCategoria, AnyToolDef[]>();
  for (const t of TOOLS) {
    const arr = grupos.get(t.categoria) ?? [];
    arr.push(t);
    grupos.set(t.categoria, arr);
  }

  const partes: string[] = ['*🤖 Soy tu asistente. Esto es lo que puedo hacer:*', ''];

  for (const cat of CATEGORIA_ORDEN) {
    const tools = grupos.get(cat);
    if (!tools || tools.length === 0) continue;
    partes.push(CATEGORIA_LABEL[cat]);
    for (const t of tools) {
      const ejemplos = t.ejemplos.length > 0 ? ` — ${t.ejemplos[0]}` : '';
      partes.push(`• ${t.descripcion}${ejemplos}`);
    }
    partes.push('');
  }

  partes.push('También recibirás aviso aquí cada vez que un cliente reserva, confirma o cancela una cita.');
  return partes.join('\n').trim();
}
