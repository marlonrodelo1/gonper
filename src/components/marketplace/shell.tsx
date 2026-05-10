'use client';

import { useState } from 'react';

import { MarketplaceTopNav } from './top-nav';
import { MarketplaceFiltersSheet } from './filters-sheet';
import { MarketplaceMobileFab } from './mobile-fab';

/**
 * Coordina TopNav + Sheet (mobile) + FAB.
 * El TopNav lleva el buscador permanente; el sheet es el editor móvil
 * de los filtros completos.
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
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <MarketplaceTopNav
        filtersCount={filtersCount}
        onOpenFilters={() => setSheetOpen(true)}
        q={q}
        ciudad={ciudad}
        categoria={categoria}
        ciudades={ciudades}
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
