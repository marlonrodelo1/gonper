/**
 * Queries del marketplace público — SOLO server (importa Drizzle).
 *
 * No importar desde un Client Component: arrastra `postgres`/`net`/`tls`
 * al bundle del cliente y rompe el build. Para constantes/types usables
 * desde el cliente, importar `./categorias.ts`.
 */

import 'server-only';
import { and, asc, eq, ilike, inArray, ne, or, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  galeriaImagenes,
  salones,
  salonesRatingCache,
} from '@/lib/db/schema';

import { CATEGORIAS_MARKETPLACE, type SalonCard, type TipoNegocio } from './categorias';

export type MarketplaceFilters = {
  categoria?: TipoNegocio | null;
  ciudad?: string | null;
  q?: string | null;
  limit?: number;
};

/**
 * Filtro base de salones que pueden aparecer en el marketplace público.
 *
 * REQUERIMOS lat/lng geocodificados con OpenStreetMap: si el dueño no ha
 * configurado la dirección con autocompletado, su salón NO aparece en el
 * listado público hasta que lo haga. Forzamos buena higiene de datos.
 */
const MARKETPLACE_VISIBLE = and(
  eq(salones.activo, true),
  eq(salones.marketplaceVisible, true),
  ne(salones.plan, 'cancelado'),
  sql`${salones.lat} is not null`,
  sql`${salones.lng} is not null`,
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
      id: salones.id,
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

  // Cargar imágenes de galería para todos los salones devueltos en una
  // sola query y agrupar por salonId. Limit 5 imágenes por salón es
  // suficiente para el slider.
  const galeriaPorSalon = new Map<string, string[]>();
  if (rows.length > 0) {
    const ids = rows.map((r) => r.id);
    const galeriaRows = await db
      .select({
        salonId: galeriaImagenes.salonId,
        url: galeriaImagenes.url,
        orden: galeriaImagenes.orden,
        createdAt: galeriaImagenes.createdAt,
      })
      .from(galeriaImagenes)
      .where(
        and(
          inArray(galeriaImagenes.salonId, ids),
          eq(galeriaImagenes.activa, true),
        ),
      )
      .orderBy(asc(galeriaImagenes.orden), asc(galeriaImagenes.createdAt));

    for (const g of galeriaRows) {
      const arr = galeriaPorSalon.get(g.salonId) ?? [];
      if (arr.length < 5) arr.push(g.url);
      galeriaPorSalon.set(g.salonId, arr);
    }
  }

  return rows.map((r) => {
    const galeria = galeriaPorSalon.get(r.id) ?? [];
    const imagenes = [
      ...(r.bannerUrl ? [r.bannerUrl] : []),
      ...galeria.filter((u) => u !== r.bannerUrl),
    ];
    return {
      slug: r.slug,
      nombre: r.nombre,
      tipoNegocio: r.tipoNegocio as TipoNegocio,
      ciudad: r.ciudad,
      descripcionCorta: r.descripcionCorta,
      logoUrl: r.logoUrl,
      bannerUrl: r.bannerUrl,
      imagenes,
      lat: r.lat !== null ? Number(r.lat) : null,
      lng: r.lng !== null ? Number(r.lng) : null,
      ratingAvg: r.ratingAvg !== null ? Number(r.ratingAvg) : null,
      totalResenas: r.totalResenas ?? 0,
    };
  });
}

/**
 * Devuelve los salones marcados como destacados desde el super-admin,
 * ordenados por `marketplace_destacado_orden asc nulls last`. Reutiliza
 * el filtro base del marketplace (activo + visible + lat/lng).
 */
export async function listMarketplaceDestacados(
  limit = 8,
): Promise<SalonCard[]> {
  const conds = and(
    MARKETPLACE_VISIBLE,
    eq(salones.marketplaceDestacado, true),
  );

  const rows = await db
    .select({
      id: salones.id,
      slug: salones.slug,
      nombre: salones.nombre,
      tipoNegocio: salones.tipoNegocio,
      ciudad: salones.ciudad,
      descripcionCorta: salones.descripcionCorta,
      logoUrl: salones.logoUrl,
      bannerUrl: salones.bannerUrl,
      lat: salones.lat,
      lng: salones.lng,
      orden: salones.marketplaceDestacadoOrden,
      ratingAvg: salonesRatingCache.ratingAvg,
      totalResenas: salonesRatingCache.totalResenas,
    })
    .from(salones)
    .leftJoin(salonesRatingCache, eq(salonesRatingCache.salonId, salones.id))
    .where(conds)
    .orderBy(
      sql`${salones.marketplaceDestacadoOrden} asc nulls last`,
      asc(salones.nombre),
    )
    .limit(limit);

  if (rows.length === 0) return [];

  // Galería igual que la query principal
  const galeriaPorSalon = new Map<string, string[]>();
  const ids = rows.map((r) => r.id);
  const galeriaRows = await db
    .select({
      salonId: galeriaImagenes.salonId,
      url: galeriaImagenes.url,
    })
    .from(galeriaImagenes)
    .where(
      and(
        inArray(galeriaImagenes.salonId, ids),
        eq(galeriaImagenes.activa, true),
      ),
    )
    .orderBy(asc(galeriaImagenes.orden), asc(galeriaImagenes.createdAt));

  for (const g of galeriaRows) {
    const arr = galeriaPorSalon.get(g.salonId) ?? [];
    if (arr.length < 5) arr.push(g.url);
    galeriaPorSalon.set(g.salonId, arr);
  }

  return rows.map((r) => {
    const galeria = galeriaPorSalon.get(r.id) ?? [];
    const imagenes = [
      ...(r.bannerUrl ? [r.bannerUrl] : []),
      ...galeria.filter((u) => u !== r.bannerUrl),
    ];
    return {
      slug: r.slug,
      nombre: r.nombre,
      tipoNegocio: r.tipoNegocio as TipoNegocio,
      ciudad: r.ciudad,
      descripcionCorta: r.descripcionCorta,
      logoUrl: r.logoUrl,
      bannerUrl: r.bannerUrl,
      imagenes,
      lat: r.lat !== null ? Number(r.lat) : null,
      lng: r.lng !== null ? Number(r.lng) : null,
      ratingAvg: r.ratingAvg !== null ? Number(r.ratingAvg) : null,
      totalResenas: r.totalResenas ?? 0,
    };
  });
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
