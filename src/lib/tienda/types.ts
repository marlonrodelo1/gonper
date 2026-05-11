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
  direccion: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  /** true si el visitante puede pagar (online o efectivo, alguno activo). */
  aceptaPagos: boolean;
  aceptaPagoOnline: boolean;
  aceptaEfectivo: boolean;
  /** Coste de envío en € o null si no hace envíos. */
  costeEnvioEur: number | null;
  zonaEnvio: string | null;
};
