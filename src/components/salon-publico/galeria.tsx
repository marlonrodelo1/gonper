'use client';

import { useState } from 'react';
import { Icon } from './icons';
import { ImageSwiper, type SwiperImage } from './image-swiper';
import type { GaleriaImagen } from '@/lib/db/schema';

type Props = { galeria: GaleriaImagen[] };

export function Galeria({ galeria }: Props) {
  const [clip, setClip] = useState(50);

  if (galeria.length === 0) return null;

  const works: SwiperImage[] = galeria.map((g) => ({
    src: g.url,
    alt: g.alt ?? g.titulo ?? '',
    tag: g.tag ?? '',
    title: g.titulo ?? '',
  }));

  // Antes/Después solo si hay >= 2 imágenes
  const hayBeforeAfter = galeria.length >= 2;
  const despuesUrl = hayBeforeAfter ? galeria[0].url : null;
  const antesUrl = hayBeforeAfter ? galeria[1].url : null;

  return (
    <section id="galeria" className="py-24 px-6 bg-paper border-y border-line">
      <div className="mx-auto max-w-[1200px]">
        <div className="reveal flex items-end justify-between gap-6 flex-wrap mb-12">
          <div>
            <div className="text-[12px] uppercase tracking-[0.22em] text-stone/80 mb-3">Galería</div>
            <h2
              className="tight font-medium text-ink"
              style={{ fontSize: 'clamp(36px,5vw,56px)', lineHeight: 1 }}
            >
              Trabajos <span className="font-serif-it">recientes</span>
            </h2>
          </div>
          <div className="text-[13px] text-stone max-w-[340px] leading-relaxed">
            Una muestra real de lo que hacemos cada semana. Síguenos en Instagram para ver más.
          </div>
        </div>

        <div
          className={
            hayBeforeAfter
              ? 'grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-12 lg:gap-16 items-start'
              : 'flex justify-center'
          }
        >
          <div className="reveal flex justify-center" data-delay="60">
            <ImageSwiper images={works} />
          </div>

          {hayBeforeAfter && despuesUrl && antesUrl ? (
            <div className="reveal flex flex-col gap-5" data-delay="160">
              <div className="text-[12px] uppercase tracking-[0.18em] text-stone/80">Antes / Después</div>
              <div
                className="text-ink tight font-medium"
                style={{ fontSize: '28px', lineHeight: 1.1 }}
              >
                Resultados <span className="font-serif-it">en una sesión</span>
              </div>
              <div
                className="relative rounded-3xl overflow-hidden border border-line bg-cream-2"
                style={{ aspectRatio: '4/3' }}
              >
                <img
                  src={despuesUrl}
                  alt="Después"
                  className="absolute inset-0 w-full h-full object-cover"
                  draggable={false}
                />
                <div
                  className="absolute inset-0 ba-clip"
                  style={{ ['--clip' as string]: `${100 - clip}%` } as React.CSSProperties}
                >
                  <img
                    src={antesUrl}
                    alt="Antes"
                    className="absolute inset-0 w-full h-full object-cover"
                    draggable={false}
                  />
                </div>
                <div className="absolute top-4 left-4 px-2.5 py-1 rounded-full bg-paper/95 text-[10px] uppercase tracking-[0.2em] text-stone">
                  Antes
                </div>
                <div
                  className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-paper text-[10px] uppercase tracking-[0.2em]"
                  style={{ background: 'var(--gomper-accent-2)' }}
                >
                  Después
                </div>
                <div
                  className="absolute top-0 bottom-0 pointer-events-none"
                  style={{ left: `${clip}%`, transform: 'translateX(-50%)' }}
                >
                  <div className="w-px h-full bg-paper/90"></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-paper border border-line shadow-lg flex items-center justify-center text-ink">
                    <Icon.Drag width="18" height="18" />
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={clip}
                  onChange={(e) => setClip(parseInt(e.target.value, 10))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
                />
              </div>
              <div className="text-[13px] text-stone leading-relaxed">
                Cada cita empieza con limpieza profunda y termina con un acabado de larga duración. Mueve el slider para ver la diferencia.
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
