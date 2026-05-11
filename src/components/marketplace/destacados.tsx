'use client';

import { useEffect, useRef, useState } from 'react';

import { SalonCard } from './salon-card';
import { Icon } from './icons';
import type { SalonCard as SalonCardData } from '@/lib/marketplace/categorias';

/**
 * Slider horizontal de salones destacados.
 *
 * - Snap horizontal con scroll nativo (mobile friendly).
 * - Si hay 4+ cards, autoplay cada 5s pausable on-hover.
 * - Si hay <=3, no autoplay (no tiene sentido rotar lo que ya cabe).
 * - Botones de navegación discretos en desktop.
 * - Si no hay destacados → no renderiza nada.
 */

type Props = {
  salones: SalonCardData[];
};

const AUTOPLAY_MS = 5000;

export function MarketplaceDestacados({ salones }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [hovered, setHovered] = useState(false);

  // Autoplay
  useEffect(() => {
    if (salones.length <= 3 || hovered) return;
    if (typeof window === 'undefined') return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    const id = window.setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      const cardWidth = el.scrollWidth / salones.length;
      const nextLeft = el.scrollLeft + cardWidth;
      el.scrollTo({
        left: nextLeft >= maxScroll - 10 ? 0 : nextLeft,
        behavior: 'smooth',
      });
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [salones.length, hovered]);

  if (salones.length === 0) return null;

  function scrollBy(direction: 'prev' | 'next') {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.scrollWidth / salones.length;
    el.scrollBy({
      left: direction === 'next' ? cardWidth : -cardWidth,
      behavior: 'smooth',
    });
  }

  return (
    <section
      className="px-5 sm:px-6 pt-2 pb-8 sm:pb-10"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="mx-auto max-w-[1240px]">
        <header className="flex items-end justify-between gap-3 mb-4 sm:mb-5">
          <div>
            <h2
              className="reveal in font-playfair text-ink leading-tight"
              style={{ fontSize: 'clamp(22px, 3.4vw, 32px)', letterSpacing: '-0.01em' }}
            >
              Destacados
            </h2>
            <p className="reveal in mt-0.5 text-[13px] text-stone/85 tight">
              Salones que recomendamos desde Gestori
            </p>
          </div>
          {salones.length > 3 && (
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => scrollBy('prev')}
                aria-label="Anterior"
                className="h-9 w-9 grid place-items-center rounded-full border border-line bg-paper text-ink hover:bg-cream transition"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => scrollBy('next')}
                aria-label="Siguiente"
                className="h-9 w-9 grid place-items-center rounded-full border border-line bg-paper text-ink hover:bg-cream transition"
              >
                <Icon.Arrow width="14" height="14" />
              </button>
            </div>
          )}
        </header>

        <div
          ref={scrollRef}
          className="flex gap-4 sm:gap-5 overflow-x-auto no-scroll-x pb-2 snap-x snap-mandatory"
          style={{ scrollPadding: '0 20px' }}
        >
          {salones.map((s, i) => (
            <div
              key={s.slug}
              className="reveal in shrink-0 snap-start"
              style={{
                width: 'min(82vw, 320px)',
              }}
              data-delay={Math.min(i * 40, 200)}
            >
              <SalonCard s={s} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
