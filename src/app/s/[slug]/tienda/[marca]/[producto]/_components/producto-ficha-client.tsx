'use client';

import { useRouter } from 'next/navigation';
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

export function ProductoFichaClient({
  producto: p,
  salonSlug,
  aceptaPagos,
}: Props) {
  const router = useRouter();
  const [cantidad, setCantidad] = useState(1);
  const [feedback, setFeedback] = useState<string | null>(null);

  function addNow() {
    addToCart(
      getCarritoStorageKey(salonSlug),
      {
        productoId: p.productoId,
        nombre: p.nombre,
        precio: p.precioEur,
        imagen: p.imagenes[0] ?? null,
        maxCantidad: p.cantidadDisponible,
        marcaNombre: p.marca.nombre,
      },
      cantidad,
    );
    setFeedback('Añadido al carrito');
    window.setTimeout(() => setFeedback(null), 1500);
  }

  function buyNow() {
    addNow();
    router.push(`/s/${salonSlug}/tienda/carrito`);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center rounded-full border border-line bg-paper">
          <button
            type="button"
            onClick={() => setCantidad((c) => Math.max(1, c - 1))}
            className="h-9 w-9 grid place-items-center text-stone hover:text-ink"
            aria-label="Restar"
          >
            −
          </button>
          <input
            type="number"
            min={1}
            max={p.cantidadDisponible}
            value={cantidad}
            onChange={(e) =>
              setCantidad(
                Math.max(
                  1,
                  Math.min(p.cantidadDisponible, Number(e.target.value) || 1),
                ),
              )
            }
            className="w-12 bg-transparent text-center text-[14px] tight text-ink focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            type="button"
            onClick={() =>
              setCantidad((c) => Math.min(p.cantidadDisponible, c + 1))
            }
            className="h-9 w-9 grid place-items-center text-stone hover:text-ink"
            aria-label="Sumar"
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={addNow}
          disabled={!aceptaPagos}
          className="tight inline-flex items-center gap-2 rounded-full border border-line bg-paper px-5 py-2.5 text-[13px] font-medium text-ink hover:bg-cream disabled:opacity-50"
        >
          {feedback ?? 'Añadir al carrito'}
        </button>
        <button
          type="button"
          onClick={buyNow}
          disabled={!aceptaPagos}
          className="gloss-btn tight rounded-full px-5 py-2.5 text-[13px] font-medium disabled:opacity-50"
        >
          Comprar ahora
        </button>
      </div>
      {!aceptaPagos && (
        <div className="text-[12.5px] text-stone/80">
          El salón aún está configurando los pagos online.
        </div>
      )}
    </div>
  );
}
