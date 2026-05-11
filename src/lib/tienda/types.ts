/**
 * Tipos client-safe para la tienda pública del salón.
 * No importa Drizzle ni `db`.
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
  cantidadDisponible: number;
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
  logoUrl: string | null;
  bannerUrl: string | null;
  /** Si false, el visitante NO puede pagar (no hay Connect onboarded). */
  aceptaPagos: boolean;
};
