'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { getCarritoStorageKey, leerCarrito } from '@/lib/tienda/cart';

type Props = {
  salonSlug: string;
  aceptaPagos: boolean;
};

export function CarritoFab({ salonSlug, aceptaPagos }: Props) {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    function refresh() {
      const items = leerCarrito(salonSlug);
      const sum = items.reduce((acc, it) => acc + it.cantidad, 0);
      setTotal(sum);
    }
    refresh();
    function onStorage(e: StorageEvent) {
      if (e.key === getCarritoStorageKey(salonSlug)) refresh();
    }
    window.addEventListener('storage', onStorage);
    window.addEventListener('gestori-cart-updated', refresh as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(
        'gestori-cart-updated',
        refresh as EventListener,
      );
    };
  }, [salonSlug]);

  if (!aceptaPagos || total === 0) return null;

  return (
    <Link
      href={`/s/${salonSlug}/tienda/carrito`}
      className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 gloss-btn tight rounded-full px-5 py-3 text-[13.5px] font-medium shadow-2xl"
    >
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 6h18l-2 12H5L3 6z" />
        <path d="M3 6l-1-3H0" />
      </svg>
      Ir al carrito · {total}
    </Link>
  );
}
