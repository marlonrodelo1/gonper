import Link from 'next/link';
import { Icon } from './icons';
import { tiempoRelativo } from '@/lib/format/tiempo-relativo';
import type { Resena } from '@/lib/db/schema';

type Props = {
  resenas: Resena[];
  resumen: { rating: number; total: number } | null;
  salonSlug: string;
};

function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

export function Resenas({ resenas, resumen, salonSlug }: Props) {
  const hayResenas = resenas.length > 0;
  const rating = resumen?.rating ?? 0;
  const total = resumen?.total ?? resenas.length;

  return (
    <section className="py-24 px-6 bg-paper border-y border-line">
      <div className="mx-auto max-w-[1200px]">
        <div className="reveal flex items-end justify-between gap-6 flex-wrap mb-12">
          <div>
            <div className="text-[13px] uppercase tracking-[0.22em] text-stone/80 mb-3">Reseñas</div>
            <h2
              className="tight font-medium text-ink"
              style={{ fontSize: 'clamp(36px,5vw,56px)', lineHeight: 1 }}
            >
              {hayResenas ? (
                <>
                  {rating.toFixed(1)} / 5 ·{' '}
                  <span className="font-serif-it">{total} reseñas</span>
                </>
              ) : (
                <>
                  ¿Has venido?{' '}
                  <span className="font-serif-it">comparte tu experiencia</span>
                </>
              )}
            </h2>
          </div>
          <Link
            href={`/s/${salonSlug}/resena`}
            scroll={true}
            className="accent-btn tight inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[13.5px] font-medium"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden>
              <path d="M12 3.5l2.7 5.6 6.2.9-4.5 4.3 1.1 6.1L12 17.6l-5.5 2.9 1.1-6.1L3.1 10l6.2-.9L12 3.5z" />
            </svg>
            Deja tu reseña
          </Link>
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
                    className="w-10 h-10 rounded-full grid place-items-center text-gestori-accent tight font-medium"
                    style={{ background: 'var(--gestori-accent-soft)' }}
                  >
                    {iniciales(r.autorNombre)}
                  </div>
                  <div>
                    <div className="text-[15px] tight font-medium text-ink">
                      {r.autorNombre}
                    </div>
                    <div className="text-[12px] text-stone/70">
                      {tiempoRelativo(r.fecha as unknown as string)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 text-gestori-accent">
                  {Array.from({ length: r.rating }).map((_, k) => (
                    <Icon.Star key={k} width="13" height="13" />
                  ))}
                </div>
              </div>
              {r.texto ? (
                <p className="text-[15px] text-ink/85 leading-relaxed">
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
