import Link from 'next/link';

import type { MarcaCatalogo } from '@/lib/catalogo/types';

export function MarcaHeader({ marca }: { marca: MarcaCatalogo }) {
  return (
    <section className="card flex flex-col gap-4 overflow-hidden p-5 md:flex-row md:items-center md:gap-6">
      <div
        className="grid shrink-0 place-items-center rounded-2xl bg-cream-2 p-4 md:p-5"
        style={{ width: '180px', height: '120px' }}
      >
        {marca.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={marca.logoUrl}
            alt={marca.nombre}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="font-serif-it text-[40px] text-stone/70">
            {marca.nombre.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5">
        <Link
          href="/panel/catalogo"
          className="tight inline-flex items-center gap-1 text-[12px] text-stone hover:text-ink"
        >
          ← Todas las marcas
        </Link>
        <h2
          className="font-playfair leading-tight text-ink"
          style={{ fontSize: '24px', letterSpacing: '-0.01em' }}
        >
          {marca.nombre}
        </h2>
        {marca.descripcion && (
          <p className="text-[13px] text-stone leading-relaxed">
            {marca.descripcion}
          </p>
        )}
        <div className="mt-1 flex flex-wrap gap-3 text-[11.5px] text-stone">
          <span className="inline-flex items-center gap-1.5">
            <span className="pill-dot bg-ink/60" />
            {marca.numProductos} producto{marca.numProductos === 1 ? '' : 's'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="pill-dot bg-stone/40" />
            {marca.condicionesB2bMinimoEur > 0
              ? `Mínimo de pedido: ${marca.condicionesB2bMinimoEur.toFixed(2)} €`
              : 'Sin mínimo de pedido'}
          </span>
        </div>
      </div>
    </section>
  );
}
