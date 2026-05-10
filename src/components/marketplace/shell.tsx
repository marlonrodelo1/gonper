'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { MarketplaceTopNav } from './top-nav';
import { MarketplaceFiltersSheet } from './filters-sheet';
import { MarketplaceMobileFab } from './mobile-fab';
import { buildMarketplaceHref } from './href';

/**
 * Coordina TopNav (botón "Filtros" mobile) + Sheet (open/close) + FAB.
 * Comparte el state de "sheet abierto/cerrado" y el draft de búsqueda
 * compacta del TopNav.
 */
type Props = {
  filtersCount: number;
  q: string;
  ciudad: string;
  categoria: string;
  ciudades: string[];
  hasFilters: boolean;
};

export function MarketplaceShell({
  filtersCount,
  q,
  ciudad,
  categoria,
  ciudades,
  hasFilters,
}: Props) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [topNavQ, setTopNavQ] = useState(q);

  useEffect(() => {
    setTopNavQ(q);
  }, [q]);

  // Cuando el usuario escribe en el TopNav comprimido, hacemos push a la URL
  // con un pequeño debounce para no martillear el router en cada tecla.
  useEffect(() => {
    if (topNavQ === q) return;
    const t = setTimeout(() => {
      router.push(
        buildMarketplaceHref(
          { categoria, ciudad, q },
          { q: topNavQ.trim() || null },
        ),
      );
    }, 350);
    return () => clearTimeout(t);
  }, [topNavQ, q, ciudad, categoria, router]);

  return (
    <>
      <MarketplaceTopNav
        filtersCount={filtersCount}
        onOpenFilters={() => setSheetOpen(true)}
        q={topNavQ}
        onSearch={setTopNavQ}
      />
      <MarketplaceFiltersSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        q={q}
        ciudad={ciudad}
        categoria={categoria}
        ciudades={ciudades}
        hasFilters={hasFilters}
      />
      <MarketplaceMobileFab
        count={filtersCount}
        onClick={() => setSheetOpen(true)}
      />
    </>
  );
}
