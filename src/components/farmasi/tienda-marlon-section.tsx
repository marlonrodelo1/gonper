/**
 * Sección/banner promocional de la tienda Farmasi de Marlon.
 *
 * Aparece SIEMPRE en la landing principal y en el marketplace. Es la
 * tienda personal de Marlon (sponsor de toda la red de salones Farmasi
 * en Gonper). Link externo a farmasi.es/marlonjoserodelo en nueva
 * pestaña.
 *
 * Diferenciado del resto del marketplace: NO es un salón, es un
 * Beauty Influencer. Usa paleta acento + glass para distinguirse.
 */

const TIENDA_URL = 'https://www.farmasi.es/marlonjoserodelo';

type Props = {
  /** Si true, omite el borde superior (cuando va justo después de otra sección con su propio borde). */
  noBorderTop?: boolean;
};

export function TiendaFarmasiMarlonSection({ noBorderTop = false }: Props) {
  return (
    <section
      className={`px-5 sm:px-6 py-10 sm:py-14 ${noBorderTop ? '' : 'border-t border-line/60'}`}
      style={{
        background:
          'linear-gradient(180deg, rgba(197,86,44,0.04) 0%, rgba(197,142,44,0.06) 100%)',
      }}
    >
      <div className="mx-auto max-w-[1240px]">
        <div
          className="reveal relative overflow-hidden rounded-[28px] border border-line bg-paper p-6 sm:p-10"
          style={{
            background:
              'linear-gradient(135deg, #FBF8F2 0%, #FAEFEA 60%, #F2E4C7 100%)',
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.6), 0 18px 40px -20px rgba(168,69,31,0.18)',
          }}
        >
          {/* Decoración de fondo */}
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-60"
            style={{
              background:
                'radial-gradient(closest-side, rgba(197,86,44,0.22), transparent 70%)',
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-20 bottom-0 h-48 w-48 rounded-full opacity-50"
            style={{
              background:
                'radial-gradient(closest-side, rgba(139,157,122,0.20), transparent 70%)',
            }}
            aria-hidden
          />

          <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
            <div className="flex flex-col gap-3 max-w-[640px]">
              <span
                className="pill self-start"
                style={{
                  background: 'rgba(197,86,44,0.12)',
                  color: '#A8451F',
                }}
              >
                <span className="pill-dot" style={{ background: '#C5562C' }} />
                Beauty Influencer · Marlon
              </span>
              <h2
                className="font-playfair text-ink leading-tight"
                style={{
                  fontSize: 'clamp(24px, 3.6vw, 36px)',
                  letterSpacing: '-0.01em',
                }}
              >
                Cosmética premium en{' '}
                <span className="font-serif-it text-stone">mi tienda Farmasi</span>
              </h2>
              <p className="text-[14.5px] leading-relaxed text-stone">
                Maquillaje, skincare Dr.&nbsp;C.&nbsp;Tuna, perfumes y bienestar
                Nutriplus seleccionados por mí. Pago seguro en Farmasi.es,
                envío directo a casa.
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
              <a
                href={TIENDA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="tight inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[14px] font-medium text-paper transition hover:scale-[1.02] active:scale-[0.97]"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(197,86,44,0.92) 0%, rgba(168,69,31,0.95) 100%)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  boxShadow:
                    'inset 0 1px 0 rgba(255,255,255,0.25), 0 10px 25px -10px rgba(168,69,31,0.45)',
                }}
              >
                Visitar mi tienda
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M7 17L17 7" />
                  <path d="M8 7h9v9" />
                </svg>
              </a>
              <p className="text-center text-[11.5px] text-stone/70 sm:text-right">
                farmasi.es/marlonjoserodelo
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
