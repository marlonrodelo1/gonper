'use client';

/**
 * Carrito B2C client-side: persiste en sessionStorage por slug de salón
 * (no se mezcla entre tiendas distintas).
 */

export type CarritoItem = {
  productoId: string;
  nombre: string;
  precio: number;
  imagen: string | null;
  cantidad: number;
  maxCantidad: number;
  marcaNombre: string;
};

export function getCarritoStorageKey(salonSlug: string): string {
  return `gestori_carrito_${salonSlug}`;
}

export function leerCarrito(salonSlug: string): CarritoItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(getCarritoStorageKey(salonSlug));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CarritoItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function escribir(key: string, items: CarritoItem[]) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(key, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('gestori-cart-updated'));
}

export function addToCart(
  key: string,
  item: Omit<CarritoItem, 'cantidad'>,
  delta = 1,
) {
  if (typeof window === 'undefined') return;
  const raw = window.sessionStorage.getItem(key);
  const items: CarritoItem[] = raw ? JSON.parse(raw) : [];
  const existing = items.find((it) => it.productoId === item.productoId);
  if (existing) {
    const next = Math.min(item.maxCantidad, existing.cantidad + delta);
    existing.cantidad = next;
    existing.maxCantidad = item.maxCantidad;
  } else {
    items.push({ ...item, cantidad: Math.min(item.maxCantidad, delta) });
  }
  escribir(key, items);
}

export function setCantidad(
  salonSlug: string,
  productoId: string,
  cantidad: number,
) {
  if (typeof window === 'undefined') return;
  const key = getCarritoStorageKey(salonSlug);
  const items = leerCarrito(salonSlug)
    .map((it) =>
      it.productoId === productoId
        ? { ...it, cantidad: Math.min(it.maxCantidad, Math.max(0, cantidad)) }
        : it,
    )
    .filter((it) => it.cantidad > 0);
  escribir(key, items);
}

export function removeFromCart(salonSlug: string, productoId: string) {
  if (typeof window === 'undefined') return;
  const key = getCarritoStorageKey(salonSlug);
  const items = leerCarrito(salonSlug).filter((it) => it.productoId !== productoId);
  escribir(key, items);
}

export function clearCart(salonSlug: string) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(getCarritoStorageKey(salonSlug));
  window.dispatchEvent(new CustomEvent('gestori-cart-updated'));
}

export function totalCarrito(items: CarritoItem[]): number {
  return items.reduce((acc, it) => acc + it.precio * it.cantidad, 0);
}
