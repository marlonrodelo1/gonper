import { Icon } from './icons';

// TODO Fase 5+: leer de tabla `promociones` cuando exista. Hardcoded para pintar el diseño.
type Props = { agenteNombre: string };

export function Promos({ agenteNombre }: Props) {
  const promos = [
    { tag: 'Solo lunes', title: 'Servicio destacado', off: '-20%', price: '24€', was: '30€', note: 'Promoción semanal' },
    { tag: 'Pack', title: 'Combina dos servicios', off: 'Pack', price: '45€', was: '55€', note: 'Reserva 2h seguidas' },
    { tag: 'Trae a una amiga', title: '2x1 en sesiones', off: '2x1', price: '35€', was: '70€', note: 'Solo de martes a jueves' },
  ];
  return (
    <section className="py-20 px-6">
      <div className="mx-auto max-w-[1200px]">
        <div className="reveal flex items-end justify-between gap-6 flex-wrap mb-10">
          <div>
            <div className="text-[12px] uppercase tracking-[0.22em] text-stone/80 mb-3">Promociones</div>
            <h2 className="tight font-medium text-ink" style={{ fontSize: 'clamp(32px,4vw,46px)', lineHeight: 1 }}>
              Ofertas <span className="font-serif-it">de la semana</span>
            </h2>
          </div>
          <div className="text-[13px] text-stone max-w-[320px]">
            Descuentos válidos solo reservando online. Cuéntale a {agenteNombre} al confirmar.
          </div>
        </div>

        <div className="reveal grid grid-cols-1 md:grid-cols-3 gap-4" data-delay="80">
          {promos.map((p, i) => (
            <div key={i} className="promo-glow rounded-3xl border border-line p-6 flex flex-col gap-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-[0.2em] text-stone">{p.tag}</span>
                <span
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                  style={{ background: 'var(--ink)', color: 'var(--paper)' }}
                >
                  {p.off}
                </span>
              </div>
              <div className="text-ink tight font-medium" style={{ fontSize: '24px', lineHeight: 1.1 }}>
                {p.title}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-gomper-accent tight font-medium" style={{ fontSize: '32px' }}>
                  {p.price}
                </span>
                <span className="text-stone/60 line-through text-[14px]">{p.was}</span>
              </div>
              <div className="text-[12px] text-stone">{p.note}</div>
              <a
                href="#reservar"
                className="mt-2 self-start text-[13px] font-medium text-ink hover:text-gomper-accent flex items-center gap-1.5 transition"
              >
                Aprovechar <Icon.Arrow width="13" height="13" />
              </a>
              <div
                className="absolute -bottom-12 -right-12 w-40 h-40 rounded-full opacity-30"
                style={{
                  background:
                    'radial-gradient(circle, var(--gomper-accent-soft) 0%, transparent 70%)',
                }}
              ></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
