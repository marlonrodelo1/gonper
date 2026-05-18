import Link from 'next/link';

import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { Icon } from '@/app/panel/_components/icons';

import { activarFarmasi, desactivarFarmasi } from './actions';

type SalonRow = {
  id: string;
  slug: string;
  nombre: string;
  farmasi_username?: string | null;
  farmasiUsername?: string | null;
  farmasi_activado_at?: string | Date | null;
  farmasiActivadoAt?: string | Date | null;
};

const FARMASI_REGISTRO_URL =
  'https://www.farmasi.es/gonperstudio/register/beautyinfluencer';

const inputClass =
  'w-full bg-paper border border-line rounded-2xl px-5 py-3.5 text-[14.5px] text-ink placeholder:text-stone/50 focus:outline-none focus:border-line-2';
const labelClass = 'text-[11px] uppercase tracking-[0.2em] text-stone/80';

function formatFecha(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default async function ConfigFarmasiPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const params = await searchParams;
  const salonRaw = (await getCurrentSalon()) as unknown;
  const salon = salonRaw as SalonRow | null;

  if (!salon) {
    return (
      <div className="card mx-auto flex max-w-2xl flex-col items-center gap-3 p-10 text-center">
        <h2 className="tight text-[22px] font-medium text-ink">
          Configura tu salón primero
        </h2>
        <p className="text-[14px] text-stone">
          Aún no tienes un salón asociado a tu cuenta.
        </p>
      </div>
    );
  }

  const username =
    salon.farmasi_username ?? salon.farmasiUsername ?? null;
  const activadoAt =
    salon.farmasi_activado_at ?? salon.farmasiActivadoAt ?? null;
  const activado = !!username;
  const fechaActivacion = formatFecha(activadoAt);
  const urlTienda = username
    ? `https://www.farmasi.es/${username}`
    : null;
  const previewSalonUrl = `/s/${salon.slug}`;

  return (
    <div className="flex w-full flex-col gap-5">
      {params.ok ? (
        <div className="flex items-center gap-2 rounded-xl border border-sage/40 bg-sage-soft px-4 py-3 text-[13px] text-sage-deep">
          <Icon.Check width="14" height="14" />
          Cambios guardados correctamente.
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

      {/* ============================================
          ESTADO 1: Tienda Farmasi ACTIVA
          ============================================ */}
      {activado ? (
        <section
          className="card grain flex flex-col gap-5 p-5 md:p-7"
          style={{
            borderColor: 'rgba(139,157,122,0.45)',
            background:
              'linear-gradient(180deg, rgba(139,157,122,0.10) 0%, rgba(139,157,122,0.02) 100%)',
          }}
        >
          <header className="flex flex-wrap items-center gap-3">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ background: 'rgba(139,157,122,0.25)', color: '#3F4D34' }}
            >
              <Icon.Check width="16" height="16" />
            </span>
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
                Tienda Farmasi activa
              </span>
              <h2 className="tight text-[19px] font-medium text-ink">
                Tu botón &laquo;Visitar tienda&raquo; ya está enlazado
              </h2>
            </div>
          </header>

          <div className="flex flex-col gap-3 text-[13.5px] text-stone">
            <p>
              Las clientas que abran la web pública del salón verán el botón
              &laquo;Visitar tienda&raquo; en el banner, que abre directamente
              tu catálogo Farmasi.
            </p>
            {fechaActivacion ? (
              <p className="text-[12.5px] text-stone/70">
                Activada el {fechaActivacion}.
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-paper p-4">
            <div>
              <span className={labelClass}>Tu URL Farmasi</span>
              <a
                href={urlTienda!}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block break-all font-mono text-[13.5px] font-medium text-terracotta hover:text-terracotta-2"
              >
                {urlTienda}
              </a>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <a
                href={urlTienda!}
                target="_blank"
                rel="noopener noreferrer"
                className="tight rounded-full border border-line bg-paper px-4 py-2 text-[12.5px] font-medium text-ink transition hover:bg-cream"
              >
                Abrir mi tienda
              </a>
              <Link
                href={previewSalonUrl}
                target="_blank"
                className="tight rounded-full border border-line bg-paper px-4 py-2 text-[12.5px] font-medium text-ink transition hover:bg-cream"
              >
                Ver mi web pública
              </Link>
            </div>
          </div>

          <details className="rounded-2xl border border-line bg-paper px-4 py-3 text-[13px]">
            <summary className="cursor-pointer select-none text-stone hover:text-ink">
              Cambiar usuario o desactivar
            </summary>
            <div className="mt-4 flex flex-col gap-4">
              <form
                action={activarFarmasi}
                className="flex flex-col gap-3 border-b border-line pb-4"
              >
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="farmasi_username" className={labelClass}>
                    Nuevo nombre de usuario
                  </label>
                  <input
                    id="farmasi_username"
                    name="farmasi_username"
                    required
                    minLength={3}
                    maxLength={50}
                    pattern="[a-zA-Z0-9_-]{3,50}"
                    defaultValue={username ?? ''}
                    placeholder="tu-usuario"
                    className={inputClass}
                  />
                </div>
                <button
                  type="submit"
                  className="gloss-btn tight self-end rounded-full px-4 py-2 text-[12.5px] font-medium"
                >
                  Guardar cambio
                </button>
              </form>
              <form action={desactivarFarmasi}>
                <button
                  type="submit"
                  className="tight rounded-full border border-line bg-paper px-4 py-2 text-[12.5px] font-medium text-ink transition hover:bg-cream"
                >
                  Desactivar tienda Farmasi
                </button>
              </form>
            </div>
          </details>
        </section>
      ) : null}

      {/* ============================================
          ESTADO 2: Tienda Farmasi NO activada
          ============================================ */}
      {!activado ? (
        <section className="card flex flex-col gap-5 p-5 md:p-8">
          <header className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
              Empieza aquí
            </span>
            <h2 className="tight text-[20px] font-medium text-ink">
              Activa tu tienda Farmasi
            </h2>
            <p className="text-[14px] text-stone">
              Ofrece cosmética premium a tus clientas y gana 30-50% en cada
              venta. El botón &laquo;Visitar tienda&raquo; del banner de tu web
              abrirá tu propio catálogo Farmasi en una pestaña nueva.
            </p>
          </header>

          <ol className="flex flex-col gap-3 rounded-2xl border border-line bg-cream/30 p-5 text-[13.5px] text-ink">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-medium text-cream">
                1
              </span>
              <div>
                <span className="font-medium">
                  Regístrate en Farmasi bajo mi sponsor.
                </span>{' '}
                Es gratis y solo necesitas tu DNI/NIE.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-medium text-cream">
                2
              </span>
              <div>
                <span className="font-medium">Copia tu nombre de usuario</span>{' '}
                — lo encuentras en tu URL personal:{' '}
                <code className="rounded bg-paper px-1.5 py-0.5 font-mono text-[12px]">
                  farmasi.es/<strong>tu-usuario</strong>
                </code>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-medium text-cream">
                3
              </span>
              <div>
                <span className="font-medium">Pégalo abajo</span> y activa la
                tienda. Listo.
              </div>
            </li>
          </ol>

          <a
            href={FARMASI_REGISTRO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="gloss-btn tight inline-flex items-center justify-center gap-2 self-start rounded-full px-5 py-3 text-[13.5px] font-medium"
          >
            Registrarme en Farmasi
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M7 17L17 7" />
              <path d="M8 7h9v9" />
            </svg>
          </a>

          <div className="border-t border-line pt-5">
            <h3 className="tight text-[16px] font-medium text-ink">
              Ya estoy registrado
            </h3>
            <p className="mt-1 text-[13px] text-stone">
              Pega tu nombre de usuario Farmasi para activar la tienda en tu
              web pública.
            </p>

            <form
              action={activarFarmasi}
              className="mt-4 flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <label htmlFor="farmasi_username" className={labelClass}>
                  Tu usuario Farmasi
                </label>
                <input
                  id="farmasi_username"
                  name="farmasi_username"
                  required
                  minLength={3}
                  maxLength={50}
                  pattern="[a-zA-Z0-9_-]{3,50}"
                  autoComplete="off"
                  placeholder="tu-usuario"
                  className={inputClass}
                />
                <p className="text-[11.5px] text-stone/70">
                  Solo letras, números, guiones y guiones bajos. 3-50
                  caracteres.
                </p>
              </div>

              <button
                type="submit"
                className="gloss-btn tight self-end rounded-full px-5 py-3 text-[13.5px] font-medium"
              >
                Activar tienda
              </button>
            </form>
          </div>
        </section>
      ) : null}

      {/* ============================================
          FAQ
          ============================================ */}
      <section className="card flex flex-col gap-4 p-5 md:p-8">
        <header>
          <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
            Cómo funciona
          </span>
          <h2 className="tight mt-1 text-[18px] font-medium text-ink">
            Comisiones y operativa
          </h2>
        </header>
        <div className="flex flex-col gap-3 text-[13.5px] text-stone">
          <details className="rounded-2xl border border-line bg-paper px-4 py-3">
            <summary className="cursor-pointer select-none font-medium text-ink">
              ¿Cuánto gano por cada venta?
            </summary>
            <p className="mt-2 text-[13px]">
              Farmasi te paga directamente: 50% en la línea Dr. C. Tuna
              (skincare premium) y 30% en maquillaje y nutrición. Es comisión
              de venta directa al momento.
            </p>
          </details>
          <details className="rounded-2xl border border-line bg-paper px-4 py-3">
            <summary className="cursor-pointer select-none font-medium text-ink">
              ¿Tengo que vender un mínimo?
            </summary>
            <p className="mt-2 text-[13px]">
              Para mantener tu cuenta activa con bonos necesitas hacer 70
              puntos al mes (≈ 60-80 €). Si no llegas un mes, no pasa nada:
              sigues siendo BI, solo no cobras bonos extra.
            </p>
          </details>
          <details className="rounded-2xl border border-line bg-paper px-4 py-3">
            <summary className="cursor-pointer select-none font-medium text-ink">
              ¿Quién gestiona el pedido y el envío?
            </summary>
            <p className="mt-2 text-[13px]">
              Farmasi. Tu clienta hace el pedido en farmasi.es bajo tu enlace,
              paga ahí mismo y Farmasi envía directo a su dirección. Tú no
              tocas stock ni logística.
            </p>
          </details>
          <details className="rounded-2xl border border-line bg-paper px-4 py-3">
            <summary className="cursor-pointer select-none font-medium text-ink">
              ¿Es obligatorio para usar Gonper?
            </summary>
            <p className="mt-2 text-[13px]">
              No. Activar Farmasi es totalmente voluntario y no condiciona tu
              suscripción a Gonper Studio. Puedes activarlo o desactivarlo
              cuando quieras.
            </p>
          </details>
        </div>
      </section>
    </div>
  );
}
