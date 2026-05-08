/**
 * Placeholder para días vacíos en la vista semana.
 * Mantiene la celda como zona destinada (futuras mejoras drag&drop)
 * sin desperdiciar espacio con texto a media altura.
 */
export function EmptyDia({ variant = 'grid' }: { variant?: 'grid' | 'section' }) {
  if (variant === 'section') {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-dashed border-line/70 bg-cream/30 px-3 py-3 text-[12px] text-stone/60">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          width="14"
          height="14"
          aria-hidden
        >
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <line x1="8" y1="3" x2="8" y2="7" />
          <line x1="16" y1="3" x2="16" y2="7" />
        </svg>
        <span>Sin citas</span>
      </div>
    );
  }

  return (
    <div
      className="flex flex-1 items-center justify-center px-2 py-6 text-stone/35"
      aria-label="Sin citas"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        width="16"
        height="16"
        aria-hidden
      >
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <line x1="8" y1="3" x2="8" y2="7" />
        <line x1="16" y1="3" x2="16" y2="7" />
      </svg>
    </div>
  );
}
