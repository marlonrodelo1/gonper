'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  clearCart,
  leerCarrito,
  removeFromCart,
  setCantidad,
  totalCarrito,
  type CarritoItem,
} from '@/lib/tienda/cart';

type Props = {
  salonSlug: string;
  aceptaPagos: boolean;
};

export function CarritoView({ salonSlug, aceptaPagos }: Props) {
  const [items, setItems] = useState<CarritoItem[]>([]);

  useEffect(() => {
    setItems(leerCarrito(salonSlug));
    function onUpd() {
      setItems(leerCarrito(salonSlug));
    }
    window.addEventListener('gestori-cart-updated', onUpd as EventListener);
    return () =>
      window.removeEventListener(
        'gestori-cart-updated',
        onUpd as EventListener,
      );
  }, [salonSlug]);

  const total = totalCarrito(items);

  if (items.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-3 p-10 text-center">
        <h1 className="font-playfair text-ink text-[28px]">
          Tu <span className="font-serif-it">carrito</span> está vacío
        </h1>
        <p className="text-[13.5px] text-stone">
          Vuelve a la tienda para añadir productos.
        </p>
        <Link
          href={`/s/${salonSlug}/tienda`}
          className="gloss-btn tight rounded-full px-5 py-2.5 text-[13px] font-medium mt-2"
        >
          Ver tienda
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Items */}
      <section className="card overflow-hidden">
        <header className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h1 className="font-playfair text-ink text-[22px] tight">
            Tu carrito
          </h1>
          <button
            type="button"
            onClick={() => clearCart(salonSlug)}
            className="text-[12px] text-stone hover:text-terracotta-2 tight"
          >
            Vaciar
          </button>
        </header>
        <ul className="divide-y divide-line">
          {items.map((it) => (
            <li key={it.productoId} className="flex items-center gap-3 p-4">
              {it.imagen ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={it.imagen}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-lg object-cover border border-line"
                />
              ) : (
                <div className="h-16 w-16 shrink-0 rounded-lg bg-cream-2" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-[11.5px] uppercase tracking-[0.16em] text-stone/80">
                  {it.marcaNombre}
                </div>
                <div className="tight text-[14px] font-medium text-ink truncate">
                  {it.nombre}
                </div>
                <div className="text-[12.5px] text-stone">
                  {it.precio.toFixed(2)} € / unidad
                </div>
              </div>
              <div className="inline-flex items-center rounded-full border border-line bg-paper">
                <button
                  type="button"
                  onClick={() =>
                    setCantidad(
                      salonSlug,
                      it.productoId,
                      Math.max(0, it.cantidad - 1),
                    )
                  }
                  className="h-8 w-8 grid place-items-center text-stone hover:text-ink"
                  aria-label="Restar"
                >
                  −
                </button>
                <span className="w-8 text-center text-[13px] tight text-ink">
                  {it.cantidad}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCantidad(
                      salonSlug,
                      it.productoId,
                      Math.min(it.maxCantidad, it.cantidad + 1),
                    )
                  }
                  className="h-8 w-8 grid place-items-center text-stone hover:text-ink"
                  aria-label="Sumar"
                >
                  +
                </button>
              </div>
              <div className="tight text-[14px] font-medium text-ink w-20 text-right">
                {(it.precio * it.cantidad).toFixed(2)} €
              </div>
              <button
                type="button"
                onClick={() => removeFromCart(salonSlug, it.productoId)}
                className="h-8 w-8 grid place-items-center rounded-full text-stone hover:bg-cream hover:text-terracotta-2"
                aria-label="Eliminar"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Resumen */}
      <aside className="card flex flex-col gap-3 p-5 h-fit lg:sticky lg:top-5">
        <h2 className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
          Resumen
        </h2>
        <div className="flex items-center justify-between text-[13.5px] text-stone">
          <span>Productos</span>
          <span className="text-ink">{total.toFixed(2)} €</span>
        </div>
        <div className="flex items-center justify-between text-[13.5px] text-stone">
          <span>Envío</span>
          <span className="text-sage-deep">Recogida en salón · gratis</span>
        </div>
        <div className="flex items-center justify-between border-t border-line pt-3 mt-1">
          <span className="text-[11px] uppercase tracking-[0.2em] text-stone/80">
            Total
          </span>
          <span className="tight text-[22px] font-medium text-ink">
            {total.toFixed(2)} €
          </span>
        </div>
        <Link
          href={
            aceptaPagos
              ? `/s/${salonSlug}/tienda/checkout`
              : `/s/${salonSlug}/tienda`
          }
          className={`gloss-btn tight rounded-full px-5 py-3 text-[13px] font-medium text-center mt-1 ${aceptaPagos ? '' : 'opacity-50 pointer-events-none'}`}
        >
          {aceptaPagos ? 'Ir a pagar' : 'Pagos no disponibles'}
        </Link>
        <p className="text-[11.5px] text-stone/75 text-center">
          Pago seguro con Stripe. Recibirás un email cuando tu pedido esté
          listo para recoger.
        </p>
      </aside>
    </div>
  );
}
