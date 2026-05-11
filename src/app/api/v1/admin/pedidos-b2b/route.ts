import { NextResponse } from 'next/server';
import { and, desc, eq, type SQL } from 'drizzle-orm';

import { db } from '@/lib/db';
import { marcas, pedidosB2b, salones } from '@/lib/db/schema';
import { requireApiToken } from '@/lib/api/auth';

/**
 * GET /api/v1/admin/pedidos-b2b
 *
 * Listado de todos los pedidos B2B con datos del salón y de la marca.
 * Filtros opcionales:
 *   - estado=pendiente|aceptado|enviado|entregado|cancelado
 *   - marca_id=uuid
 *   - salon_id=uuid
 *
 * Auth: bearer INTERNAL_API_TOKEN.
 */
export async function GET(req: Request) {
  const authError = requireApiToken(req);
  if (authError) return authError;

  const url = new URL(req.url);
  const estado = url.searchParams.get('estado');
  const marcaId = url.searchParams.get('marca_id');
  const salonId = url.searchParams.get('salon_id');

  const conds: SQL[] = [];
  if (estado) conds.push(eq(pedidosB2b.estado, estado));
  if (marcaId && /^[0-9a-f-]{36}$/.test(marcaId))
    conds.push(eq(pedidosB2b.marcaId, marcaId));
  if (salonId && /^[0-9a-f-]{36}$/.test(salonId))
    conds.push(eq(pedidosB2b.salonId, salonId));

  const rows = await db
    .select({
      id: pedidosB2b.id,
      numero: pedidosB2b.numero,
      estado: pedidosB2b.estado,
      totalEur: pedidosB2b.totalEur,
      createdAt: pedidosB2b.createdAt,
      aceptadoAt: pedidosB2b.aceptadoAt,
      enviadoAt: pedidosB2b.enviadoAt,
      entregadoAt: pedidosB2b.entregadoAt,
      canceladoAt: pedidosB2b.canceladoAt,
      notasSalon: pedidosB2b.notasSalon,
      notasMarca: pedidosB2b.notasMarca,
      salonId: salones.id,
      salonNombre: salones.nombre,
      salonSlug: salones.slug,
      salonEmail: salones.email,
      marcaId: marcas.id,
      marcaNombre: marcas.nombre,
      marcaEmail: marcas.contactoEmail,
    })
    .from(pedidosB2b)
    .innerJoin(salones, eq(salones.id, pedidosB2b.salonId))
    .innerJoin(marcas, eq(marcas.id, pedidosB2b.marcaId))
    .where(conds.length > 0 ? and(...conds) : undefined)
    .orderBy(desc(pedidosB2b.createdAt))
    .limit(200);

  return NextResponse.json({ pedidos: rows });
}

export const dynamic = 'force-dynamic';
