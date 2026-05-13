import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, asc, desc, eq, type SQL } from 'drizzle-orm';

import { db } from '@/lib/db';
import { categoriasMarca, productos, marcas } from '@/lib/db/schema';
import { requireApiToken } from '@/lib/api/auth';

/**
 * GET  /api/v1/admin/productos?marca_id=&categoria=&tipo_distribucion= → listado
 * POST /api/v1/admin/productos → crear producto
 * Auth: bearer INTERNAL_API_TOKEN.
 */

const Categorias = ['capilar', 'barba', 'unas', 'estetica', 'accesorio', 'otro'] as const;
const TiposNegocio = ['peluqueria', 'barberia', 'estetica', 'manicura', 'otro'] as const;
const TiposDistribucion = ['stock', 'dropshipping'] as const;

export async function GET(req: Request) {
  const authError = requireApiToken(req);
  if (authError) return authError;

  const url = new URL(req.url);
  const marcaId = url.searchParams.get('marca_id');
  const categoria = url.searchParams.get('categoria');
  const tipoDistribucion = url.searchParams.get('tipo_distribucion');

  const conds: SQL[] = [];
  if (marcaId) conds.push(eq(productos.marcaId, marcaId));
  if (categoria && (Categorias as readonly string[]).includes(categoria)) {
    conds.push(eq(productos.categoria, categoria));
  }
  if (
    tipoDistribucion &&
    (TiposDistribucion as readonly string[]).includes(tipoDistribucion)
  ) {
    conds.push(eq(productos.tipoDistribucion, tipoDistribucion));
  }

  const rows = await db
    .select({
      id: productos.id,
      marcaId: productos.marcaId,
      marcaNombre: marcas.nombre,
      slug: productos.slug,
      sku: productos.sku,
      nombre: productos.nombre,
      descripcion: productos.descripcion,
      categoria: productos.categoria,
      categoriaMarcaId: productos.categoriaMarcaId,
      categoriaMarcaSlug: categoriasMarca.slug,
      categoriaMarcaNombre: categoriasMarca.nombre,
      tipoDistribucion: productos.tipoDistribucion,
      tipoNegocioTarget: productos.tipoNegocioTarget,
      imagenes: productos.imagenes,
      costeMayoristaEur: productos.costeMayoristaEur,
      precioMayoristaEur: productos.precioMayoristaEur,
      precioPublicoRecomendadoEur: productos.precioPublicoRecomendadoEur,
      unidadMedida: productos.unidadMedida,
      pesoG: productos.pesoG,
      stockDisponibleMarca: productos.stockDisponibleMarca,
      activo: productos.activo,
      createdAt: productos.createdAt,
    })
    .from(productos)
    .innerJoin(marcas, eq(marcas.id, productos.marcaId))
    .leftJoin(
      categoriasMarca,
      eq(categoriasMarca.id, productos.categoriaMarcaId),
    )
    .where(conds.length > 0 ? and(...conds) : undefined)
    .orderBy(asc(marcas.nombre), desc(productos.createdAt));

  return NextResponse.json({ productos: rows });
}

const CreateBody = z.object({
  marca_id: z.string().uuid(),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/, 'Slug inválido'),
  sku: z.string().max(80).nullable().optional(),
  nombre: z.string().trim().min(1).max(300),
  descripcion: z.string().max(5000).nullable().optional(),
  categoria: z.enum(Categorias),
  /** Categoría propia de la marca (opcional, debe pertenecer a la misma marca). */
  categoria_marca_id: z.string().uuid().nullable().optional(),
  /** 'stock' (default, modelo distribuidor actual) | 'dropshipping' (Wella). */
  tipo_distribucion: z.enum(TiposDistribucion).default('stock'),
  tipo_negocio_target: z.array(z.enum(TiposNegocio)).default([]),
  imagenes: z.array(z.string().url().max(500)).default([]),
  /** Lo que paga Gonper Studio a la marca (info interna). */
  coste_mayorista_eur: z.number().min(0).nullable().optional(),
  /** Lo que paga el salón a Gonper Studio (precio de reventa). */
  precio_mayorista_eur: z.number().min(0),
  precio_publico_recomendado_eur: z.number().min(0),
  unidad_medida: z.string().max(40).default('unidad'),
  peso_g: z.number().int().nonnegative().nullable().optional(),
  stock_disponible_marca: z.number().int().nonnegative().nullable().optional(),
  activo: z.boolean().default(true),
});

export async function POST(req: Request) {
  const authError = requireApiToken(req);
  if (authError) return authError;

  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
  const parsed = CreateBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Body inválido', detalles: parsed.error.issues }, { status: 400 });
  }
  const d = parsed.data;

  if (d.categoria_marca_id) {
    const [cat] = await db
      .select({ marcaId: categoriasMarca.marcaId })
      .from(categoriasMarca)
      .where(eq(categoriasMarca.id, d.categoria_marca_id))
      .limit(1);
    if (!cat) {
      return NextResponse.json({ error: 'categoria_marca_no_existe' }, { status: 400 });
    }
    if (cat.marcaId !== d.marca_id) {
      return NextResponse.json(
        { error: 'categoria_marca_no_pertenece_a_marca' },
        { status: 400 },
      );
    }
  }

  const dup = await db
    .select({ id: productos.id })
    .from(productos)
    .where(and(eq(productos.marcaId, d.marca_id), eq(productos.slug, d.slug)))
    .limit(1);
  if (dup.length > 0) {
    return NextResponse.json({ error: 'slug_ya_existe_en_marca' }, { status: 409 });
  }

  const [created] = await db
    .insert(productos)
    .values({
      marcaId: d.marca_id,
      slug: d.slug,
      sku: d.sku ?? null,
      nombre: d.nombre,
      descripcion: d.descripcion ?? null,
      categoria: d.categoria,
      categoriaMarcaId: d.categoria_marca_id ?? null,
      tipoDistribucion: d.tipo_distribucion,
      tipoNegocioTarget: d.tipo_negocio_target,
      imagenes: d.imagenes,
      costeMayoristaEur:
        d.coste_mayorista_eur !== undefined && d.coste_mayorista_eur !== null
          ? d.coste_mayorista_eur.toFixed(2)
          : null,
      precioMayoristaEur: d.precio_mayorista_eur.toFixed(2),
      precioPublicoRecomendadoEur: d.precio_publico_recomendado_eur.toFixed(2),
      unidadMedida: d.unidad_medida,
      pesoG: d.peso_g ?? null,
      stockDisponibleMarca: d.stock_disponible_marca ?? null,
      activo: d.activo,
    })
    .returning();

  return NextResponse.json({ ok: true, producto: created }, { status: 201 });
}

export const dynamic = 'force-dynamic';
