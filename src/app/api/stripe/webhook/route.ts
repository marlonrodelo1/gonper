import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getStripe } from '@/lib/stripe/client';
import { db } from '@/lib/db';
import {
  marcas,
  productos,
  salones,
  stripeEventsProcessed,
  ventasB2c,
  ventasB2cItems,
} from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';

// Stripe firma el body raw — desactivar cualquier optimización de Next que altere el body.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Webhook de Stripe.
 *
 * Idempotencia: registramos cada event.id en `stripe_events_processed`
 * antes de procesarlo. Si Stripe reintenta (timeout/5xx en intento previo),
 * insert con PRIMARY KEY duplicada falla y devolvemos 200 sin tocar BD —
 * evitamos updates duplicados de plan/customer/subscription.
 */
export async function POST(req: Request) {
  const stripe = getStripe();
  const sig = (await headers()).get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook Error: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  // Idempotencia: intentamos insertar event_id; si ya existe, salimos.
  try {
    await db
      .insert(stripeEventsProcessed)
      .values({
        eventId: event.id,
        eventType: event.type,
      });
  } catch (err) {
    // 23505 = unique_violation → evento ya procesado, no es un error real.
    const code =
      err && typeof err === 'object' && 'code' in err
        ? (err as { code?: string }).code
        : undefined;
    if (code === '23505') {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error('[stripe webhook] error guardando event_id', err);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 },
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const salonId = session.metadata?.salon_id;
        const plan = session.metadata?.plan as 'basico' | undefined;
        if (salonId && plan) {
          await db
            .update(salones)
            .set({
              plan,
              stripeCustomerId:
                typeof session.customer === 'string'
                  ? session.customer
                  : (session.customer?.id ?? null),
              stripeSubscriptionId:
                typeof session.subscription === 'string'
                  ? session.subscription
                  : (session.subscription?.id ?? null),
              trialUntil: null,
            })
            .where(eq(salones.id, salonId));
        }
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const salonId = sub.metadata?.salon_id;
        const plan = sub.metadata?.plan as 'basico' | undefined;
        if (salonId && plan && sub.status === 'active') {
          await db
            .update(salones)
            .set({ plan, stripeSubscriptionId: sub.id })
            .where(eq(salones.id, salonId));
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const salonId = sub.metadata?.salon_id;
        if (salonId) {
          await db
            .update(salones)
            .set({ plan: 'cancelado' })
            .where(eq(salones.id, salonId));
        }
        break;
      }

      // ============================================================
      // STRIPE CONNECT — onboarding del salón completado
      // ============================================================
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        const onboarded =
          Boolean(account.charges_enabled) &&
          Boolean(account.details_submitted);
        await db
          .update(salones)
          .set({ stripeConnectOnboarded: onboarded })
          .where(eq(salones.stripeConnectAccountId, account.id));
        break;
      }

      // ============================================================
      // VENTAS B2C — pago de tienda pública del salón
      // ============================================================
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        // Solo procesamos PaymentIntents marcados con tipo b2c en metadata.
        if (pi.metadata?.kind !== 'b2c') break;

        const ventaId = pi.metadata?.venta_id;
        if (!ventaId) {
          console.warn(
            '[stripe webhook] payment_intent.succeeded sin venta_id en metadata',
            pi.id,
          );
          break;
        }

        // Cargar la venta + items
        const [venta] = await db
          .select()
          .from(ventasB2c)
          .where(eq(ventasB2c.id, ventaId))
          .limit(1);
        if (!venta) {
          console.warn('[stripe webhook] venta no encontrada', ventaId);
          break;
        }
        if (venta.estado !== 'pendiente_pago') {
          // Ya estaba marcada (retry de webhook) — no hacer nada.
          break;
        }

        await db
          .update(ventasB2c)
          .set({
            // Modelo dropshipping: tras pago, queda pendiente que Marlon
            // tramite el pedido a la marca. No hay stock que descontar —
            // la marca lo envía directo.
            estado: 'pagada',
            pagadoAt: new Date(),
            stripeChargeId:
              typeof pi.latest_charge === 'string'
                ? pi.latest_charge
                : (pi.latest_charge?.id ?? null),
          })
          .where(eq(ventasB2c.id, ventaId));

        // Emails post-pago: cliente, salón y admin (tramitar marca).
        // Lectura de info necesaria para los 3 templates.
        const [salon] = await db
          .select({
            nombre: salones.nombre,
            slug: salones.slug,
            email: salones.email,
          })
          .from(salones)
          .where(eq(salones.id, venta.salonId))
          .limit(1);

        const itemsRows = await db
          .select({
            nombre: ventasB2cItems.nombreSnapshot,
            cantidad: ventasB2cItems.cantidad,
            precioUnitEur: ventasB2cItems.precioUnitEur,
            subtotalEur: ventasB2cItems.subtotalEur,
            marcaNombre: marcas.nombre,
          })
          .from(ventasB2cItems)
          .leftJoin(productos, eq(productos.id, ventasB2cItems.productoId))
          .leftJoin(marcas, eq(marcas.id, productos.marcaId))
          .where(eq(ventasB2cItems.ventaId, ventaId));

        const items = itemsRows.map((r) => ({
          nombre: r.nombre,
          cantidad: r.cantidad,
          precioUnitEur: r.precioUnitEur,
          subtotalEur: r.subtotalEur,
          marcaNombre: r.marcaNombre,
        }));

        if (salon) {
          const adminEmail =
            process.env.ADMIN_NOTIFY_EMAIL || 'rodelomarlon1@gmail.com';
          const {
            enviarConfirmacionVentaB2cCliente,
            enviarNotificacionVentaB2cSalon,
            enviarVentaB2cAdminTramitar,
          } = await import('@/lib/email/resend');

          const results = await Promise.allSettled([
            enviarConfirmacionVentaB2cCliente({
              to: venta.clienteEmail,
              clienteNombre: venta.clienteNombre ?? venta.clienteEmail,
              numero: venta.numero,
              salonNombre: salon.nombre,
              salonSlug: salon.slug,
              totalEur: venta.totalEur,
              items,
              direccionEnvio: venta.direccionEnvio ?? '',
            }),
            salon.email
              ? enviarNotificacionVentaB2cSalon({
                  to: salon.email,
                  salonNombre: salon.nombre,
                  numero: venta.numero,
                  clienteNombre: venta.clienteNombre ?? venta.clienteEmail,
                  totalEur: venta.totalEur,
                  comisionSalonEur: venta.comisionSalonEur,
                  items,
                })
              : Promise.resolve({ ok: false, error: 'salon_sin_email' }),
            enviarVentaB2cAdminTramitar({
              to: adminEmail,
              numero: venta.numero,
              salonNombre: salon.nombre,
              clienteNombre: venta.clienteNombre ?? venta.clienteEmail,
              clienteEmail: venta.clienteEmail,
              clienteTelefono: venta.clienteTelefono,
              direccionEnvio: venta.direccionEnvio ?? '',
              items,
              totalEur: venta.totalEur,
              comisionSalonEur: venta.comisionSalonEur,
              costeMarcaEur: venta.costeMarcaEur,
            }),
          ]);

          results.forEach((r, i) => {
            const etiqueta = ['cliente', 'salon', 'admin'][i];
            if (r.status === 'rejected') {
              console.error(`[stripe webhook] email B2C ${etiqueta} rejected`, r.reason);
            } else if (!r.value.ok) {
              console.error(`[stripe webhook] email B2C ${etiqueta} no enviado`, r.value.error);
            }
          });
        } else {
          console.error('[stripe webhook] salon no encontrado para venta', ventaId);
        }
        break;
      }
    }
  } catch (err) {
    console.error('[stripe webhook] error procesando evento', event.type, err);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
