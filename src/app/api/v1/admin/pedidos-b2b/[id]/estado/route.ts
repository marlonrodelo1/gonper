import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import {
  pedidosB2b,
  pedidosB2bItems,
  stockSalon,
} from '@/lib/db/schema';
import { requireApiToken } from '@/lib/api/auth';

/**
 * PATCH /api/v1/admin/pedidos-b2b/[id]/estado
 *
 * Cambia el estado de un pedido B2B desde el super-admin (lo dispara la
 * marca via super-admin o Gestori). Cuando el pedido pasa a `entregado`,
 * se hace upsert en `stock_salon` con las cantidades pedidas — el salón
 * tendrá ese stock disponible para vender en su tienda pública (debe
 * activarlo manualmente desde /panel/stock).
 *
 * Body: { estado: 'aceptado'|'enviado'|'entregado'|'cancelado', notas_marca?: string }
 */

const ESTADOS_VALIDOS = ['aceptado', 'enviado', 'entregado', 'cancelado'] as const;

const Body = z.object({
  estado: z.enum(ESTADOS_VALIDOS),
  notas_marca: z.string().max(500).optional(),
});

function tsFieldUpdate(
  estado: (typeof ESTADOS_VALIDOS)[number],
  now: Date,
): Partial<typeof pedidosB2b.$inferInsert> {
  switch (estado) {
    case 'aceptado':
      return { aceptadoAt: now };
    case 'enviado':
      return { enviadoAt: now };
    case 'entregado':
      return { entregadoAt: now };
    case 'cancelado':
      return { canceladoAt: now };
  }
}

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
    return NextResponse.json(
      { error: 'Body inválido', detalles: parsed.error.issues },
      { status: 400 },
    );
  }
  const { estado, notas_marca } = parsed.data;

  // Cargar pedido + items
  const [pedido] = await db
    .select()
    .from(pedidosB2b)
    .where(eq(pedidosB2b.id, id))
    .limit(1);
  if (!pedido) {
    return NextResponse.json({ error: 'pedido_no_existe' }, { status: 404 });
  }

  if (pedido.estado === estado) {
    return NextResponse.json({ ok: true, pedido, note: 'sin_cambio' });
  }
  if (pedido.estado === 'cancelado' || pedido.estado === 'entregado') {
    return NextResponse.json(
      { error: 'pedido_en_estado_final', estado_actual: pedido.estado },
      { status: 409 },
    );
  }

  const update: Record<string, unknown> = {
    estado,
    ...tsFieldUpdate(estado, new Date()),
  };
  if (notas_marca !== undefined) update.notasMarca = notas_marca;

  try {
    await db.transaction(async (tx) => {
      await tx.update(pedidosB2b).set(update).where(eq(pedidosB2b.id, id));

      // Si pasamos a entregado, sumar items al stock_salon
      if (estado === 'entregado') {
        const items = await tx
          .select()
          .from(pedidosB2bItems)
          .where(eq(pedidosB2bItems.pedidoId, id));

        for (const it of items) {
          await tx
            .insert(stockSalon)
            .values({
              salonId: pedido.salonId,
              productoId: it.productoId,
              cantidadDisponible: it.cantidad,
              activoEnTiendaPublica: false,
            })
            .onConflictDoUpdate({
              target: [stockSalon.salonId, stockSalon.productoId],
              set: {
                cantidadDisponible: sql`${stockSalon.cantidadDisponible} + ${it.cantidad}`,
              },
            });
        }
      }
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno';
    console.error('[admin/pedidos-b2b/estado]', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  revalidatePath('/panel/pedidos');
  revalidatePath(`/panel/pedidos/${id}`);
  revalidatePath('/panel/stock');

  const [updated] = await db
    .select()
    .from(pedidosB2b)
    .where(eq(pedidosB2b.id, id))
    .limit(1);

  return NextResponse.json({ ok: true, pedido: updated });
}

export const dynamic = 'force-dynamic';
