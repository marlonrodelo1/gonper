'use client';

import { Icon } from './icons';

type Props = {
  count: number;
  onClick: () => void;
};

export function MarketplaceMobileFab({ count, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="lg:hidden fixed left-1/2 -translate-x-1/2 bottom-5 z-30 inline-flex items-center gap-2 px-5 py-3 rounded-full gloss-btn text-[13.5px] font-medium tight"
    >
      <Icon.Sliders width="14" height="14" />
      <span>Filtros</span>
      {count > 0 && (
        <span
          className="ml-0.5 min-w-[20px] h-[20px] grid place-items-center px-1.5 rounded-full text-[11px] font-medium"
          style={{ background: 'var(--terracotta)', color: 'var(--paper)' }}
        >
          {count}
        </span>
      )}
    </button>
  );
}
