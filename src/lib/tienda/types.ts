/**
 * Tipos client-safe para la tienda pública del salón.
 * Modelo dropshipping (sesión 2026-05-12): el salón solo activa/desactiva
 * productos del catálogo central. El precio es fijo (lo pone Marlon).
 * No hay stock — asumimos que la marca siempre tiene disponibilidad.
 */

export type TiendaProducto = {
  productoId: string;
  productoSlug: string;
  nombre: string;
  descripcion: string | null;
  imagenes: string[];
  unidad: string;
  categoria: string;
  precioEur: number;
  marca: {
    id: string;
    slug: string;
    nombre: string;
    logoUrl: string | null;
  };
};

export type TiendaSalon = {
  id: string;
  slug: string;
  nombre: string;
  tipoNegocio: string;
  ciudad: string | null;
  direccion: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  /** Stripe Connect onboarded del salón — bloqueante para vender. */
  aceptaPagos: boolean;
  stripeConnectAccountId: string | null;
};
