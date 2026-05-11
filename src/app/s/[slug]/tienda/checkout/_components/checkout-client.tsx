'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { loadStripe, type Stripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';

import {
  clearCart,
  leerCarrito,
  totalCarrito,
  type CarritoItem,
} from '@/lib/tienda/cart';

type Props = {
  salonSlug: string;
  salonNombre: string;
  aceptaPagos: boolean;
};

type CheckoutResp =
  | {
      ok: true;
      venta_id: string;
      numero: string;
      client_secret: string;
      publishable_key: string | null;
    }
  | { error: string; producto?: string; disponible?: number };

export function CheckoutClient({
  salonSlug,
  salonNombre,
  aceptaPagos,
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState<CarritoItem[]>([]);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [ventaId, setVentaId] = useState<string | null>(null);
  const [numero, setNumero] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setItems(leerCarrito(salonSlug));
  }, [salonSlug]);

  const total = useMemo(() => totalCarrito(items), [items]);

  async function startCheckout(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!aceptaPagos) {
      setErr('El salón no acepta pagos online todavía.');
      return;
    }
    if (items.length === 0) {
      setErr('Tu carrito está vacío.');
      return;
    }
    if (!nombre.trim() || !email.trim()) {
      setErr('Necesitamos tu nombre y email.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/${salonSlug}/checkout-tienda`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_email: email.trim(),
          cliente_nombre: nombre.trim(),
          cliente_telefono: telefono.trim() || undefined,
          items: items.map((it) => ({
            producto_id: it.productoId,
            cantidad: it.cantidad,
          })),
        }),
      });
      const data = (await res.json()) as CheckoutResp;
      if (!res.ok || !('ok' in data) || !data.ok) {
        const e = 'error' in data ? data.error : 'No se pudo iniciar el pago';
        setErr(
          'producto' in data && data.producto
            ? `${e}: ${data.producto}${
                data.disponible !== undefined
                  ? ` (quedan ${data.disponible})`
                  : ''
              }`
            : e,
        );
        setSubmitting(false);
        return;
      }
      setClientSecret(data.client_secret);
      setVentaId(data.venta_id);
      setNumero(data.numero);
      if (data.publishable_key) {
        setStripePromise(loadStripe(data.publishable_key));
      }
    } catch (e) {
      setErr((e as Error).message);
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-3 p-10 text-center">
        <p className="text-[14px] text-stone">Tu carrito está vacío.</p>
        <button
          type="button"
          onClick={() => router.push(`/s/${salonSlug}/tienda`)}
          className="gloss-btn tight rounded-full px-5 py-2.5 text-[13px] font-medium"
        >
          Ver tienda
        </button>
      </div>
    );
  }

  if (clientSecret && stripePromise && ventaId && numero) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="card p-5 md:p-7">
          <h2 className="text-[11px] uppercase tracking-[0.22em] text-stone/70 mb-3">
            Detalles de pago
          </h2>
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: 'flat',
                variables: {
                  colorPrimary: '#C5562C',
                  colorBackground: '#FBF8F2',
                  colorText: '#1A1815',
                  colorDanger: '#7C2E2E',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  borderRadius: '12px',
                },
              },
            }}
          >
            <StripePaymentForm
              salonSlug={salonSlug}
              numero={numero}
              total={total}
            />
          </Elements>
        </section>
        <ResumenAside items={items} total={total} salonNombre={salonNombre} />
      </div>
    );
  }

  return (
    <form onSubmit={startCheckout} className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="card flex flex-col gap-4 p-5 md:p-7">
        <h2 className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
          Tus datos
        </h2>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] uppercase tracking-[0.2em] text-stone/80">
            Nombre y apellidos
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            maxLength={120}
            className="rounded-2xl border border-line bg-paper px-4 py-3 text-[14px] text-ink placeholder:text-stone/50 focus:outline-none focus:border-line-2"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] uppercase tracking-[0.2em] text-stone/80">
            Email (para confirmación y aviso de recogida)
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            maxLength={200}
            className="rounded-2xl border border-line bg-paper px-4 py-3 text-[14px] text-ink placeholder:text-stone/50 focus:outline-none focus:border-line-2"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] uppercase tracking-[0.2em] text-stone/80">
            Teléfono (opcional)
          </label>
          <input
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            maxLength={40}
            placeholder="+34 ..."
            className="rounded-2xl border border-line bg-paper px-4 py-3 text-[14px] text-ink placeholder:text-stone/50 focus:outline-none focus:border-line-2"
          />
        </div>

        {err && (
          <div
            className="rounded-2xl border px-4 py-3 text-[13px]"
            style={{
              borderColor: 'rgba(177,72,72,0.4)',
              background: '#F1D6D6',
              color: '#7C2E2E',
            }}
          >
            {err}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="gloss-btn tight rounded-full px-5 py-3 text-[13.5px] font-medium disabled:opacity-60"
        >
          {submitting ? 'Preparando pago…' : `Continuar al pago · ${total.toFixed(2)} €`}
        </button>

        <p className="text-[11.5px] text-stone/75">
          Te llevaremos a un campo seguro para introducir tu tarjeta. El cobro
          lo procesa Stripe, no almacenamos tus datos de tarjeta.
        </p>
      </section>

      <ResumenAside items={items} total={total} salonNombre={salonNombre} />
    </form>
  );
}

function StripePaymentForm({
  salonSlug,
  numero,
  total,
}: {
  salonSlug: string;
  numero: string;
  total: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function pagar(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setErr(null);

    const origin = window.location.origin;
    const returnUrl = `${origin}/s/${salonSlug}/tienda/exito?numero=${encodeURIComponent(
      numero,
    )}`;

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
    });

    if (result.error) {
      setErr(result.error.message ?? 'Error procesando el pago');
      setSubmitting(false);
    } else {
      // Stripe redirige al return_url tras éxito.
      // El carrito se vacía allí.
    }
  }

  return (
    <form onSubmit={pagar} className="flex flex-col gap-4">
      <PaymentElement />
      {err && (
        <div
          className="rounded-2xl border px-4 py-3 text-[13px]"
          style={{
            borderColor: 'rgba(177,72,72,0.4)',
            background: '#F1D6D6',
            color: '#7C2E2E',
          }}
        >
          {err}
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="gloss-btn tight rounded-full px-5 py-3 text-[13.5px] font-medium disabled:opacity-60"
      >
        {submitting ? 'Procesando…' : `Pagar ${total.toFixed(2)} €`}
      </button>
    </form>
  );
}

function ResumenAside({
  items,
  total,
  salonNombre,
}: {
  items: CarritoItem[];
  total: number;
  salonNombre: string;
}) {
  return (
    <aside className="card flex flex-col gap-3 p-5 h-fit lg:sticky lg:top-5">
      <h2 className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
        Resumen
      </h2>
      <ul className="flex flex-col gap-1.5 text-[12.5px] text-stone">
        {items.map((it) => (
          <li key={it.productoId} className="flex items-center justify-between">
            <span className="truncate pr-2">
              {it.cantidad}× {it.nombre}
            </span>
            <span className="text-ink">{(it.precio * it.cantidad).toFixed(2)} €</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between border-t border-line pt-3 mt-1">
        <span className="text-[11px] uppercase tracking-[0.2em] text-stone/80">
          Total
        </span>
        <span className="tight text-[22px] font-medium text-ink">
          {total.toFixed(2)} €
        </span>
      </div>
      <p className="text-[11.5px] text-stone/75 leading-relaxed mt-1">
        Recogida en <strong>{salonNombre}</strong>. Te avisaremos por email
        cuando tu pedido esté listo.
      </p>
    </aside>
  );
}
