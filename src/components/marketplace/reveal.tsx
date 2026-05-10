'use client';

import { useEffect } from 'react';

/**
 * Activa las animaciones `.reveal` añadiendo `js-reveal-active` al body
 * y observando los elementos. Replica el patrón de `useReveal` de la
 * landing pero en un componente client component standalone.
 */
export function MarketplaceReveal() {
  useEffect(() => {
    document.body.classList.add('js-reveal-active');
    const els = document.querySelectorAll<HTMLElement>('.reveal');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const target = e.target as HTMLElement;
            const d = parseInt(target.dataset.delay || '0', 10);
            setTimeout(() => target.classList.add('in'), d);
            io.unobserve(target);
          }
        });
      },
      { threshold: 0.06, rootMargin: '0px 0px -20px 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      document.body.classList.remove('js-reveal-active');
    };
  }, []);
  return null;
}
