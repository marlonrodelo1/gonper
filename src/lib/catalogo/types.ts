/**
 * Tipos y constantes del catálogo SAFE PARA CLIENTE.
 *
 * No importa Drizzle ni `db`. Client components pueden usar esto sin
 * que el bundler arrastre `postgres`/`net`/`tls`. Las queries que tocan
 * la BBDD viven en `./query.ts` y SÓLO se importan desde server.
 */

export type CategoriaProducto =
  | 'capilar'
  | 'barba'
  | 'unas'
  | 'estetica'
  | 'accesorio'
  | 'otro';

export const CATEGORIAS_PRODUCTO: Array<{
  key: CategoriaProducto;
  label: string;
}> = [
  { key: 'capilar', label: 'Capilar' },
  { key: 'barba', label: 'Barba' },
  { key: 'unas', label: 'Uñas' },
  { key: 'estetica', label: 'Estética' },
  { key: 'accesorio', label: 'Accesorios' },
  { key: 'otro', label: 'Otros' },
];

export type ProductoCatalogo = {
  id: string;
  slug: string;
  nombre: string;
  descripcion: string | null;
  categoria: CategoriaProducto;
  imagenes: string[];
  precioMayoristaEur: number;
  precioPublicoRecomendadoEur: number;
  unidadMedida: string;
  pesoG: number | null;
  marca: {
    id: string;
    slug: string;
    nombre: string;
    logoUrl: string | null;
    condicionesB2bMinimoEur: number;
  };
};

export type MarcaCatalogo = {
  id: string;
  slug: string;
  nombre: string;
  logoUrl: string | null;
  condicionesB2bMinimoEur: number;
  numProductos: number;
};
