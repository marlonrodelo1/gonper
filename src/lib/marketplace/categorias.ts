/**
 * Constantes y tipos del marketplace SAFE PARA CLIENTE.
 *
 * No importa Drizzle ni `db`, así client components pueden usar esto sin
 * que el bundler arrastre `postgres`/`net`/`tls` al cliente. La capa de
 * queries (que sí toca la BBDD) vive en `./query.ts` y SÓLO debe importarse
 * desde Server Components / route handlers / server actions.
 */

export type TipoNegocio =
  | 'peluqueria'
  | 'barberia'
  | 'manicura'
  | 'estetica'
  | 'otro';

export type CategoriaMeta = {
  key: TipoNegocio;
  label: string;
  /** Color del dot del chip. */
  dot: string;
  /** Soft de fondo para banner placeholder. */
  soft: string;
  /** Color profundo para texto sobre fondo soft. */
  deep: string;
};

export const CATEGORIAS_MARKETPLACE: CategoriaMeta[] = [
  { key: 'peluqueria', label: 'Peluquería', dot: '#C58E2C', soft: '#F2E4C7', deep: '#A87217' },
  { key: 'barberia', label: 'Barbería', dot: '#C5562C', soft: '#F1D9CC', deep: '#A8451F' },
  { key: 'manicura', label: 'Manicura', dot: '#D88EA0', soft: '#F3DEE3', deep: '#B66E80' },
  { key: 'estetica', label: 'Estética', dot: '#8B9D7A', soft: '#DDE3D3', deep: '#6B7C5A' },
  { key: 'otro', label: 'Otro', dot: '#8A8174', soft: '#EFE9DD', deep: '#6B6356' },
];

export function categoriaBy(key: string | null | undefined): CategoriaMeta {
  return (
    CATEGORIAS_MARKETPLACE.find((c) => c.key === key) ??
    CATEGORIAS_MARKETPLACE[4]
  );
}

/** Forma de la card que envía el server al renderizar el marketplace. */
export type SalonCard = {
  slug: string;
  nombre: string;
  tipoNegocio: TipoNegocio;
  ciudad: string | null;
  descripcionCorta: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  /**
   * Imágenes para el slider de la card: empieza por `bannerUrl` y sigue
   * con las imágenes de la galería del salón ordenadas por `orden`. Si
   * el dueño no tiene banner ni galería, este array viene vacío y la
   * card pinta un placeholder con el color de la categoría.
   */
  imagenes: string[];
  ratingAvg: number | null;
  totalResenas: number;
  /** Coordenadas (OpenStreetMap) — null si el dueño no las ha guardado. */
  lat: number | null;
  lng: number | null;
};
