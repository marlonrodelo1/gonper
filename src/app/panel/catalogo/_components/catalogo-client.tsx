'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { CATEGORIAS_PRODUCTO, type ProductoCatalogo, type MarcaCatalogo } from '@/lib/catalogo/types';
import { CartDrawer, type CartItem } from './cart-drawer';
import { ProductoCard } from './producto-card';

type Filtros = {
  marca_id: string;
  categoria: string;
  q: string;
};

type Props = {
  marcas: MarcaCatalogo[];
  productos: ProductoCatalogo[];
  filtros: Filtros;
};

const CART_STORAGE_KEY = 'gestori_cart_b2b';

export function CatalogoClient({ marcas, productos, filtros }: Props) {
  const router = useRouter();
  const [draftQ, setDraftQ] = useState(filtros.q);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  // Cargar carrito desde sessionStorage al montar
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.sessionStorage.getItem(CART_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartItem[];
        if (Array.isArray(parsed)) setCart(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Persistir carrito en sessionStorage en cada cambio
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      /* ignore */
    }
  }, [cart]);

  function navigate(patch: Partial<Filtros>) {
    const params = new URLSearchParams();
    const next = { ...filtros, ...patch };
    if (next.marca_id) params.set('marca', next.marca_id);
    if (next.categoria) params.set('categoria', next.categoria);
    if (next.q) params.set('q', next.q);
    const qs = params.toString();
    router.push(qs ? `/panel/catalogo?${qs}` : '/panel/catalogo');
  }

  function addToCart(p: ProductoCatalogo, cantidad: number) {
    if (cantidad <= 0) return;
    setCart((prev) => {
      const existing = prev.find((it) => it.producto_id === p.id);
      if (existing) {
        return prev.map((it) =>
          it.producto_id === p.id
            ? { ...it, cantidad: it.cantidad + cantidad }
            : it,
        );
      }
      return [
        ...prev,
        {
          producto_id: p.id,
          marca_id: p.marca.id,
          marca_nombre: p.marca.nombre,
          marca_condiciones_minimo_eur: p.marca.condicionesB2bMinimoEur,
          nombre: p.nombre,
          sku_snapshot: null,
          imagen: p.imagenes[0] ?? null,
          precio_unit_mayorista_eur: p.precioMayoristaEur,
          cantidad,
          unidad_medida: p.unidadMedida,
        },
      ];
    });
    setCartOpen(true);
  }

  function updateCantidad(producto_id: string, cantidad: number) {
    setCart((prev) =>
      prev
        .map((it) => (it.producto_id === producto_id ? { ...it, cantidad } : it))
        .filter((it) => it.cantidad > 0),
    );
  }

  function removeItem(producto_id: string) {
    setCart((prev) => prev.filter((it) => it.producto_id !== producto_id));
  }

  function clearMarca(marca_id: string) {
    setCart((prev) => prev.filter((it) => it.marca_id !== marca_id));
  }

  function clearAll() {
    setCart([]);
  }

  const totalItems = useMemo(
    () => cart.reduce((acc, it) => acc + it.cantidad, 0),
    [cart],
  );

  return (
    <>
      {/* Filtros */}
      <section className="card flex flex-col gap-4 p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate({ marca_id: '' })}
            className={`tight rounded-full border px-3.5 py-2 text-[12.5px] transition ${
              filtros.marca_id === ''
                ? 'bg-ink text-paper border-ink'
                : 'bg-paper border-line text-stone hover:text-ink hover:border-line-2'
            }`}
          >
            Todas las marcas
            <span
              className={
                filtros.marca_id === '' ? 'ml-1 text-paper/55' : 'ml-1 text-stone/55'
              }
            >
              ({marcas.reduce((a, m) => a + m.numProductos, 0)})
            </span>
          </button>
          {marcas.map((m) => {
            const active = filtros.marca_id === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => navigate({ marca_id: m.id })}
                className={`tight rounded-full border px-3.5 py-2 text-[12.5px] transition inline-flex items-center gap-2 ${
                  active
                    ? 'bg-ink text-paper border-ink'
                    : 'bg-paper border-line text-stone hover:text-ink hover:border-line-2'
                }`}
              >
                {m.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.logoUrl}
                    alt=""
                    className="h-4 w-4 rounded-full object-cover"
                  />
                )}
                {m.nombre}
                <span className={active ? 'text-paper/55' : 'text-stone/55'}>
                  ({m.numProductos})
                </span>
              </button>
            );
          })}
        </div>

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

        <form
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ q: draftQ.trim() });
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            placeholder="Buscar por nombre o marca…"
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
      </section>

      {/* Botón flotante de carrito */}
      {totalItems > 0 && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 gloss-btn tight rounded-full px-5 py-3 text-[13.5px] font-medium shadow-2xl"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18l-2 12H5L3 6z" />
            <path d="M3 6l-1-3H0" />
          </svg>
          Carrito · {totalItems}
        </button>
      )}

      {/* Grid productos */}
      {productos.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 p-12 text-center">
          <p className="text-[14px] text-stone">
            No hay productos con esos filtros.
          </p>
          <button
            type="button"
            onClick={() => {
              setDraftQ('');
              router.push('/panel/catalogo');
            }}
            className="tight text-[12.5px] text-terracotta hover:text-terracotta-2 underline underline-offset-4 decoration-terracotta/30"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {productos.map((p) => (
            <ProductoCard
              key={p.id}
              producto={p}
              onAdd={(cantidad) => addToCart(p, cantidad)}
            />
          ))}
        </div>
      )}

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        onUpdateCantidad={updateCantidad}
        onRemove={removeItem}
        onClearMarca={clearMarca}
        onClearAll={clearAll}
      />
    </>
  );
}
