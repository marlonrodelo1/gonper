/**
 * Queries del marketplace público.
 *
 * No usa endpoint REST: la página `/marketplace` es Server Component
 * y consume estas funciones directamente vía Drizzle.
 */

import { and, asc, eq, ilike, ne, or, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { salones, salonesRatingCache } from '@/lib/db/schema';

export type TipoNegocio =
  | 'peluqueria'
  | 'barberia'
  | 'manicura'
  | 'estetica'
  | 'otro';

export const CATEGORIAS_MARKETPLACE: Array<{
  key: TipoNegocio;
  label: string;
  /** CSS var con el color del dot del chip. */
  dot: string;
  /** Soft de fondo para banner placeholder. */
  soft: string;
  /** Color profundo para texto sobre fondo soft. */
  deep: string;
}> = [
  { key: 'peluqueria', label: 'Peluquería', dot: '#C58E2C', soft: '#F2E4C7', deep: '#A87217' },
  { key: 'barberia', label: 'Barbería', dot: '#C5562C', soft: '#F1D9CC', deep: '#A8451F' },
  { key: 'manicura', label: 'Manicura', dot: '#D88EA0', soft: '#F3DEE3', deep: '#B66E80' },
  { key: 'estetica', label: 'Estética', dot: '#8B9D7A', soft: '#DDE3D3', deep: '#6B7C5A' },
  { key: 'otro', label: 'Otro', dot: '#8A8174', soft: '#EFE9DD', deep: '#6B6356' },
];

export function categoriaBy(key: string | null | undefined) {
  return CATEGORIAS_MARKETPLACE.find((c) => c.key === key) ?? CATEGORIAS_MARKETPLACE[4];
}

export type SalonCard = {
  slug: string;
  nombre: string;
  tipoNegocio: TipoNegocio;
  ciudad: string | null;
  descripcionCorta: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  ratingAvg: number | null;
  totalResenas: number;
};

export type MarketplaceFilters = {
  categoria?: TipoNegocio | null;
  ciudad?: string | null;
  q?: string | null;
  limit?: number;
};

const MARKETPLACE_VISIBLE = and(
  eq(salones.activo, true),
  eq(salones.marketplaceVisible, true),
  ne(salones.plan, 'cancelado'),
);

/**
 * Devuelve los salones del marketplace ya filtrados, con su rating cacheado.
 */
export async function listMarketplaceSalones(
  filters: MarketplaceFilters = {},
): Promise<SalonCard[]> {
  const conds = [MARKETPLACE_VISIBLE];

  if (filters.categoria) {
    conds.push(eq(salones.tipoNegocio, filters.categoria));
  }
  if (filters.ciudad) {
    conds.push(eq(salones.ciudad, filters.ciudad));
  }
  if (filters.q && filters.q.trim()) {
    const like = `%${filters.q.trim()}%`;
    conds.push(
      or(
        ilike(salones.nombre, like),
        ilike(salones.descripcionCorta, like),
        ilike(salones.ciudad, like),
      )!,
    );
  }

  const rows = await db
    .select({
      slug: salones.slug,
      nombre: salones.nombre,
      tipoNegocio: salones.tipoNegocio,
      ciudad: salones.ciudad,
      descripcionCorta: salones.descripcionCorta,
      logoUrl: salones.logoUrl,
      bannerUrl: salones.bannerUrl,
      ratingAvg: salonesRatingCache.ratingAvg,
      totalResenas: salonesRatingCache.totalResenas,
    })
    .from(salones)
    .leftJoin(salonesRatingCache, eq(salonesRatingCache.salonId, salones.id))
    .where(and(...conds))
    .orderBy(asc(salones.nombre))
    .limit(filters.limit ?? 60);

  return rows.map((r) => ({
    slug: r.slug,
    nombre: r.nombre,
    tipoNegocio: r.tipoNegocio as TipoNegocio,
    ciudad: r.ciudad,
    descripcionCorta: r.descripcionCorta,
    logoUrl: r.logoUrl,
    bannerUrl: r.bannerUrl,
    ratingAvg: r.ratingAvg !== null ? Number(r.ratingAvg) : null,
    totalResenas: r.totalResenas ?? 0,
  }));
}

/**
 * Devuelve los conteos de filtros (cuántos salones hay por categoría y por
 * ciudad, considerando solo los visibles en marketplace) más el total global.
 */
export async function getMarketplaceFiltros(): Promise<{
  total: number;
  categorias: Array<{ key: TipoNegocio; count: number }>;
  ciudades: Array<{ value: string; count: number }>;
}> {
  // Total global
  const totalRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(salones)
    .where(MARKETPLACE_VISIBLE);
  const total = totalRows[0]?.count ?? 0;

  // Por categoría
  const catRows = await db
    .select({
      key: salones.tipoNegocio,
      count: sql<number>`count(*)::int`,
    })
    .from(salones)
    .where(MARKETPLACE_VISIBLE)
    .groupBy(salones.tipoNegocio);

  const catMap = new Map<string, number>(catRows.map((r) => [r.key, r.count]));
  const categorias = CATEGORIAS_MARKETPLACE.map((c) => ({
    key: c.key,
    count: catMap.get(c.key) ?? 0,
  }));

  // Ciudades (con al menos 1 salón)
  const ciudadRows = await db
    .select({
      value: salones.ciudad,
      count: sql<number>`count(*)::int`,
    })
    .from(salones)
    .where(and(MARKETPLACE_VISIBLE, sql`${salones.ciudad} is not null`))
    .groupBy(salones.ciudad)
    .orderBy(asc(salones.ciudad));

  const ciudades = ciudadRows
    .filter((r): r is { value: string; count: number } => r.value !== null)
    .map((r) => ({ value: r.value, count: r.count }));

  return { total, categorias, ciudades };
}
