'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';

import { Icon } from './icons';
import { buildMarketplaceHref } from './href';

type Props = {
  filtersCount: number;
  onOpenFilters: () => void;
  q: string;
  ciudad: string;
  categoria: string;
  ciudades: string[];
};

/**
 * TopNav del marketplace con buscador y selector de ciudad permanentes.
 *
 * El buscador vive dentro del nav flotante (no aparece sólo al scroll).
 * En mobile el nav muestra solo logo + botón "Filtros" que abre el sheet
 * (donde está el input de búsqueda completo).
 */
export function MarketplaceTopNav({
  filtersCount,
  onOpenFilters,
  q,
  ciudad,
  categoria,
  ciudades,
}: Props) {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [draftQ, setDraftQ] = useState(q);

  useEffect(() => {
    setDraftQ(q);
  }, [q]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    router.push(
      buildMarketplaceHref(
        { categoria, ciudad, q },
        { q: draftQ.trim() || null },
      ),
    );
  }

  function onCity(value: string) {
    router.push(
      buildMarketplaceHref(
        { categoria, ciudad, q },
        { ciudad: value || null },
      ),
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-40 pointer-events-none px-3 sm:px-4 pt-3 sm:pt-4">
      <header
        className={`floating-nav pointer-events-auto mx-auto w-full max-w-[1240px] flex items-center gap-2 sm:gap-3 transition-all duration-300 ${scrolled ? 'is-scrolled' : ''}`}
        style={{ padding: '8px 8px 8px 14px', borderRadius: '999px' }}
      >
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-ink shrink-0 pr-1"
        >
          <span
            className="w-8 h-8 rounded-full grid place-items-center"
            style={{ background: 'var(--ink)', color: 'var(--paper)' }}
          >
            <span className="font-serif-it text-[16px] leading-none translate-y-[-1px]">
              G
            </span>
          </span>
          <span className="hidden sm:flex flex-col leading-tight">
            <span className="text-[14px] tight font-medium">Gestori</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-stone/70 -mt-0.5">
              Marketplace
            </span>
          </span>
        </Link>

        {/* Search shell — desktop / tablet */}
        <form
          onSubmit={onSubmit}
          className="hidden md:flex flex-1 min-w-0 items-center gap-2 px-3.5 py-1.5 rounded-full bg-cream/80 border border-line"
        >
          <Icon.Search width="14" height="14" className="text-stone/70 shrink-0" />
          <input
            type="text"
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            placeholder="¿Qué buscas? · 'barbería en Madrid', 'manicura rusa'…"
            className="flex-1 min-w-0 bg-transparent text-[13.5px] tight text-ink placeholder:text-stone/55 focus:outline-none py-1.5"
          />
          <span className="hidden lg:flex items-center gap-1.5 pl-2.5 ml-1 border-l border-line">
            <Icon.Pin width="12" height="12" className="text-stone/70 shrink-0" />
            <select
              value={ciudad}
              onChange={(e) => onCity(e.target.value)}
              className="bg-transparent text-[12.5px] tight text-ink focus:outline-none cursor-pointer max-w-[140px]"
              aria-label="Ciudad"
            >
              <option value="">Todas las ciudades</option>
              {ciudades.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </span>
          <button
            type="submit"
            aria-label="Buscar"
            className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full gloss-btn shrink-0"
          >
            <Icon.Search width="12" height="12" />
          </button>
        </form>

        {/* Mobile: ocupa todo el espacio con búsqueda compacta */}
        <button
          type="button"
          onClick={onOpenFilters}
          className="md:hidden flex flex-1 min-w-0 items-center gap-2 px-3.5 py-2 rounded-full bg-cream/80 border border-line text-left"
        >
          <Icon.Search width="14" height="14" className="text-stone/70 shrink-0" />
          <span className="flex-1 min-w-0 truncate text-[13px] tight text-stone/70">
            {q || ciudad || categoria
              ? [q, ciudad, categoria].filter(Boolean).join(' · ')
              : '¿Qué buscas? Filtra y descubre'}
          </span>
          <Icon.Sliders width="13" height="13" className="text-stone/70 shrink-0" />
        </button>

        {/* Right: filtros mobile + soy un salón */}
        <div className="flex items-center gap-2 shrink-0">
          {filtersCount > 0 && (
            <span
              className="hidden md:inline-flex lg:hidden items-center justify-center min-w-[22px] h-[22px] rounded-full text-[10.5px] font-medium px-1.5"
              style={{ background: 'var(--terracotta)', color: 'var(--paper)' }}
            >
              {filtersCount}
            </span>
          )}
          <Link
            href="/"
            className="hidden sm:inline-flex text-[12.5px] font-medium px-4 py-2 rounded-full gloss-btn shrink-0"
          >
            Soy un salón
          </Link>
        </div>
      </header>
    </div>
  );
}
