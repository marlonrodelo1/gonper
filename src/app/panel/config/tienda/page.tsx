import Link from 'next/link';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { salones } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { Icon } from '@/app/panel/_components/icons';

import {
  actualizarConfigTienda,
  toggleMetodoPagoEfectivo,
  toggleMetodoPagoOnline,
} from './actions';

export default async function ConfigTiendaPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const params = await searchParams;
  const salonRaw = (await getCurrentSalon()) as { id?: string } | null;
  if (!salonRaw?.id) {
    return (
      <div className="card mx-auto flex max-w-2xl flex-col items-center gap-3 p-10 text-center">
        <h2 className="tight text-[20px] font-medium text-ink">
          Sin salón asociado
        </h2>
      </div>
    );
  }

  const [salon] = await db
    .select({
      stripeConnectOnboarded: salones.stripeConnectOnboarded,
      tiendaAceptaPagoOnline: salones.tiendaAceptaPagoOnline,
      tiendaAceptaEfectivo: salones.tiendaAceptaEfectivo,
      tiendaCosteEnvioEur: salones.tiendaCosteEnvioEur,
      tiendaZonaEnvio: salones.tiendaZonaEnvio,
      slug: salones.slug,
    })
    .from(salones)
    .where(eq(salones.id, salonRaw.id))
    .limit(1);

  if (!salon) return null;

  const costeEnvioStr = salon.tiendaCosteEnvioEur
    ? Number(salon.tiendaCosteEnvioEur).toFixed(2)
    : '';

  return (
    <div className="flex w-full flex-col gap-5">
      {params.ok && (
        <div className="flex items-center gap-2 rounded-xl border border-sage/40 bg-sage-soft px-4 py-3 text-[13px] text-sage-deep">
          <Icon.Check width="14" height="14" />
          Cambios guardados.
        </div>
      )}
      {params.error && (
        <div
          className="rounded-xl border bg-[#F1D6D6] px-4 py-3 text-[13px] text-[#7C2E2E]"
          style={{ borderColor: 'rgba(177,72,72,0.4)' }}
        >
          {params.error}
        </div>
      )}

      <header className="flex flex-col gap-1">
        <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
          Tienda online
        </span>
        <h2 className="tight text-[20px] font-medium text-ink">
          Configura cómo vendes productos
        </h2>
        <p className="text-[13px] text-stone">
          Define cómo cobras a tus clientes finales y si haces envíos. El
          inventario y los precios los gestionas en{' '}
          <Link href="/panel/stock" className="text-terracotta hover:text-terracotta-2">
            /panel/stock
          </Link>
          .
        </p>
      </header>

      {/* Métodos de pago */}
      <section className="card flex flex-col gap-5 p-5 md:p-7">
        <header className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
            Métodos de pago
          </span>
          <h3 className="tight text-[17px] font-medium text-ink">
            Cómo cobras al cliente final
          </h3>
        </header>

        {/* Pago online */}
        <div className="rounded-2xl border border-line bg-cream/40 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="tight text-[14px] font-medium text-ink">
                  Pago online con tarjeta
                </span>
                {salon.tiendaAceptaPagoOnline && salon.stripeConnectOnboarded ? (
                  <span
                    className="pill"
                    style={{
                      background: 'rgba(139,157,122,0.15)',
                      color: '#5A6B4D',
                    }}
                  >
                    <span className="pill-dot" style={{ background: '#8B9D7A' }} />
                    Activo
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
                    Desactivado
                  </span>
                )}
              </div>
              <p className="mt-1 text-[12.5px] text-stone">
                El cliente paga con tarjeta al instante. El dinero llega a tu
                cuenta Stripe (con un fee de Stripe estándar). Requiere conectar
                Stripe Connect en{' '}
                <Link
                  href="/panel/cuenta"
                  className="text-terracotta hover:text-terracotta-2 underline decoration-terracotta/30 underline-offset-4"
                >
                  Mi cuenta
                </Link>
                .
              </p>
              {!salon.stripeConnectOnboarded && (
                <div
                  className="mt-2 rounded-xl border px-3 py-2 text-[12px]"
                  style={{
                    borderColor: 'rgba(197,142,44,0.45)',
                    background: 'rgba(197,142,44,0.10)',
                    color: '#7A5A1B',
                  }}
                >
                  Conecta Stripe Connect primero para poder activar el pago online.
                </div>
              )}
            </div>
            <form action={toggleMetodoPagoOnline}>
              <input
                type="hidden"
                name="activar"
                value={salon.tiendaAceptaPagoOnline ? 'false' : 'true'}
              />
              <button
                type="submit"
                disabled={!salon.stripeConnectOnboarded && !salon.tiendaAceptaPagoOnline}
                className="tight rounded-full border border-line bg-paper px-4 py-2 text-[12.5px] font-medium text-ink hover:bg-cream disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {salon.tiendaAceptaPagoOnline ? 'Desactivar' : 'Activar'}
              </button>
            </form>
          </div>
        </div>

        {/* Pago efectivo */}
        <div className="rounded-2xl border border-line bg-cream/40 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="tight text-[14px] font-medium text-ink">
                  Pago en efectivo / al recoger
                </span>
                {salon.tiendaAceptaEfectivo ? (
                  <span
                    className="pill"
                    style={{
                      background: 'rgba(139,157,122,0.15)',
                      color: '#5A6B4D',
                    }}
                  >
                    <span className="pill-dot" style={{ background: '#8B9D7A' }} />
                    Activo
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
                    Desactivado
                  </span>
                )}
              </div>
              <p className="mt-1 text-[12.5px] text-stone">
                El cliente reserva online y paga al recoger en el salón (efectivo,
                Bizum, tu TPV propio, lo que prefieras). Sin pasarela en
                plataforma. Tú gestionas el cobro.
              </p>
            </div>
            <form action={toggleMetodoPagoEfectivo}>
              <input
                type="hidden"
                name="activar"
                value={salon.tiendaAceptaEfectivo ? 'false' : 'true'}
              />
              <button
                type="submit"
                className="tight rounded-full border border-line bg-paper px-4 py-2 text-[12.5px] font-medium text-ink hover:bg-cream"
              >
                {salon.tiendaAceptaEfectivo ? 'Desactivar' : 'Activar'}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Envío */}
      <section className="card flex flex-col gap-5 p-5 md:p-7">
        <header className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
            Envío al cliente
          </span>
          <h3 className="tight text-[17px] font-medium text-ink">
            Coste fijo de envío
          </h3>
          <p className="text-[13px] text-stone">
            Si dejas el campo vacío, el cliente solo podrá recoger en el salón.
            Si pones un coste, el cliente podrá elegir entre recogida (gratis)
            o envío a domicilio (con ese coste). El envío lo gestionas tú con
            tu mensajería habitual.
          </p>
        </header>

        <form action={actualizarConfigTienda} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 max-w-xs">
            <label
              htmlFor="coste_envio"
              className="text-[11px] uppercase tracking-[0.2em] text-stone/80"
            >
              Coste de envío (€)
            </label>
            <input
              id="coste_envio"
              name="coste_envio_eur"
              type="number"
              min={0}
              max={9999}
              step="0.01"
              defaultValue={costeEnvioStr}
              placeholder="Ej. 6.00"
              className="rounded-2xl border border-line bg-paper px-4 py-3 text-[13.5px] text-ink placeholder:text-stone/50 focus:outline-none focus:border-line-2"
            />
            <p className="text-[11.5px] text-stone/70">
              Déjalo vacío para desactivar el envío.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="zona_envio"
              className="text-[11px] uppercase tracking-[0.2em] text-stone/80"
            >
              Zona de envío (opcional, informativa)
            </label>
            <input
              id="zona_envio"
              name="zona_envio"
              type="text"
              defaultValue={salon.tiendaZonaEnvio ?? ''}
              maxLength={200}
              placeholder="Ej. Tenerife isla · Península sin Baleares · …"
              className="rounded-2xl border border-line bg-paper px-4 py-3 text-[13.5px] text-ink placeholder:text-stone/50 focus:outline-none focus:border-line-2"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="gloss-btn tight rounded-full px-5 py-2.5 text-[13px] font-medium"
            >
              Guardar
            </button>
          </div>
        </form>
      </section>

      <section className="card flex flex-col gap-3 p-5 md:p-7 bg-cream/40">
        <h3 className="tight text-[14px] font-medium text-ink">
          ¿Cómo recibo los pedidos B2B (a Gestori)?
        </h3>
        <p className="text-[13px] text-stone leading-relaxed">
          Cuando hagas un pedido desde{' '}
          <Link href="/panel/catalogo" className="text-terracotta hover:text-terracotta-2">
            /panel/catalogo
          </Link>
          , Gestori procesa tu pedido y la marca te lo envía directamente.
          Pagas contra reembolso o por transferencia al recibir. Verás tus
          pedidos y su estado en{' '}
          <Link href="/panel/pedidos" className="text-terracotta hover:text-terracotta-2">
            /panel/pedidos
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
