'use client';

import { useRouter } from 'next/navigation';

import { Icon } from './icons';
import { buildMarketplaceHref } from './href';
import { categoriaBy } from '@/lib/marketplace/categorias';

type Props = {
  categoria: string;
  ciudad: string;
  q: string;
  count: number;
  total: number;
};

export function ActiveFilters({ categoria, ciudad, q, count, total }: Props) {
  const router = useRouter();
  const hasFilters = !!categoria || !!ciudad || !!q.trim();

  if (!hasFilters && count === total) {
    return (
      <div className="text-[13.5px] tight text-stone">
        <span className="text-ink font-medium">{count}</span> salones disponibles
      </div>
    );
  }

  const chips: Array<{
    key: string;
    label: string;
    onRemove: () => void;
    dot?: string;
  }> = [];

  if (categoria) {
    const c = categoriaBy(categoria);
    chips.push({
      key: 'cat',
      label: c.label,
      dot: c.dot,
      onRemove: () =>
        router.push(buildMarketplaceHref({ categoria, ciudad, q }, { categoria: null })),
    });
  }
  if (ciudad) {
    chips.push({
      key: 'city',
      label: ciudad,
      onRemove: () =>
        router.push(buildMarketplaceHref({ categoria, ciudad, q }, { ciudad: null })),
    });
  }
  if (q.trim()) {
    chips.push({
      key: 'q',
      label: `"${q.trim()}"`,
      onRemove: () =>
        router.push(buildMarketplaceHref({ categoria, ciudad, q }, { q: null })),
    });
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="text-[13.5px] tight text-stone shrink-0">
        <span className="text-ink font-medium">{count}</span>{' '}
        {count === 1 ? 'salón' : 'salones'} ·
      </div>
      {chips.map((c) => (
        <span
          key={c.key}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-paper border border-line text-[12.5px] tight text-ink"
        >
          {c.dot && (
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: c.dot }}
            />
          )}
          {c.label}
          <button
            type="button"
            onClick={c.onRemove}
            className="ml-0.5 w-4 h-4 grid place-items-center rounded-full hover:bg-cream-2 text-stone hover:text-ink"
          >
            <Icon.Close width="10" height="10" />
          </button>
        </span>
      ))}
      {hasFilters && (
        <button
          type="button"
          onClick={() => router.push('/marketplace')}
          className="text-[12.5px] text-terracotta hover:text-terracotta-2 tight underline underline-offset-4 decoration-terracotta/30 hover:decoration-terracotta-2"
        >
          Limpiar todo
        </button>
      )}
    </div>
  );
}
