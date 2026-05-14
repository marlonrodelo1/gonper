'use client';

import { useMemo, useState } from 'react';
import { TiendaProductoCard } from './tienda-producto-card';
import type { TiendaProducto } from '@/lib/tienda/types';

type Props = {
  productos: TiendaProducto[];
  salonSlug: string;
  aceptaPagos: boolean;
};

const CATEGORIA_LABELS: Record<string, string> = {
  cabello: 'Cabello',
  unas: 'Uñas',
  piel: 'Piel',
  maquillaje: 'Maquillaje',
  barba: 'Barba',
  cuidado_corporal: 'Cuerpo',
  herramientas: 'Herramientas',
  otros: 'Otros',
};

function labelCategoria(cat: string): string {
  return CATEGORIA_LABELS[cat] ?? cat.charAt(0).toUpperCase() + cat.slice(1);
}

export function TiendaGrid({ productos, salonSlug, aceptaPagos }: Props) {
  const categorias = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of productos) {
      const c = p.categoria || 'otros';
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => ({ cat, count }));
  }, [productos]);

  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    if (!categoriaActiva) return productos;
    return productos.filter(
      (p) => (p.categoria || 'otros') === categoriaActiva,
    );
  }, [productos, categoriaActiva]);

  if (productos.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-3 p-10 text-center">
        <p className="text-[14px] text-stone">
          Aún no hay productos disponibles en esta tienda.
        </p>
      </div>
    );
  }

  return (
    <>
      {categorias.length > 1 && (
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setCategoriaActiva(null)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-[12.5px] font-medium tight transition border ${
              categoriaActiva === null
                ? 'bg-ink text-paper border-ink'
                : 'bg-paper text-ink border-line hover:border-stone/40'
            }`}
          >
            Todos · {productos.length}
          </button>
          {categorias.map(({ cat, count }) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoriaActiva(cat)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-[12.5px] font-medium tight transition border ${
                categoriaActiva === cat
                  ? 'bg-ink text-paper border-ink'
                  : 'bg-paper text-ink border-line hover:border-stone/40'
              }`}
            >
              {labelCategoria(cat)} · {count}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {filtrados.map((p) => (
          <TiendaProductoCard
            key={p.productoId}
            producto={p}
            salonSlug={salonSlug}
            aceptaPagos={aceptaPagos}
          />
        ))}
      </div>

      {filtrados.length === 0 && (
        <div className="mt-6 text-center text-[13px] text-stone">
          No hay productos en esta categoría.
        </div>
      )}
    </>
  );
}
