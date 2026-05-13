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
  cambiarPlanSalon,
  capturarLead,
  crearMarca,
  crearProducto,
  crearSalon,
  desmarcarDestacado,
  getMetricasGlobales,
  infoSalon,
  leadsRecientes,
  listarSalones,
  marcarDestacado,
  marcasActivas,
  productosCatalogo,
  ventasB2cRecientes,
} from './royce-tools';

export type RoyceCategoria =
  | 'metricas'
  | 'salones'
  | 'tienda'
  | 'captacion'
  | 'gestion'
  | 'sistema';

export const ROYCE_CATEGORIA_LABEL: Record<RoyceCategoria, string> = {
  metricas: '📊 *Métricas*',
  salones: '🏪 *Salones*',
  tienda: '🛍️ *Tienda online*',
  captacion: '📥 *Captación*',
  gestion: '⚙️ *Gestión (acciones)*',
  sistema: '⚙️ *Sistema*',
};

const ROYCE_CATEGORIA_ORDEN: RoyceCategoria[] = [
  'metricas',
  'salones',
  'tienda',
  'captacion',
  'gestion',
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
  defineTool({
    name: 'capturar_lead',
    categoria: 'captacion',
    descripcion: 'Guarda email + datos del visitante de la landing como lead. Idempotente por email (actualiza si ya existe).',
    ejemplos: ['cuando el visitante deja su email en el chat'],
    schema: z
      .object({
        email: z.string().email().max(200),
        nombre: z.string().min(1).max(120).optional(),
        tipo_negocio: z
          .enum(['barberia', 'peluqueria', 'estetica', 'manicura', 'otro'])
          .optional(),
        dolor: z.string().max(2000).optional(),
      })
      .strict(),
    handler: (args) => capturarLead(args),
  }),

  // ---------- GESTIÓN (mutaciones — exigir confirmación previa) ----------
  defineTool({
    name: 'crear_salon',
    categoria: 'gestion',
    descripcion: 'Crea un salón nuevo con trial 7d, seeds de servicios/horarios/profesional. NO crea user auth — el dueño se vincula después manualmente.',
    ejemplos: ['"crea un salón Barber Tenerife"', '"añade salón con slug pepe-barber"'],
    schema: z
      .object({
        nombre: z.string().min(2).max(120),
        slug: z.string().min(2).max(120),
        tipo_negocio: z.enum(['barberia', 'peluqueria', 'estetica', 'manicura', 'otro']),
        email: z.string().email().max(200).optional(),
        telefono: z.string().max(40).optional(),
        direccion: z.string().max(300).optional(),
      })
      .strict(),
    handler: (args) => crearSalon(args),
  }),
  defineTool({
    name: 'cambiar_plan_salon',
    categoria: 'gestion',
    descripcion: 'Cambia el plan de un salón. Planes: trial, basico, solo, studio, pro, cancelado.',
    ejemplos: ['"sube el plan de dadi a basico"', '"cancela suscripción de salon-X"'],
    schema: z
      .object({
        slug: z.string().min(1).max(120),
        plan: z.enum(['trial', 'basico', 'solo', 'studio', 'pro', 'cancelado']),
      })
      .strict(),
    handler: (args) => cambiarPlanSalon(args),
  }),
  defineTool({
    name: 'crear_marca',
    categoria: 'gestion',
    descripcion: 'Crea una marca nueva en el catálogo de la tienda. Slug se autogenera del nombre si no se pasa.',
    ejemplos: ['"crea marca Wella con 10% de comisión salón"'],
    schema: z
      .object({
        nombre: z.string().min(2).max(120),
        slug: z.string().min(2).max(120).optional(),
        comision_salon_porcentaje: z.number().min(0).max(100).optional(),
        descripcion: z.string().max(2000).optional(),
        logo_url: z.string().url().max(500).optional(),
        contacto_email: z.string().email().max(200).optional(),
      })
      .strict(),
    handler: (args) => crearMarca(args),
  }),
  defineTool({
    name: 'crear_producto',
    categoria: 'gestion',
    descripcion: 'Crea un producto nuevo asociado a una marca existente. Si no se pasa precio_mayorista, se calcula como 60% del PVP.',
    ejemplos: ['"añade Champú X de Wella a 12€"'],
    schema: z
      .object({
        marca_slug: z.string().min(1).max(120),
        nombre: z.string().min(2).max(200),
        categoria: z.string().min(1).max(80),
        precio_publico_recomendado_eur: z.number().nonnegative(),
        precio_mayorista_eur: z.number().nonnegative().optional(),
        slug: z.string().min(2).max(160).optional(),
        sku: z.string().max(80).optional(),
        tipo_distribucion: z.enum(['stock', 'dropshipping']).optional(),
      })
      .strict(),
    handler: (args) => crearProducto(args),
  }),
  defineTool({
    name: 'marcar_destacado',
    categoria: 'gestion',
    descripcion: 'Destaca un salón en el marketplace (aparece al frente). orden controla la prioridad (menor = antes).',
    ejemplos: ['"destaca dadi"', '"sube barber-shop al destacado"'],
    schema: z
      .object({
        salon_slug: z.string().min(1).max(120),
        orden: z.number().int().nonnegative().optional(),
      })
      .strict(),
    handler: (args) => marcarDestacado(args),
  }),
  defineTool({
    name: 'desmarcar_destacado',
    categoria: 'gestion',
    descripcion: 'Quita a un salón del listado de destacados del marketplace.',
    ejemplos: ['"quita destacado a dadi"'],
    schema: z
      .object({
        salon_slug: z.string().min(1).max(120),
      })
      .strict(),
    handler: (args) => desmarcarDestacado(args),
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
