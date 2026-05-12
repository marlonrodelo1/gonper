import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { categoriasMarca } from '@/lib/db/schema';
import { requireApiToken } from '@/lib/api/auth';

/**
 * GET    /api/v1/admin/categorias-marca/[id]
 * PATCH  /api/v1/admin/categorias-marca/[id]
 * DELETE /api/v1/admin/categorias-marca/[id] — soft (activa=false).
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
  const [row] = await db
    .select()
    .from(categoriasMarca)
    .where(eq(categoriasMarca.id, id))
    .limit(1);
  if (!row) return NextResponse.json({ error: 'no_existe' }, { status: 404 });
  return NextResponse.json({ categoria: row });
}

const PatchBody = z.object({
  nombre: z.string().trim().min(1).max(120).optional(),
  orden: z.number().int().min(0).max(9999).optional(),
  activa: z.boolean().optional(),
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
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }
  const parsed = PatchBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Body inválido', detalles: parsed.error.issues },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const update: Record<string, unknown> = {};
  if (d.nombre !== undefined) update.nombre = d.nombre;
  if (d.orden !== undefined) update.orden = d.orden;
  if (d.activa !== undefined) update.activa = d.activa;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'sin_cambios' }, { status: 400 });
  }

  const [updated] = await db
    .update(categoriasMarca)
    .set(update)
    .where(eq(categoriasMarca.id, id))
    .returning();
  if (!updated) return NextResponse.json({ error: 'no_existe' }, { status: 404 });
  return NextResponse.json({ ok: true, categoria: updated });
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
  const [updated] = await db
    .update(categoriasMarca)
    .set({ activa: false })
    .where(eq(categoriasMarca.id, id))
    .returning({ id: categoriasMarca.id });
  if (!updated) return NextResponse.json({ error: 'no_existe' }, { status: 404 });
  return NextResponse.json({ ok: true, soft_deleted: true });
}

export const dynamic = 'force-dynamic';
