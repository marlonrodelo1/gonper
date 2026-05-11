import 'server-only';
import { and, asc, desc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  marcas,
  productos,
  salones,
  stockSalon,
} from '@/lib/db/schema';
import type { TiendaProducto, TiendaSalon } from './types';

export async function getTiendaSalonBySlug(
  slug: string,
): Promise<TiendaSalon | null> {
  const [row] = await db
    .select({
      id: salones.id,
      slug: salones.slug,
      nombre: salones.nombre,
      tipoNegocio: salones.tipoNegocio,
      ciudad: salones.ciudad,
      logoUrl: salones.logoUrl,
      bannerUrl: salones.bannerUrl,
      activo: salones.activo,
      stripeConnectOnboarded: salones.stripeConnectOnboarded,
    })
    .from(salones)
    .where(eq(salones.slug, slug))
    .limit(1);

  if (!row || !row.activo) return null;
  return {
    id: row.id,
    slug: row.slug,
    nombre: row.nombre,
    tipoNegocio: row.tipoNegocio,
    ciudad: row.ciudad,
    logoUrl: row.logoUrl,
    bannerUrl: row.bannerUrl,
    aceptaPagos: row.stripeConnectOnboarded,
  };
}

export async function listTiendaProductos(
  salonId: string,
): Promise<TiendaProducto[]> {
  const rows = await db
    .select({
      productoId: productos.id,
      productoSlug: productos.slug,
      nombre: productos.nombre,
      descripcion: productos.descripcion,
      imagenes: productos.imagenes,
      unidad: productos.unidadMedida,
      categoria: productos.categoria,
      precioPublicoEur: stockSalon.precioPublicoEur,
      precioRecomendadoEur: productos.precioPublicoRecomendadoEur,
      cantidadDisponible: stockSalon.cantidadDisponible,
      marcaId: marcas.id,
      marcaSlug: marcas.slug,
      marcaNombre: marcas.nombre,
      marcaLogoUrl: marcas.logoUrl,
    })
    .from(stockSalon)
    .innerJoin(productos, eq(productos.id, stockSalon.productoId))
    .innerJoin(marcas, eq(marcas.id, productos.marcaId))
    .where(
      and(
        eq(stockSalon.salonId, salonId),
        eq(stockSalon.activoEnTiendaPublica, true),
        eq(productos.activo, true),
        eq(marcas.activa, true),
      ),
    )
    .orderBy(asc(marcas.nombre), desc(productos.createdAt));

  return rows
    .filter((r) => r.cantidadDisponible > 0)
    .map((r) => ({
      productoId: r.productoId,
      productoSlug: r.productoSlug,
      nombre: r.nombre,
      descripcion: r.descripcion,
      imagenes: Array.isArray(r.imagenes) ? (r.imagenes as string[]) : [],
      unidad: r.unidad,
      categoria: r.categoria,
      precioEur: Number(r.precioPublicoEur ?? r.precioRecomendadoEur),
      cantidadDisponible: r.cantidadDisponible,
      marca: {
        id: r.marcaId,
        slug: r.marcaSlug,
        nombre: r.marcaNombre,
        logoUrl: r.marcaLogoUrl,
      },
    }));
}

export async function getTiendaProductoBySlug(args: {
  salonId: string;
  marcaSlug: string;
  productoSlug: string;
}): Promise<TiendaProducto | null> {
  const [r] = await db
    .select({
      productoId: productos.id,
      productoSlug: productos.slug,
      nombre: productos.nombre,
      descripcion: productos.descripcion,
      imagenes: productos.imagenes,
      unidad: productos.unidadMedida,
      categoria: productos.categoria,
      precioPublicoEur: stockSalon.precioPublicoEur,
      precioRecomendadoEur: productos.precioPublicoRecomendadoEur,
      cantidadDisponible: stockSalon.cantidadDisponible,
      activoEnTienda: stockSalon.activoEnTiendaPublica,
      marcaId: marcas.id,
      marcaSlug: marcas.slug,
      marcaNombre: marcas.nombre,
      marcaLogoUrl: marcas.logoUrl,
    })
    .from(stockSalon)
    .innerJoin(productos, eq(productos.id, stockSalon.productoId))
    .innerJoin(marcas, eq(marcas.id, productos.marcaId))
    .where(
      and(
        eq(stockSalon.salonId, args.salonId),
        eq(marcas.slug, args.marcaSlug),
        eq(productos.slug, args.productoSlug),
        eq(productos.activo, true),
        eq(marcas.activa, true),
      ),
    )
    .limit(1);

  if (!r || !r.activoEnTienda || r.cantidadDisponible <= 0) return null;

  return {
    productoId: r.productoId,
    productoSlug: r.productoSlug,
    nombre: r.nombre,
    descripcion: r.descripcion,
    imagenes: Array.isArray(r.imagenes) ? (r.imagenes as string[]) : [],
    unidad: r.unidad,
    categoria: r.categoria,
    precioEur: Number(r.precioPublicoEur ?? r.precioRecomendadoEur),
    cantidadDisponible: r.cantidadDisponible,
    marca: {
      id: r.marcaId,
      slug: r.marcaSlug,
      nombre: r.marcaNombre,
      logoUrl: r.marcaLogoUrl,
    },
  };
}
