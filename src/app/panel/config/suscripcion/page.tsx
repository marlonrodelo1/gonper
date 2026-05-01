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

const ORDEN: ('solo' | 'studio' | 'pro')[] = ['solo', 'studio', 'pro'];
const RECOMENDADO: 'studio' = 'studio';

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
  const planActivo =
    planActual === 'solo' || planActual === 'studio' || planActual === 'pro';
  const cancelado = planActual === 'cancelado';

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
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
            Suscríbete a uno de los planes para seguir usando Gomper.
          </p>
        </section>
      ) : null}

      {enTrial && !trialExpirado ? (
        <section className="card flex flex-col gap-1.5 p-6">
          <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
            Trial
          </span>
          <h2 className="tight text-[20px] font-medium text-ink">
            Estás en prueba gratuita
          </h2>
          <p className="text-[13.5px] text-stone">
            {trialDias === 1
              ? 'Queda 1 día de prueba.'
              : `Quedan ${trialDias} días de prueba.`}{' '}
            Elige un plan cuando estés list@.
          </p>
        </section>
      ) : null}

      {planActivo ? (
        <section className="card flex items-start justify-between gap-4 p-6">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
              Plan activo
            </span>
            <h2 className="tight flex items-center gap-2 text-[20px] font-medium text-ink">
              {PLANES[planActual as 'solo' | 'studio' | 'pro'].nombre}
              <span
                className="pill"
                style={{
                  background: 'rgba(139,157,122,0.15)',
                  color: '#5A6B4D',
                }}
              >
                <span
                  className="pill-dot"
                  style={{ background: '#8B9D7A' }}
                />
                Activo
              </span>
            </h2>
            <p className="text-[13.5px] text-stone">
              Gestiona tu método de pago, facturas o cancela desde Stripe.
            </p>
          </div>
          {customerId ? (
            <form action={abrirPortalCliente}>
              <button
                type="submit"
                className="gloss-btn tight rounded-full px-5 py-3 text-[13.5px] font-medium"
              >
                Gestionar suscripción
              </button>
            </form>
          ) : null}
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
            Puedes reactivar tu cuenta eligiendo cualquiera de los planes.
          </p>
        </section>
      ) : null}

      <header className="flex flex-col gap-1">
        <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
          Planes
        </span>
        <h2 className="tight text-[24px] font-medium text-ink">
          Elige el que se adapta
        </h2>
        <p className="font-serif-it text-[14px] text-stone/70">
          cancela cuando quieras · IVA no incluido
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {ORDEN.map((id) => {
          const p = PLANES[id];
          const esActual = planActual === id;
          const esRecomendado = id === RECOMENDADO;
          const useReco = esRecomendado || esActual;
          const cardClass = useReco
            ? 'plan-reco relative flex flex-col gap-5 rounded-[20px] p-7'
            : 'card relative flex flex-col gap-5 p-7';
          const titleColor = useReco ? 'text-cream' : 'text-ink';
          const stoneColor = useReco ? 'text-cream/70' : 'text-stone';
          const featureColor = useReco ? 'text-cream/85' : 'text-ink/85';
          return (
            <div key={id} className={cardClass}>
              {esActual ? (
                <span className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-terracotta text-paper text-[11px] uppercase tracking-[0.18em]">
                  Tu plan
                </span>
              ) : esRecomendado ? (
                <span className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-terracotta text-paper text-[11px] uppercase tracking-[0.18em]">
                  Recomendado
                </span>
              ) : null}

              <div className="flex flex-col gap-1.5">
                <span
                  className={`text-[11px] uppercase tracking-[0.22em] ${useReco ? 'text-cream/60' : 'text-stone/70'}`}
                >
                  Plan
                </span>
                <h3 className={`tight text-[24px] font-medium ${titleColor}`}>
                  {p.nombre}
                </h3>
                <div className="flex items-baseline gap-1.5">
                  <span
                    className={`tight tabular text-[32px] font-medium ${titleColor}`}
                  >
                    {p.precio.toFixed(2).replace('.', ',')} €
                  </span>
                  <span className={`text-[13px] ${stoneColor}`}>/ mes</span>
                </div>
              </div>

              <ul className={`flex flex-col gap-2 text-[13.5px] ${featureColor}`}>
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span
                      className={`mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${useReco ? 'bg-cream/20 text-cream' : 'bg-sage-soft text-sage-deep'}`}
                    >
                      <Icon.Check width="10" height="10" />
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-2">
                {esActual ? (
                  <button
                    type="button"
                    disabled
                    className={`tight w-full rounded-full px-5 py-3 text-[13.5px] font-medium ${useReco ? 'border border-cream/30 text-cream/70' : 'border border-line text-stone'}`}
                  >
                    Plan actual
                  </button>
                ) : planActivo ? (
                  <form action={abrirPortalCliente}>
                    <button
                      type="submit"
                      className={`tight w-full rounded-full px-5 py-3 text-[13.5px] font-medium ${useReco ? 'bg-cream text-ink hover:opacity-90' : 'card-tight text-ink hover:bg-cream'}`}
                    >
                      Cambiar plan
                    </button>
                  </form>
                ) : (
                  <form action={crearCheckout.bind(null, id)}>
                    <button
                      type="submit"
                      className={
                        useReco
                          ? 'tight w-full rounded-full bg-cream px-5 py-3 text-[13.5px] font-medium text-ink hover:opacity-90'
                          : 'gloss-btn tight w-full rounded-full px-5 py-3 text-[13.5px] font-medium'
                      }
                    >
                      Suscribirme
                    </button>
                  </form>
                )}
                {!p.priceId ? (
                  <p
                    className={`mt-2 text-[12px] ${useReco ? 'text-amber-soft/80' : ''}`}
                    style={!useReco ? { color: '#7A5A1B' } : undefined}
                  >
                    Plan no configurado en Stripe (falta STRIPE_PRICE_
                    {id.toUpperCase()}).
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
