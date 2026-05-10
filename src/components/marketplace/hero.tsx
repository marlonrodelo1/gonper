'use client';

import { useRouter } from 'next/navigation';

import { buildMarketplaceHref } from './href';
import type { TipoNegocio } from '@/lib/marketplace/categorias';

type Cat = {
  key: TipoNegocio;
  label: string;
  count: number;
  dot: string;
};

type Props = {
  q: string;
  ciudad: string;
  categoria: string;
  categorias: Cat[];
  total: number;
};

/**
 * Hero del marketplace — solo título + chips de categoría.
 * El buscador y el selector de ciudad viven dentro del TopNav.
 */
export function MarketplaceHero({
  q,
  ciudad,
  categoria,
  categorias,
  total,
}: Props) {
  const router = useRouter();

  function onCat(key: 'all' | TipoNegocio) {
    router.push(
      buildMarketplaceHref(
        { categoria, q, ciudad },
        { categoria: key === 'all' ? null : key },
      ),
    );
  }

  return (
    <section className="relative pt-[88px] sm:pt-[110px] pb-6 sm:pb-8 px-5 sm:px-6">
      <div className="mx-auto max-w-[1100px]">
        {/* Título */}
        <div className="text-center">
          <h1
            className="reveal in tighter font-medium text-ink"
            style={{ fontSize: 'clamp(32px, 7vw, 76px)', lineHeight: 1 }}
          >
            Encuentra tu próximo{' '}
            <span className="font-serif-it">salón</span>.
          </h1>
        </div>

        {/* Chips categoría — sticky bajo el TopNav */}
        <div
          className="reveal in mt-7 sm:mt-9 -mx-5 sm:mx-0 px-5 sm:px-0 overflow-x-auto no-scroll-x"
        >
          <div className="flex items-center gap-2 min-w-max sm:min-w-0 sm:flex-wrap sm:justify-center">
            <button
              type="button"
              onClick={() => onCat('all')}
              className={`group px-3.5 py-2 rounded-full text-[12.5px] tight transition border whitespace-nowrap ${
                categoria === ''
                  ? 'bg-ink text-paper border-ink'
                  : 'bg-paper/70 text-stone border-line hover:text-ink hover:border-line-2'
              }`}
            >
              Todos{' '}
              <span
                className={categoria === '' ? 'text-paper/60' : 'text-stone/50'}
              >
                ({total})
              </span>
            </button>
            {categorias.map((c) => {
              const active = categoria === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => onCat(c.key)}
                  className={`group px-3.5 py-2 rounded-full text-[12.5px] tight transition border inline-flex items-center gap-2 whitespace-nowrap ${
                    active
                      ? 'border-ink'
                      : 'bg-paper/70 border-line hover:border-line-2'
                  }`}
                  style={
                    active
                      ? { background: 'var(--ink)', color: 'var(--paper)' }
                      : undefined
                  }
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: c.dot }}
                  />
                  <span>{c.label}</span>
                  <span
                    className={active ? 'text-paper/55' : 'text-stone/55'}
                  >
                    ({c.count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
