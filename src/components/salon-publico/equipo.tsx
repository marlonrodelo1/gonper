import { Icon } from './icons';

export type ProfReal = {
  id: string;
  nombre: string;
  fotoUrl: string | null;
  colorHex: string | null;
};

type Props = { profesionales: ProfReal[] };

export function Equipo({ profesionales }: Props) {
  if (profesionales.length === 0) return null;

  return (
    <section id="equipo" className="py-20 px-6">
      <div className="mx-auto max-w-[1200px]">
        <div className="reveal flex items-end justify-between gap-6 flex-wrap mb-10">
          <div>
            <div className="text-[12px] uppercase tracking-[0.22em] text-stone/80 mb-3">El equipo</div>
            <h2
              className="tight font-medium text-ink"
              style={{ fontSize: 'clamp(36px,5vw,56px)', lineHeight: 1 }}
            >
              Las manos <span className="font-serif-it">detrás</span> del estudio
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {profesionales.map((t, i) => {
            const role = i === 0 ? 'Fundador/a · Profesional senior' : 'Profesional';
            return (
              <div
                key={t.id}
                className="reveal bg-paper border border-line rounded-3xl overflow-hidden"
                data-delay={i * 80}
              >
                <div className="aspect-[4/5] overflow-hidden bg-cream-2">
                  {t.fotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.fotoUrl}
                      alt={t.nombre}
                      className="w-full h-full object-cover gallery-card"
                    />
                  ) : (
                    <div
                      className="w-full h-full grid place-items-center"
                      style={{ background: t.colorHex ?? 'var(--cream-2)' }}
                    >
                      <span className="text-paper text-[48px] tight font-medium">
                        {t.nombre
                          .split(' ')
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((n) => n[0])
                          .join('')}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-5 flex flex-col gap-2">
                  <div className="text-ink tight font-medium" style={{ fontSize: '19px' }}>
                    {t.nombre}
                  </div>
                  <div className="text-[13px] text-stone">{role}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[12px] text-sage-deep">
                      <span className="w-1.5 h-1.5 rounded-full bg-sage"></span>
                      Disponible esta semana
                    </div>
                    <a
                      href="#reservar"
                      className="text-[12px] font-medium text-gomper-accent hover:text-ink flex items-center gap-1 transition"
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
