import {
  CATEGORIAS_PRODUCTO,
  type CategoriaProducto,
} from '@/lib/catalogo/types';
import {
  listMarcasCatalogo,
  listProductosCatalogo,
} from '@/lib/catalogo/query';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';

import { CatalogoClient } from './_components/catalogo-client';

type SearchParams = {
  marca?: string;
  categoria?: string;
  q?: string;
};

type SalonRow = {
  id?: string;
  tipo_negocio?: string;
  tipoNegocio?: string;
} | null;

const TIPOS_VALIDOS = new Set([
  'peluqueria',
  'barberia',
  'estetica',
  'manicura',
  'otro',
]);

const CATS_VALIDOS = new Set(CATEGORIAS_PRODUCTO.map((c) => c.key as string));

export default async function PanelCatalogoPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const salon = (await getCurrentSalon()) as SalonRow;
  const tipoNegocio = salon?.tipo_negocio ?? salon?.tipoNegocio ?? undefined;

  const marcaId =
    sp.marca && /^[0-9a-f-]{36}$/.test(sp.marca) ? sp.marca : undefined;
  const categoria =
    sp.categoria && CATS_VALIDOS.has(sp.categoria)
      ? (sp.categoria as CategoriaProducto)
      : undefined;
  const q = sp.q?.trim() || undefined;

  const [marcas, productos] = await Promise.all([
    listMarcasCatalogo(),
    listProductosCatalogo({
      marca_id: marcaId,
      categoria,
      q,
      tipo_negocio:
        tipoNegocio && TIPOS_VALIDOS.has(tipoNegocio) ? tipoNegocio : undefined,
    }),
  ]);

  return (
    <div className="flex w-full flex-col gap-5">
      <header className="flex flex-col gap-1">
        <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
          Catálogo central de Gestori
        </span>
        <h2 className="tight text-[20px] font-medium text-ink">
          Pide stock a las marcas
        </h2>
        <p className="text-[13px] text-stone">
          Añade productos al carrito y envía el pedido a cada marca. Cuando
          recibas el stock, podrás venderlo en tu tienda pública.
        </p>
      </header>

      <CatalogoClient
        marcas={marcas}
        productos={productos}
        filtros={{ marca_id: marcaId ?? '', categoria: categoria ?? '', q: q ?? '' }}
      />
    </div>
  );
}
