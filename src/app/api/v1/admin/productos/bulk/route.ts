import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/lib/db';
import { categoriasMarca, marcas, productos } from '@/lib/db/schema';
import { requireApiToken } from '@/lib/api/auth';

/**
 * POST /api/v1/admin/productos/bulk
 *
 * Inserta en lote N productos para una marca. El parsing CSV → JSON lo hace
 * el cliente (super-admin). Aquí solo recibimos JSON ya tipado.
 *
 * Body: { marca_id: uuid, productos: ProductoInput[] }  (max 200 productos)
 *
 * Validación previa al insert:
 *   - Todos los productos deben tener slugs únicos dentro del CSV (no se
 *     puede dejar a la BD: el unique constraint salta en el primero y
 *     todos los anteriores ya están dentro de la transacción).
 *   - Si se referencia categoria_marca_id, debe existir y pertenecer a marca_id.
 *
 * Auth: bearer INTERNAL_API_TOKEN.
 */

const Categorias = [
  'capilar',
  'barba',
  'unas',
  'estetica',
  'accesorio',
  'otro',
] as const;
const TiposNegocio = [
  'peluqueria',
  'barberia',
  'estetica',
  'manicura',
  'otro',
] as const;
const TiposDistribucion = ['stock', 'dropshipping'] as const;

const ProductoInput = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, 'Slug inválido'),
  sku: z.string().max(80).nullable().optional(),
  nombre: z.string().trim().min(1).max(300),
  descripcion: z.string().max(5000).nullable().optional(),
  categoria: z.enum(Categorias),
  categoria_marca_id: z.string().uuid().nullable().optional(),
  tipo_distribucion: z.enum(TiposDistribucion).default('stock'),
  tipo_negocio_target: z.array(z.enum(TiposNegocio)).default([]),
  imagenes: z.array(z.string().url().max(500)).default([]),
  coste_mayorista_eur: z.number().min(0).nullable().optional(),
  precio_mayorista_eur: z.number().min(0),
  precio_publico_recomendado_eur: z.number().min(0),
  unidad_medida: z.string().max(40).default('unidad'),
  peso_g: z.number().int().nonnegative().nullable().optional(),
  stock_disponible_marca: z.number().int().nonnegative().nullable().optional(),
  activo: z.boolean().default(true),
});

const Body = z.object({
  marca_id: z.string().uuid(),
  productos: z.array(ProductoInput).min(1).max(200),
});

export async function POST(req: Request) {
  const authError = requireApiToken(req);
  if (authError) return authError;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Body inválido', detalles: parsed.error.issues },
      { status: 400 },
    );
  }
  const { marca_id, productos: items } = parsed.data;

  const [marca] = await db
    .select({ id: marcas.id })
    .from(marcas)
    .where(eq(marcas.id, marca_id))
    .limit(1);
  if (!marca) {
    return NextResponse.json({ error: 'marca_no_existe' }, { status: 404 });
  }

  // Slugs duplicados dentro del CSV
  const slugs = items.map((p) => p.slug);
  const slugsSet = new Set<string>();
  const slugsDuplicados: string[] = [];
  for (const s of slugs) {
    if (slugsSet.has(s)) slugsDuplicados.push(s);
    slugsSet.add(s);
  }
  if (slugsDuplicados.length > 0) {
    return NextResponse.json(
      { error: 'slugs_duplicados_en_csv', slugs: slugsDuplicados },
      { status: 400 },
    );
  }

  // Slugs ya existentes en la BD para esta marca
  const existentes = await db
    .select({ slug: productos.slug })
    .from(productos)
    .where(and(eq(productos.marcaId, marca_id), inArray(productos.slug, slugs)));
  if (existentes.length > 0) {
    return NextResponse.json(
      {
        error: 'slugs_ya_existen_en_marca',
        slugs: existentes.map((e) => e.slug),
      },
      { status: 409 },
    );
  }

  // Validar todas las categorías propias referenciadas
  const catIds = Array.from(
    new Set(
      items
        .map((p) => p.categoria_marca_id)
        .filter((v): v is string => Boolean(v)),
    ),
  );
  if (catIds.length > 0) {
    const cats = await db
      .select({ id: categoriasMarca.id, marcaId: categoriasMarca.marcaId })
      .from(categoriasMarca)
      .where(inArray(categoriasMarca.id, catIds));
    const validSet = new Set<string>();
    for (const c of cats) {
      if (c.marcaId === marca_id) validSet.add(c.id);
    }
    const invalid = catIds.filter((id) => !validSet.has(id));
    if (invalid.length > 0) {
      return NextResponse.json(
        {
          error: 'categorias_marca_invalidas',
          categoria_marca_ids: invalid,
        },
        { status: 400 },
      );
    }
  }

  const values = items.map((d) => ({
    marcaId: marca_id,
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
  }));

  const created = await db.insert(productos).values(values).returning({
    id: productos.id,
    slug: productos.slug,
  });

  return NextResponse.json(
    { ok: true, creados: created.length, productos: created },
    { status: 201 },
  );
}

export const dynamic = 'force-dynamic';
