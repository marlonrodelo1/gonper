import { Icon } from './icons';

export type ProfReal = {
  id: string;
  nombre: string;
  fotoUrl: string | null;
  colorHex: string | null;
};

type Props = { profesionales: ProfReal[] };

function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

export function Equipo({ profesionales }: Props) {
  if (profesionales.length === 0) return null;

  return (
    <section id="equipo" className="py-20 px-6">
      <div className="mx-auto max-w-[1200px]">
        <div className="reveal flex items-end justify-between gap-6 flex-wrap mb-10">
          <div>
            <div className="text-[12px] uppercase tracking-[0.22em] text-stone/80 mb-3">
              El equipo
            </div>
            <h2
              className="tight font-medium text-ink"
              style={{ fontSize: 'clamp(36px,5vw,56px)', lineHeight: 1 }}
            >
              Las manos <span className="font-serif-it">detrás</span> del estudio
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {profesionales.map((t, i) => {
            const role = i === 0 ? 'Fundador/a · Profesional senior' : 'Profesional';
            return (
              <div
                key={t.id}
                className="reveal flex items-center gap-4 bg-paper border border-line rounded-2xl p-4"
                data-delay={i * 80}
              >
                {/* Avatar circular */}
                <div className="shrink-0">
                  {t.fotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.fotoUrl}
                      alt={t.nombre}
                      className="h-16 w-16 rounded-full border border-line object-cover"
                    />
                  ) : (
                    <div
                      className="h-16 w-16 rounded-full border border-line grid place-items-center"
                      style={{ background: t.colorHex ?? 'var(--cream-2)' }}
                    >
                      <span className="tight text-paper text-[18px] font-medium">
                        {iniciales(t.nombre)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Texto + acción */}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div
                    className="tight truncate font-medium text-ink"
                    style={{ fontSize: '15px' }}
                  >
                    {t.nombre}
                  </div>
                  <div className="truncate text-[12px] text-stone">{role}</div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[11px] text-sage-deep">
                      <span className="h-1.5 w-1.5 rounded-full bg-sage" />
                      Disponible
                    </span>
                    <a
                      href="#reservar"
                      className="flex items-center gap-1 text-[12px] font-medium text-gomper-accent hover:text-ink transition"
                    >
                      Reservar <Icon.Arrow width="11" height="11" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
