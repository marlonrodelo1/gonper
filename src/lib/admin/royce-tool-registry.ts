/**
 * Registro de tools de Royce admin Telegram (plataforma-wide).
 *
 * A diferencia de `tool-registry.ts` (tools por salón, ejecutadas por
 * Juanita Pro desde el bot multi-tenant), estas son tools globales para
 * que Marlon hable con Royce vía @Royrogo_bot y vea el estado de TODA
 * la plataforma Gonper Studio.
 */

import { z } from 'zod';

import {
  getMetricasGlobales,
  infoSalon,
  leadsRecientes,
  listarSalones,
  marcasActivas,
  productosCatalogo,
  ventasB2cRecientes,
} from './royce-tools';

export type RoyceCategoria =
  | 'metricas'
  | 'salones'
  | 'tienda'
  | 'captacion'
  | 'sistema';

export const ROYCE_CATEGORIA_LABEL: Record<RoyceCategoria, string> = {
  metricas: '📊 *Métricas*',
  salones: '🏪 *Salones*',
  tienda: '🛍️ *Tienda online*',
  captacion: '📥 *Captación*',
  sistema: '⚙️ *Sistema*',
};

const ROYCE_CATEGORIA_ORDEN: RoyceCategoria[] = [
  'metricas',
  'salones',
  'tienda',
  'captacion',
  'sistema',
];

export interface RoyceToolDef<S extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  categoria: RoyceCategoria;
  descripcion: string;
  ejemplos: string[];
  schema: S;
  handler: (args: z.infer<S>) => Promise<unknown>;
}

export type AnyRoyceToolDef = RoyceToolDef<z.ZodTypeAny>;

function defineTool<S extends z.ZodTypeAny>(def: RoyceToolDef<S>): AnyRoyceToolDef {
  return def as unknown as AnyRoyceToolDef;
}

export const ROYCE_TOOLS: AnyRoyceToolDef[] = [
  // ---------- MÉTRICAS ----------
  defineTool({
    name: 'metricas_globales',
    categoria: 'metricas',
    descripcion: 'Resumen de plataforma: salones, MRR, ventas y leads del mes.',
    ejemplos: ['"cómo va el mes"', '"métricas globales"', '"resumen plataforma"'],
    schema: z.object({}).strict(),
    handler: () => getMetricasGlobales(),
  }),

  // ---------- SALONES ----------
  defineTool({
    name: 'listar_salones',
    categoria: 'salones',
    descripcion: 'Lista los últimos salones registrados (por defecto 10).',
    ejemplos: ['"últimos salones"', '"lista de salones"', '"salones nuevos"'],
    schema: z
      .object({
        limite: z.number().int().positive().max(50).optional(),
      })
      .strict(),
    handler: (args) => listarSalones({ limite: args.limite }),
  }),
  defineTool({
    name: 'info_salon',
    categoria: 'salones',
    descripcion: 'Detalle de un salón por su slug (plan, trial, Stripe, etc.).',
    ejemplos: ['"info de dadi"', '"cómo está el salón salon-demo"'],
    schema: z
      .object({
        slug: z.string().min(1).max(120),
      })
      .strict(),
    handler: (args) => infoSalon({ slug: args.slug }),
  }),

  // ---------- TIENDA ----------
  defineTool({
    name: 'ventas_b2c_recientes',
    categoria: 'tienda',
    descripcion: 'Últimas ventas B2C de la plataforma (por defecto 5).',
    ejemplos: ['"últimas ventas"', '"ventas recientes"'],
    schema: z
      .object({
        limite: z.number().int().positive().max(20).optional(),
      })
      .strict(),
    handler: (args) => ventasB2cRecientes({ limite: args.limite }),
  }),
  defineTool({
    name: 'marcas_activas',
    categoria: 'tienda',
    descripcion: 'Lista las marcas activas con su comisión y productos.',
    ejemplos: ['"qué marcas tenemos"', '"marcas activas"'],
    schema: z.object({}).strict(),
    handler: () => marcasActivas(),
  }),
  defineTool({
    name: 'productos_catalogo',
    categoria: 'tienda',
    descripcion: 'Lista productos del catálogo, opcionalmente filtrado por marca.',
    ejemplos: ['"productos"', '"productos de wella-professionals"'],
    schema: z
      .object({
        marca_slug: z.string().min(1).max(120).optional(),
        limite: z.number().int().positive().max(30).optional(),
      })
      .strict(),
    handler: (args) => productosCatalogo(args),
  }),

  // ---------- CAPTACIÓN ----------
  defineTool({
    name: 'leads_recientes',
    categoria: 'captacion',
    descripcion: 'Últimos leads capturados (chat landing). Opcional: solo no convertidos.',
    ejemplos: ['"leads"', '"leads sin convertir"', '"últimos 5 leads"'],
    schema: z
      .object({
        limite: z.number().int().positive().max(20).optional(),
        solo_no_convertidos: z.boolean().optional(),
      })
      .strict(),
    handler: (args) => leadsRecientes(args),
  }),

  // ---------- SISTEMA ----------
  defineTool({
    name: 'comando_help',
    categoria: 'sistema',
    descripcion: 'Lista todas las cosas que puedo hacer como Royce.',
    ejemplos: ['"/help"', '"ayuda"', '"qué puedes hacer"'],
    schema: z.object({}).strict(),
    handler: async () => ({ mensaje: renderRoyceHelp() }),
  }),
];

const ROYCE_BY_NAME: Map<string, AnyRoyceToolDef> = new Map(
  ROYCE_TOOLS.map((t) => [t.name, t]),
);

export function getRoyceTool(name: string): AnyRoyceToolDef | undefined {
  return ROYCE_BY_NAME.get(name);
}

export function renderRoyceHelp(): string {
  const grupos = new Map<RoyceCategoria, AnyRoyceToolDef[]>();
  for (const t of ROYCE_TOOLS) {
    const arr = grupos.get(t.categoria) ?? [];
    arr.push(t);
    grupos.set(t.categoria, arr);
  }

  const partes: string[] = [
    '*🤵 Soy Royce — director de Gonper Studio.* Esto es lo que veo de la plataforma:',
    '',
  ];

  for (const cat of ROYCE_CATEGORIA_ORDEN) {
    const tools = grupos.get(cat);
    if (!tools || tools.length === 0) continue;
    partes.push(ROYCE_CATEGORIA_LABEL[cat]);
    for (const t of tools) {
      const ejemplo = t.ejemplos[0] ? ` — ${t.ejemplos[0]}` : '';
      partes.push(`• ${t.descripcion}${ejemplo}`);
    }
    partes.push('');
  }

  partes.push('Estoy en construcción: pronto podré también dar de alta salones, cambiar planes y mandar mensajes a dueños.');
  return partes.join('\n').trim();
}
