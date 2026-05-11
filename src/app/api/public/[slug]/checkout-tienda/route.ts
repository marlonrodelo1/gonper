import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq, inArray, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
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
 * Modelo v2: Gestori NO comisiona B2C. El salón cobra todo el importe.
 * El cliente elige:
 *   - método de pago: `online` (Stripe Connect, total al salón) o `efectivo`
 *     (paga al recoger/recibir; no se crea PaymentIntent).
 *   - método de entrega: `recogida` en salón o `envio` (suma `coste_envio_eur`
 *     configurado por el salón en su config de tienda).
 *
 * Reserva stock atómicamente con UPDATE WHERE cantidad >= X.
 */

const Body = z.object({
  cliente_email: z.string().email().max(200),
  cliente_nombre: z.string().min(1).max(120),
  cliente_telefono: z.string().max(40).optional(),
  metodo_pago: z.enum(['online', 'efectivo']),
  metodo_entrega: z.enum(['recogida', 'envio']),
  direccion_envio: z.string().max(500).optional(),
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

  // Si elige envío, dirección obligatoria
  if (data.metodo_entrega === 'envio' && !data.direccion_envio?.trim()) {
    return NextResponse.json(
      { error: 'direccion_envio_requerida' },
      { status: 400 },
    );
  }

  // Cargar salón con su config de tienda
  const [salon] = await db
    .select({
      id: salones.id,
      nombre: salones.nombre,
      slug: salones.slug,
      activo: salones.activo,
      stripeConnectAccountId: salones.stripeConnectAccountId,
      stripeConnectOnboarded: salones.stripeConnectOnboarded,
      tiendaAceptaPagoOnline: salones.tiendaAceptaPagoOnline,
      tiendaAceptaEfectivo: salones.tiendaAceptaEfectivo,
      tiendaCosteEnvioEur: salones.tiendaCosteEnvioEur,
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

  // Validar método de pago aceptado por el salón
  if (data.metodo_pago === 'online') {
    if (
      !salon.tiendaAceptaPagoOnline ||
      !salon.stripeConnectAccountId ||
      !salon.stripeConnectOnboarded
    ) {
      return NextResponse.json(
        { error: 'salon_no_acepta_pago_online' },
        { status: 400 },
      );
    }
  } else {
    if (!salon.tiendaAceptaEfectivo) {
      return NextResponse.json(
        { error: 'salon_no_acepta_efectivo' },
        { status: 400 },
      );
    }
  }

  // Validar método de entrega
  const costeEnvio =
    data.metodo_entrega === 'envio' && salon.tiendaCosteEnvioEur
      ? Number(salon.tiendaCosteEnvioEur)
      : 0;
  if (data.metodo_entrega === 'envio' && costeEnvio <= 0) {
    return NextResponse.json(
      { error: 'salon_no_acepta_envio' },
      { status: 400 },
    );
  }

  // Cargar productos + stock para validar y calcular total
  const productoIds = data.items.map((it) => it.producto_id);
  const rows = await db
    .select({
      productoId: productos.id,
      productoNombre: productos.nombre,
      productoImagenes: productos.imagenes,
      productoActivo: productos.activo,
      stockCantidad: stockSalon.cantidadDisponible,
      stockPrecioPublico: stockSalon.precioPublicoEur,
      stockActivo: stockSalon.activoEnTiendaPublica,
      precioRecomendado: productos.precioPublicoRecomendadoEur,
    })
    .from(productos)
    .innerJoin(
      stockSalon,
      and(
        eq(stockSalon.productoId, productos.id),
        eq(stockSalon.salonId, salon.id),
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
  };
  const itemsValidados: ItemInternal[] = [];
  let subtotalCentimos = 0;

  for (const it of data.items) {
    const r = rowMap.get(it.producto_id);
    if (!r) {
      return NextResponse.json(
        { error: `producto_no_disponible: ${it.producto_id}` },
        { status: 400 },
      );
    }
    if (!r.productoActivo || !r.stockActivo) {
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
    subtotalCentimos += Math.round(precio * 100) * it.cantidad;
    const imagenes = Array.isArray(r.productoImagenes)
      ? (r.productoImagenes as string[])
      : [];
    itemsValidados.push({
      productoId: it.producto_id,
      cantidad: it.cantidad,
      precioUnitEur: precio,
      nombreSnapshot: r.productoNombre,
      imagenSnapshot: imagenes[0] ?? null,
    });
  }

  const costeEnvioCentimos = Math.round(costeEnvio * 100);
  const totalCentimos = subtotalCentimos + costeEnvioCentimos;

  if (data.metodo_pago === 'online' && totalCentimos < 50) {
    return NextResponse.json(
      { error: 'total_demasiado_bajo' },
      { status: 400 },
    );
  }

  // Reservar stock atómicamente
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

  // Crear venta_b2c. Estado inicial depende del método de pago:
  // - online: pendiente_pago (esperando confirmación Stripe)
  // - efectivo: pendiente_pago_efectivo (espera a que el salón confirme cobro)
  const estadoInicial =
    data.metodo_pago === 'online' ? 'pendiente_pago' : 'pendiente_pago_efectivo';
  const totalEur = (totalCentimos / 100).toFixed(2);
  const costeEnvioEurStr = costeEnvio.toFixed(2);

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
        estado: estadoInicial,
        metodoPago: data.metodo_pago,
        metodoEntrega: data.metodo_entrega,
        costeEnvioEur: costeEnvioEurStr,
        direccionEnvio: data.direccion_envio?.trim() || null,
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

  // Si pago efectivo, no creamos PaymentIntent. Notificamos a n8n y
  // devolvemos redirección directa a éxito.
  if (data.metodo_pago === 'efectivo') {
    const n8nUrl = process.env.N8N_VENTA_B2C_WEBHOOK_URL;
    if (n8nUrl) {
      fetch(n8nUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venta_id: ventaCreada.id }),
      }).catch(() => {});
    }
    return NextResponse.json({
      ok: true,
      venta_id: ventaCreada.id,
      numero: ventaCreada.numero,
      metodo_pago: 'efectivo',
      redirect_url: `/s/${salon.slug}/tienda/exito?numero=${encodeURIComponent(ventaCreada.numero)}`,
    });
  }

  // Pago online — crear PaymentIntent Stripe Connect SIN application_fee.
  // Toda la pasta va al salón.
  try {
    const stripe = getStripe();
    const pi = await stripe.paymentIntents.create({
      amount: totalCentimos,
      currency: 'eur',
      automatic_payment_methods: { enabled: true },
      // NO application_fee_amount: Gestori no comisiona B2C.
      transfer_data: {
        destination: salon.stripeConnectAccountId!,
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
      metodo_pago: 'online',
      client_secret: pi.client_secret,
      publishable_key: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null,
    });
  } catch (e) {
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
