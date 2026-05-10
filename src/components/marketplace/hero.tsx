'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { Icon } from './icons';
import { buildMarketplaceHref } from './href';
import type { TipoNegocio } from '@/lib/marketplace/query';

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
  ciudades: string[];
  categorias: Cat[];
  total: number;
};

export function MarketplaceHero({
  q,
  ciudad,
  categoria,
  ciudades,
  categorias,
  total,
}: Props) {
  const router = useRouter();
  const [draftQ, setDraftQ] = useState(q);
  const [draftCiudad, setDraftCiudad] = useState(ciudad);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    router.push(
      buildMarketplaceHref(
        { categoria, q, ciudad },
        {
          q: draftQ.trim() ? draftQ.trim() : null,
          ciudad: draftCiudad ? draftCiudad : null,
        },
      ),
    );
  }

  function onCity(value: string) {
    setDraftCiudad(value);
    router.push(
      buildMarketplaceHref(
        { categoria, q, ciudad },
        { ciudad: value ? value : null },
      ),
    );
  }

  function onCat(key: 'all' | TipoNegocio) {
    router.push(
      buildMarketplaceHref(
        { categoria, q, ciudad },
        { categoria: key === 'all' ? null : key },
      ),
    );
  }

  return (
    <section className="relative pt-[96px] sm:pt-[124px] pb-10 sm:pb-12 px-5 sm:px-6">
      <div className="mx-auto max-w-[920px] text-center">
        <h1
          className="reveal in tighter font-medium text-ink"
          style={{ fontSize: 'clamp(36px, 9vw, 92px)', lineHeight: 0.98 }}
        >
          Encuentra tu próximo
          <br />
          <span className="font-serif-it">salón</span>.
        </h1>

        {/* Search shell */}
        <form
          onSubmit={onSubmit}
          className="reveal in mt-7 sm:mt-10 max-w-[760px] mx-auto"
        >
          <div className="search-shell rounded-full pl-5 pr-2 py-2 flex items-center gap-3">
            <Icon.Search width="18" height="18" className="text-stone shrink-0" />
            <input
              type="text"
              value={draftQ}
              onChange={(e) => setDraftQ(e.target.value)}
              placeholder="¿Qué buscas?  · 'barbería en Madrid', 'manicura rusa'..."
              className="flex-1 min-w-0 bg-transparent text-[15.5px] tight text-ink placeholder:text-stone/60 focus:outline-none py-3"
            />
            <div className="hidden sm:flex items-center pl-3 border-l border-line gap-2">
              <Icon.Pin width="14" height="14" className="text-stone shrink-0" />
              <select
                value={draftCiudad}
                onChange={(e) => onCity(e.target.value)}
                className="bg-transparent text-[14px] tight text-ink focus:outline-none cursor-pointer pr-1"
              >
                <option value="">Todas las ciudades</option>
                {ciudades.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="px-5 sm:px-6 py-3 rounded-full text-[14px] font-medium gloss-btn shrink-0 inline-flex items-center gap-2"
            >
              <span className="hidden sm:inline">Buscar</span>
              <Icon.Search width="14" height="14" className="sm:hidden" />
              <Icon.Arrow width="14" height="14" className="hidden sm:inline" />
            </button>
          </div>

          {/* Mobile location row */}
          <div className="sm:hidden mt-3 flex items-center justify-center gap-2 text-[13px] text-stone">
            <Icon.Locate width="13" height="13" />
            <span className="text-stone/60">Filtra por:</span>
            <select
              value={draftCiudad}
              onChange={(e) => onCity(e.target.value)}
              className="bg-transparent text-ink focus:outline-none"
            >
              <option value="">Todas las ciudades</option>
              {ciudades.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </form>

        {/* Category quick chips */}
        <div className="reveal in mt-7 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => onCat('all')}
            className={`group px-4 py-2 rounded-full text-[13px] tight transition border ${
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
                onClick={() => onCat(c.key)}
                className={`group px-4 py-2 rounded-full text-[13px] tight transition border inline-flex items-center gap-2 ${
                  active ? 'border-ink' : 'bg-paper/70 border-line hover:border-line-2'
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
    </section>
  );
}
