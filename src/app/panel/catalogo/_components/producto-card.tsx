'use client';

import { useState } from 'react';

import type { ProductoCatalogo } from '@/lib/catalogo/types';

type Props = {
  producto: ProductoCatalogo;
  onAdd: (cantidad: number) => void;
};

export function ProductoCard({ producto: p, onAdd }: Props) {
  const [cantidad, setCantidad] = useState(1);

  const ahorroPorcentaje =
    p.precioPublicoRecomendadoEur > p.precioMayoristaEur
      ? Math.round(
          ((p.precioPublicoRecomendadoEur - p.precioMayoristaEur) /
            p.precioPublicoRecomendadoEur) *
            100,
        )
      : 0;

  return (
    <article className="card flex flex-col overflow-hidden">
      {/* Imagen */}
      <div
        className="relative w-full bg-cream-2"
        style={{ aspectRatio: '4/3' }}
      >
        {p.imagenes[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.imagenes[0]}
            alt={p.nombre}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-[28px] font-serif-it text-stone/60">
            {p.nombre.charAt(0).toUpperCase()}
          </div>
        )}
        {ahorroPorcentaje > 0 && (
          <span
            className="absolute right-2 top-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10.5px] font-medium tight"
            style={{ background: 'rgba(139,157,122,0.92)', color: '#FBF8F2' }}
          >
            -{ahorroPorcentaje}% vs PVP
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-2">
          {p.marca.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.marca.logoUrl}
              alt=""
              className="h-4 w-4 rounded-full object-cover"
            />
          )}
          <span className="text-[11.5px] uppercase tracking-[0.16em] text-stone/80">
            {p.marca.nombre}
          </span>
        </div>
        <h3
          className="font-playfair leading-tight text-ink"
          style={{ fontSize: '17px', letterSpacing: '-0.01em' }}
        >
          {p.nombre}
        </h3>
        {p.descripcion && (
          <p className="line-clamp-2 text-[12.5px] text-stone leading-relaxed">
            {p.descripcion}
          </p>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-2">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <span className="text-[10.5px] uppercase tracking-[0.18em] text-stone/70">
                Precio mayorista
              </span>
              <div className="tight text-[20px] font-medium text-ink">
                {p.precioMayoristaEur.toFixed(2)} €
                <span className="ml-1 text-[11.5px] font-normal text-stone/70">
                  / {p.unidadMedida}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10.5px] uppercase tracking-[0.16em] text-stone/60">
                PVP recom.
              </span>
              <div className="tight text-[13px] text-stone">
                {p.precioPublicoRecomendadoEur.toFixed(2)} €
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center rounded-full border border-line bg-paper">
              <button
                type="button"
                onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                className="h-8 w-8 grid place-items-center text-stone hover:text-ink"
                aria-label="Restar"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                max={999}
                value={cantidad}
                onChange={(e) =>
                  setCantidad(Math.max(1, Math.min(999, Number(e.target.value) || 1)))
                }
                className="w-10 bg-transparent text-center text-[13px] tight text-ink focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                type="button"
                onClick={() => setCantidad((c) => Math.min(999, c + 1))}
                className="h-8 w-8 grid place-items-center text-stone hover:text-ink"
                aria-label="Sumar"
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={() => onAdd(cantidad)}
              className="gloss-btn tight flex-1 rounded-full px-4 py-2 text-[12.5px] font-medium"
            >
              Añadir al pedido
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
