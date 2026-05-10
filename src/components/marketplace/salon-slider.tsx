'use client';

import { useEffect, useState } from 'react';

/**
 * Slider crossfade automático para la card del salón.
 *
 * - Si hay 1 imagen o menos, no anima — pinta estática (o nada).
 * - Si hay 2+, hace crossfade infinito cada `intervalMs` (default 4s).
 * - `respect-reduced-motion`: si el visitante tiene `prefers-reduced-motion`,
 *   no anima.
 *
 * Reporta el índice activo vía callback opcional para que la card pueda
 * pintar los pagination dots sincronizados.
 */

type Props = {
  images: string[];
  alt: string;
  intervalMs?: number;
  /** Llamada cada vez que cambia la imagen activa (para los dots). */
  onActiveChange?: (index: number) => void;
};

const DEFAULT_INTERVAL = 4000;

export function SalonSlider({
  images,
  alt,
  intervalMs = DEFAULT_INTERVAL,
  onActiveChange,
}: Props) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    onActiveChange?.(active);
  }, [active, onActiveChange]);

  useEffect(() => {
    if (images.length <= 1) return;
    if (typeof window !== 'undefined') {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (reduce.matches) return;
    }
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % images.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [images.length, intervalMs]);

  if (images.length === 0) return null;

  return (
    <>
      {images.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src + i}
          src={src}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-in-out"
          style={{ opacity: i === active ? 1 : 0 }}
          loading={i === 0 ? 'eager' : 'lazy'}
          draggable={false}
        />
      ))}
    </>
  );
}
