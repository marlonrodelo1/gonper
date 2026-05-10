'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Icon } from './icons';

type Props = {
  filtersCount: number;
  onOpenFilters: () => void;
  q: string;
  onSearch: (v: string) => void;
};

export function MarketplaceTopNav({
  filtersCount,
  onOpenFilters,
  q,
  onSearch,
}: Props) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-40 pointer-events-none px-3 sm:px-4 pt-3 sm:pt-4">
      <header
        className={`floating-nav pointer-events-auto mx-auto w-full max-w-[1240px] flex items-center gap-2 transition-all duration-300 ${scrolled ? 'is-scrolled' : ''}`}
        style={{ padding: '8px 8px 8px 16px', borderRadius: '999px' }}
      >
        <Link
          href="/"
          className="flex items-center gap-2 text-ink shrink-0 pr-1"
        >
          <span
            className="w-7 h-7 rounded-full grid place-items-center"
            style={{ background: 'var(--ink)', color: 'var(--paper)' }}
          >
            <span className="font-serif-it text-[15px] leading-none translate-y-[-1px]">
              G
            </span>
          </span>
          <span className="text-[15.5px] tight font-medium hidden sm:inline">
            Gestori
          </span>
          <span className="hidden md:flex items-center gap-1.5 text-[12px] text-stone/80 ml-2 pl-2.5 border-l border-line/80">
            <span>Marketplace</span>
          </span>
        </Link>

        {/* Compressed search appears when scrolled */}
        <div
          className={`flex-1 min-w-0 transition-all duration-300 ${scrolled ? 'opacity-100 max-w-full' : 'opacity-0 max-w-0 pointer-events-none'} hidden md:block`}
        >
          <div className="relative max-w-[420px] ml-2">
            <Icon.Search
              width="14"
              height="14"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone/70"
            />
            <input
              type="text"
              value={q}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Buscar salón..."
              className="w-full bg-cream/70 border border-line rounded-full pl-9 pr-4 py-2 text-[13px] tight text-ink placeholder:text-stone/60 focus:outline-none focus:bg-paper focus:border-line-2"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto shrink-0">
          <button
            type="button"
            onClick={onOpenFilters}
            className="lg:hidden inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12.5px] font-medium border border-line bg-paper/70 text-ink"
          >
            <Icon.Sliders width="14" height="14" />
            <span>Filtros</span>
            {filtersCount > 0 && (
              <span
                className="ml-0.5 min-w-[18px] h-[18px] grid place-items-center px-1 rounded-full text-[10.5px] font-medium"
                style={{ background: 'var(--terracotta)', color: 'var(--paper)' }}
              >
                {filtersCount}
              </span>
            )}
          </button>
          <Link
            href="/"
            className="hidden sm:inline-flex text-[12.5px] font-medium px-4 py-2 rounded-full gloss-btn"
          >
            Soy un salón
          </Link>
        </div>
      </header>
    </div>
  );
}
