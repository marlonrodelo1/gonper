import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, asc, eq, ne, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { salones } from '@/lib/db/schema';
import { requireApiToken } from '@/lib/api/auth';
import { revalidatePath } from 'next/cache';

/**
 * GET  /api/v1/admin/destacados → listado de salones marcables como destacados
 * PATCH /api/v1/admin/destacados → actualizar destacado/orden de un salón
 *
 * Auth: bearer INTERNAL_API_TOKEN. Lo consume el repo super-admin
 * (admin.gonperstudio.shop).
 */

export async function GET(req: Request) {
  const authError = requireApiToken(req);
  if (authError) return authError;

  const url = new URL(req.url);
  const onlyDestacados = url.searchParams.get('only') === 'destacados';

  const baseWhere = and(
    eq(salones.activo, true),
    eq(salones.marketplaceVisible, true),
    ne(salones.plan, 'cancelado'),
  );

  const where = onlyDestacados
    ? and(baseWhere, eq(salones.marketplaceDestacado, true))
    : baseWhere;

  const rows = await db
    .select({
      id: salones.id,
      slug: salones.slug,
      nombre: salones.nombre,
      tipoNegocio: salones.tipoNegocio,
      ciudad: salones.ciudad,
      destacado: salones.marketplaceDestacado,
      orden: salones.marketplaceDestacadoOrden,
      tieneCoordenadas: sql<boolean>`${salones.lat} is not null and ${salones.lng} is not null`,
    })
    .from(salones)
    .where(where)
    .orderBy(
      sql`${salones.marketplaceDestacadoOrden} asc nulls last`,
      asc(salones.nombre),
    );

  return NextResponse.json({ salones: rows });
}

const PatchBody = z.object({
  salon_id: z.string().uuid(),
  destacado: z.boolean(),
  orden: z.number().int().min(0).max(9999).nullable().optional(),
});

export async function PATCH(req: Request) {
  const authError = requireApiToken(req);
  if (authError) return authError;

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

  const { salon_id, destacado, orden } = parsed.data;

  const updateValues: {
    marketplaceDestacado: boolean;
    marketplaceDestacadoOrden?: number | null;
  } = { marketplaceDestacado: destacado };
  if (orden !== undefined) updateValues.marketplaceDestacadoOrden = orden;
  if (!destacado) updateValues.marketplaceDestacadoOrden = null;

  const [row] = await db
    .update(salones)
    .set(updateValues)
    .where(eq(salones.id, salon_id))
    .returning({
      id: salones.id,
      slug: salones.slug,
      destacado: salones.marketplaceDestacado,
      orden: salones.marketplaceDestacadoOrden,
    });

  if (!row) {
    return NextResponse.json({ error: 'salon_no_existe' }, { status: 404 });
  }

  revalidatePath('/marketplace');
  return NextResponse.json({ ok: true, salon: row });
}

export const dynamic = 'force-dynamic';
