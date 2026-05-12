'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  CATEGORIAS_PRODUCTO,
  type CategoriaMarcaCatalogo,
  type MarcaCatalogo,
  type ProductoCatalogo,
} from '@/lib/catalogo/types';
import { ProductoCard } from './producto-card';

type Filtros = {
  categoria_marca_id: string;
  categoria: string;
  q: string;
};

type Props = {
  marca: MarcaCatalogo;
  categoriasMarca: CategoriaMarcaCatalogo[];
  productos: ProductoCatalogo[];
  filtros: Filtros;
  returnTo: string;
};

export function CatalogoClient({
  marca,
  categoriasMarca,
  productos,
  filtros,
  returnTo,
}: Props) {
  const router = useRouter();
  const [draftQ, setDraftQ] = useState(filtros.q);

  function navigate(patch: Partial<Filtros>) {
    const next = { ...filtros, ...patch };
    const params = new URLSearchParams();
    params.set('marca', marca.slug);
    if (next.categoria_marca_id) params.set('cat_marca', next.categoria_marca_id);
    if (next.categoria) params.set('categoria', next.categoria);
    if (next.q) params.set('q', next.q);
    router.push(`/panel/catalogo?${params.toString()}`);
  }

  const usaCategoriasMarca = categoriasMarca.length > 0;
  const totalEnMiTienda = productos.filter((p) => p.enMiTienda).length;

  return (
    <>
      <section className="card flex flex-col gap-4 p-4 md:p-5">
        {usaCategoriasMarca ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate({ categoria_marca_id: '' })}
              className={`tight rounded-full border px-3.5 py-2 text-[12.5px] transition ${
                filtros.categoria_marca_id === ''
                  ? 'bg-ink text-paper border-ink'
                  : 'bg-paper border-line text-stone hover:text-ink hover:border-line-2'
              }`}
            >
              Todos
              <span
                className={
                  filtros.categoria_marca_id === ''
                    ? 'ml-1 text-paper/55'
                    : 'ml-1 text-stone/55'
                }
              >
                ({marca.numProductos})
              </span>
            </button>
            {categoriasMarca.map((c) => {
              const active = filtros.categoria_marca_id === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => navigate({ categoria_marca_id: c.id })}
                  className={`tight rounded-full border px-3.5 py-2 text-[12.5px] transition ${
                    active
                      ? 'bg-ink text-paper border-ink'
                      : 'bg-paper border-line text-stone hover:text-ink hover:border-line-2'
                  }`}
                >
                  {c.nombre}
                  <span
                    className={active ? 'ml-1 text-paper/55' : 'ml-1 text-stone/55'}
                  >
                    ({c.numProductos})
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate({ categoria: '' })}
              className={`tight rounded-full border px-3 py-1.5 text-[12px] transition ${
                filtros.categoria === ''
                  ? 'bg-ink text-paper border-ink'
                  : 'bg-paper border-line text-stone hover:text-ink hover:border-line-2'
              }`}
            >
              Todas las categorías
            </button>
            {CATEGORIAS_PRODUCTO.map((c) => {
              const active = filtros.categoria === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => navigate({ categoria: c.key })}
                  className={`tight rounded-full border px-3 py-1.5 text-[12px] transition ${
                    active
                      ? 'bg-ink text-paper border-ink'
                      : 'bg-paper border-line text-stone hover:text-ink hover:border-line-2'
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ q: draftQ.trim() });
            }}
            className="flex flex-1 items-center gap-2"
          >
            <input
              type="text"
              value={draftQ}
              onChange={(e) => setDraftQ(e.target.value)}
              placeholder={`Buscar en ${marca.nombre}…`}
              className="flex-1 rounded-2xl border border-line bg-paper px-4 py-2.5 text-[13.5px] text-ink placeholder:text-stone/55 focus:outline-none focus:border-line-2"
            />
            <button
              type="submit"
              className="gloss-btn tight rounded-full px-4 py-2.5 text-[13px] font-medium"
            >
              Buscar
            </button>
            {filtros.q && (
              <button
                type="button"
                onClick={() => {
                  setDraftQ('');
                  navigate({ q: '' });
                }}
                className="tight rounded-full border border-line bg-paper px-3 py-2 text-[12.5px] text-stone hover:text-ink"
              >
                Limpiar
              </button>
            )}
          </form>

          <div className="flex items-center gap-2 text-[12px] text-stone whitespace-nowrap">
            <span className="pill-dot bg-sage" />
            {totalEnMiTienda} producto{totalEnMiTienda === 1 ? '' : 's'} en mi
            tienda
          </div>
        </div>
      </section>

      {productos.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 p-12 text-center">
          <p className="text-[14px] text-stone">
            {filtros.q || filtros.categoria || filtros.categoria_marca_id
              ? 'No hay productos con esos filtros.'
              : `${marca.nombre} aún no tiene productos en el catálogo.`}
          </p>
          {(filtros.q || filtros.categoria || filtros.categoria_marca_id) && (
            <button
              type="button"
              onClick={() => {
                setDraftQ('');
                router.push(
                  `/panel/catalogo?marca=${encodeURIComponent(marca.slug)}`,
                );
              }}
              className="tight text-[12.5px] text-terracotta hover:text-terracotta-2 underline underline-offset-4 decoration-terracotta/30"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {productos.map((p) => (
            <ProductoCard key={p.id} producto={p} returnTo={returnTo} />
          ))}
        </div>
      )}
    </>
  );
}
