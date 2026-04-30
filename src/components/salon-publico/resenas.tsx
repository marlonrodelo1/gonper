import { Icon } from './icons';

// TODO Fase 5+: leer de tabla `resenas` cuando exista. Hardcoded para pintar el diseño.
type Props = { rating?: number; total?: number };

export function Resenas({ rating = 4.9, total = 287 }: Props) {
  const reviews = [
    {
      name: 'Carmen M.',
      rating: 5,
      date: 'Hace 2 días',
      text: 'Las mejores manicuras de Tenerife. Lucía es una crack y el sitio es preciosísimo. Llevo yendo 6 meses y no fallan.',
    },
    {
      name: 'Andrea P.',
      rating: 5,
      date: 'Hace 1 semana',
      text: 'Reservé por aquí en 2 minutos sin descargar nada. Y la pedicura spa es relajante a otro nivel. Volveré seguro.',
    },
    {
      name: 'Lucía S.',
      rating: 5,
      date: 'Hace 2 semanas',
      text: 'María hace nail art espectacular. Le enseñé una foto de Pinterest y me la clavó. Súper paciente con el dibujo.',
    },
    {
      name: 'Marta G.',
      rating: 4,
      date: 'Hace 3 semanas',
      text: 'Bonito, limpio, las chicas atentísimas. La semi me duró 4 semanas perfecta.',
    },
  ];
  return (
    <section className="py-24 px-6 bg-paper border-y border-line">
      <div className="mx-auto max-w-[1200px]">
        <div className="reveal flex items-end justify-between gap-6 flex-wrap mb-12">
          <div>
            <div className="text-[12px] uppercase tracking-[0.22em] text-stone/80 mb-3">Reseñas</div>
            <h2
              className="tight font-medium text-ink"
              style={{ fontSize: 'clamp(36px,5vw,56px)', lineHeight: 1 }}
            >
              {rating.toFixed(1)} / 5 ·{' '}
              <span className="font-serif-it">{total} reseñas</span>
            </h2>
          </div>
          <a href="#" className="text-[13px] text-stone hover:text-ink flex items-center gap-1.5">
            Ver todas en Google <Icon.Arrow width="13" height="13" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.map((r, i) => (
            <div
              key={i}
              className="reveal bg-cream border border-line rounded-3xl p-7"
              data-delay={i * 60}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full grid place-items-center text-gomper-accent tight font-medium"
                    style={{ background: 'var(--gomper-accent-soft)' }}
                  >
                    {r.name
                      .split(' ')
                      .filter(Boolean)
                      .map((n) => n[0])
                      .join('')}
                  </div>
                  <div>
                    <div className="text-[14px] tight font-medium text-ink">{r.name}</div>
                    <div className="text-[11px] text-stone/70">{r.date}</div>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 text-gomper-accent">
                  {Array.from({ length: r.rating }).map((_, k) => (
                    <Icon.Star key={k} width="13" height="13" />
                  ))}
                </div>
              </div>
              <p className="text-[14px] text-ink/85 leading-relaxed">&ldquo;{r.text}&rdquo;</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
