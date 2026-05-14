import { Icon } from './icons';
import type { Salon, Servicio } from '@/lib/db/schema';

type Props = {
  salon: Salon;
  abierto: boolean;
  estadoTexto: string; // ej "Cierra a las 20:00" o "Abre lunes 10:00"
  tipoNegocioLabel: string;
  horarioHoyTexto: string;
  servicios: Pick<Servicio, 'nombre'>[];
  tieneTienda: boolean;
  /** True cuando se renderiza dentro de /s/[slug]/tienda. Cambia el
   * segundo CTA del hero a "Volver al salón". */
  enTienda?: boolean;
  /** Si false, omite la fila de quick-info debajo del hero (Hoy /
   * Ubicación / Teléfono / Servicios). Útil cuando el hero es solo
   * decorativo (tienda). */
  mostrarInfoRow?: boolean;
};

const COVER_DEFAULT =
  'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=2200&auto=format&fit=crop&q=80';

function calleFromDireccion(d?: string | null): string {
  if (!d) return '—';
  const parts = d.split(',').map((s) => s.trim()).filter(Boolean);
  return parts[0] || d;
}

export function Hero({
  salon,
  abierto,
  estadoTexto,
  horarioHoyTexto,
  servicios,
  tieneTienda,
  enTienda = false,
  mostrarInfoRow = true,
}: Props) {
  const cover = salon.bannerUrl ?? COVER_DEFAULT;
  const calle = calleFromDireccion(salon.direccion);
  const top3 = servicios.slice(0, 3).map((s) => s.nombre).join(' · ') || '—';

  return (
    <section className="relative pt-[88px] sm:pt-[96px]">
      <div className="mx-auto max-w-[1200px] px-6">
        <div
          className="reveal relative rounded-[32px] overflow-hidden grain border border-line aspect-[4/3] sm:aspect-[21/9]"
        >
          <img
            src={cover}
            alt={salon.nombre}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(26,24,21,0) 30%, rgba(26,24,21,0.55) 100%)',
            }}
          ></div>

          {/* status pill */}
          <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-paper/90 backdrop-blur-sm border border-line text-[13px]">
            <span
              className={`relative w-2 h-2 rounded-full ${abierto ? 'bg-sage live-dot' : 'bg-stone/50'}`}
            ></span>
            <span className="text-ink font-medium">
              {abierto ? 'Abierto ahora' : 'Cerrado'}
            </span>
            <span className="text-stone">· {estadoTexto}</span>
          </div>

          {/* socials */}
          <div className="absolute top-6 right-6 hidden sm:flex items-center gap-2">
            {salon.telefono && (
              <a
                href={`https://wa.me/${salon.telefono.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 grid place-items-center rounded-full bg-paper/90 backdrop-blur-sm border border-line text-ink hover:bg-paper transition"
              >
                <Icon.Whatsapp width="15" height="15" />
              </a>
            )}
            {salon.email && (
              <a
                href={`mailto:${salon.email}`}
                className="w-9 h-9 grid place-items-center rounded-full bg-paper/90 backdrop-blur-sm border border-line text-ink hover:bg-paper transition"
              >
                <Icon.Instagram width="15" height="15" />
              </a>
            )}
          </div>

          {/* Bottom CTA bar — glassmorphism */}
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 flex items-center justify-between gap-3">
            <a
              href={enTienda ? `/s/${salon.slug}#reservar` : '#reservar'}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-[13.5px] font-medium tight text-paper transition hover:scale-[1.02]"
              style={{
                background:
                  'linear-gradient(180deg, rgba(197,86,44,0.78) 0%, rgba(168,69,31,0.82) 100%)',
                backdropFilter: 'saturate(160%) blur(12px)',
                WebkitBackdropFilter: 'saturate(160%) blur(12px)',
                border: '1px solid rgba(255,255,255,0.25)',
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,0.25), 0 10px 25px -10px rgba(168,69,31,0.45)',
              }}
            >
              Reservar cita
            </a>
            {enTienda ? (
              <a
                href={`/s/${salon.slug}`}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-[13.5px] font-medium tight text-paper transition hover:scale-[1.02]"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(197,86,44,0.78) 0%, rgba(168,69,31,0.82) 100%)',
                  backdropFilter: 'saturate(160%) blur(12px)',
                  WebkitBackdropFilter: 'saturate(160%) blur(12px)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  boxShadow:
                    'inset 0 1px 0 rgba(255,255,255,0.25), 0 10px 25px -10px rgba(168,69,31,0.45)',
                }}
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M19 12H5" />
                  <path d="M11 6l-6 6 6 6" />
                </svg>
                Volver al salón
              </a>
            ) : (
              tieneTienda && (
                <a
                  href={`/s/${salon.slug}/tienda`}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-[13.5px] font-medium tight text-paper transition hover:scale-[1.02]"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(197,86,44,0.78) 0%, rgba(168,69,31,0.82) 100%)',
                    backdropFilter: 'saturate(160%) blur(12px)',
                    WebkitBackdropFilter: 'saturate(160%) blur(12px)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    boxShadow:
                      'inset 0 1px 0 rgba(255,255,255,0.25), 0 10px 25px -10px rgba(168,69,31,0.45)',
                  }}
                >
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M6 7h12l-1 13H7L6 7z" />
                    <path d="M9 7a3 3 0 016 0" />
                  </svg>
                  Visitar tienda
                </a>
              )
            )}
          </div>
        </div>

        {/* Quick info row */}
        {mostrarInfoRow && (
        <div
          className="reveal mt-6 grid grid-cols-2 md:grid-cols-4 gap-3"
          data-delay="100"
        >
          {[
            {
              icon: <Icon.Clock width="16" height="16" />,
              label: 'Hoy',
              value: horarioHoyTexto,
            },
            {
              icon: <Icon.Pin width="16" height="16" />,
              label: 'Ubicación',
              value: calle,
            },
            {
              icon: <Icon.Phone width="16" height="16" />,
              label: 'Teléfono',
              value: salon.telefono || '—',
            },
            {
              icon: <Icon.Sparkle width="16" height="16" />,
              label: 'Servicios',
              value: top3,
            },
          ].map((it, i) => (
            <div
              key={i}
              className="bg-paper border border-line rounded-2xl px-4 py-3.5 flex items-start gap-3"
            >
              <span
                className="w-8 h-8 rounded-full grid place-items-center text-gestori-accent shrink-0"
                style={{ background: 'var(--gestori-accent-soft)' }}
              >
                {it.icon}
              </span>
              <div className="min-w-0">
                <div className="text-[12px] uppercase tracking-[0.18em] text-stone/70">
                  {it.label}
                </div>
                <div className="text-[14px] text-ink tight font-medium truncate">
                  {it.value}
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    </section>
  );
}
