import { Icon } from './icons';
import type { Salon, Servicio } from '@/lib/db/schema';

type Props = {
  salon: Salon;
  abierto: boolean;
  estadoTexto: string; // ej "Cierra a las 20:00" o "Abre lunes 10:00"
  tipoNegocioLabel: string;
  urlTelegram?: string | null;
  agenteNombre: string;
  horarioHoyTexto: string;
  servicios: Pick<Servicio, 'nombre'>[];
};

const COVER_DEFAULT =
  'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=2200&auto=format&fit=crop&q=80';

function splitName(nombre: string): { primary: string; serif?: string; rest?: string } {
  const parts = nombre.trim().split(/\s+/);
  if (parts.length === 1) return { primary: parts[0] };
  if (parts.length === 2) return { primary: parts[0], serif: parts[1] };
  return { primary: parts[0], serif: parts[1], rest: parts.slice(2).join(' ') };
}

function lugarFromDireccion(d?: string | null): string {
  if (!d) return 'España';
  const parts = d.split(',').map((s) => s.trim()).filter(Boolean);
  return parts[parts.length - 1] || 'España';
}

function calleFromDireccion(d?: string | null): string {
  if (!d) return '—';
  const parts = d.split(',').map((s) => s.trim()).filter(Boolean);
  return parts[0] || d;
}

export function Hero({
  salon,
  abierto,
  estadoTexto,
  tipoNegocioLabel,
  urlTelegram,
  agenteNombre,
  horarioHoyTexto,
  servicios,
}: Props) {
  const cover = COVER_DEFAULT;
  const { primary, serif, rest } = splitName(salon.nombre);
  const lugar = lugarFromDireccion(salon.direccion);
  const calle = calleFromDireccion(salon.direccion);
  const top3 = servicios.slice(0, 3).map((s) => s.nombre).join(' · ') || '—';

  return (
    <section className="relative pt-[88px] sm:pt-[96px]">
      <div className="mx-auto max-w-[1200px] px-6">
        <div
          className="reveal relative rounded-[32px] overflow-hidden grain border border-line"
          style={{ aspectRatio: '21/9' }}
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
          <div className="absolute top-6 left-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-paper/90 backdrop-blur-sm border border-line text-[12px]">
            <span
              className={`relative w-2 h-2 rounded-full ${abierto ? 'bg-sage live-dot' : 'bg-stone/50'}`}
            ></span>
            <span className="text-ink font-medium">
              {abierto ? 'Abierto ahora' : 'Cerrado'}
            </span>
            <span className="text-stone">· {estadoTexto}</span>
          </div>

          {/* socials */}
          <div className="absolute top-6 right-6 flex items-center gap-2">
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

          {/* bottom info */}
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 flex items-end justify-between gap-6 flex-wrap">
            <div className="text-paper">
              <div className="flex items-center gap-2 text-[12px] uppercase tracking-[0.22em] text-paper/80 mb-3">
                <Icon.Sparkle width="13" height="13" />
                <span>
                  {tipoNegocioLabel} · {lugar}
                </span>
              </div>
              <h1
                className="tight font-medium"
                style={{ fontSize: 'clamp(40px, 6vw, 72px)', lineHeight: 1.05 }}
              >
                {serif ? (
                  <>
                    {primary} <span className="font-serif-it">{serif}</span>
                    {rest && (
                      <>
                        <br />
                        {rest}
                      </>
                    )}
                  </>
                ) : (
                  primary
                )}
              </h1>
              <div className="mt-4 flex items-center gap-5 text-[13px] text-paper/85">
                <span className="hidden sm:flex items-center gap-1.5">
                  <Icon.Pin width="13" height="13" /> {calle}
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
              <a
                href="#reservar"
                className="px-6 py-3.5 rounded-full text-[14px] font-medium accent-btn text-center"
              >
                Reservar cita
              </a>
              {urlTelegram && (
                <a
                  href={urlTelegram}
                  target="_blank"
                  rel="noreferrer"
                  className="px-6 py-3.5 rounded-full text-[14px] font-medium bg-paper/95 hover:bg-paper text-ink border border-line/40 transition flex items-center justify-center gap-2"
                >
                  <Icon.Telegram width="14" height="14" /> Chatear con {agenteNombre}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Quick info row */}
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
                className="w-8 h-8 rounded-full grid place-items-center text-gomper-accent shrink-0"
                style={{ background: 'var(--gomper-accent-soft)' }}
              >
                {it.icon}
              </span>
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.18em] text-stone/70">
                  {it.label}
                </div>
                <div className="text-[13px] text-ink tight font-medium truncate">
                  {it.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
