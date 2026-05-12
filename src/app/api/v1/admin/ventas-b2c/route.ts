import { NextResponse } from 'next/server';
import { and, desc, eq, type SQL } from 'drizzle-orm';

import { db } from '@/lib/db';
import { salones, ventasB2c } from '@/lib/db/schema';
import { requireApiToken } from '@/lib/api/auth';

/**
 * GET /api/v1/admin/ventas-b2c
 *
 * Listado global de ventas B2C. Filtros:
 *   - estado=pendiente_pago|pendiente_tramitar_marca|tramitada_marca|recogida|cancelada|reembolsada
 *   - salon_id=uuid
 *
 * Auth: bearer INTERNAL_API_TOKEN.
 */
export async function GET(req: Request) {
  const authError = requireApiToken(req);
  if (authError) return authError;

  const url = new URL(req.url);
  const estado = url.searchParams.get('estado');
  const salonId = url.searchParams.get('salon_id');

  const conds: SQL[] = [];
  if (estado) conds.push(eq(ventasB2c.estado, estado));
  if (salonId && /^[0-9a-f-]{36}$/.test(salonId))
    conds.push(eq(ventasB2c.salonId, salonId));

  const rows = await db
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
    .where(conds.length > 0 ? and(...conds) : undefined)
    .orderBy(desc(ventasB2c.createdAt))
    .limit(200);

  return NextResponse.json({ ventas: rows });
}

export const dynamic = 'force-dynamic';
