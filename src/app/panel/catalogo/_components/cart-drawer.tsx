'use client';

import { useMemo, useState, useTransition } from 'react';

import { crearPedidoB2B } from '../actions';

export type CartItem = {
  producto_id: string;
  marca_id: string;
  marca_nombre: string;
  marca_condiciones_minimo_eur: number;
  nombre: string;
  sku_snapshot: string | null;
  imagen: string | null;
  precio_unit_mayorista_eur: number;
  cantidad: number;
  unidad_medida: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateCantidad: (producto_id: string, cantidad: number) => void;
  onRemove: (producto_id: string) => void;
  onClearMarca: (marca_id: string) => void;
  onClearAll: () => void;
};

export function CartDrawer({
  open,
  onClose,
  items,
  onUpdateCantidad,
  onRemove,
  onClearMarca,
  onClearAll,
}: Props) {
  const [enviando, setEnviando] = useState<string | null>(null);
  const [errorPorMarca, setErrorPorMarca] = useState<Record<string, string>>({});
  const [okPorMarca, setOkPorMarca] = useState<Record<string, string>>({});
  const [notasPorMarca, setNotasPorMarca] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  // Agrupar por marca
  const grupos = useMemo(() => {
    const map = new Map<
      string,
      {
        marca_id: string;
        marca_nombre: string;
        minimo_eur: number;
        items: CartItem[];
      }
    >();
    for (const it of items) {
      const g = map.get(it.marca_id);
      if (g) g.items.push(it);
      else
        map.set(it.marca_id, {
          marca_id: it.marca_id,
          marca_nombre: it.marca_nombre,
          minimo_eur: it.marca_condiciones_minimo_eur,
          items: [it],
        });
    }
    return Array.from(map.values()).map((g) => ({
      ...g,
      total: g.items.reduce(
        (acc, it) => acc + it.precio_unit_mayorista_eur * it.cantidad,
        0,
      ),
    }));
  }, [items]);

  function enviarPedido(marca_id: string) {
    setEnviando(marca_id);
    setErrorPorMarca((e) => ({ ...e, [marca_id]: '' }));
    setOkPorMarca((o) => ({ ...o, [marca_id]: '' }));

    const grupo = grupos.find((g) => g.marca_id === marca_id);
    if (!grupo) {
      setEnviando(null);
      return;
    }

    startTransition(async () => {
      const result = await crearPedidoB2B({
        marca_id,
        notas: notasPorMarca[marca_id] ?? '',
        items: grupo.items.map((it) => ({
          producto_id: it.producto_id,
          nombre_snapshot: it.nombre,
          sku_snapshot: it.sku_snapshot,
          cantidad: it.cantidad,
          precio_unit_mayorista_eur: it.precio_unit_mayorista_eur,
        })),
      });

      if (result.ok) {
        setOkPorMarca((o) => ({
          ...o,
          [marca_id]: `Pedido ${result.numero} enviado. Te avisaremos cuando la marca lo confirme.`,
        }));
        onClearMarca(marca_id);
        setNotasPorMarca((n) => {
          const next = { ...n };
          delete next[marca_id];
          return next;
        });
      } else {
        setErrorPorMarca((e) => ({
          ...e,
          [marca_id]: result.error ?? 'No se pudo enviar el pedido',
        }));
      }
      setEnviando(null);
    });
  }

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className={`absolute inset-y-0 right-0 w-full sm:max-w-[440px] bg-paper border-l border-line shadow-2xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <header className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <h3 className="tight text-[16px] font-medium text-ink">
                Carrito de pedidos
              </h3>
              <p className="text-[12px] text-stone">
                Un pedido por marca. Cada marca facturará al salón directamente.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-full text-stone hover:bg-cream hover:text-ink"
              aria-label="Cerrar"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              >
                <path d="M6 6l12 12" />
                <path d="M18 6L6 18" />
              </svg>
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {grupos.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <p className="text-[13.5px] text-stone">
                  Aún no has añadido nada al carrito.
                </p>
                <p className="text-[12px] text-stone/70">
                  Añade productos del catálogo para hacer un pedido a cada marca.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {grupos.map((g) => {
                  const cumpleMinimo =
                    g.minimo_eur === 0 || g.total >= g.minimo_eur;
                  const ok = okPorMarca[g.marca_id];
                  const err = errorPorMarca[g.marca_id];
                  return (
                    <section
                      key={g.marca_id}
                      className="rounded-2xl border border-line bg-cream/40 p-4"
                    >
                      <header className="mb-3 flex items-center justify-between gap-2">
                        <span className="tight text-[13.5px] font-medium text-ink">
                          {g.marca_nombre}
                        </span>
                        <button
                          type="button"
                          onClick={() => onClearMarca(g.marca_id)}
                          className="text-[11.5px] text-stone hover:text-terracotta-2"
                        >
                          Vaciar
                        </button>
                      </header>

                      <ul className="flex flex-col gap-2.5">
                        {g.items.map((it) => (
                          <li
                            key={it.producto_id}
                            className="flex items-center gap-3 rounded-xl bg-paper border border-line px-3 py-2"
                          >
                            {it.imagen ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={it.imagen}
                                alt=""
                                className="h-12 w-12 shrink-0 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="h-12 w-12 shrink-0 rounded-lg bg-cream-2" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[13px] tight text-ink">
                                {it.nombre}
                              </div>
                              <div className="text-[11.5px] text-stone">
                                {it.precio_unit_mayorista_eur.toFixed(2)} € /{' '}
                                {it.unidad_medida}
                              </div>
                            </div>
                            <div className="inline-flex items-center rounded-full border border-line bg-paper">
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateCantidad(
                                    it.producto_id,
                                    Math.max(0, it.cantidad - 1),
                                  )
                                }
                                className="h-7 w-7 grid place-items-center text-stone hover:text-ink"
                                aria-label="Restar"
                              >
                                −
                              </button>
                              <span className="w-7 text-center text-[12px] tight text-ink">
                                {it.cantidad}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateCantidad(it.producto_id, it.cantidad + 1)
                                }
                                className="h-7 w-7 grid place-items-center text-stone hover:text-ink"
                                aria-label="Sumar"
                              >
                                +
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => onRemove(it.producto_id)}
                              className="grid h-7 w-7 place-items-center rounded-full text-stone hover:bg-cream hover:text-terracotta-2"
                              aria-label="Eliminar"
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-3 flex flex-col gap-1.5">
                        <label className="text-[10.5px] uppercase tracking-[0.18em] text-stone/80">
                          Notas para la marca (opcional)
                        </label>
                        <textarea
                          value={notasPorMarca[g.marca_id] ?? ''}
                          onChange={(e) =>
                            setNotasPorMarca((n) => ({
                              ...n,
                              [g.marca_id]: e.target.value,
                            }))
                          }
                          maxLength={500}
                          rows={2}
                          placeholder="Ej. preferencia de fecha de entrega…"
                          className="rounded-xl border border-line bg-paper px-3 py-2 text-[12.5px] text-ink placeholder:text-stone/50 focus:outline-none focus:border-line-2 resize-none"
                        />
                      </div>

                      <footer className="mt-3 flex items-center justify-between gap-3">
                        <div>
                          <span className="text-[10.5px] uppercase tracking-[0.18em] text-stone/80">
                            Total pedido
                          </span>
                          <div className="tight text-[18px] font-medium text-ink">
                            {g.total.toFixed(2)} €
                          </div>
                          {g.minimo_eur > 0 && !cumpleMinimo && (
                            <div className="text-[11px] text-[#7A5A1B]">
                              Mínimo {g.minimo_eur.toFixed(2)} € (te faltan{' '}
                              {(g.minimo_eur - g.total).toFixed(2)} €)
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={
                            !cumpleMinimo ||
                            enviando === g.marca_id ||
                            isPending ||
                            g.items.length === 0
                          }
                          onClick={() => enviarPedido(g.marca_id)}
                          className="gloss-btn tight rounded-full px-5 py-2.5 text-[12.5px] font-medium disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {enviando === g.marca_id
                            ? 'Enviando…'
                            : 'Enviar pedido'}
                        </button>
                      </footer>

                      {ok && (
                        <div className="mt-3 rounded-xl border border-sage/40 bg-sage-soft px-3 py-2 text-[12px] text-sage-deep">
                          {ok}
                        </div>
                      )}
                      {err && (
                        <div
                          className="mt-3 rounded-xl border px-3 py-2 text-[12px]"
                          style={{
                            borderColor: 'rgba(177,72,72,0.4)',
                            background: '#F1D6D6',
                            color: '#7C2E2E',
                          }}
                        >
                          {err}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
          </div>

          {grupos.length > 0 && (
            <footer className="border-t border-line bg-paper px-5 py-3">
              <button
                type="button"
                onClick={onClearAll}
                className="text-[12px] text-stone hover:text-terracotta-2"
              >
                Vaciar todo
              </button>
            </footer>
          )}
        </div>
      </div>
    </div>
  );
}
