'use client';

import Link from 'next/link';
import { useState } from 'react';

import {
  addToCart,
  getCarritoStorageKey,
} from '@/lib/tienda/cart';
import type { TiendaProducto } from '@/lib/tienda/types';

type Props = {
  producto: TiendaProducto;
  salonSlug: string;
  aceptaPagos: boolean;
};

export function TiendaProductoCard({ producto: p, salonSlug, aceptaPagos }: Props) {
  const [adding, setAdding] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  function addOne(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!aceptaPagos) return;
    addToCart(getCarritoStorageKey(salonSlug), {
      productoId: p.productoId,
      nombre: p.nombre,
      precio: p.precioEur,
      imagen: p.imagenes[0] ?? null,
      maxCantidad: 99,
      marcaNombre: p.marca.nombre,
    });
    setAdding(true);
    setFeedback('Añadido');
    window.setTimeout(() => {
      setAdding(false);
      setFeedback(null);
    }, 1500);
    window.dispatchEvent(new CustomEvent('gestori-cart-updated'));
  }

  const href = `/s/${salonSlug}/tienda/${p.marca.slug}/${p.productoSlug}`;

  return (
    <article className="group card flex flex-col overflow-hidden">
      <Link
        href={href}
        className="relative w-full bg-cream-2 block"
        style={{ aspectRatio: '1/1' }}
      >
        {p.imagenes[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.imagenes[0]}
            alt={p.nombre}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-[36px] font-serif-it text-stone/55">
            {p.nombre.charAt(0)}
          </div>
        )}
        {p.marca.logoUrl && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1.5 bg-paper/90 backdrop-blur-sm rounded-full px-2 py-1 border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.marca.logoUrl}
              alt=""
              className="h-3 w-3 rounded-full object-cover"
            />
            <span className="text-[9.5px] uppercase tracking-[0.14em] text-stone">
              {p.marca.nombre}
            </span>
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-3.5">
        <Link href={href} className="block min-h-[36px]">
          <h3
            className="font-playfair leading-tight text-ink line-clamp-2"
            style={{ fontSize: '14px', letterSpacing: '-0.005em' }}
          >
            {p.nombre}
          </h3>
        </Link>

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <div className="tight text-[17px] font-medium text-ink leading-none">
            {p.precioEur.toFixed(2).replace(/\.00$/, '')} €
          </div>
          <button
            type="button"
            onClick={addOne}
            disabled={!aceptaPagos || adding}
            aria-label={`Añadir ${p.nombre} al carrito`}
            className="gloss-btn tight rounded-full px-3 py-1.5 text-[11.5px] font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {feedback ?? '+ Añadir'}
          </button>
        </div>
      </div>
    </article>
  );
}
