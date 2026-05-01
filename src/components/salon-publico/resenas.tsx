import { Icon } from './icons';
import { tiempoRelativo } from '@/lib/format/tiempo-relativo';
import type { Resena } from '@/lib/db/schema';

type Props = {
  resenas: Resena[];
  resumen: { rating: number; total: number } | null;
};

function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

export function Resenas({ resenas, resumen }: Props) {
  if (resenas.length === 0) return null;

  const rating = resumen?.rating ?? 0;
  const total = resumen?.total ?? resenas.length;

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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resenas.map((r, i) => (
            <div
              key={r.id}
              className="reveal bg-cream border border-line rounded-3xl p-7"
              data-delay={i * 60}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full grid place-items-center text-gomper-accent tight font-medium"
                    style={{ background: 'var(--gomper-accent-soft)' }}
                  >
                    {iniciales(r.autorNombre)}
                  </div>
                  <div>
                    <div className="text-[14px] tight font-medium text-ink">
                      {r.autorNombre}
                    </div>
                    <div className="text-[11px] text-stone/70">
                      {tiempoRelativo(r.fecha as unknown as string)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 text-gomper-accent">
                  {Array.from({ length: r.rating }).map((_, k) => (
                    <Icon.Star key={k} width="13" height="13" />
                  ))}
                </div>
              </div>
              {r.texto ? (
                <p className="text-[14px] text-ink/85 leading-relaxed">
                  &ldquo;{r.texto}&rdquo;
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
