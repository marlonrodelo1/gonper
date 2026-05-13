import 'server-only';

import { and, desc, eq, gte, isNotNull, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  horarios,
  leads,
  marcas,
  productos,
  profesionales,
  salones,
  servicios,
  ventasB2c,
} from '@/lib/db/schema';
import {
  HORARIOS_DEFAULT,
  SERVICIOS_POR_TIPO,
} from './salon-seeds';

/**
 * Tools de Royce admin Telegram — operaciones plataforma-wide.
 *
 * A diferencia de `src/lib/admin/tools.ts` (que opera sobre 1 salón
 * concreto), estas tools son globales: leen métricas, listan salones de
 * toda la plataforma, ven leads sin convertir, etc. Solo Marlon (super
 * admin) debe poder ejecutarlas vía el bot @Royrogo_bot en Telegram.
 *
 * Todas devuelven `{ mensaje: string }` con Markdown listo para reenviar
 * tal cual al chat del super admin.
 */

const TZ = 'Europe/Madrid';

function fmtEur(n: unknown): string {
  const num = Number(n ?? 0);
  return num.toFixed(2).replace('.', ',') + ' €';
}

function fmtFecha(d: Date | string | null): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
    timeZone: TZ,
  }).format(date);
}

function inicioDeMes(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

// ============================================
// MÉTRICAS GLOBALES
// ============================================
export async function getMetricasGlobales(): Promise<{ mensaje: string }> {
  const inicioMes = inicioDeMes();

  const [planesRow] = await db
    .select({
      total: sql<number>`count(*)::int`,
      trial: sql<number>`count(*) filter (where plan = 'trial')::int`,
      activos: sql<number>`count(*) filter (where plan in ('basico','solo','studio','pro'))::int`,
      cancelados: sql<number>`count(*) filter (where plan = 'cancelado')::int`,
    })
    .from(salones);

  const [ventasMesRow] = await db
    .select({
      total: sql<number>`count(*)::int`,
      ingresos: sql<string>`coalesce(sum(total_eur), 0)::text`,
      comisionSalones: sql<string>`coalesce(sum(comision_salon_eur), 0)::text`,
      costeMarcas: sql<string>`coalesce(sum(coste_marca_eur), 0)::text`,
    })
    .from(ventasB2c)
    .where(
      and(
        gte(ventasB2c.createdAt, inicioMes),
        sql`${ventasB2c.estado} in ('pagada','pendiente_tramitar_marca','tramitada_marca','recogida')`,
      ),
    );

  const [leadsRow] = await db
    .select({
      total: sql<number>`count(*)::int`,
      sinConvertir: sql<number>`count(*) filter (where convertido = false)::int`,
    })
    .from(leads)
    .where(gte(leads.createdAt, inicioMes));

  const ingresosNum = Number(ventasMesRow?.ingresos ?? 0);
  const comisionNum = Number(ventasMesRow?.comisionSalones ?? 0);
  const costeNum = Number(ventasMesRow?.costeMarcas ?? 0);
  const margenRogotech = ingresosNum - comisionNum - costeNum;
  const mrr = Number(planesRow?.activos ?? 0) * 30;

  const lineas = [
    '*📊 Métricas globales · Gonper Studio*',
    '',
    '*Salones*',
    `• Total: ${planesRow?.total ?? 0}`,
    `• En trial: ${planesRow?.trial ?? 0}`,
    `• Activos (pagando): ${planesRow?.activos ?? 0}`,
    `• Cancelados: ${planesRow?.cancelados ?? 0}`,
    '',
    '*Recurrente*',
    `• MRR estimado: ${fmtEur(mrr)} (${planesRow?.activos ?? 0} × 30 €)`,
    '',
    '*Tienda online (mes actual)*',
    `• Ventas: ${ventasMesRow?.total ?? 0}`,
    `• Ingresos brutos: ${fmtEur(ingresosNum)}`,
    `• Comisión transferida a salones: ${fmtEur(comisionNum)}`,
    `• Coste a pagar a marcas: ${fmtEur(costeNum)}`,
    `• Margen Rogotech: ${fmtEur(margenRogotech)}`,
    '',
    '*Captación (mes actual)*',
    `• Leads totales: ${leadsRow?.total ?? 0}`,
    `• Leads sin convertir: ${leadsRow?.sinConvertir ?? 0}`,
  ];

  return { mensaje: lineas.join('\n') };
}

// ============================================
// LISTAR SALONES
// ============================================
export async function listarSalones(args: {
  limite?: number;
}): Promise<{ mensaje: string }> {
  const limite = Math.min(50, Math.max(1, args.limite ?? 10));

  const rows = await db
    .select({
      slug: salones.slug,
      nombre: salones.nombre,
      plan: salones.plan,
      trialUntil: salones.trialUntil,
      tipoNegocio: salones.tipoNegocio,
      createdAt: salones.createdAt,
    })
    .from(salones)
    .orderBy(desc(salones.createdAt))
    .limit(limite);

  if (rows.length === 0) {
    return { mensaje: '_No hay salones registrados todavía._' };
  }

  const lineas = [`*🏪 Salones (últimos ${rows.length})*`, ''];
  for (const r of rows) {
    const planIcon =
      r.plan === 'trial'
        ? '🟡'
        : r.plan === 'cancelado'
          ? '🔴'
          : '🟢';
    const tipo = r.tipoNegocio ?? '—';
    const desde = fmtFecha(r.createdAt);
    lineas.push(
      `${planIcon} *${r.nombre}* · /${r.slug}\n   ${tipo} · ${r.plan} · desde ${desde}`,
    );
  }

  return { mensaje: lineas.join('\n') };
}

// ============================================
// INFO DE 1 SALÓN
// ============================================
export async function infoSalon(args: {
  slug: string;
}): Promise<{ mensaje: string }> {
  const [s] = await db
    .select()
    .from(salones)
    .where(eq(salones.slug, args.slug.trim()))
    .limit(1);

  if (!s) {
    return { mensaje: `❌ No encontré ningún salón con slug \`${args.slug}\`.` };
  }

  const [ventasRow] = await db
    .select({
      total: sql<number>`count(*)::int`,
      ingresos: sql<string>`coalesce(sum(total_eur), 0)::text`,
    })
    .from(ventasB2c)
    .where(eq(ventasB2c.salonId, s.id));

  const lineas = [
    `*🏪 ${s.nombre}*`,
    `_${s.slug} · ${s.tipoNegocio ?? '—'}_`,
    '',
    `• Plan: *${s.plan}*`,
    `• Trial hasta: ${fmtFecha(s.trialUntil)}`,
    `• Stripe Connect: ${s.stripeConnectOnboarded ? '✅ listo' : s.stripeConnectAccountId ? '🟡 pendiente' : '⚪ sin conectar'}`,
    `• Telegram dueño: ${s.telegramChatIdDueno ? '✅ vinculado' : '⚪ sin vincular'}`,
    `• Ciudad: ${s.ciudad ?? '—'}`,
    `• Email: ${s.email ?? '—'}`,
    '',
    `*Tienda online*`,
    `• Ventas: ${ventasRow?.total ?? 0}`,
    `• Ingresos: ${fmtEur(ventasRow?.ingresos ?? 0)}`,
    '',
    `Web: https://gonperstudio.shop/s/${s.slug}`,
  ];

  return { mensaje: lineas.join('\n') };
}

// ============================================
// VENTAS B2C RECIENTES
// ============================================
export async function ventasB2cRecientes(args: {
  limite?: number;
}): Promise<{ mensaje: string }> {
  const limite = Math.min(20, Math.max(1, args.limite ?? 5));

  const rows = await db
    .select({
      numero: ventasB2c.numero,
      total: ventasB2c.totalEur,
      estado: ventasB2c.estado,
      clienteNombre: ventasB2c.clienteNombre,
      salonNombre: salones.nombre,
      salonSlug: salones.slug,
      createdAt: ventasB2c.createdAt,
    })
    .from(ventasB2c)
    .innerJoin(salones, eq(salones.id, ventasB2c.salonId))
    .orderBy(desc(ventasB2c.createdAt))
    .limit(limite);

  if (rows.length === 0) {
    return { mensaje: '_Aún no hay ventas B2C en la plataforma._' };
  }

  const lineas = [`*🛍️ Últimas ${rows.length} ventas*`, ''];
  for (const r of rows) {
    const cliente = r.clienteNombre ?? 'cliente';
    lineas.push(
      `• *${r.numero}* · ${fmtEur(r.total)} · ${r.estado}\n   ${cliente} → /${r.salonSlug} · ${fmtFecha(r.createdAt)}`,
    );
  }

  return { mensaje: lineas.join('\n') };
}

// ============================================
// MARCAS ACTIVAS
// ============================================
export async function marcasActivas(): Promise<{ mensaje: string }> {
  const rows = await db
    .select({
      slug: marcas.slug,
      nombre: marcas.nombre,
      comision: marcas.comisionSalonPorcentaje,
      productosCount: sql<number>`(select count(*) from productos where productos.marca_id = ${marcas.id} and productos.activo = true)::int`,
    })
    .from(marcas)
    .where(eq(marcas.activa, true));

  if (rows.length === 0) {
    return { mensaje: '_No hay marcas activas._' };
  }

  const lineas = [`*🏷️ Marcas activas (${rows.length})*`, ''];
  for (const r of rows) {
    lineas.push(
      `• *${r.nombre}* · ${Number(r.comision)}% comisión salón · ${r.productosCount} productos`,
    );
  }

  return { mensaje: lineas.join('\n') };
}

// ============================================
// LEADS RECIENTES
// ============================================
export async function leadsRecientes(args: {
  limite?: number;
  solo_no_convertidos?: boolean;
}): Promise<{ mensaje: string }> {
  const limite = Math.min(20, Math.max(1, args.limite ?? 10));

  const whereClause = args.solo_no_convertidos
    ? eq(leads.convertido, false)
    : undefined;

  const rows = await db
    .select({
      email: leads.email,
      nombre: leads.nombre,
      tipoNegocio: leads.tipoNegocio,
      convertido: leads.convertido,
      createdAt: leads.createdAt,
    })
    .from(leads)
    .where(whereClause)
    .orderBy(desc(leads.createdAt))
    .limit(limite);

  if (rows.length === 0) {
    return { mensaje: '_No hay leads que cumplan ese criterio._' };
  }

  const titulo = args.solo_no_convertidos
    ? `📥 Leads sin convertir (${rows.length})`
    : `📥 Leads recientes (${rows.length})`;
  const lineas = [`*${titulo}*`, ''];
  for (const r of rows) {
    const estado = r.convertido ? '✅' : '🟡';
    const nombre = r.nombre ?? '—';
    const tipo = r.tipoNegocio ?? '—';
    lineas.push(
      `${estado} *${nombre}* · ${tipo}\n   ${r.email} · ${fmtFecha(r.createdAt)}`,
    );
  }

  return { mensaje: lineas.join('\n') };
}

// ============================================
// PRODUCTOS DESTACADOS / CATÁLOGO
// ============================================
export async function productosCatalogo(args: {
  marca_slug?: string;
  limite?: number;
}): Promise<{ mensaje: string }> {
  const limite = Math.min(30, Math.max(1, args.limite ?? 10));

  // Tratar "" o whitespace como undefined (el AI Agent puede mandar "" cuando el LLM no provee el placeholder)
  const marcaSlug = args.marca_slug?.trim() || undefined;

  let marcaId: string | null = null;
  if (marcaSlug) {
    const [m] = await db
      .select({ id: marcas.id, nombre: marcas.nombre })
      .from(marcas)
      .where(eq(marcas.slug, marcaSlug))
      .limit(1);
    if (!m) {
      return { mensaje: `❌ No encontré la marca \`${marcaSlug}\`.` };
    }
    marcaId = m.id;
  }

  const whereClause = marcaId
    ? and(eq(productos.activo, true), eq(productos.marcaId, marcaId))
    : eq(productos.activo, true);

  const rows = await db
    .select({
      sku: productos.sku,
      nombre: productos.nombre,
      pvp: productos.precioPublicoRecomendadoEur,
      tipo: productos.tipoDistribucion,
      marcaNombre: marcas.nombre,
    })
    .from(productos)
    .innerJoin(marcas, eq(marcas.id, productos.marcaId))
    .where(whereClause)
    .orderBy(desc(productos.createdAt))
    .limit(limite);

  if (rows.length === 0) {
    return { mensaje: '_No hay productos que cumplan ese criterio._' };
  }

  const lineas = [`*📦 Productos (${rows.length})*`, ''];
  for (const r of rows) {
    const skuStr = r.sku ? ` · \`${r.sku}\`` : '';
    lineas.push(
      `• *${r.nombre}* · ${r.marcaNombre}${skuStr}\n   ${fmtEur(r.pvp)} · ${r.tipo}`,
    );
  }

  return { mensaje: lineas.join('\n') };
}

// ============================================
// CAPTURAR LEAD (landing — Royce comercial)
// ============================================
export async function capturarLead(args: {
  email: string;
  nombre?: string;
  tipo_negocio?: 'barberia' | 'peluqueria' | 'estetica' | 'manicura' | 'otro';
  dolor?: string;
}): Promise<{ mensaje: string; lead_id?: string; ya_existia?: boolean }> {
  const email = args.email.trim().toLowerCase();
  // Tratar "" como undefined (el AI Agent puede mandar "" cuando el LLM no provee el placeholder)
  const nombre = args.nombre?.trim() || null;
  const tipoNegocio = args.tipo_negocio?.trim() || null;
  const dolor = args.dolor?.trim() || null;

  const existing = await db
    .select({ id: leads.id, convertido: leads.convertido })
    .from(leads)
    .where(eq(leads.email, email))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(leads)
      .set({
        nombre,
        tipoNegocio,
        dolorPrincipal: dolor,
      })
      .where(eq(leads.id, existing[0].id));
    return {
      mensaje: `✅ Datos actualizados para ${email}. Te contactaremos pronto.`,
      lead_id: existing[0].id,
      ya_existia: true,
    };
  }

  const [inserted] = await db
    .insert(leads)
    .values({
      email,
      nombre,
      tipoNegocio,
      dolorPrincipal: dolor,
      origen: 'landing_chat',
    })
    .returning({ id: leads.id });

  return {
    mensaje: `✅ ¡Gracias! Apuntado ${email}. Te contactaremos en menos de 24h.`,
    lead_id: inserted.id,
    ya_existia: false,
  };
}

// ============================================
// MUTACIONES — solo si las llama Marlon (super admin)
// ============================================
//
// Tools de escritura para que Royce pueda gestionar la plataforma desde
// Telegram. El AI Agent debe pedir confirmación explícita ("¿confirmas?
// sí/no") antes de invocarlas — el system prompt lo refuerza.

const PLANES_VALIDOS = ['trial', 'basico', 'solo', 'studio', 'pro', 'cancelado'] as const;
type PlanValido = (typeof PLANES_VALIDOS)[number];

const TIPOS_NEGOCIO_VALIDOS = ['barberia', 'peluqueria', 'estetica', 'manicura', 'otro'] as const;
type TipoNegocioValido = (typeof TIPOS_NEGOCIO_VALIDOS)[number];

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ============================================
// CREAR SALÓN (sin user — Marlon vincula después)
// ============================================
export async function crearSalon(args: {
  nombre: string;
  slug: string;
  tipo_negocio: TipoNegocioValido;
  email?: string;
  telefono?: string;
  direccion?: string;
}): Promise<{ mensaje: string; salon_id?: string; slug?: string }> {
  const nombre = args.nombre.trim();
  const slug = slugify(args.slug);
  if (!nombre || !slug) {
    return { mensaje: '❌ Necesito nombre y slug válidos.' };
  }
  if (!TIPOS_NEGOCIO_VALIDOS.includes(args.tipo_negocio)) {
    return {
      mensaje: `❌ tipo_negocio inválido. Usa uno de: ${TIPOS_NEGOCIO_VALIDOS.join(', ')}.`,
    };
  }

  const existing = await db
    .select({ id: salones.id })
    .from(salones)
    .where(eq(salones.slug, slug))
    .limit(1);
  if (existing.length > 0) {
    return { mensaje: `❌ Ya existe un salón con slug \`${slug}\`. Prueba otro.` };
  }

  const trialUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [salon] = await db
    .insert(salones)
    .values({
      slug,
      nombre,
      tipoNegocio: args.tipo_negocio,
      email: args.email?.trim() || null,
      telefono: args.telefono?.trim() || null,
      direccion: args.direccion?.trim() || null,
      plan: 'trial',
      trialUntil,
    })
    .returning({ id: salones.id, slug: salones.slug });

  // Seeds: servicios, horarios, profesional default
  const serviciosSeed =
    SERVICIOS_POR_TIPO[args.tipo_negocio] ?? SERVICIOS_POR_TIPO.otro;
  try {
    await db.insert(servicios).values(
      serviciosSeed.map((s) => ({
        salonId: salon.id,
        nombre: s.nombre,
        duracionMin: s.duracion_min,
        precioEur: String(s.precio_eur),
        orden: s.orden,
        esDefault: true,
      })),
    );
  } catch (e) {
    console.warn('[royce:crearSalon] seed servicios:', e);
  }
  try {
    await db.insert(horarios).values(
      HORARIOS_DEFAULT.map((h) => ({
        salonId: salon.id,
        diaSemana: h.dia_semana,
        inicio: h.inicio,
        fin: h.fin,
        esDefault: true,
      })),
    );
  } catch (e) {
    console.warn('[royce:crearSalon] seed horarios:', e);
  }
  try {
    await db.insert(profesionales).values({
      salonId: salon.id,
      nombre,
      colorHex: '#8B9D7A',
      orden: 0,
      esDefault: true,
    });
  } catch (e) {
    console.warn('[royce:crearSalon] seed profesional:', e);
  }

  return {
    mensaje: `✅ Salón *${nombre}* creado con slug \`${slug}\`. Trial 7d activado. El dueño aún no está vinculado — invítale a registrarse (signup con este email creará usuario, pero el slug ya está tomado; mejor crear el user manual desde Supabase o cambiar la lógica más adelante).`,
    salon_id: salon.id,
    slug: salon.slug,
  };
}

// ============================================
// CAMBIAR PLAN DE UN SALÓN
// ============================================
export async function cambiarPlanSalon(args: {
  slug: string;
  plan: PlanValido;
}): Promise<{ mensaje: string }> {
  if (!PLANES_VALIDOS.includes(args.plan)) {
    return {
      mensaje: `❌ Plan inválido. Usa uno de: ${PLANES_VALIDOS.join(', ')}.`,
    };
  }
  const slug = args.slug.trim();

  const result = await db
    .update(salones)
    .set({
      plan: args.plan,
      // Si el plan no es trial, limpiamos trialUntil (ya pagó o se canceló).
      ...(args.plan === 'trial'
        ? {}
        : { trialUntil: null }),
      updatedAt: new Date(),
    })
    .where(eq(salones.slug, slug))
    .returning({ id: salones.id, nombre: salones.nombre });

  if (result.length === 0) {
    return { mensaje: `❌ No encontré salón con slug \`${slug}\`.` };
  }
  return {
    mensaje: `✅ Plan de *${result[0].nombre}* cambiado a *${args.plan}*.`,
  };
}

// ============================================
// CREAR MARCA
// ============================================
export async function crearMarca(args: {
  nombre: string;
  slug?: string;
  comision_salon_porcentaje?: number;
  descripcion?: string;
  logo_url?: string;
  contacto_email?: string;
}): Promise<{ mensaje: string; marca_id?: string }> {
  const nombre = args.nombre.trim();
  const slug = slugify(args.slug?.trim() || nombre);
  if (!nombre || !slug) {
    return { mensaje: '❌ Necesito al menos el nombre de la marca.' };
  }

  const existing = await db
    .select({ id: marcas.id })
    .from(marcas)
    .where(eq(marcas.slug, slug))
    .limit(1);
  if (existing.length > 0) {
    return { mensaje: `❌ Ya existe una marca con slug \`${slug}\`.` };
  }

  const comision = Number(args.comision_salon_porcentaje ?? 0);
  if (comision < 0 || comision > 100) {
    return { mensaje: '❌ La comisión del salón debe estar entre 0 y 100.' };
  }

  const [marca] = await db
    .insert(marcas)
    .values({
      slug,
      nombre,
      descripcion: args.descripcion?.trim() || null,
      logoUrl: args.logo_url?.trim() || null,
      contactoEmail: args.contacto_email?.trim() || null,
      comisionSalonPorcentaje: comision.toFixed(2),
      activa: true,
    })
    .returning({ id: marcas.id });

  return {
    mensaje: `✅ Marca *${nombre}* creada (slug \`${slug}\`, comisión salón ${comision}%).`,
    marca_id: marca.id,
  };
}

// ============================================
// CREAR PRODUCTO
// ============================================
export async function crearProducto(args: {
  marca_slug: string;
  nombre: string;
  categoria: string;
  precio_publico_recomendado_eur: number;
  precio_mayorista_eur?: number;
  slug?: string;
  sku?: string;
  tipo_distribucion?: 'stock' | 'dropshipping';
}): Promise<{ mensaje: string; producto_id?: string }> {
  const marcaSlug = args.marca_slug.trim();
  const [marca] = await db
    .select({ id: marcas.id, nombre: marcas.nombre })
    .from(marcas)
    .where(eq(marcas.slug, marcaSlug))
    .limit(1);
  if (!marca) {
    return { mensaje: `❌ No encontré la marca \`${marcaSlug}\`.` };
  }

  const nombre = args.nombre.trim();
  const slug = slugify(args.slug?.trim() || nombre);
  const categoria = args.categoria.trim();
  if (!nombre || !slug || !categoria) {
    return { mensaje: '❌ Necesito nombre, slug y categoría.' };
  }

  const pvp = Number(args.precio_publico_recomendado_eur);
  if (isNaN(pvp) || pvp < 0) {
    return { mensaje: '❌ El precio público recomendado debe ser un número >= 0.' };
  }
  const pvpMayorista =
    args.precio_mayorista_eur !== undefined
      ? Number(args.precio_mayorista_eur)
      : pvp * 0.6; // default 60% del PVP

  const tipo = args.tipo_distribucion ?? 'stock';

  const existing = await db
    .select({ id: productos.id })
    .from(productos)
    .where(and(eq(productos.marcaId, marca.id), eq(productos.slug, slug)))
    .limit(1);
  if (existing.length > 0) {
    return {
      mensaje: `❌ Ya existe un producto con slug \`${slug}\` en la marca *${marca.nombre}*.`,
    };
  }

  const [producto] = await db
    .insert(productos)
    .values({
      marcaId: marca.id,
      slug,
      nombre,
      categoria,
      tipoDistribucion: tipo,
      sku: args.sku?.trim() || null,
      precioMayoristaEur: pvpMayorista.toFixed(2),
      precioPublicoRecomendadoEur: pvp.toFixed(2),
      activo: true,
    })
    .returning({ id: productos.id });

  return {
    mensaje: `✅ Producto *${nombre}* creado en marca *${marca.nombre}* (PVP ${fmtEur(pvp)}, mayorista ${fmtEur(pvpMayorista)}).`,
    producto_id: producto.id,
  };
}

// ============================================
// MARCAR / DESMARCAR DESTACADO EN MARKETPLACE
// ============================================
export async function marcarDestacado(args: {
  salon_slug: string;
  orden?: number;
}): Promise<{ mensaje: string }> {
  const slug = args.salon_slug.trim();
  const orden = Number.isInteger(args.orden) ? args.orden : 0;

  const result = await db
    .update(salones)
    .set({
      marketplaceDestacado: true,
      marketplaceDestacadoOrden: orden,
      updatedAt: new Date(),
    })
    .where(eq(salones.slug, slug))
    .returning({ nombre: salones.nombre });
  if (result.length === 0) {
    return { mensaje: `❌ No encontré salón con slug \`${slug}\`.` };
  }
  return {
    mensaje: `✅ *${result[0].nombre}* destacado en marketplace (orden ${orden}).`,
  };
}

export async function desmarcarDestacado(args: {
  salon_slug: string;
}): Promise<{ mensaje: string }> {
  const slug = args.salon_slug.trim();

  const result = await db
    .update(salones)
    .set({
      marketplaceDestacado: false,
      marketplaceDestacadoOrden: null,
      updatedAt: new Date(),
    })
    .where(eq(salones.slug, slug))
    .returning({ nombre: salones.nombre });
  if (result.length === 0) {
    return { mensaje: `❌ No encontré salón con slug \`${slug}\`.` };
  }
  return { mensaje: `✅ *${result[0].nombre}* removido de destacados.` };
}

// Avoid unused import
void isNotNull;
