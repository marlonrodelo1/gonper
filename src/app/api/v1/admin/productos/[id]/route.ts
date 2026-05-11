import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { productos } from '@/lib/db/schema';
import { requireApiToken } from '@/lib/api/auth';

const IdParam = z.string().uuid();
const Categorias = ['capilar', 'barba', 'unas', 'estetica', 'accesorio', 'otro'] as const;
const TiposNegocio = ['peluqueria', 'barberia', 'estetica', 'manicura', 'otro'] as const;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = requireApiToken(req);
  if (authError) return authError;
  const { id } = await params;
  if (!IdParam.safeParse(id).success) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 });
  }

  const [row] = await db.select().from(productos).where(eq(productos.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: 'no_existe' }, { status: 404 });
  return NextResponse.json({ producto: row });
}

const PatchBody = z.object({
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/).optional(),
  sku: z.string().max(80).nullable().optional(),
  nombre: z.string().trim().min(1).max(300).optional(),
  descripcion: z.string().max(5000).nullable().optional(),
  categoria: z.enum(Categorias).optional(),
  tipo_negocio_target: z.array(z.enum(TiposNegocio)).optional(),
  imagenes: z.array(z.string().url().max(500)).optional(),
  coste_mayorista_eur: z.number().min(0).nullable().optional(),
  precio_mayorista_eur: z.number().min(0).optional(),
  precio_publico_recomendado_eur: z.number().min(0).optional(),
  unidad_medida: z.string().max(40).optional(),
  peso_g: z.number().int().nonnegative().nullable().optional(),
  stock_disponible_marca: z.number().int().nonnegative().nullable().optional(),
  activo: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = requireApiToken(req);
  if (authError) return authError;
  const { id } = await params;
  if (!IdParam.safeParse(id).success) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 });
  }

  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
  const parsed = PatchBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Body inválido', detalles: parsed.error.issues }, { status: 400 });
  }
  const d = parsed.data;

  const update: Record<string, unknown> = {};
  if (d.slug !== undefined) update.slug = d.slug;
  if (d.sku !== undefined) update.sku = d.sku;
  if (d.nombre !== undefined) update.nombre = d.nombre;
  if (d.descripcion !== undefined) update.descripcion = d.descripcion;
  if (d.categoria !== undefined) update.categoria = d.categoria;
  if (d.tipo_negocio_target !== undefined) update.tipoNegocioTarget = d.tipo_negocio_target;
  if (d.imagenes !== undefined) update.imagenes = d.imagenes;
  if (d.coste_mayorista_eur !== undefined)
    update.costeMayoristaEur =
      d.coste_mayorista_eur !== null ? d.coste_mayorista_eur.toFixed(2) : null;
  if (d.precio_mayorista_eur !== undefined) update.precioMayoristaEur = d.precio_mayorista_eur.toFixed(2);
  if (d.precio_publico_recomendado_eur !== undefined) update.precioPublicoRecomendadoEur = d.precio_publico_recomendado_eur.toFixed(2);
  if (d.unidad_medida !== undefined) update.unidadMedida = d.unidad_medida;
  if (d.peso_g !== undefined) update.pesoG = d.peso_g;
  if (d.stock_disponible_marca !== undefined) update.stockDisponibleMarca = d.stock_disponible_marca;
  if (d.activo !== undefined) update.activo = d.activo;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'sin_cambios' }, { status: 400 });
  }

  const [updated] = await db.update(productos).set(update).where(eq(productos.id, id)).returning();
  if (!updated) return NextResponse.json({ error: 'no_existe' }, { status: 404 });
  return NextResponse.json({ ok: true, producto: updated });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = requireApiToken(req);
  if (authError) return authError;
  const { id } = await params;
  if (!IdParam.safeParse(id).success) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 });
  }

  // Soft delete: pone activo=false. No hace DELETE físico para no romper
  // pedidos/ventas históricos.
  const [updated] = await db
    .update(productos)
    .set({ activo: false })
    .where(eq(productos.id, id))
    .returning({ id: productos.id });

  if (!updated) return NextResponse.json({ error: 'no_existe' }, { status: 404 });
  return NextResponse.json({ ok: true, soft_deleted: true });
}

export const dynamic = 'force-dynamic';
