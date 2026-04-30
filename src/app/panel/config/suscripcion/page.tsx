import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Suscripción</CardTitle>
          <CardDescription>
            Aún no tienes un salón asociado a tu cuenta.
          </CardDescription>
        </CardHeader>
      </Card>
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
    <div className="mx-auto max-w-5xl space-y-6">
      {params.success ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
          Pago completado. Tu suscripción está activa. Puede tardar unos
          segundos en reflejarse aquí.
        </div>
      ) : null}
      {params.canceled ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
          Has cancelado el proceso de pago. No se ha hecho ningún cargo.
        </div>
      ) : null}
      {params.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {params.error}
        </div>
      ) : null}

      {trialExpirado && !planActivo ? (
        <Card className="border-red-300 bg-red-50 dark:border-red-900/40 dark:bg-red-900/20">
          <CardHeader>
            <CardTitle className="text-red-800 dark:text-red-200">
              Tu prueba gratuita ha terminado
            </CardTitle>
            <CardDescription className="text-red-700 dark:text-red-300">
              Suscríbete a uno de los planes para seguir usando Gomper.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {enTrial && !trialExpirado ? (
        <Card>
          <CardHeader>
            <CardTitle>Estás en prueba gratuita</CardTitle>
            <CardDescription>
              {trialDias === 1
                ? 'Queda 1 día de prueba.'
                : `Quedan ${trialDias} días de prueba.`}{' '}
              Elige un plan cuando estés list@.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {planActivo ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Plan {PLANES[planActual as 'solo' | 'studio' | 'pro'].nombre}
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-transparent">
                    Plan activo
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Gestiona tu método de pago, facturas o cancela desde el portal
                  de cliente de Stripe.
                </CardDescription>
              </div>
              {customerId ? (
                <form action={abrirPortalCliente}>
                  <Button type="submit">Gestionar suscripción</Button>
                </form>
              ) : null}
            </div>
          </CardHeader>
        </Card>
      ) : null}

      {cancelado ? (
        <Card>
          <CardHeader>
            <CardTitle>Suscripción cancelada</CardTitle>
            <CardDescription>
              Puedes reactivar tu cuenta eligiendo cualquiera de los planes.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <div>
        <h2 className="text-lg font-semibold tracking-tight">Planes</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Cancela cuando quieras. IVA no incluido.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {ORDEN.map((id) => {
          const p = PLANES[id];
          const esActual = planActual === id;
          const esRecomendado = id === RECOMENDADO;
          return (
            <Card
              key={id}
              className={
                esActual
                  ? 'border-emerald-400 ring-2 ring-emerald-300 dark:border-emerald-700 dark:ring-emerald-900'
                  : esRecomendado
                    ? 'border-purple-300 dark:border-purple-800'
                    : ''
              }
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{p.nombre}</CardTitle>
                  {esActual ? (
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-transparent">
                      Tu plan
                    </Badge>
                  ) : esRecomendado ? (
                    <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-transparent">
                      Recomendado
                    </Badge>
                  ) : null}
                </div>
                <CardDescription>
                  <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    {p.precio.toFixed(2).replace('.', ',')} €
                  </span>
                  <span className="text-zinc-500"> / mes</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-1.5 text-sm text-zinc-700 dark:text-zinc-300">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="mt-0.5 text-emerald-600 dark:text-emerald-400">
                        ✓
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Separator />
                {esActual ? (
                  <Button disabled className="w-full" variant="outline">
                    Plan actual
                  </Button>
                ) : planActivo ? (
                  <form action={abrirPortalCliente}>
                    <Button type="submit" className="w-full" variant="outline">
                      Cambiar plan
                    </Button>
                  </form>
                ) : (
                  <form action={crearCheckout.bind(null, id)}>
                    <Button type="submit" className="w-full">
                      Suscribirme
                    </Button>
                  </form>
                )}
                {!p.priceId ? (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Plan no configurado en Stripe (falta STRIPE_PRICE_
                    {id.toUpperCase()}).
                  </p>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
