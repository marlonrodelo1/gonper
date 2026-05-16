import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, count, desc, eq, gte, lte, type SQL } from 'drizzle-orm';

import { db } from '@/lib/db';
import { salones, ventasB2c } from '@/lib/db/schema';
import { requireApiToken } from '@/lib/api/auth';

/**
 * GET /api/v1/admin/ventas-b2c
 *
 * Listado paginado de ventas B2C. Filtros (todos opcionales):
 *   - estado      → enum (pendiente_pago, pendiente_tramitar_marca,
 *                   tramitada_marca, recogida, cancelada, reembolsada)
 *   - salon_id    → uuid
 *   - desde       → YYYY-MM-DD (created_at >= desde)
 *   - hasta       → YYYY-MM-DD (created_at < hasta+1d)
 *   - page        → 1..N (default 1)
 *   - page_size   → 10..200 (default 50)
 *
 * Devuelve `{ ventas, total, page, page_size, pages }`.
 *
 * Auth: bearer INTERNAL_API_TOKEN.
 */

const ESTADOS = [
  'pendiente_pago',
  'pendiente_tramitar_marca',
  'tramitada_marca',
  'recogida',
  'cancelada',
  'reembolsada',
] as const;

const QuerySchema = z.object({
  estado: z.enum(ESTADOS).optional(),
  salon_id: z.string().regex(/^[0-9a-f-]{36}$/).optional(),
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(10).max(200).default(50),
});

export async function GET(req: Request) {
  const authError = requireApiToken(req);
  if (authError) return authError;

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse(
    Object.fromEntries(url.searchParams.entries()),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'query_invalida', detalles: parsed.error.issues },
      { status: 400 },
    );
  }
  const q = parsed.data;

  const conds: SQL[] = [];
  if (q.estado) conds.push(eq(ventasB2c.estado, q.estado));
  if (q.salon_id) conds.push(eq(ventasB2c.salonId, q.salon_id));
  if (q.desde)
    conds.push(gte(ventasB2c.createdAt, new Date(`${q.desde}T00:00:00Z`)));
  if (q.hasta) {
    const fin = new Date(`${q.hasta}T00:00:00Z`);
    fin.setUTCDate(fin.getUTCDate() + 1);
    conds.push(lte(ventasB2c.createdAt, fin));
  }

  const whereClause = conds.length > 0 ? and(...conds) : undefined;
  const offset = (q.page - 1) * q.page_size;

  const [rows, totals] = await Promise.all([
    db
      .select({
        id: ventasB2c.id,
        numero: ventasB2c.numero,
        estado: ventasB2c.estado,
        totalEur: ventasB2c.totalEur,
        comisionSalonEur: ventasB2c.comisionSalonEur,
        costeMarcaEur: ventasB2c.costeMarcaEur,
        metodoPago: ventasB2c.metodoPago,
        clienteEmail: ventasB2c.clienteEmail,
        clienteNombre: ventasB2c.clienteNombre,
        direccionEnvio: ventasB2c.direccionEnvio,
        pagadoAt: ventasB2c.pagadoAt,
        createdAt: ventasB2c.createdAt,
        salonId: salones.id,
        salonNombre: salones.nombre,
        salonSlug: salones.slug,
      })
      .from(ventasB2c)
      .innerJoin(salones, eq(salones.id, ventasB2c.salonId))
      .where(whereClause)
      .orderBy(desc(ventasB2c.createdAt))
      .limit(q.page_size)
      .offset(offset),
    db
      .select({ value: count() })
      .from(ventasB2c)
      .where(whereClause),
  ]);

  const total = Number(totals[0]?.value ?? 0);

  return NextResponse.json({
    ventas: rows,
    total,
    page: q.page,
    page_size: q.page_size,
    pages: Math.max(1, Math.ceil(total / q.page_size)),
  });
}

export const dynamic = 'force-dynamic';
