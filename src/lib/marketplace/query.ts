/**
 * Queries del marketplace público — SOLO server (importa Drizzle).
 *
 * No importar desde un Client Component: arrastra `postgres`/`net`/`tls`
 * al bundle del cliente y rompe el build. Para constantes/types usables
 * desde el cliente, importar `./categorias.ts`.
 */

import 'server-only';
import { and, asc, eq, ilike, ne, or, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { salones, salonesRatingCache } from '@/lib/db/schema';

import { CATEGORIAS_MARKETPLACE, type SalonCard, type TipoNegocio } from './categorias';

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
      lat: salones.lat,
      lng: salones.lng,
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
    lat: r.lat !== null ? Number(r.lat) : null,
    lng: r.lng !== null ? Number(r.lng) : null,
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
  const totalRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(salones)
    .where(MARKETPLACE_VISIBLE);
  const total = totalRows[0]?.count ?? 0;

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
