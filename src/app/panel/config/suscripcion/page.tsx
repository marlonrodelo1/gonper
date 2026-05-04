import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { Icon } from '@/app/panel/_components/icons';
import { PLANES } from '@/lib/stripe/client';
import { crearCheckout, abrirPortalCliente } from './actions';

type SalonRow = Record<string, unknown>;

function pick<T = unknown>(row: SalonRow, ...keys: string[]): T | undefined {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null) return v as T;
  }
  return undefined;
}

function diasRestantes(trialUntil: string | Date): number {
  const d = trialUntil instanceof Date ? trialUntil : new Date(trialUntil);
  if (isNaN(d.getTime())) return 0;
  const ms = d.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export default async function SuscripcionPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string; error?: string }>;
}) {
  const params = await searchParams;
  const salonRaw = (await getCurrentSalon()) as SalonRow | null;

  if (!salonRaw) {
    return (
      <div className="card mx-auto flex max-w-2xl flex-col items-center gap-3 p-10 text-center">
        <h2 className="tight text-[22px] font-medium text-ink">Suscripción</h2>
        <p className="text-[14px] text-stone">
          Aún no tienes un salón asociado a tu cuenta.
        </p>
      </div>
    );
  }

  const planActual = (pick<string>(salonRaw, 'plan') ?? 'trial') as
    | 'trial'
    | 'basico'
    | 'solo'
    | 'studio'
    | 'pro'
    | 'cancelado';
  const trialUntil = pick<string | Date>(salonRaw, 'trial_until', 'trialUntil');
  const customerId = pick<string>(
    salonRaw,
    'stripe_customer_id',
    'stripeCustomerId',
  );

  const enTrial = planActual === 'trial';
  const trialDias = trialUntil ? diasRestantes(trialUntil) : 0;
  const trialExpirado = enTrial && trialDias <= 0;
  // Cualquier plan distinto de trial / cancelado se considera activo
  // (incluye legacy: solo / studio / pro y el nuevo basico).
  const planActivo =
    planActual === 'basico' ||
    planActual === 'solo' ||
    planActual === 'studio' ||
    planActual === 'pro';
  const cancelado = planActual === 'cancelado';

  const plan = PLANES.basico;
  const precioFmt = plan.precio.toFixed(2).replace('.', ',');

  return (
    <div className="flex w-full flex-col gap-5">
      {params.success ? (
        <div className="flex items-center gap-2 rounded-xl border border-sage/40 bg-sage-soft px-4 py-3 text-[13px] text-sage-deep">
          <Icon.Check width="14" height="14" />
          Pago completado. Tu suscripción está activa.
        </div>
      ) : null}
      {params.canceled ? (
        <div
          className="rounded-xl border px-4 py-3 text-[13px]"
          style={{
            borderColor: 'rgba(197,142,44,0.4)',
            background: 'rgba(197,142,44,0.10)',
            color: '#7A5A1B',
          }}
        >
          Has cancelado el proceso de pago. No se ha hecho ningún cargo.
        </div>
      ) : null}
      {params.error ? (
        <div
          className="rounded-xl border bg-[#F1D6D6] px-4 py-3 text-[13px] text-[#7C2E2E]"
          style={{ borderColor: 'rgba(177,72,72,0.4)' }}
        >
          {params.error}
        </div>
      ) : null}

      {trialExpirado && !planActivo ? (
        <section
          className="card flex flex-col gap-1.5 p-6"
          style={{
            borderColor: 'rgba(177,72,72,0.4)',
            background: '#F1D6D6',
          }}
        >
          <span className="text-[11px] uppercase tracking-[0.22em] text-[#7C2E2E]/80">
            Atención
          </span>
          <h2 className="tight text-[20px] font-medium text-[#7C2E2E]">
            Tu prueba gratuita ha terminado
          </h2>
          <p className="text-[13.5px] text-[#7C2E2E]">
            Suscríbete al plan Básico para seguir usando Gomper.
          </p>
        </section>
      ) : null}

      {enTrial && !trialExpirado ? (
        <section className="card flex flex-col gap-1.5 p-6">
          <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
            Trial
          </span>
          <h2 className="tight text-[20px] font-medium text-ink">
            Tu prueba acaba en {trialDias === 1 ? '1 día' : `${trialDias} días`}
          </h2>
          <p className="text-[13.5px] text-stone">
            Suscríbete cuando estés list@ — sin permanencia, cancelas cuando
            quieras.
          </p>
        </section>
      ) : null}

      {cancelado ? (
        <section className="card flex flex-col gap-1.5 p-6">
          <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
            Estado
          </span>
          <h2 className="tight text-[20px] font-medium text-ink">
            Suscripción cancelada
          </h2>
          <p className="text-[13.5px] text-stone">
            Puedes reactivar tu cuenta volviendo a suscribirte al plan Básico.
          </p>
        </section>
      ) : null}

      <section className="plan-reco relative flex flex-col gap-5 rounded-[20px] p-5 md:p-7">
        {planActivo ? (
          <span className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-terracotta text-paper text-[11px] uppercase tracking-[0.18em]">
            Plan activo
          </span>
        ) : enTrial && !trialExpirado ? (
          <span className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-terracotta text-paper text-[11px] uppercase tracking-[0.18em]">
            Empezar prueba gratuita 7 días
          </span>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-[0.22em] text-cream/60">
            Plan
          </span>
          <h3 className="tight text-[24px] font-medium text-cream">
            {plan.nombre}
          </h3>
          <div className="flex items-baseline gap-1.5">
            <span className="tight tabular text-[32px] font-medium text-cream">
              {precioFmt} €
            </span>
            <span className="text-[13px] text-cream/70">/ mes</span>
          </div>
          <p className="font-serif-it text-[12.5px] text-cream/60">
            cancela cuando quieras · IVA no incluido
          </p>
        </div>

        <ul className="flex flex-col gap-2 text-[13.5px] text-cream/85">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <span className="mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-cream/20 text-cream">
                <Icon.Check width="10" height="10" />
              </span>
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-2">
          {planActivo ? (
            customerId ? (
              <form action={abrirPortalCliente}>
                <button
                  type="submit"
                  className="tight w-full rounded-full bg-cream px-5 py-3 text-[13.5px] font-medium text-ink hover:opacity-90"
                >
                  Gestionar suscripción
                </button>
              </form>
            ) : (
              <button
                type="button"
                disabled
                className="tight w-full rounded-full border border-cream/30 px-5 py-3 text-[13.5px] font-medium text-cream/70"
              >
                Plan actual
              </button>
            )
          ) : cancelado ? (
            <form action={crearCheckout.bind(null, 'basico')}>
              <button
                type="submit"
                className="tight w-full rounded-full bg-cream px-5 py-3 text-[13.5px] font-medium text-ink hover:opacity-90"
              >
                Reactivar
              </button>
            </form>
          ) : (
            <form action={crearCheckout.bind(null, 'basico')}>
              <button
                type="submit"
                className="tight w-full rounded-full bg-cream px-5 py-3 text-[13.5px] font-medium text-ink hover:opacity-90"
              >
                Suscribirme ({precioFmt} €/mes)
              </button>
            </form>
          )}
          {!plan.priceId ? (
            <p className="mt-2 text-[12px] text-amber-soft/80">
              Plan no configurado en Stripe (falta STRIPE_PRICE_BASIC).
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
