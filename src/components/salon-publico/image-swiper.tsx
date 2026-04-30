'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from './icons';

export type SwiperImage = { src: string; alt: string; tag: string; title: string };

// TODO Fase 5+: leer de tabla `galeria_imagenes` cuando exista.
export function ImageSwiper({ images }: { images: SwiperImage[] }) {
  const stackRef = useRef<HTMLDivElement>(null);
  const isSwiping = useRef(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const rafId = useRef<number | null>(null);
  const [order, setOrder] = useState<number[]>(() => images.map((_, i) => i));

  const applyStyles = useCallback((deltaX: number) => {
    if (!stackRef.current) return;
    const card = stackRef.current.querySelector<HTMLElement>(
      '.swiper-card[data-active="true"]',
    );
    if (!card) return;
    card.style.transform = `translateX(${deltaX}px) rotate(${deltaX * 0.07}deg)`;
    card.style.opacity = (1 - Math.min(Math.abs(deltaX) / 250, 1) * 0.6).toString();
  }, []);

  const handleStart = (clientX: number) => {
    isSwiping.current = true;
    startX.current = clientX;
    currentX.current = clientX;
    const card = stackRef.current?.querySelector<HTMLElement>(
      '.swiper-card[data-active="true"]',
    );
    if (card) card.classList.add('dragging');
  };

  const handleEnd = useCallback(() => {
    if (!isSwiping.current) return;
    if (rafId.current) cancelAnimationFrame(rafId.current);
    const deltaX = currentX.current - startX.current;
    const card = stackRef.current?.querySelector<HTMLElement>(
      '.swiper-card[data-active="true"]',
    );
    if (card) {
      card.classList.remove('dragging');
      if (Math.abs(deltaX) > 90) {
        const dir = Math.sign(deltaX);
        card.style.transform = `translateX(${dir * 500}px) rotate(${dir * 25}deg)`;
        card.style.opacity = '0';
        setTimeout(() => {
          setOrder((prev) => [...prev.slice(1), prev[0]]);
        }, 320);
      } else {
        card.style.transform = '';
        card.style.opacity = '';
      }
    }
    isSwiping.current = false;
  }, []);

  const handleMove = useCallback(
    (clientX: number) => {
      if (!isSwiping.current) return;
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        currentX.current = clientX;
        applyStyles(currentX.current - startX.current);
      });
    },
    [applyStyles],
  );

  useEffect(() => {
    const el = stackRef.current;
    if (!el) return;
    const down = (e: PointerEvent) => handleStart(e.clientX);
    const move = (e: PointerEvent) => handleMove(e.clientX);
    const up = () => handleEnd();
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [handleEnd, handleMove]);

  useEffect(() => {
    if (!stackRef.current) return;
    const cards = stackRef.current.querySelectorAll<HTMLElement>('.swiper-card');
    cards.forEach((c) => {
      c.style.transform = '';
      c.style.opacity = '';
    });
  }, [order]);

  const skip = () => setOrder((prev) => [...prev.slice(1), prev[0]]);

  return (
    <div className="flex flex-col items-center gap-6">
      <div
        ref={stackRef}
        className="swiper-stack relative"
        style={{ width: 320, height: 420, touchAction: 'none', userSelect: 'none' }}
      >
        {order.map((origIdx, displayIdx) => {
          const isActive = displayIdx === 0;
          return (
            <article
              key={`${origIdx}`}
              data-active={isActive}
              className="swiper-card absolute inset-0 rounded-[28px] overflow-hidden border border-line shadow-[0_20px_50px_-15px_rgba(26,24,21,0.25)]"
              style={{
                zIndex: images.length - displayIdx,
                transform: `translateY(${displayIdx * 8}px) scale(${1 - displayIdx * 0.04})`,
                opacity: displayIdx > 3 ? 0 : 1,
                cursor: isActive ? 'grab' : 'default',
              }}
            >
              <img
                src={images[origIdx].src}
                alt={images[origIdx].alt}
                className="w-full h-full object-cover pointer-events-none"
                draggable={false}
              />
              <div
                className="absolute bottom-0 inset-x-0 p-5 text-paper"
                style={{
                  background:
                    'linear-gradient(180deg, transparent 0%, rgba(26,24,21,0.7) 100%)',
                }}
              >
                <div className="text-[11px] uppercase tracking-[0.2em] text-paper/70">
                  {images[origIdx].tag}
                </div>
                <div className="text-[18px] tight font-medium mt-1">
                  {images[origIdx].title}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="flex items-center gap-3 text-[12px] text-stone">
        <button
          onClick={skip}
          className="w-11 h-11 rounded-full bg-paper border border-line text-stone hover:text-ink hover:border-line-2 transition flex items-center justify-center"
        >
          <Icon.ArrowL width="16" height="16" />
        </button>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-paper border border-line">
          <Icon.Drag width="14" height="14" className="text-gomper-accent" />
          <span>Arrastra o pulsa para ver más</span>
        </div>
        <button
          onClick={skip}
          className="w-11 h-11 rounded-full text-paper accent-btn flex items-center justify-center"
        >
          <Icon.ArrowR width="16" height="16" />
        </button>
      </div>
    </div>
  );
}
