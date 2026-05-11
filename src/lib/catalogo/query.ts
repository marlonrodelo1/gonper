/**
 * Queries del catálogo central — server only.
 *
 * Lo consume el panel del salón (`/panel/catalogo`) para mostrar qué
 * productos puede pedir a las marcas. NO incluye precios públicos
 * recomendados como "obligatorios" — solo informativos: el salón ajusta
 * su PVP final cuando los activa en su tienda pública.
 */

import 'server-only';
import { and, asc, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';

import { db } from '@/lib/db';
import { marcas, productos } from '@/lib/db/schema';

import type {
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
      logoUrl: marcas.logoUrl,
      condicionesB2bMinimoEur: marcas.condicionesB2bMinimoEur,
    })
    .from(marcas)
    .where(eq(marcas.activa, true))
    .orderBy(asc(marcas.nombre));

  if (rows.length === 0) return [];

  // Conteo de productos activos por marca en una sola query.
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
    logoUrl: r.logoUrl,
    condicionesB2bMinimoEur: Number(r.condicionesB2bMinimoEur),
    numProductos: map.get(r.id) ?? 0,
  }));
}

export type CatalogoFilters = {
  marca_id?: string;
  categoria?: CategoriaProducto;
  q?: string;
  tipo_negocio?: string;
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
      precioMayoristaEur: productos.precioMayoristaEur,
      precioPublicoRecomendadoEur: productos.precioPublicoRecomendadoEur,
      unidadMedida: productos.unidadMedida,
      pesoG: productos.pesoG,
      tipoNegocioTarget: productos.tipoNegocioTarget,
      marcaId: marcas.id,
      marcaSlug: marcas.slug,
      marcaNombre: marcas.nombre,
      marcaLogoUrl: marcas.logoUrl,
      marcaCondicionesMinimoEur: marcas.condicionesB2bMinimoEur,
    })
    .from(productos)
    .innerJoin(marcas, eq(marcas.id, productos.marcaId))
    .where(and(...conds))
    .orderBy(asc(marcas.nombre), desc(productos.createdAt))
    .limit(200);

  let result = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    nombre: r.nombre,
    descripcion: r.descripcion,
    categoria: r.categoria as CategoriaProducto,
    imagenes: Array.isArray(r.imagenes) ? (r.imagenes as string[]) : [],
    precioMayoristaEur: Number(r.precioMayoristaEur),
    precioPublicoRecomendadoEur: Number(r.precioPublicoRecomendadoEur),
    unidadMedida: r.unidadMedida,
    pesoG: r.pesoG,
    marca: {
      id: r.marcaId,
      slug: r.marcaSlug,
      nombre: r.marcaNombre,
      logoUrl: r.marcaLogoUrl,
      condicionesB2bMinimoEur: Number(r.marcaCondicionesMinimoEur),
    },
  }));

  // Filtro por tipo_negocio del salón se hace en cliente con array overlap
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

export async function getProductoById(
  id: string,
): Promise<ProductoCatalogo | null> {
  const [r] = await db
    .select({
      id: productos.id,
      slug: productos.slug,
      nombre: productos.nombre,
      descripcion: productos.descripcion,
      categoria: productos.categoria,
      imagenes: productos.imagenes,
      precioMayoristaEur: productos.precioMayoristaEur,
      precioPublicoRecomendadoEur: productos.precioPublicoRecomendadoEur,
      unidadMedida: productos.unidadMedida,
      pesoG: productos.pesoG,
      marcaId: marcas.id,
      marcaSlug: marcas.slug,
      marcaNombre: marcas.nombre,
      marcaLogoUrl: marcas.logoUrl,
      marcaCondicionesMinimoEur: marcas.condicionesB2bMinimoEur,
    })
    .from(productos)
    .innerJoin(marcas, eq(marcas.id, productos.marcaId))
    .where(
      and(
        eq(productos.id, id),
        eq(productos.activo, true),
        eq(marcas.activa, true),
      ),
    )
    .limit(1);

  if (!r) return null;
  return {
    id: r.id,
    slug: r.slug,
    nombre: r.nombre,
    descripcion: r.descripcion,
    categoria: r.categoria as CategoriaProducto,
    imagenes: Array.isArray(r.imagenes) ? (r.imagenes as string[]) : [],
    precioMayoristaEur: Number(r.precioMayoristaEur),
    precioPublicoRecomendadoEur: Number(r.precioPublicoRecomendadoEur),
    unidadMedida: r.unidadMedida,
    pesoG: r.pesoG,
    marca: {
      id: r.marcaId,
      slug: r.marcaSlug,
      nombre: r.marcaNombre,
      logoUrl: r.marcaLogoUrl,
      condicionesB2bMinimoEur: Number(r.marcaCondicionesMinimoEur),
    },
  };
}
