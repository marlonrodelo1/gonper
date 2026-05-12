import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { categoriasMarca, marcas } from '@/lib/db/schema';
import { requireApiToken } from '@/lib/api/auth';

/**
 * GET  /api/v1/admin/marcas/[id]/categorias — lista categorías de la marca
 * POST /api/v1/admin/marcas/[id]/categorias — crea una categoría en la marca
 * Auth: bearer INTERNAL_API_TOKEN.
 */

const IdParam = z.string().uuid();

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

  const url = new URL(req.url);
  const includeInactivas = url.searchParams.get('include_inactivas') === '1';

  const conds = [eq(categoriasMarca.marcaId, id)];
  if (!includeInactivas) conds.push(eq(categoriasMarca.activa, true));

  const rows = await db
    .select()
    .from(categoriasMarca)
    .where(and(...conds))
    .orderBy(asc(categoriasMarca.orden), asc(categoriasMarca.nombre));

  return NextResponse.json({ categorias: rows });
}

const CreateBody = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Slug inválido (a-z, 0-9, guiones)'),
  nombre: z.string().trim().min(1).max(120),
  orden: z.number().int().min(0).max(9999).optional(),
  activa: z.boolean().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = requireApiToken(req);
  if (authError) return authError;
  const { id } = await params;
  if (!IdParam.safeParse(id).success) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 });
  }

  const [marca] = await db
    .select({ id: marcas.id })
    .from(marcas)
    .where(eq(marcas.id, id))
    .limit(1);
  if (!marca) {
    return NextResponse.json({ error: 'marca_no_existe' }, { status: 404 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }
  const parsed = CreateBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Body inválido', detalles: parsed.error.issues },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const dup = await db
    .select({ id: categoriasMarca.id })
    .from(categoriasMarca)
    .where(
      and(eq(categoriasMarca.marcaId, id), eq(categoriasMarca.slug, d.slug)),
    )
    .limit(1);
  if (dup.length > 0) {
    return NextResponse.json(
      { error: 'slug_ya_existe_en_marca' },
      { status: 409 },
    );
  }

  const [created] = await db
    .insert(categoriasMarca)
    .values({
      marcaId: id,
      slug: d.slug,
      nombre: d.nombre,
      orden: d.orden ?? 0,
      activa: d.activa ?? true,
    })
    .returning();

  return NextResponse.json({ ok: true, categoria: created }, { status: 201 });
}

export const dynamic = 'force-dynamic';
