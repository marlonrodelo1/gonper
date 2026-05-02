'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type TrialBlockerProps = {
  trialExpirado: boolean;
  planActivo: boolean;
};

/**
 * Overlay full-screen que bloquea el panel cuando el trial ha expirado y el
 * salón no tiene un plan de pago activo. Sólo se oculta en
 * /panel/config/suscripcion para que el dueño pueda completar el checkout.
 */
export function TrialBlocker({ trialExpirado, planActivo }: TrialBlockerProps) {
  const pathname = usePathname();
  const debeBloquear =
    trialExpirado &&
    !planActivo &&
    !pathname.startsWith('/panel/config/suscripcion');

  if (!debeBloquear) return null;

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
          Tu prueba gratuita ha terminado
        </h2>
        <p className="mt-2 text-[13.5px] text-[#7C2E2E]">
          Para seguir usando Gomper, suscríbete al plan Básico (30 €/mes,
          sin permanencia, cancelas cuando quieras).
        </p>
        <Link
          href="/panel/config/suscripcion"
          className="gloss-btn tight mt-5 inline-flex h-11 w-full items-center justify-center rounded-full text-[14px] font-medium"
        >
          Suscribirme ahora
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
