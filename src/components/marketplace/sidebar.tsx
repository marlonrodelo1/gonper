'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { Icon } from './icons';
import { buildMarketplaceHref } from './href';

type Props = {
  q: string;
  ciudad: string;
  categoria: string;
  ciudades: string[];
  hasFilters: boolean;
};

export function MarketplaceSidebar({
  q,
  ciudad,
  categoria,
  ciudades,
  hasFilters,
}: Props) {
  const router = useRouter();
  const [draftQ, setDraftQ] = useState(q);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    router.push(
      buildMarketplaceHref({ categoria, q, ciudad }, { q: draftQ.trim() || null }),
    );
  }

  function onCity(value: string) {
    router.push(
      buildMarketplaceHref({ categoria, q, ciudad }, { ciudad: value || null }),
    );
  }

  function onClear() {
    setDraftQ('');
    router.push('/marketplace');
  }

  return (
    <aside className="w-[280px] shrink-0 hidden lg:block">
      <div className="sticky-sidebar pr-2">
        <div className="bg-paper border border-line rounded-3xl p-6">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[12px] uppercase tracking-[0.22em] text-stone/80">
              Filtros
            </div>
            {hasFilters && (
              <button
                onClick={onClear}
                className="text-[12px] text-terracotta hover:text-terracotta-2 tight"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Ciudad */}
          <div className="mt-5">
            <div className="text-[11.5px] uppercase tracking-[0.18em] text-stone mb-2.5">
              Ciudad
            </div>
            <div className="relative">
              <select
                value={ciudad}
                onChange={(e) => onCity(e.target.value)}
                className="w-full appearance-none bg-cream border border-line rounded-2xl px-4 py-3 text-[13.5px] tight text-ink focus:outline-none focus:border-line-2 pr-9 cursor-pointer"
              >
                <option value="">Todas las ciudades</option>
                {ciudades.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <Icon.ChevDown
                width="14"
                height="14"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone pointer-events-none"
              />
            </div>
          </div>

          {/* Buscar por nombre */}
          <form onSubmit={onSubmit} className="mt-6">
            <div className="text-[11.5px] uppercase tracking-[0.18em] text-stone mb-2.5">
              Buscar por nombre
            </div>
            <div className="relative">
              <Icon.Search
                width="14"
                height="14"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone"
              />
              <input
                type="text"
                value={draftQ}
                onChange={(e) => setDraftQ(e.target.value)}
                placeholder="Ej. Bloom"
                className="w-full bg-cream border border-line rounded-2xl pl-9 pr-3 py-3 text-[13.5px] tight text-ink placeholder:text-stone/55 focus:outline-none focus:border-line-2"
              />
            </div>
          </form>
        </div>

        {/* Tip card */}
        <div className="mt-4 px-5 py-4 rounded-3xl bg-cream border border-line/80">
          <div className="flex items-start gap-3">
            <span
              className="w-7 h-7 rounded-full grid place-items-center shrink-0"
              style={{ background: 'var(--cream-2)', color: 'var(--ink)' }}
            >
              <Icon.Sparkle width="13" height="13" />
            </span>
            <div className="text-[12.5px] text-stone leading-relaxed">
              ¿Tu salón aún no está?{' '}
              <a
                href="/signup"
                className="text-ink underline underline-offset-4 decoration-line-2 hover:decoration-ink"
              >
                Listo en 5 minutos
              </a>
              .
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
