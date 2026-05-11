'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import { pedidosB2b } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';

/**
 * Cancela un pedido B2B del salón. Solo permitido si el pedido está en
 * `pendiente` (no aceptado todavía por la marca).
 */
export async function cancelarPedidoB2B(pedidoId: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/.test(pedidoId)) return;

  const salonRaw = (await getCurrentSalon()) as { id?: string } | null;
  if (!salonRaw?.id) return;

  await db
    .update(pedidosB2b)
    .set({ estado: 'cancelado', canceladoAt: new Date() })
    .where(
      and(
        eq(pedidosB2b.id, pedidoId),
        eq(pedidosB2b.salonId, salonRaw.id),
        eq(pedidosB2b.estado, 'pendiente'),
      ),
    );

  revalidatePath('/panel/pedidos');
  revalidatePath(`/panel/pedidos/${pedidoId}`);
}
