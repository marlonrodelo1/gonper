import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  marcas,
  productos,
  productosSalon,
  salones,
  ventasB2c,
  ventasB2cItems,
} from '@/lib/db/schema';
import { getStripe } from '@/lib/stripe/client';
import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit';

/**
 * POST /api/public/[slug]/checkout-tienda
 *
 * Modelo dropshipping (sesión 2026-05-12):
 *   - Rogotech (mi Stripe) cobra al cliente final.
 *   - El producto lo envía la marca directo al cliente.
 *   - Vía transfer_data, Stripe transfiere automáticamente al Connect del
 *     salón su % de comisión configurado por marca.
 *   - Marlon paga a la marca aparte (semanal/mensual).
 *
 * El salón NO toca precio ni stock. Solo activa productos en productos_salon.
 * El precio público es fijo (productos.precio_publico_recomendado_eur).
 *
 * Sin método "efectivo" — siempre online en este modelo.
 * Sin envío configurable — el coste de envío de la marca al cliente lo
 * asumimos como parte del precio o lo absorbe Rogotech (decisión fuera
 * del código).
 */

const Body = z.object({
  cliente_email: z.string().email().max(200),
  cliente_nombre: z.string().min(1).max(120),
  cliente_telefono: z.string().max(40).optional(),
  direccion_envio: z.string().min(5).max(500),
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

  const [salon] = await db
    .select({
      id: salones.id,
      nombre: salones.nombre,
      slug: salones.slug,
      activo: salones.activo,
      stripeConnectAccountId: salones.stripeConnectAccountId,
      stripeConnectOnboarded: salones.stripeConnectOnboarded,
    })
    .from(salones)
    .where(eq(salones.slug, slug))
    .limit(1);

  if (!salon || !salon.activo) {
    return NextResponse.json({ error: 'salon_no_encontrado' }, { status: 404 });
  }
  if (!salon.stripeConnectAccountId || !salon.stripeConnectOnboarded) {
    return NextResponse.json(
      { error: 'salon_sin_pagos_configurados' },
      { status: 400 },
    );
  }

  const productoIds = data.items.map((it) => it.producto_id);
  const rows = await db
    .select({
      productoId: productos.id,
      productoNombre: productos.nombre,
      productoImagenes: productos.imagenes,
      productoActivo: productos.activo,
      precioEur: productos.precioPublicoRecomendadoEur,
      costeMayoristaEur: productos.costeMayoristaEur,
      productoSalonActivo: productosSalon.activo,
      marcaId: marcas.id,
      marcaActiva: marcas.activa,
      marcaComisionSalonPct: marcas.comisionSalonPorcentaje,
    })
    .from(productos)
    .innerJoin(marcas, eq(marcas.id, productos.marcaId))
    .innerJoin(
      productosSalon,
      and(
        eq(productosSalon.productoId, productos.id),
        eq(productosSalon.salonId, salon.id),
      ),
    )
    .where(inArray(productos.id, productoIds));

  const rowMap = new Map(rows.map((r) => [r.productoId, r]));

  type ItemInternal = {
    productoId: string;
    cantidad: number;
    precioUnitEur: number;
    nombreSnapshot: string;
    imagenSnapshot: string | null;
    comisionSalonEur: number;
    costeMarcaEur: number;
  };
  const itemsValidados: ItemInternal[] = [];
  let subtotalCentimos = 0;
  let comisionSalonCentimos = 0;
  let costeMarcaCentimos = 0;

  for (const it of data.items) {
    const r = rowMap.get(it.producto_id);
    if (!r) {
      return NextResponse.json(
        { error: `producto_no_disponible: ${it.producto_id}` },
        { status: 400 },
      );
    }
    if (!r.productoActivo || !r.marcaActiva || !r.productoSalonActivo) {
      return NextResponse.json(
        { error: `producto_no_activo: ${r.productoNombre}` },
        { status: 400 },
      );
    }
    const precio = Number(r.precioEur);
    const comisionPct = Number(r.marcaComisionSalonPct);
    const lineaSubtotalCentimos = Math.round(precio * 100) * it.cantidad;
    const lineaComisionCentimos = Math.round(
      (lineaSubtotalCentimos * comisionPct) / 100,
    );
    const costeMayoristaUnit = r.costeMayoristaEur
      ? Number(r.costeMayoristaEur)
      : 0;
    const lineaCosteMarcaCentimos =
      Math.round(costeMayoristaUnit * 100) * it.cantidad;

    subtotalCentimos += lineaSubtotalCentimos;
    comisionSalonCentimos += lineaComisionCentimos;
    costeMarcaCentimos += lineaCosteMarcaCentimos;

    const imagenes = Array.isArray(r.productoImagenes)
      ? (r.productoImagenes as string[])
      : [];
    itemsValidados.push({
      productoId: it.producto_id,
      cantidad: it.cantidad,
      precioUnitEur: precio,
      nombreSnapshot: r.productoNombre,
      imagenSnapshot: imagenes[0] ?? null,
      comisionSalonEur: lineaComisionCentimos / 100,
      costeMarcaEur: lineaCosteMarcaCentimos / 100,
    });
  }

  const totalCentimos = subtotalCentimos;
  if (totalCentimos < 50) {
    return NextResponse.json({ error: 'total_demasiado_bajo' }, { status: 400 });
  }
  if (comisionSalonCentimos > totalCentimos) {
    // Guardia defensiva.
    return NextResponse.json(
      { error: 'comision_excede_total' },
      { status: 500 },
    );
  }

  const totalEur = (totalCentimos / 100).toFixed(2);
  const comisionSalonEur = (comisionSalonCentimos / 100).toFixed(2);
  const costeMarcaEur = (costeMarcaCentimos / 100).toFixed(2);

  let ventaCreada: { id: string; numero: string };
  try {
    const [created] = await db
      .insert(ventasB2c)
      .values({
        salonId: salon.id,
        numero: '',
        clienteEmail: data.cliente_email,
        clienteNombre: data.cliente_nombre,
        clienteTelefono: data.cliente_telefono ?? null,
        totalEur,
        comisionGestoriEur: '0',
        comisionSalonEur,
        costeMarcaEur,
        estado: 'pendiente_pago',
        metodoPago: 'online',
        metodoEntrega: 'envio',
        costeEnvioEur: '0',
        direccionEnvio: data.direccion_envio.trim(),
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
    const msg = e instanceof Error ? e.message : 'Error creando venta';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // PaymentIntent al Stripe de Rogotech con transfer_data.destination que
  // hace que Stripe reparta automáticamente la comisión al salón.
  try {
    const stripe = getStripe();
    const pi = await stripe.paymentIntents.create({
      amount: totalCentimos,
      currency: 'eur',
      automatic_payment_methods: { enabled: true },
      transfer_data: {
        destination: salon.stripeConnectAccountId!,
        amount: comisionSalonCentimos,
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
    await db.delete(ventasB2c).where(eq(ventasB2c.id, ventaCreada.id));
    const msg = e instanceof Error ? e.message : 'Error creando pago';
    console.error('[checkout-tienda] stripe', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
