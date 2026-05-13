import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { ventasB2c, ventasB2cItems } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import {
  marcarListaRecogida,
  marcarPagadaEfectivo,
  marcarRecogida,
  reembolsarVenta,
} from '../actions';

const ESTADO_LABELS: Record<string, { label: string; bg: string; fg: string; dot: string }> = {
  pendiente_pago: { label: 'Pendiente de pago', bg: 'rgba(107,99,86,0.12)', fg: '#6B6356', dot: '#8A8174' },
  pendiente_pago_efectivo: { label: 'Pagará al recoger', bg: 'rgba(197,142,44,0.15)', fg: '#7A5A1B', dot: '#C58E2C' },
  pagada: { label: 'Pagada', bg: 'rgba(43,82,120,0.12)', fg: '#2B5278', dot: '#2B5278' },
  lista_recogida: { label: 'Lista para recoger', bg: 'rgba(197,142,44,0.18)', fg: '#7A5A1B', dot: '#C58E2C' },
  recogida: { label: 'Recogida', bg: 'rgba(139,157,122,0.18)', fg: '#5A6B4D', dot: '#8B9D7A' },
  cancelada: { label: 'Cancelada', bg: 'rgba(177,72,72,0.15)', fg: '#7C2E2E', dot: '#B14848' },
  reembolsada: { label: 'Reembolsada', bg: 'rgba(177,72,72,0.10)', fg: '#7C2E2E', dot: '#B14848' },
};

export default async function PanelVentaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const salonRaw = (await getCurrentSalon()) as { id?: string } | null;
  if (!salonRaw?.id) notFound();

  const [venta] = await db
    .select()
    .from(ventasB2c)
    .where(and(eq(ventasB2c.id, id), eq(ventasB2c.salonId, salonRaw.id)))
    .limit(1);
  if (!venta) notFound();

  const items = await db
    .select()
    .from(ventasB2cItems)
    .where(eq(ventasB2cItems.ventaId, id));

  const estado = ESTADO_LABELS[venta.estado] ?? ESTADO_LABELS.pagada;

  return (
    <div className="flex w-full flex-col gap-5">
      <div>
        <Link href="/panel/ventas" className="text-[12.5px] text-stone hover:text-ink">
          ← Volver a ventas
        </Link>
      </div>

      <header className="card flex flex-col gap-3 p-5 md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[12.5px] text-stone">{venta.numero}</div>
            <h2 className="tight text-[19px] font-medium text-ink">
              {venta.clienteNombre ?? venta.clienteEmail}
            </h2>
            <div className="text-[12.5px] text-stone">
              {venta.clienteEmail}
              {venta.clienteTelefono && ` · ${venta.clienteTelefono}`}
            </div>
          </div>
          <span className="pill" style={{ background: estado.bg, color: estado.fg }}>
            <span className="pill-dot" style={{ background: estado.dot }} />
            {estado.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 pt-2 border-t border-line">
          <DateField label="Pagado" value={venta.pagadoAt} />
          <DateField label="Lista" value={venta.listaRecogidaAt} />
          <DateField label="Recogida" value={venta.recogidaAt} />
          <DateField label="Reembolsada" value={venta.reembolsadaAt ?? venta.canceladaAt} />
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
            <li key={it.id} className="flex items-center gap-3 py-3">
              {it.imagenSnapshot ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={it.imagenSnapshot}
                  alt=""
                  className="h-12 w-12 rounded-lg object-cover border border-line"
                />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-cream-2" />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] tight text-ink">{it.nombreSnapshot}</div>
                <div className="text-[12px] text-stone">
                  {it.cantidad} × {Number(it.precioUnitEur).toFixed(2)} €
                </div>
              </div>
              <div className="tight text-[14px] font-medium text-ink shrink-0">
                {Number(it.subtotalEur).toFixed(2)} €
              </div>
            </li>
          ))}
        </ul>
        <footer className="flex items-center justify-between border-t border-line pt-3">
          <div>
            <span className="text-[11px] uppercase tracking-[0.18em] text-stone/80">Total</span>
            <div className="tight text-[20px] font-medium text-ink">
              {Number(venta.totalEur).toFixed(2)} €
            </div>
            <div className="text-[11.5px] text-stone/70">
              Comisión Gonper Studio: {Number(venta.comisionGestoriEur).toFixed(2)} €
            </div>
          </div>
        </footer>
      </section>

      {/* Info adicional: método pago/entrega */}
      <section className="card grid gap-3 p-5 md:p-7 md:grid-cols-2">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-stone/70">
            Método de pago
          </div>
          <div className="mt-0.5 text-[14px] tight text-ink">
            {venta.metodoPago === 'online' ? 'Online (tarjeta vía Stripe)' : 'Efectivo / al recoger'}
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-stone/70">
            Entrega
          </div>
          <div className="mt-0.5 text-[14px] tight text-ink">
            {venta.metodoEntrega === 'envio'
              ? `Envío a domicilio (+${Number(venta.costeEnvioEur).toFixed(2)} €)`
              : 'Recogida en salón'}
          </div>
          {venta.metodoEntrega === 'envio' && venta.direccionEnvio && (
            <div className="mt-1 text-[12.5px] text-stone">
              {venta.direccionEnvio}
            </div>
          )}
        </div>
      </section>

      {/* Acciones según estado */}
      {(venta.estado === 'pendiente_pago_efectivo' ||
        venta.estado === 'pagada' ||
        venta.estado === 'lista_recogida') && (
        <section className="flex flex-wrap items-center gap-2">
          {venta.estado === 'pendiente_pago_efectivo' && (
            <form action={marcarPagadaEfectivo}>
              <input type="hidden" name="venta_id" value={venta.id} />
              <button
                type="submit"
                className="gloss-btn tight rounded-full px-5 py-2.5 text-[13px] font-medium"
              >
                Marcar como pagada (recibí el dinero)
              </button>
            </form>
          )}
          {venta.estado === 'pagada' && (
            <form action={marcarListaRecogida}>
              <input type="hidden" name="venta_id" value={venta.id} />
              <button
                type="submit"
                className="gloss-btn tight rounded-full px-5 py-2.5 text-[13px] font-medium"
              >
                {venta.metodoEntrega === 'envio' ? 'Marcar enviada' : 'Marcar lista para recoger'}
              </button>
            </form>
          )}
          {venta.estado === 'lista_recogida' && (
            <form action={marcarRecogida}>
              <input type="hidden" name="venta_id" value={venta.id} />
              <button
                type="submit"
                className="gloss-btn tight rounded-full px-5 py-2.5 text-[13px] font-medium"
              >
                {venta.metodoEntrega === 'envio' ? 'Marcar entregada' : 'Marcar como recogida'}
              </button>
            </form>
          )}
          {venta.metodoPago === 'online' && venta.estado !== 'pendiente_pago_efectivo' && (
            <form action={reembolsarVenta}>
              <input type="hidden" name="venta_id" value={venta.id} />
              <button
                type="submit"
                className="tight rounded-full border border-line bg-paper px-4 py-2 text-[12.5px] text-stone hover:bg-cream hover:text-terracotta-2"
              >
                Cancelar y reembolsar
              </button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}

function DateField({ label, value }: { label: string; value: Date | string | null }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.18em] text-stone/70">{label}</div>
      <div className="mt-0.5 text-[12.5px] text-ink">
        {value
          ? new Date(value).toLocaleString('es-ES', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '—'}
      </div>
    </div>
  );
}
