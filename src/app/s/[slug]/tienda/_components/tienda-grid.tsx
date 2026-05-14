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

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export function TiendaGrid({ productos, salonSlug, aceptaPagos }: Props) {
  // Categorías únicas con contador, para el desplegable.
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

  const [categoriaActiva, setCategoriaActiva] = useState<string>('');
  const [busqueda, setBusqueda] = useState<string>('');

  const filtrados = useMemo(() => {
    const termino = normalize(busqueda.trim());
    return productos.filter((p) => {
      const cat = p.categoria || 'otros';
      if (categoriaActiva && cat !== categoriaActiva) return false;
      if (termino) {
        const haystack = normalize(`${p.nombre} ${p.marca.nombre}`);
        if (!haystack.includes(termino)) return false;
      }
      return true;
    });
  }, [productos, categoriaActiva, busqueda]);

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
      <div className="mb-7 sm:mb-9 flex flex-col sm:flex-row gap-3 sm:items-center">
        {/* Buscador por nombre */}
        <div className="relative flex-1 min-w-0">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone/70">
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
          </span>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full rounded-full bg-paper border border-line pl-11 pr-4 py-2.5 text-[14px] text-ink placeholder:text-stone/55 outline-none transition focus:border-stone/40"
          />
        </div>

        {/* Select de categorías */}
        {categorias.length > 0 && (
          <div className="relative shrink-0 sm:w-[240px]">
            <select
              value={categoriaActiva}
              onChange={(e) => setCategoriaActiva(e.target.value)}
              className="appearance-none w-full rounded-full bg-paper border border-line pl-4 pr-10 py-2.5 text-[14px] text-ink outline-none transition focus:border-stone/40 cursor-pointer"
            >
              <option value="">Todas las categorías</option>
              {categorias.map(({ cat, count }) => (
                <option key={cat} value={cat}>
                  {labelCategoria(cat)} ({count})
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-stone/70">
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </span>
          </div>
        )}
      </div>

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
        <div className="mt-8 text-center text-[13.5px] text-stone">
          No hay productos que coincidan con tu búsqueda.
        </div>
      )}
    </>
  );
}
