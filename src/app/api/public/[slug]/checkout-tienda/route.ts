import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq, inArray, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  marcas,
  productos,
  salones,
  stockSalon,
  ventasB2c,
  ventasB2cItems,
} from '@/lib/db/schema';
import { getStripe } from '@/lib/stripe/client';
import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit';

/**
 * POST /api/public/[slug]/checkout-tienda
 *
 * Crea una venta B2C en estado `pendiente_pago` y un PaymentIntent en
 * Stripe Connect destinado a la cuenta del salón con `application_fee`
 * por marca según `comision_porcentaje`.
 *
 * Concurrencia: hacemos UPDATE con WHERE cantidad >= X para reservar
 * stock atómicamente. Si alguna línea falla, abortamos antes de crear
 * el PaymentIntent.
 *
 * El cliente final no se autentica — la sesión vive en el carrito local
 * del visitante (sessionStorage) + el email que introduce en checkout.
 */

const Body = z.object({
  cliente_email: z.string().email().max(200),
  cliente_nombre: z.string().min(1).max(120),
  cliente_telefono: z.string().max(40).optional(),
  items: z
    .array(
      z.object({
        producto_id: z.string().uuid(),
        cantidad: z.number().int().positive().max(99),
      }),
    )
    .min(1)
    .max(50),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const ip = getClientIp(req);
  const limit = await checkRateLimit('ip', `tienda-checkout:${ip}`, 30);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Demasiados intentos, espera unos minutos.' },
      { status: 429 },
    );
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
      { error: 'Parámetros inválidos', detalles: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // Cargar salón
  const [salon] = await db
    .select({
      id: salones.id,
      nombre: salones.nombre,
      slug: salones.slug,
      stripeConnectAccountId: salones.stripeConnectAccountId,
      stripeConnectOnboarded: salones.stripeConnectOnboarded,
      activo: salones.activo,
    })
    .from(salones)
    .where(eq(salones.slug, slug))
    .limit(1);

  if (!salon || !salon.activo) {
    return NextResponse.json(
      { error: 'salon_no_encontrado' },
      { status: 404 },
    );
  }
  if (!salon.stripeConnectAccountId || !salon.stripeConnectOnboarded) {
    return NextResponse.json(
      { error: 'salon_no_acepta_pagos' },
      { status: 400 },
    );
  }

  // Cargar productos + stock + marca para validar y calcular comisión
  const productoIds = data.items.map((it) => it.producto_id);
  const rows = await db
    .select({
      productoId: productos.id,
      productoNombre: productos.nombre,
      productoImagenes: productos.imagenes,
      productoActivo: productos.activo,
      marcaActiva: marcas.activa,
      marcaComision: marcas.comisionPorcentaje,
      stockId: stockSalon.id,
      stockCantidad: stockSalon.cantidadDisponible,
      stockPrecioPublico: stockSalon.precioPublicoEur,
      stockActivo: stockSalon.activoEnTiendaPublica,
      precioRecomendado: productos.precioPublicoRecomendadoEur,
    })
    .from(productos)
    .innerJoin(marcas, eq(marcas.id, productos.marcaId))
    .innerJoin(
      stockSalon,
      and(
        eq(stockSalon.productoId, productos.id),
        eq(stockSalon.salonId, salon.id),
      ),
    )
    .where(inArray(productos.id, productoIds));

  const rowMap = new Map(rows.map((r) => [r.productoId, r]));

  // Validar todos los items y construir snapshot
  type ItemInternal = {
    productoId: string;
    cantidad: number;
    precioUnitEur: number;
    comisionPct: number;
    nombreSnapshot: string;
    imagenSnapshot: string | null;
  };
  const itemsValidados: ItemInternal[] = [];
  let totalCentimos = 0;
  let comisionCentimos = 0;

  for (const it of data.items) {
    const r = rowMap.get(it.producto_id);
    if (!r) {
      return NextResponse.json(
        { error: `producto_no_disponible: ${it.producto_id}` },
        { status: 400 },
      );
    }
    if (!r.productoActivo || !r.marcaActiva || !r.stockActivo) {
      return NextResponse.json(
        { error: `producto_no_activo: ${r.productoNombre}` },
        { status: 400 },
      );
    }
    if (r.stockCantidad < it.cantidad) {
      return NextResponse.json(
        {
          error: 'stock_insuficiente',
          producto: r.productoNombre,
          disponible: r.stockCantidad,
        },
        { status: 409 },
      );
    }
    const precio = Number(r.stockPrecioPublico ?? r.precioRecomendado);
    const cantidadCent = Math.round(precio * 100) * it.cantidad;
    const comisionPct = Number(r.marcaComision);
    const comisionCent = Math.round(cantidadCent * (comisionPct / 100));
    totalCentimos += cantidadCent;
    comisionCentimos += comisionCent;
    const imagenes = Array.isArray(r.productoImagenes)
      ? (r.productoImagenes as string[])
      : [];
    itemsValidados.push({
      productoId: it.producto_id,
      cantidad: it.cantidad,
      precioUnitEur: precio,
      comisionPct,
      nombreSnapshot: r.productoNombre,
      imagenSnapshot: imagenes[0] ?? null,
    });
  }

  if (totalCentimos < 50) {
    // Stripe rechaza < 0.50 €
    return NextResponse.json(
      { error: 'total_demasiado_bajo' },
      { status: 400 },
    );
  }

  // Reservar stock atómicamente: UPDATE WHERE cantidad >= X.
  // Si alguno falla, devolver stock previo y abortar.
  const reservas: Array<{ productoId: string; cantidad: number }> = [];
  try {
    for (const it of itemsValidados) {
      const upd = await db
        .update(stockSalon)
        .set({
          cantidadDisponible: sql`${stockSalon.cantidadDisponible} - ${it.cantidad}`,
        })
        .where(
          and(
            eq(stockSalon.salonId, salon.id),
            eq(stockSalon.productoId, it.productoId),
            sql`${stockSalon.cantidadDisponible} >= ${it.cantidad}`,
          ),
        )
        .returning({ id: stockSalon.id });
      if (upd.length === 0) {
        // Devolver lo ya reservado
        await rollbackReservas(salon.id, reservas);
        return NextResponse.json(
          { error: 'stock_insuficiente_concurrente', producto: it.nombreSnapshot },
          { status: 409 },
        );
      }
      reservas.push({ productoId: it.productoId, cantidad: it.cantidad });
    }
  } catch (e) {
    await rollbackReservas(salon.id, reservas);
    const msg = e instanceof Error ? e.message : 'Error reservando stock';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Crear fila ventas_b2c con estado pendiente_pago
  let ventaCreada: { id: string; numero: string };
  try {
    const totalEur = (totalCentimos / 100).toFixed(2);
    const comisionEur = (comisionCentimos / 100).toFixed(2);
    const [created] = await db
      .insert(ventasB2c)
      .values({
        salonId: salon.id,
        numero: '',
        clienteEmail: data.cliente_email,
        clienteNombre: data.cliente_nombre,
        clienteTelefono: data.cliente_telefono ?? null,
        totalEur,
        comisionGestoriEur: comisionEur,
        estado: 'pendiente_pago',
      })
      .returning({ id: ventasB2c.id, numero: ventasB2c.numero });
    ventaCreada = created;

    await db.insert(ventasB2cItems).values(
      itemsValidados.map((it) => ({
        ventaId: ventaCreada.id,
        productoId: it.productoId,
        nombreSnapshot: it.nombreSnapshot,
        imagenSnapshot: it.imagenSnapshot,
        cantidad: it.cantidad,
        precioUnitEur: it.precioUnitEur.toFixed(2),
        subtotalEur: (it.precioUnitEur * it.cantidad).toFixed(2),
      })),
    );
  } catch (e) {
    await rollbackReservas(salon.id, reservas);
    const msg = e instanceof Error ? e.message : 'Error creando venta';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Crear PaymentIntent Stripe Connect
  try {
    const stripe = getStripe();
    const pi = await stripe.paymentIntents.create({
      amount: totalCentimos,
      currency: 'eur',
      automatic_payment_methods: { enabled: true },
      application_fee_amount: comisionCentimos,
      transfer_data: {
        destination: salon.stripeConnectAccountId,
      },
      receipt_email: data.cliente_email,
      metadata: {
        kind: 'b2c',
        venta_id: ventaCreada.id,
        venta_numero: ventaCreada.numero,
        salon_id: salon.id,
        salon_slug: salon.slug,
      },
    });

    await db
      .update(ventasB2c)
      .set({ stripePaymentIntentId: pi.id })
      .where(eq(ventasB2c.id, ventaCreada.id));

    return NextResponse.json({
      ok: true,
      venta_id: ventaCreada.id,
      numero: ventaCreada.numero,
      client_secret: pi.client_secret,
      publishable_key: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null,
    });
  } catch (e) {
    // Si Stripe falla, devolver stock y borrar venta
    await rollbackReservas(salon.id, reservas);
    await db.delete(ventasB2c).where(eq(ventasB2c.id, ventaCreada.id));
    const msg = e instanceof Error ? e.message : 'Error creando pago';
    console.error('[checkout-tienda] stripe', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function rollbackReservas(
  salonId: string,
  reservas: Array<{ productoId: string; cantidad: number }>,
) {
  for (const r of reservas) {
    await db
      .update(stockSalon)
      .set({
        cantidadDisponible: sql`${stockSalon.cantidadDisponible} + ${r.cantidad}`,
      })
      .where(
        and(
          eq(stockSalon.salonId, salonId),
          eq(stockSalon.productoId, r.productoId),
        ),
      )
      .catch(() => {});
  }
}

export const dynamic = 'force-dynamic';
