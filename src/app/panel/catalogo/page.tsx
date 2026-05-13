import {
  CATEGORIAS_PRODUCTO,
  type CategoriaProducto,
} from '@/lib/catalogo/types';
import {
  getMarcaCatalogoBySlugOrId,
  listCategoriasMarcaCatalogo,
  listMarcasCatalogo,
  listProductosCatalogo,
} from '@/lib/catalogo/query';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';

import { CatalogoClient } from './_components/catalogo-client';
import { MarcaHeader } from './_components/marca-header';
import { MarcasGrid } from './_components/marcas-grid';

type SearchParams = {
  marca?: string;
  cat_marca?: string;
  categoria?: string;
  q?: string;
};

type SalonRow = {
  id?: string;
  slug?: string;
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

function buildReturnTo(sp: SearchParams): string {
  const params = new URLSearchParams();
  if (sp.marca) params.set('marca', sp.marca);
  if (sp.cat_marca) params.set('cat_marca', sp.cat_marca);
  if (sp.categoria) params.set('categoria', sp.categoria);
  if (sp.q) params.set('q', sp.q);
  const qs = params.toString();
  return qs ? `/panel/catalogo?${qs}` : '/panel/catalogo';
}

export default async function PanelCatalogoPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const salon = (await getCurrentSalon()) as SalonRow;
  const salonId = salon?.id;
  const tipoNegocio = salon?.tipo_negocio ?? salon?.tipoNegocio ?? undefined;
  const tipoNegocioFiltro =
    tipoNegocio && TIPOS_VALIDOS.has(tipoNegocio) ? tipoNegocio : undefined;

  // ============================================
  // Vista A — sin marca: grid de marcas
  // ============================================
  if (!sp.marca || sp.marca.trim() === '') {
    const marcas = await listMarcasCatalogo();
    return (
      <div className="flex w-full flex-col gap-5">
        <header className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
            Catálogo central de Gonper Studio
          </span>
          <h2 className="tight text-[20px] font-medium text-ink">
            Elige una marca
          </h2>
          <p className="text-[13px] text-stone">
            Trabajamos por marcas. Cada producto que actives aparece en tu
            tienda pública al precio que fija la marca. Te llevas un % de
            comisión por cada venta.
          </p>
        </header>

        <MarcasGrid marcas={marcas} />
      </div>
    );
  }

  // ============================================
  // Vista B — con marca: header de marca + catálogo
  // ============================================
  const marca = await getMarcaCatalogoBySlugOrId(sp.marca);
  if (!marca) {
    const marcas = await listMarcasCatalogo();
    return (
      <div className="flex w-full flex-col gap-5">
        <header className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
            Catálogo central de Gonper Studio
          </span>
          <h2 className="tight text-[20px] font-medium text-ink">
            Elige una marca
          </h2>
          <p className="text-[13px] text-stone">
            Esa marca ya no está disponible. Elige otra del listado.
          </p>
        </header>
        <MarcasGrid marcas={marcas} />
      </div>
    );
  }

  const categoriasMarca = await listCategoriasMarcaCatalogo(marca.id);

  const catMarcaId =
    sp.cat_marca && /^[0-9a-f-]{36}$/.test(sp.cat_marca) ? sp.cat_marca : undefined;
  const categoria =
    sp.categoria && CATS_VALIDOS.has(sp.categoria)
      ? (sp.categoria as CategoriaProducto)
      : undefined;
  const q = sp.q?.trim() || undefined;

  const productos = await listProductosCatalogo({
    marca_id: marca.id,
    categoria_marca_id: catMarcaId,
    categoria,
    q,
    tipo_negocio: tipoNegocioFiltro,
    salon_id: salonId,
  });

  return (
    <div className="flex w-full flex-col gap-5">
      <MarcaHeader marca={marca} />
      <CatalogoClient
        marca={marca}
        categoriasMarca={categoriasMarca}
        productos={productos}
        filtros={{
          categoria_marca_id: catMarcaId ?? '',
          categoria: categoria ?? '',
          q: q ?? '',
        }}
        returnTo={buildReturnTo(sp)}
      />
    </div>
  );
}
