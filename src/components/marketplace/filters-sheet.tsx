'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { Icon } from './icons';
import { buildMarketplaceHref } from './href';
import { CATEGORIAS_MARKETPLACE, type TipoNegocio } from '@/lib/marketplace/query';

type Props = {
  open: boolean;
  onClose: () => void;
  q: string;
  ciudad: string;
  categoria: string;
  ciudades: string[];
  hasFilters: boolean;
};

export function MarketplaceFiltersSheet({
  open,
  onClose,
  q,
  ciudad,
  categoria,
  ciudades,
  hasFilters,
}: Props) {
  const router = useRouter();
  const [draftQ, setDraftQ] = useState(q);
  const [draftCiudad, setDraftCiudad] = useState(ciudad);
  const [draftCat, setDraftCat] = useState<string>(categoria);

  function applyAndClose() {
    router.push(
      buildMarketplaceHref(
        {},
        {
          categoria: draftCat || null,
          ciudad: draftCiudad || null,
          q: draftQ.trim() || null,
        },
      ),
    );
    onClose();
  }

  function clear() {
    setDraftQ('');
    setDraftCiudad('');
    setDraftCat('');
    router.push('/marketplace');
    onClose();
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    applyAndClose();
  }

  return (
    <div
      className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
    >
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className={`absolute inset-x-0 bottom-0 bg-paper border-t border-line rounded-t-[28px] transition-transform duration-300 ${open ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ maxHeight: '88vh' }}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-center pt-3 pb-1">
            <div className="sheet-handle" />
          </div>
          <div className="flex items-center justify-between px-6 py-3 border-b border-line/70">
            <div className="text-[15px] tight font-medium text-ink">Filtros</div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 grid place-items-center rounded-full hover:bg-cream"
            >
              <Icon.Close width="16" height="16" />
            </button>
          </div>

          <form
            onSubmit={onSubmit}
            className="overflow-y-auto px-6 py-5 flex flex-col gap-6"
          >
            <div>
              <div className="text-[11.5px] uppercase tracking-[0.18em] text-stone mb-2.5">
                Categoría
              </div>
              <div className="flex flex-wrap gap-2">
                <SheetChip
                  active={!draftCat}
                  onClick={() => setDraftCat('')}
                  dot="#1A1815"
                >
                  Todos
                </SheetChip>
                {CATEGORIAS_MARKETPLACE.map((c) => (
                  <SheetChip
                    key={c.key}
                    active={draftCat === c.key}
                    onClick={() => setDraftCat(c.key as TipoNegocio)}
                    dot={c.dot}
                  >
                    {c.label}
                  </SheetChip>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[11.5px] uppercase tracking-[0.18em] text-stone mb-2.5">
                Ciudad
              </div>
              <div className="relative">
                <select
                  value={draftCiudad}
                  onChange={(e) => setDraftCiudad(e.target.value)}
                  className="w-full appearance-none bg-cream border border-line rounded-2xl px-4 py-3 text-[14px] tight text-ink focus:outline-none focus:border-line-2 pr-9 cursor-pointer"
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

            <div>
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
                  className="w-full bg-cream border border-line rounded-2xl pl-9 pr-3 py-3 text-[14px] tight text-ink placeholder:text-stone/55 focus:outline-none focus:border-line-2"
                />
              </div>
            </div>
          </form>

          <div className="px-6 pt-3 pb-5 border-t border-line/70 flex gap-2 bg-paper">
            {hasFilters && (
              <button
                type="button"
                onClick={clear}
                className="px-5 py-3 rounded-full bg-cream border border-line text-ink text-[13.5px] font-medium tight"
              >
                Limpiar
              </button>
            )}
            <button
              type="button"
              onClick={applyAndClose}
              className="flex-1 px-5 py-3 rounded-full gloss-btn text-[13.5px] font-medium tight"
            >
              Ver resultados
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SheetChip({
  active,
  onClick,
  children,
  dot,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  dot: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-[13px] tight border inline-flex items-center gap-2 transition ${
        active
          ? 'bg-ink text-paper border-ink'
          : 'bg-cream text-ink border-line'
      }`}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: dot }}
      />
      {children}
    </button>
  );
}
