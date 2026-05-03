'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type TrialBlockerProps = {
  /**
   * El salón aún no tiene suscripción Stripe (no completó Checkout en signup).
   * Esto bloquea siempre, salvo en /panel/config/suscripcion.
   */
  sinSuscripcion: boolean;
  /** Trial Stripe terminado y suscripción cancelada / impaga. */
  trialExpirado: boolean;
  planActivo: boolean;
};

/**
 * Overlay full-screen que bloquea el panel cuando:
 *  a) el salón aún no ha pasado por Stripe Checkout (sinSuscripcion), o
 *  b) el plan ya no está activo (cancelado, impagado, etc.).
 *
 * Sólo se oculta en /panel/config/suscripcion para que el dueño pueda
 * completar el flujo.
 */
export function TrialBlocker({
  sinSuscripcion,
  trialExpirado,
  planActivo,
}: TrialBlockerProps) {
  const pathname = usePathname();

  const debeBloquear =
    !planActivo &&
    (sinSuscripcion || trialExpirado) &&
    !pathname.startsWith('/panel/config/suscripcion');

  if (!debeBloquear) return null;

  const titulo = sinSuscripcion
    ? 'Activa tu cuenta'
    : 'Tu prueba gratuita ha terminado';
  const descripcion = sinSuscripcion
    ? 'Para empezar a usar Gomper necesitas añadir tu tarjeta. Tienes 7 días gratis y no se te cobra nada hoy. Cancelas cuando quieras.'
    : 'Para seguir usando Gomper, suscríbete al plan Básico (30 €/mes, sin permanencia, cancelas cuando quieras).';
  const cta = sinSuscripcion ? 'Añadir tarjeta y activar' : 'Suscribirme ahora';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="card grain mx-4 max-w-md p-7 text-center"
        style={{
          borderColor: 'rgba(177,72,72,0.4)',
          background: '#F1D6D6',
        }}
      >
        <div className="text-[11px] uppercase tracking-[0.22em] text-[#7C2E2E]/80">
          Atención
        </div>
        <h2 className="tight mt-2 text-[22px] font-medium text-[#7C2E2E]">
          {titulo}
        </h2>
        <p className="mt-2 text-[13.5px] text-[#7C2E2E]">{descripcion}</p>
        <Link
          href="/panel/config/suscripcion"
          className="gloss-btn tight mt-5 inline-flex h-11 w-full items-center justify-center rounded-full text-[14px] font-medium"
        >
          {cta}
        </Link>
        <form action="/auth/sign-out" method="POST" className="mt-3">
          <button
            type="submit"
            className="text-[12px] text-[#7C2E2E]/70 hover:text-[#7C2E2E]"
          >
            Salir
          </button>
        </form>
      </div>
    </div>
  );
}
