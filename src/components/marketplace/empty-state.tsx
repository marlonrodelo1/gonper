'use client';

import { useRouter } from 'next/navigation';

export function MarketplaceEmptyState() {
  const router = useRouter();
  return (
    <div className="reveal in flex flex-col items-center text-center py-20 px-6 bg-paper border border-line rounded-[28px]">
      <svg className="line-art" width="120" height="80" viewBox="0 0 120 80" strokeWidth="1.4">
        <circle cx="48" cy="36" r="22" />
        <path d="M64 52l18 18" />
        <path d="M38 36h20" />
      </svg>
      <h3
        className="mt-6 font-playfair text-ink"
        style={{ fontSize: '28px', letterSpacing: '-0.01em' }}
      >
        No hay salones que <span className="font-serif-it">cumplan</span> estos
        filtros
      </h3>
      <p className="mt-3 text-[14px] text-stone max-w-[400px] leading-relaxed">
        Prueba a quitar la ciudad, ampliar la categoría, o buscar por otro
        nombre. Cada semana se suman nuevos salones.
      </p>
      <div className="mt-6 flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => router.push('/marketplace')}
          className="px-5 py-2.5 rounded-full gloss-btn text-[13px] font-medium tight"
        >
          Limpiar filtros
        </button>
        <a
          href="/signup"
          className="px-5 py-2.5 rounded-full bg-cream border border-line text-ink text-[13px] font-medium tight hover:border-line-2 transition"
        >
          Avísame cuando haya
        </a>
      </div>
    </div>
  );
}
