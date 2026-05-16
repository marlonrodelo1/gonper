import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { ventasB2c } from '@/lib/db/schema';
import { requireApiToken } from '@/lib/api/auth';

/**
 * PATCH /api/v1/admin/ventas-b2c/[id]/estado
 *
 * Cambia el estado de la venta para reflejar el flujo dropshipping:
 *   - pendiente_tramitar_marca → tramitada_marca (Marlon ya avisó/Wella)
 *   - tramitada_marca → recogida (cliente confirma recepción)
 *   - cualquiera → cancelada / reembolsada (con cuidado)
 *
 * Auth: bearer INTERNAL_API_TOKEN.
 */
const ESTADOS_ADMIN = [
  'pendiente_tramitar_marca',
  'tramitada_marca',
  'recogida',
  'cancelada',
  'reembolsada',
] as const;

const Body = z.object({
  estado: z.enum(ESTADOS_ADMIN),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = requireApiToken(req);
  if (authError) return authError;

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }
  const { estado } = parsed.data;

  const update: Record<string, unknown> = { estado };
  const now = new Date();
  if (estado === 'tramitada_marca') update.listaRecogidaAt = now;
  if (estado === 'recogida') update.recogidaAt = now;
  if (estado === 'cancelada') update.canceladaAt = now;
  if (estado === 'reembolsada') {
    // El reembolso es un evento de cierre: si no estaba cancelada, marcamos
    // también canceladaAt para que las queries de "cuándo se cerró" funcionen.
    update.canceladaAt = now;
  }

  const [row] = await db
    .update(ventasB2c)
    .set(update)
    .where(eq(ventasB2c.id, id))
    .returning({ id: ventasB2c.id, numero: ventasB2c.numero, estado: ventasB2c.estado });

  if (!row) {
    return NextResponse.json({ error: 'venta_no_existe' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, venta: row });
}

export const dynamic = 'force-dynamic';
