import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { marcas, pedidosB2b, pedidosB2bItems } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { cancelarPedidoB2B } from '../actions';

const ESTADO_LABELS: Record<string, { label: string; bg: string; fg: string; dot: string }> = {
  pendiente: { label: 'Pendiente', bg: 'rgba(197,142,44,0.15)', fg: '#7A5A1B', dot: '#C58E2C' },
  aceptado: { label: 'Aceptado', bg: 'rgba(43,82,120,0.12)', fg: '#2B5278', dot: '#2B5278' },
  enviado: { label: 'Enviado', bg: 'rgba(197,142,44,0.18)', fg: '#7A5A1B', dot: '#A87217' },
  entregado: { label: 'Entregado', bg: 'rgba(139,157,122,0.18)', fg: '#5A6B4D', dot: '#8B9D7A' },
  cancelado: { label: 'Cancelado', bg: 'rgba(177,72,72,0.15)', fg: '#7C2E2E', dot: '#B14848' },
  borrador: { label: 'Borrador', bg: 'rgba(107,99,86,0.12)', fg: '#6B6356', dot: '#8A8174' },
};

export default async function PanelPedidoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const salonRaw = (await getCurrentSalon()) as { id?: string } | null;
  if (!salonRaw?.id) notFound();
  const salonId = salonRaw.id;

  const [pedido] = await db
    .select({
      id: pedidosB2b.id,
      numero: pedidosB2b.numero,
      estado: pedidosB2b.estado,
      totalEur: pedidosB2b.totalEur,
      notasSalon: pedidosB2b.notasSalon,
      notasMarca: pedidosB2b.notasMarca,
      createdAt: pedidosB2b.createdAt,
      aceptadoAt: pedidosB2b.aceptadoAt,
      enviadoAt: pedidosB2b.enviadoAt,
      entregadoAt: pedidosB2b.entregadoAt,
      canceladoAt: pedidosB2b.canceladoAt,
      marcaId: marcas.id,
      marcaNombre: marcas.nombre,
      marcaLogo: marcas.logoUrl,
      marcaEmail: marcas.contactoEmail,
    })
    .from(pedidosB2b)
    .innerJoin(marcas, eq(marcas.id, pedidosB2b.marcaId))
    .where(and(eq(pedidosB2b.id, id), eq(pedidosB2b.salonId, salonId)))
    .limit(1);

  if (!pedido) notFound();

  const items = await db
    .select()
    .from(pedidosB2bItems)
    .where(eq(pedidosB2bItems.pedidoId, id))
    .orderBy(asc(pedidosB2bItems.nombreSnapshot));

  const estado = ESTADO_LABELS[pedido.estado] ?? ESTADO_LABELS.pendiente;

  return (
    <div className="flex w-full flex-col gap-5">
      <div>
        <Link
          href="/panel/pedidos"
          className="text-[12.5px] text-stone hover:text-ink"
        >
          ← Volver a pedidos
        </Link>
      </div>

      <header className="card flex flex-col gap-4 p-5 md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {pedido.marcaLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pedido.marcaLogo}
                alt=""
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-cream-2 grid place-items-center text-[16px] font-serif-it text-stone">
                {pedido.marcaNombre.charAt(0)}
              </div>
            )}
            <div>
              <div className="font-mono text-[12.5px] text-stone">
                {pedido.numero}
              </div>
              <h2 className="tight text-[19px] font-medium text-ink">
                {pedido.marcaNombre}
              </h2>
            </div>
          </div>
          <span className="pill" style={{ background: estado.bg, color: estado.fg }}>
            <span className="pill-dot" style={{ background: estado.dot }} />
            {estado.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <DateField label="Creado" value={pedido.createdAt} />
          <DateField label="Aceptado" value={pedido.aceptadoAt} />
          <DateField label="Enviado" value={pedido.enviadoAt} />
          <DateField label="Entregado" value={pedido.entregadoAt} />
        </div>
      </header>

      <section className="card flex flex-col gap-3 p-5 md:p-7">
        <header className="flex flex-col gap-0.5">
          <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
            Productos
          </span>
          <h3 className="tight text-[16px] font-medium text-ink">
            {items.length} {items.length === 1 ? 'producto' : 'productos'}
          </h3>
        </header>

        <ul className="divide-y divide-line">
          {items.map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="truncate text-[13.5px] tight text-ink">
                  {it.nombreSnapshot}
                </div>
                {it.skuSnapshot && (
                  <div className="text-[11.5px] font-mono text-stone">
                    SKU {it.skuSnapshot}
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="text-[12.5px] text-stone">
                  {it.cantidad} × {Number(it.precioUnitMayoristaEur).toFixed(2)} €
                </div>
                <div className="tight text-[14px] font-medium text-ink">
                  {Number(it.subtotalEur).toFixed(2)} €
                </div>
              </div>
            </li>
          ))}
        </ul>

        <footer className="flex items-center justify-between border-t border-line pt-3">
          <span className="text-[11px] uppercase tracking-[0.18em] text-stone/80">
            Total
          </span>
          <span className="tight text-[20px] font-medium text-ink">
            {Number(pedido.totalEur).toFixed(2)} €
          </span>
        </footer>
      </section>

      {(pedido.notasSalon || pedido.notasMarca) && (
        <section className="card flex flex-col gap-3 p-5 md:p-7">
          <h3 className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
            Notas
          </h3>
          {pedido.notasSalon && (
            <div>
              <div className="text-[12px] tight text-stone/80">Tus notas</div>
              <p className="mt-0.5 text-[13.5px] text-ink leading-relaxed">
                {pedido.notasSalon}
              </p>
            </div>
          )}
          {pedido.notasMarca && (
            <div>
              <div className="text-[12px] tight text-stone/80">
                Notas de {pedido.marcaNombre}
              </div>
              <p className="mt-0.5 text-[13.5px] text-ink leading-relaxed">
                {pedido.notasMarca}
              </p>
            </div>
          )}
        </section>
      )}

      {pedido.estado === 'pendiente' && (
        <form
          action={async () => {
            'use server';
            await cancelarPedidoB2B(pedido.id);
          }}
          className="flex justify-end"
        >
          <button
            type="submit"
            className="tight rounded-full border border-line bg-paper px-5 py-2.5 text-[12.5px] text-stone hover:bg-cream hover:text-terracotta-2"
          >
            Cancelar pedido
          </button>
        </form>
      )}
    </div>
  );
}

function DateField({
  label,
  value,
}: {
  label: string;
  value: Date | string | null;
}) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.18em] text-stone/70">
        {label}
      </div>
      <div className="mt-0.5 text-[12.5px] text-ink">
        {value
          ? new Date(value).toLocaleDateString('es-ES', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : '—'}
      </div>
    </div>
  );
}
