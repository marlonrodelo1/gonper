'use client';

import { useState, useTransition } from 'react';

/**
 * Card que muestra el estado de Stripe Connect del salón y permite al
 * dueño iniciar/reanudar el onboarding o abrir el dashboard Express.
 */

type Props = {
  hasAccount: boolean;
  onboarded: boolean;
  /** Si vuelve de Stripe con `?connect=ok` mostramos un banner verde. */
  justReturned?: boolean;
};

export function StripeConnectCard({ hasAccount, onboarded, justReturned }: Props) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function iniciarOnboarding() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/stripe/connect/onboard', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error || 'No se pudo iniciar el onboarding');
        return;
      }
      if (data?.onboarded) {
        startTransition(() => window.location.reload());
        return;
      }
      if (data?.url) {
        window.location.href = data.url as string;
        return;
      }
      setErr('Respuesta inesperada de Stripe');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function abrirDashboard() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/stripe/connect/dashboard', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        setErr(data?.error || 'No se pudo abrir el dashboard');
        return;
      }
      window.open(data.url as string, '_blank', 'noopener');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card flex flex-col gap-4 p-5 md:p-7">
      <header className="flex flex-col gap-1">
        <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
          Cobros por venta de productos
        </span>
        <h2 className="tight text-[19px] font-medium text-ink">
          Stripe Connect
        </h2>
        <p className="text-[13px] text-stone">
          Para vender productos en tu tienda pública necesitas conectar tu
          cuenta con Stripe. Es la pasarela de pago — tú recibes el dinero de
          cada venta en tu IBAN, Gonper Studio se queda solo la comisión por
          intermediación.
        </p>
      </header>

      {justReturned && (
        <div className="rounded-2xl border border-sage/40 bg-sage-soft px-4 py-3 text-[13px] text-sage-deep">
          Stripe te ha redirigido aquí. Comprobamos el estado…
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {onboarded ? (
          <span
            className="pill"
            style={{
              background: 'rgba(139,157,122,0.15)',
              color: '#5A6B4D',
            }}
          >
            <span className="pill-dot" style={{ background: '#8B9D7A' }} />
            Listo para cobrar
          </span>
        ) : hasAccount ? (
          <span
            className="pill"
            style={{
              background: 'rgba(197,142,44,0.18)',
              color: '#7A5A1B',
            }}
          >
            <span className="pill-dot" style={{ background: '#C58E2C' }} />
            Onboarding pendiente
          </span>
        ) : (
          <span
            className="pill"
            style={{
              background: 'rgba(107,99,86,0.10)',
              color: '#6B6356',
            }}
          >
            <span className="pill-dot" style={{ background: '#8A8174' }} />
            Sin conectar
          </span>
        )}
      </div>

      {!onboarded && (
        <div
          className="rounded-2xl border px-4 py-3 text-[13px]"
          style={{
            borderColor: 'rgba(197,142,44,0.45)',
            background: 'rgba(197,142,44,0.10)',
            color: '#7A5A1B',
          }}
        >
          {hasAccount
            ? 'Termina de rellenar tus datos en Stripe (DNI, IBAN, etc.) para empezar a vender en la tienda pública.'
            : 'Conecta una cuenta Stripe Express (gratis, sin permanencia) para empezar a cobrar ventas online de productos en tu tienda pública.'}
        </div>
      )}

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

      <div className="flex flex-wrap items-center gap-2">
        {!onboarded && (
          <button
            type="button"
            onClick={iniciarOnboarding}
            disabled={loading}
            className="gloss-btn tight inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-medium disabled:opacity-60"
          >
            {loading
              ? 'Cargando…'
              : hasAccount
                ? 'Continuar onboarding'
                : 'Conectar cuenta para cobrar'}
          </button>
        )}
        {onboarded && (
          <>
            <button
              type="button"
              onClick={abrirDashboard}
              disabled={loading}
              className="gloss-btn tight inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-medium disabled:opacity-60"
            >
              {loading ? 'Abriendo…' : 'Abrir dashboard Stripe ↗'}
            </button>
            <button
              type="button"
              onClick={iniciarOnboarding}
              disabled={loading}
              className="tight inline-flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2 text-[12.5px] font-medium text-ink hover:bg-cream disabled:opacity-60"
            >
              Actualizar datos
            </button>
          </>
        )}
      </div>
    </section>
  );
}
