'use client';

import { useState } from 'react';

type StockItem = {
  id: string;
  productoNombre: string;
  productoImagen: string | null;
  productoUnidad: string;
  marcaNombre: string;
  marcaLogo: string | null;
  cantidad: number;
  precioPublico: number | null;
  precioRecomendado: number;
  activo: boolean;
};

type Props = {
  item: StockItem;
  onSubmit: (formData: FormData) => Promise<void>;
  onRemove: (formData: FormData) => Promise<void>;
};

export function StockItemRow({ item, onSubmit, onRemove }: Props) {
  const [cantidad, setCantidad] = useState(item.cantidad);
  const [precio, setPrecio] = useState<string>(
    item.precioPublico !== null ? String(item.precioPublico) : '',
  );
  const [activo, setActivo] = useState(item.activo);

  const dirty =
    cantidad !== item.cantidad ||
    (precio === ''
      ? item.precioPublico !== null
      : Number(precio) !== item.precioPublico) ||
    activo !== item.activo;

  const sinStock = cantidad === 0;
  const precioEfectivo =
    precio === '' ? item.precioRecomendado : Number(precio);

  return (
    <li className="p-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Imagen */}
        {item.productoImagen ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.productoImagen}
            alt=""
            className="h-14 w-14 shrink-0 rounded-lg object-cover border border-line"
          />
        ) : (
          <div className="h-14 w-14 shrink-0 rounded-lg bg-cream-2 grid place-items-center text-[14px] font-serif-it text-stone">
            {item.productoNombre.charAt(0)}
          </div>
        )}

        {/* Info producto */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11.5px] uppercase tracking-[0.16em] text-stone/80">
            {item.marcaLogo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.marcaLogo}
                alt=""
                className="h-3 w-3 rounded-full object-cover"
              />
            )}
            <span>{item.marcaNombre}</span>
          </div>
          <div className="tight text-[14px] font-medium text-ink">
            {item.productoNombre}
          </div>
        </div>

        {/* Form */}
        <form
          action={onSubmit}
          className="flex flex-wrap items-center gap-3 w-full sm:w-auto"
        >
          <input type="hidden" name="stock_id" value={item.id} />

          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] uppercase tracking-[0.18em] text-stone/70">
              Cantidad
            </label>
            <input
              name="cantidad_disponible"
              type="number"
              min={0}
              max={99999}
              value={cantidad}
              onChange={(e) =>
                setCantidad(
                  Math.max(0, Math.min(99999, Number(e.target.value) || 0)),
                )
              }
              className="w-20 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-[13px] tight text-ink focus:outline-none focus:border-line-2"
            />
          </div>

          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] uppercase tracking-[0.18em] text-stone/70">
              PVP €
              <span className="ml-1 normal-case tracking-normal text-stone/55 text-[10px]">
                (rec. {item.precioRecomendado.toFixed(2)})
              </span>
            </label>
            <input
              name="precio_publico_eur"
              type="number"
              min={0}
              max={9999}
              step="0.01"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              placeholder={item.precioRecomendado.toFixed(2)}
              className="w-24 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-[13px] tight text-ink focus:outline-none focus:border-line-2"
            />
          </div>

          <label className="flex items-center gap-2 text-[12px] tight text-ink cursor-pointer">
            <input
              type="checkbox"
              name="activo_en_tienda_publica"
              checked={activo && !sinStock}
              disabled={sinStock}
              onChange={(e) => setActivo(e.target.checked)}
              className="h-4 w-4 accent-[#C5562C]"
            />
            En tienda pública
          </label>

          <button
            type="submit"
            disabled={!dirty}
            className="gloss-btn tight rounded-full px-4 py-1.5 text-[12px] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Guardar
          </button>
        </form>

        {/* Quitar */}
        <form action={onRemove}>
          <input type="hidden" name="stock_id" value={item.id} />
          <button
            type="submit"
            className="tight rounded-full border border-line bg-paper px-3 py-1.5 text-[11.5px] text-stone hover:bg-cream hover:text-terracotta-2"
            aria-label="Quitar de stock"
          >
            Quitar
          </button>
        </form>
      </div>

      {sinStock && activo && (
        <p className="mt-2 text-[11.5px] text-stone/75">
          Sin stock — para mostrarlo en tu tienda, primero pon una cantidad
          disponible.
        </p>
      )}
      {activo && !sinStock && (
        <p className="mt-2 text-[11.5px] text-sage-deep">
          A la venta en /s/.../tienda al precio de {precioEfectivo.toFixed(2)} €
        </p>
      )}
    </li>
  );
}
