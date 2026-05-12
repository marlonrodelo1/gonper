import Link from 'next/link';

import type { MarcaCatalogo } from '@/lib/catalogo/types';

/**
 * Vista "marcas-first" del catálogo del salón.
 *
 * Muestra todas las marcas activas en grid con su logo grande para que el
 * dueño primero elija marca y luego entre a su catálogo de productos.
 */
export function MarcasGrid({ marcas }: { marcas: MarcaCatalogo[] }) {
  if (marcas.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center gap-3 p-12 text-center">
        <p className="tight text-[16px] font-medium text-ink">
          Aún no hay marcas disponibles
        </p>
        <p className="max-w-md text-[13px] text-stone">
          En cuanto el equipo de Gestori añada marcas al catálogo central, las
          verás aquí y podrás pedir su stock.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {marcas.map((m) => (
        <Link
          key={m.id}
          href={`/panel/catalogo?marca=${encodeURIComponent(m.slug)}`}
          className="card group flex flex-col overflow-hidden transition hover:border-line-2"
        >
          <div
            className="relative grid w-full place-items-center bg-cream-2 p-6"
            style={{ aspectRatio: '16/9' }}
          >
            {m.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={m.logoUrl}
                alt={m.nombre}
                className="max-h-full max-w-[70%] object-contain transition group-hover:scale-[1.03]"
                loading="lazy"
              />
            ) : (
              <span className="font-serif-it text-[44px] text-stone/70">
                {m.nombre.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex flex-1 flex-col gap-2 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h3
                className="font-playfair leading-tight text-ink"
                style={{ fontSize: '18px', letterSpacing: '-0.01em' }}
              >
                {m.nombre}
              </h3>
              <span className="tight text-[11.5px] text-stone whitespace-nowrap">
                {m.numProductos} producto{m.numProductos === 1 ? '' : 's'}
              </span>
            </div>
            {m.descripcion && (
              <p className="line-clamp-2 text-[12.5px] text-stone leading-relaxed">
                {m.descripcion}
              </p>
            )}
            <div className="mt-auto flex items-center justify-between gap-3 pt-2 text-[11.5px] text-stone">
              <span className="inline-flex items-center gap-1.5">
                {m.condicionesB2bMinimoEur > 0
                  ? `Mínimo ${m.condicionesB2bMinimoEur.toFixed(2)} €`
                  : 'Sin mínimo de pedido'}
              </span>
              <span className="tight text-terracotta group-hover:text-terracotta-2">
                Ver catálogo →
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
