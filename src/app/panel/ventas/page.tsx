import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { ventasB2c } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { Icon } from '@/app/panel/_components/icons';

const ESTADO_LABELS: Record<
  string,
  { label: string; bg: string; fg: string; dot: string }
> = {
  pendiente_pago: {
    label: 'Pendiente de pago',
    bg: 'rgba(107,99,86,0.12)',
    fg: '#6B6356',
    dot: '#8A8174',
  },
  pendiente_pago_efectivo: {
    label: 'Pagará al recoger',
    bg: 'rgba(197,142,44,0.15)',
    fg: '#7A5A1B',
    dot: '#C58E2C',
  },
  pagada: {
    label: 'Pagada',
    bg: 'rgba(43,82,120,0.12)',
    fg: '#2B5278',
    dot: '#2B5278',
  },
  lista_recogida: {
    label: 'Lista para recoger',
    bg: 'rgba(197,142,44,0.18)',
    fg: '#7A5A1B',
    dot: '#C58E2C',
  },
  recogida: {
    label: 'Recogida',
    bg: 'rgba(139,157,122,0.18)',
    fg: '#5A6B4D',
    dot: '#8B9D7A',
  },
  cancelada: {
    label: 'Cancelada',
    bg: 'rgba(177,72,72,0.15)',
    fg: '#7C2E2E',
    dot: '#B14848',
  },
  reembolsada: {
    label: 'Reembolsada',
    bg: 'rgba(177,72,72,0.10)',
    fg: '#7C2E2E',
    dot: '#B14848',
  },
};

function fmtFecha(d: Date | string): string {
  return new Date(d).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default async function PanelVentasPage({
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

  const rows = await db
    .select()
    .from(ventasB2c)
    .where(eq(ventasB2c.salonId, salonRaw.id))
    .orderBy(desc(ventasB2c.createdAt))
    .limit(200);

  return (
    <div className="flex w-full flex-col gap-5">
      {params.ok && (
        <div className="flex items-center gap-2 rounded-xl border border-sage/40 bg-sage-soft px-4 py-3 text-[13px] text-sage-deep">
          <Icon.Check width="14" height="14" />
          Cambios guardados.
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
          Ventas online
        </span>
        <h2 className="tight text-[20px] font-medium text-ink">
          Tus ventas en la tienda pública
        </h2>
        <p className="text-[13px] text-stone">
          Cuando un cliente compra en tu tienda, recibes el dinero en tu
          cuenta Stripe directamente. Aquí marcas cuándo está lista para
          recoger y cuándo el cliente la ha recogido.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <p className="text-[14px] text-stone">Aún no tienes ventas online.</p>
          <p className="text-[12.5px] text-stone/70">
            Cuando alguien compre en{' '}
            <span className="font-mono">/s/.../tienda</span>, aparecerá aquí.
          </p>
        </div>
      ) : (
        <section className="card overflow-hidden">
          <ul className="divide-y divide-line">
            {rows.map((v) => {
              const e = ESTADO_LABELS[v.estado] ?? ESTADO_LABELS.pagada;
              return (
                <li key={v.id}>
                  <Link
                    href={`/panel/ventas/${v.id}`}
                    className="flex items-center gap-4 px-4 py-3.5 transition hover:bg-cream"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[12px] text-ink">
                          {v.numero}
                        </span>
                        <span className="pill" style={{ background: e.bg, color: e.fg }}>
                          <span className="pill-dot" style={{ background: e.dot }} />
                          {e.label}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[13px] text-ink">
                        {v.clienteNombre ?? v.clienteEmail}
                      </div>
                      <div className="text-[11.5px] text-stone">
                        {fmtFecha(v.createdAt)} · {v.clienteEmail}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="tight text-[15px] font-medium text-ink">
                        {Number(v.totalEur).toFixed(2)} €
                      </div>
                      <div className="text-[11px] text-stone/70">
                        {v.metodoPago === 'online' ? 'online' : 'efectivo'}
                        {' · '}
                        {v.metodoEntrega === 'envio' ? 'envío' : 'recogida'}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
