import { asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  marcas,
  productos,
  salones,
  stockSalon,
} from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { Icon } from '@/app/panel/_components/icons';

import { StockItemRow } from './_components/stock-item-row';
import { actualizarStockItem, quitarStockItem } from './actions';

export default async function PanelStockPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const params = await searchParams;
  const salonRaw = (await getCurrentSalon()) as { id?: string } | null;
  if (!salonRaw?.id) {
    return (
      <div className="card mx-auto flex max-w-2xl flex-col items-center gap-3 p-10 text-center">
        <h2 className="tight text-[20px] font-medium text-ink">
          Sin salón asociado
        </h2>
      </div>
    );
  }
  const salonId = salonRaw.id;

  // Verificar onboarding Connect del salón para alertar si no puede vender
  const [salon] = await db
    .select({
      stripeConnectOnboarded: salones.stripeConnectOnboarded,
    })
    .from(salones)
    .where(eq(salones.id, salonId))
    .limit(1);

  const rows = await db
    .select({
      id: stockSalon.id,
      cantidadDisponible: stockSalon.cantidadDisponible,
      precioPublicoEur: stockSalon.precioPublicoEur,
      activoEnTiendaPublica: stockSalon.activoEnTiendaPublica,
      productoId: productos.id,
      productoNombre: productos.nombre,
      productoImagenes: productos.imagenes,
      productoUnidad: productos.unidadMedida,
      precioRecomendado: productos.precioPublicoRecomendadoEur,
      marcaNombre: marcas.nombre,
      marcaLogoUrl: marcas.logoUrl,
    })
    .from(stockSalon)
    .innerJoin(productos, eq(productos.id, stockSalon.productoId))
    .innerJoin(marcas, eq(marcas.id, productos.marcaId))
    .where(eq(stockSalon.salonId, salonId))
    .orderBy(asc(marcas.nombre), asc(productos.nombre));

  const totalActivos = rows.filter(
    (r) => r.activoEnTiendaPublica && r.cantidadDisponible > 0,
  ).length;

  return (
    <div className="flex w-full flex-col gap-5">
      {params.ok && (
        <div className="flex items-center gap-2 rounded-xl border border-sage/40 bg-sage-soft px-4 py-3 text-[13px] text-sage-deep">
          <Icon.Check width="14" height="14" />
          Stock actualizado.
        </div>
      )}
      {params.error && (
        <div
          className="rounded-xl border bg-[#F1D6D6] px-4 py-3 text-[13px] text-[#7C2E2E]"
          style={{ borderColor: 'rgba(177,72,72,0.4)' }}
        >
          {params.error}
        </div>
      )}

      <header className="flex flex-col gap-1">
        <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
          Inventario
        </span>
        <h2 className="tight text-[20px] font-medium text-ink">
          Tu stock y tienda pública
        </h2>
        <p className="text-[13px] text-stone">
          Cuando una marca te entrega un pedido, los productos aparecen aquí.
          Decide su PVP y activa los que quieres vender en tu tienda pública
          <span className="font-mono text-ink"> /s/[slug]/tienda</span>.
        </p>
      </header>

      {!salon?.stripeConnectOnboarded && (
        <div
          className="rounded-2xl border px-4 py-3 text-[13px]"
          style={{
            borderColor: 'rgba(197,142,44,0.45)',
            background: 'rgba(197,142,44,0.10)',
            color: '#7A5A1B',
          }}
        >
          <strong>Aún no puedes cobrar ventas online.</strong> Conecta tu cuenta
          Stripe Connect desde{' '}
          <a
            href="/panel/cuenta"
            className="underline underline-offset-4 decoration-[#7A5A1B]/40 hover:decoration-[#7A5A1B]"
          >
            Mi cuenta
          </a>{' '}
          para activar pagos en tu tienda pública.
        </div>
      )}

      {rows.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <p className="text-[14px] text-stone">
            Aún no tienes stock de productos.
          </p>
          <p className="text-[12.5px] text-stone/70">
            Cuando hagas un pedido a una marca desde el catálogo y te lo
            entreguen, aparecerá aquí automáticamente.
          </p>
          <a
            href="/panel/catalogo"
            className="gloss-btn tight rounded-full px-5 py-2.5 text-[13px] font-medium"
          >
            Explorar catálogo
          </a>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-[12.5px] tight">
            <span className="pill" style={{ background: 'rgba(43,40,35,0.06)', color: '#2B2823' }}>
              <span className="pill-dot" style={{ background: '#2B2823' }} />
              {rows.length} productos en stock
            </span>
            <span
              className="pill"
              style={{
                background: 'rgba(139,157,122,0.15)',
                color: '#5A6B4D',
              }}
            >
              <span className="pill-dot" style={{ background: '#8B9D7A' }} />
              {totalActivos} a la venta en tienda
            </span>
          </div>

          <section className="card overflow-hidden">
            <ul className="divide-y divide-line">
              {rows.map((r) => {
                const imagenes = Array.isArray(r.productoImagenes)
                  ? (r.productoImagenes as string[])
                  : [];
                return (
                  <StockItemRow
                    key={r.id}
                    item={{
                      id: r.id,
                      productoNombre: r.productoNombre,
                      productoImagen: imagenes[0] ?? null,
                      productoUnidad: r.productoUnidad,
                      marcaNombre: r.marcaNombre,
                      marcaLogo: r.marcaLogoUrl,
                      cantidad: r.cantidadDisponible,
                      precioPublico: r.precioPublicoEur
                        ? Number(r.precioPublicoEur)
                        : null,
                      precioRecomendado: Number(r.precioRecomendado),
                      activo: r.activoEnTiendaPublica,
                    }}
                    onSubmit={actualizarStockItem}
                    onRemove={quitarStockItem}
                  />
                );
              })}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
