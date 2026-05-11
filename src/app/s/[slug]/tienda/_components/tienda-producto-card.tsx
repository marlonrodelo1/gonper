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

  function addOne() {
    if (!aceptaPagos) return;
    addToCart(getCarritoStorageKey(salonSlug), {
      productoId: p.productoId,
      nombre: p.nombre,
      precio: p.precioEur,
      imagen: p.imagenes[0] ?? null,
      maxCantidad: p.cantidadDisponible,
      marcaNombre: p.marca.nombre,
    });
    setAdding(true);
    setFeedback('Añadido al carrito');
    window.setTimeout(() => {
      setAdding(false);
      setFeedback(null);
    }, 1500);
    // Disparar evento custom para que el FAB actualice su badge
    window.dispatchEvent(new CustomEvent('gestori-cart-updated'));
  }

  const stockBajo = p.cantidadDisponible <= 5;

  return (
    <article className="card flex flex-col overflow-hidden">
      <Link
        href={`/s/${salonSlug}/tienda/${p.marca.slug}/${p.productoSlug}`}
        className="relative w-full bg-cream-2 block"
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
          <div className="absolute inset-0 grid place-items-center text-[42px] font-serif-it text-stone/55">
            {p.nombre.charAt(0)}
          </div>
        )}
        {stockBajo && (
          <span
            className="absolute right-2 top-2 inline-flex items-center rounded-full bg-paper/95 px-2.5 py-0.5 text-[10.5px] font-medium tight text-terracotta backdrop-blur"
            style={{ border: '1px solid rgba(197,86,44,0.3)' }}
          >
            Quedan {p.cantidadDisponible}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-stone/80">
          {p.marca.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.marca.logoUrl}
              alt=""
              className="h-3 w-3 rounded-full object-cover"
            />
          )}
          <span>{p.marca.nombre}</span>
        </div>

        <Link href={`/s/${salonSlug}/tienda/${p.marca.slug}/${p.productoSlug}`}>
          <h3
            className="font-playfair leading-tight text-ink"
            style={{ fontSize: '17px', letterSpacing: '-0.01em' }}
          >
            {p.nombre}
          </h3>
        </Link>

        <div className="mt-auto flex items-baseline justify-between gap-2">
          <div>
            <div className="tight text-[22px] font-medium text-ink">
              {p.precioEur.toFixed(2)} €
            </div>
            <div className="text-[10.5px] text-stone">/ {p.unidad}</div>
          </div>
          <button
            type="button"
            onClick={addOne}
            disabled={!aceptaPagos || adding}
            className="gloss-btn tight rounded-full px-4 py-2 text-[12px] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {feedback ?? 'Añadir'}
          </button>
        </div>
      </div>
    </article>
  );
}
