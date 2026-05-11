'use server';

import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import { marcas, pedidosB2b, pedidosB2bItems, productos } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';

const ItemSchema = z.object({
  producto_id: z.string().uuid(),
  nombre_snapshot: z.string().min(1).max(300),
  sku_snapshot: z.string().max(80).nullable(),
  cantidad: z.number().int().positive().max(9999),
  precio_unit_mayorista_eur: z.number().nonnegative(),
});

const Body = z.object({
  marca_id: z.string().uuid(),
  notas: z.string().max(500).optional(),
  items: z.array(ItemSchema).min(1).max(100),
});

export type CrearPedidoB2BInput = z.infer<typeof Body>;

export type CrearPedidoB2BResult =
  | { ok: true; pedido_id: string; numero: string; total_eur: number }
  | { ok: false; error: string };

/**
 * Crea un pedido B2B desde el carrito del salón. Valida que el salón
 * esté autenticado, que la marca y todos los productos existan y estén
 * activos, y que los precios coincidan con el catálogo actual.
 *
 * Tras crear el pedido dispara un webhook a n8n para notificar a la
 * marca por email (best-effort, no bloquea la creación).
 */
export async function crearPedidoB2B(
  input: CrearPedidoB2BInput,
): Promise<CrearPedidoB2BResult> {
  const parsed = Body.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Datos del pedido inválidos' };
  }
  const data = parsed.data;

  const salonRaw = (await getCurrentSalon()) as { id?: string } | null;
  if (!salonRaw?.id) {
    return { ok: false, error: 'No se pudo identificar el salón' };
  }
  const salonId = salonRaw.id;

  // Verificar marca activa
  const [marca] = await db
    .select({
      id: marcas.id,
      nombre: marcas.nombre,
      activa: marcas.activa,
      minimo: marcas.condicionesB2bMinimoEur,
    })
    .from(marcas)
    .where(eq(marcas.id, data.marca_id))
    .limit(1);
  if (!marca || !marca.activa) {
    return { ok: false, error: 'La marca no está disponible' };
  }

  // Verificar productos: existen, están activos y pertenecen a esa marca
  const productoIds = data.items.map((it) => it.producto_id);
  const productosRows = await db
    .select({
      id: productos.id,
      marcaId: productos.marcaId,
      activo: productos.activo,
      precio: productos.precioMayoristaEur,
      sku: productos.sku,
    })
    .from(productos)
    .where(eq(productos.activo, true));
  const productosMap = new Map(
    productosRows
      .filter((p) => productoIds.includes(p.id))
      .map((p) => [p.id, p]),
  );

  for (const it of data.items) {
    const p = productosMap.get(it.producto_id);
    if (!p) {
      return { ok: false, error: `Producto no disponible: ${it.nombre_snapshot}` };
    }
    if (p.marcaId !== data.marca_id) {
      return {
        ok: false,
        error: 'Hay productos que no pertenecen a esta marca',
      };
    }
    // Si el precio del catálogo cambió desde que se añadió al carrito,
    // usamos el precio actual (no el snapshot del cliente).
    const precioActual = Number(p.precio);
    if (Math.abs(precioActual - it.precio_unit_mayorista_eur) > 0.01) {
      // Continuamos pero sobreescribimos con el actual.
      it.precio_unit_mayorista_eur = precioActual;
    }
  }

  const total = data.items.reduce(
    (acc, it) => acc + it.precio_unit_mayorista_eur * it.cantidad,
    0,
  );
  const minimo = Number(marca.minimo);
  if (minimo > 0 && total < minimo) {
    return {
      ok: false,
      error: `Pedido mínimo de ${marca.nombre}: ${minimo.toFixed(2)} €`,
    };
  }

  // Crear pedido + items dentro de una transacción
  let pedido: { id: string; numero: string };
  try {
    pedido = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(pedidosB2b)
        .values({
          salonId,
          marcaId: data.marca_id,
          numero: '', // trigger lo rellena
          estado: 'pendiente',
          totalEur: total.toFixed(2),
          notasSalon: data.notas?.trim() || null,
        })
        .returning({ id: pedidosB2b.id, numero: pedidosB2b.numero });

      await tx.insert(pedidosB2bItems).values(
        data.items.map((it) => ({
          pedidoId: created.id,
          productoId: it.producto_id,
          nombreSnapshot: it.nombre_snapshot,
          skuSnapshot: it.sku_snapshot ?? productosMap.get(it.producto_id)?.sku ?? null,
          cantidad: it.cantidad,
          precioUnitMayoristaEur: it.precio_unit_mayorista_eur.toFixed(2),
          subtotalEur: (it.precio_unit_mayorista_eur * it.cantidad).toFixed(2),
        })),
      );

      return created;
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error guardando el pedido';
    console.error('[crearPedidoB2B]', e);
    return { ok: false, error: msg };
  }

  // Best-effort: notificar a n8n (no bloquear si falla)
  const webhookUrl = process.env.N8N_PEDIDO_B2B_WEBHOOK_URL;
  if (webhookUrl) {
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pedido_id: pedido.id,
        numero: pedido.numero,
        salon_id: salonId,
        marca_id: data.marca_id,
      }),
    }).catch((e) => console.error('[crearPedidoB2B] webhook n8n', e));
  }

  revalidatePath('/panel/catalogo');
  revalidatePath('/panel/pedidos');

  return {
    ok: true,
    pedido_id: pedido.id,
    numero: pedido.numero,
    total_eur: Number(total.toFixed(2)),
  };
}
