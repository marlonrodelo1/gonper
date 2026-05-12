/**
 * Queries del catálogo central — server only.
 *
 * Modelo dropshipping (sesión 2026-05-12): el salón ve marcas y productos
 * del catálogo central que Marlon define. NO toca precios ni stock — solo
 * activa/desactiva cada producto en su tienda pública. Cuando un cliente
 * compra, Rogotech cobra y reparte una comisión al salón vía Stripe Connect
 * transfer.
 */

import 'server-only';
import { and, asc, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  categoriasMarca,
  marcas,
  productos,
  productosSalon,
} from '@/lib/db/schema';

import type {
  CategoriaMarcaCatalogo,
  CategoriaProducto,
  MarcaCatalogo,
  ProductoCatalogo,
} from './types';

export async function listMarcasCatalogo(): Promise<MarcaCatalogo[]> {
  const rows = await db
    .select({
      id: marcas.id,
      slug: marcas.slug,
      nombre: marcas.nombre,
      descripcion: marcas.descripcion,
      logoUrl: marcas.logoUrl,
      comisionSalonPorcentaje: marcas.comisionSalonPorcentaje,
    })
    .from(marcas)
    .where(eq(marcas.activa, true))
    .orderBy(asc(marcas.nombre));

  if (rows.length === 0) return [];

  const counts = await db
    .select({
      marcaId: productos.marcaId,
      total: sql<number>`count(*)::int`,
    })
    .from(productos)
    .where(eq(productos.activo, true))
    .groupBy(productos.marcaId);

  const map = new Map<string, number>(
    counts.map((c) => [c.marcaId, c.total ?? 0]),
  );

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    nombre: r.nombre,
    descripcion: r.descripcion,
    logoUrl: r.logoUrl,
    comisionSalonPorcentaje: Number(r.comisionSalonPorcentaje),
    numProductos: map.get(r.id) ?? 0,
  }));
}

export async function getMarcaCatalogoBySlugOrId(
  slugOrId: string,
): Promise<MarcaCatalogo | null> {
  const esUuid = /^[0-9a-f-]{36}$/.test(slugOrId);
  const where = and(
    eq(marcas.activa, true),
    esUuid ? eq(marcas.id, slugOrId) : eq(marcas.slug, slugOrId),
  );

  const [row] = await db
    .select({
      id: marcas.id,
      slug: marcas.slug,
      nombre: marcas.nombre,
      descripcion: marcas.descripcion,
      logoUrl: marcas.logoUrl,
      comisionSalonPorcentaje: marcas.comisionSalonPorcentaje,
    })
    .from(marcas)
    .where(where)
    .limit(1);

  if (!row) return null;

  const [countRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(productos)
    .where(and(eq(productos.marcaId, row.id), eq(productos.activo, true)));

  return {
    id: row.id,
    slug: row.slug,
    nombre: row.nombre,
    descripcion: row.descripcion,
    logoUrl: row.logoUrl,
    comisionSalonPorcentaje: Number(row.comisionSalonPorcentaje),
    numProductos: Number(countRow?.total ?? 0),
  };
}

export async function listCategoriasMarcaCatalogo(
  marcaId: string,
): Promise<CategoriaMarcaCatalogo[]> {
  const rows = await db
    .select({
      id: categoriasMarca.id,
      slug: categoriasMarca.slug,
      nombre: categoriasMarca.nombre,
      orden: categoriasMarca.orden,
    })
    .from(categoriasMarca)
    .where(
      and(eq(categoriasMarca.marcaId, marcaId), eq(categoriasMarca.activa, true)),
    )
    .orderBy(asc(categoriasMarca.orden), asc(categoriasMarca.nombre));

  if (rows.length === 0) return [];

  const counts = await db
    .select({
      categoriaMarcaId: productos.categoriaMarcaId,
      total: sql<number>`count(*)::int`,
    })
    .from(productos)
    .where(and(eq(productos.marcaId, marcaId), eq(productos.activo, true)))
    .groupBy(productos.categoriaMarcaId);

  const map = new Map<string, number>();
  for (const c of counts) {
    if (c.categoriaMarcaId)
      map.set(c.categoriaMarcaId, Number(c.total ?? 0));
  }

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    nombre: r.nombre,
    orden: r.orden,
    numProductos: map.get(r.id) ?? 0,
  }));
}

export type CatalogoFilters = {
  marca_id?: string;
  categoria?: CategoriaProducto;
  categoria_marca_id?: string;
  q?: string;
  tipo_negocio?: string;
  /** Id del salón que está viendo el catálogo — para devolver `enMiTienda`. */
  salon_id?: string;
};

export async function listProductosCatalogo(
  filters: CatalogoFilters = {},
): Promise<ProductoCatalogo[]> {
  const conds: SQL[] = [
    eq(productos.activo, true),
    eq(marcas.activa, true),
  ];

  if (filters.marca_id) conds.push(eq(productos.marcaId, filters.marca_id));
  if (filters.categoria) conds.push(eq(productos.categoria, filters.categoria));
  if (filters.categoria_marca_id)
    conds.push(eq(productos.categoriaMarcaId, filters.categoria_marca_id));
  if (filters.q && filters.q.trim()) {
    const like = `%${filters.q.trim()}%`;
    conds.push(
      or(
        ilike(productos.nombre, like),
        ilike(productos.descripcion, like),
        ilike(marcas.nombre, like),
      )!,
    );
  }

  const rows = await db
    .select({
      id: productos.id,
      slug: productos.slug,
      nombre: productos.nombre,
      descripcion: productos.descripcion,
      categoria: productos.categoria,
      imagenes: productos.imagenes,
      precioPublicoEur: productos.precioPublicoRecomendadoEur,
      unidadMedida: productos.unidadMedida,
      pesoG: productos.pesoG,
      tipoNegocioTarget: productos.tipoNegocioTarget,
      marcaId: marcas.id,
      marcaSlug: marcas.slug,
      marcaNombre: marcas.nombre,
      marcaLogoUrl: marcas.logoUrl,
      marcaComisionSalonPorcentaje: marcas.comisionSalonPorcentaje,
    })
    .from(productos)
    .innerJoin(marcas, eq(marcas.id, productos.marcaId))
    .where(and(...conds))
    .orderBy(asc(marcas.nombre), desc(productos.createdAt))
    .limit(200);

  // Conjunto de producto_id que el salón actual tiene activos
  let activosSet = new Set<string>();
  if (filters.salon_id && rows.length > 0) {
    const productIds = rows.map((r) => r.id);
    const activosRows = await db
      .select({ productoId: productosSalon.productoId })
      .from(productosSalon)
      .where(
        and(
          eq(productosSalon.salonId, filters.salon_id),
          eq(productosSalon.activo, true),
        ),
      );
    activosSet = new Set(
      activosRows
        .map((a) => a.productoId)
        .filter((id) => productIds.includes(id)),
    );
  }

  let result: ProductoCatalogo[] = rows.map((r) => {
    const precio = Number(r.precioPublicoEur);
    const comisionPct = Number(r.marcaComisionSalonPorcentaje);
    const comisionEur = (precio * comisionPct) / 100;
    return {
      id: r.id,
      slug: r.slug,
      nombre: r.nombre,
      descripcion: r.descripcion,
      categoria: r.categoria as CategoriaProducto,
      imagenes: Array.isArray(r.imagenes) ? (r.imagenes as string[]) : [],
      precioPublicoEur: precio,
      unidadMedida: r.unidadMedida,
      pesoG: r.pesoG,
      enMiTienda: activosSet.has(r.id),
      comisionSalonEur: Math.round(comisionEur * 100) / 100,
      marca: {
        id: r.marcaId,
        slug: r.marcaSlug,
        nombre: r.marcaNombre,
        logoUrl: r.marcaLogoUrl,
        comisionSalonPorcentaje: comisionPct,
      },
    };
  });

  if (filters.tipo_negocio) {
    const tn = filters.tipo_negocio;
    result = result.filter((p) => {
      const target = (rows.find((r) => r.id === p.id)?.tipoNegocioTarget ??
        []) as string[];
      return target.length === 0 || target.includes(tn);
    });
  }

  return result;
}
