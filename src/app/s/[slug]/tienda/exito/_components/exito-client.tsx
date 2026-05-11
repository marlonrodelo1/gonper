'use client';

import { useEffect } from 'react';

import { clearCart } from '@/lib/tienda/cart';

/**
 * Limpia el carrito al cargar la página de éxito. Componente vacío,
 * solo side effect.
 */
export function ExitoClient({ salonSlug }: { salonSlug: string }) {
  useEffect(() => {
    clearCart(salonSlug);
  }, [salonSlug]);
  return null;
}
