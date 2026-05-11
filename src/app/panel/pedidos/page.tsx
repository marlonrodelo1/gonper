import Link from 'next/link';
import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { marcas, pedidosB2b } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';

const ESTADO_LABELS: Record<string, { label: string; bg: string; fg: string; dot: string }> = {
  borrador: {
    label: 'Borrador',
    bg: 'rgba(107,99,86,0.12)',
    fg: '#6B6356',
    dot: '#8A8174',
  },
  pendiente: {
    label: 'Pendiente',
    bg: 'rgba(197,142,44,0.15)',
    fg: '#7A5A1B',
    dot: '#C58E2C',
  },
  aceptado: {
    label: 'Aceptado',
    bg: 'rgba(43,82,120,0.12)',
    fg: '#2B5278',
    dot: '#2B5278',
  },
  enviado: {
    label: 'Enviado',
    bg: 'rgba(197,142,44,0.18)',
    fg: '#7A5A1B',
    dot: '#A87217',
  },
  entregado: {
    label: 'Entregado',
    bg: 'rgba(139,157,122,0.18)',
    fg: '#5A6B4D',
    dot: '#8B9D7A',
  },
  cancelado: {
    label: 'Cancelado',
    bg: 'rgba(177,72,72,0.15)',
    fg: '#7C2E2E',
    dot: '#B14848',
  },
};

function formatFecha(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default async function PanelPedidosPage() {
  const salonRaw = (await getCurrentSalon()) as { id?: string } | null;
  if (!salonRaw?.id) {
    return (
      <div className="card mx-auto flex max-w-2xl flex-col items-center gap-3 p-10 text-center">
        <h2 className="tight text-[20px] font-medium text-ink">
          Sin salón asociado
        </h2>
        <p className="text-[13px] text-stone">
          No se pudo identificar tu salón.
        </p>
      </div>
    );
  }
  const salonId = salonRaw.id;

  const rows = await db
    .select({
      id: pedidosB2b.id,
      numero: pedidosB2b.numero,
      estado: pedidosB2b.estado,
      totalEur: pedidosB2b.totalEur,
      createdAt: pedidosB2b.createdAt,
      marcaNombre: marcas.nombre,
      marcaLogo: marcas.logoUrl,
    })
    .from(pedidosB2b)
    .innerJoin(marcas, eq(marcas.id, pedidosB2b.marcaId))
    .where(eq(pedidosB2b.salonId, salonId))
    .orderBy(desc(pedidosB2b.createdAt))
    .limit(100);

  return (
    <div className="flex w-full flex-col gap-5">
      <header className="flex flex-col gap-1">
        <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
          Pedidos a marcas
        </span>
        <h2 className="tight text-[20px] font-medium text-ink">
          Tus pedidos B2B
        </h2>
        <p className="text-[13px] text-stone">
          Aquí ves los pedidos que has enviado a las marcas. Cuando una marca
          marque tu pedido como entregado, los productos se añadirán
          automáticamente a tu stock.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <p className="text-[14px] text-stone">
            Aún no has hecho ningún pedido.
          </p>
          <Link
            href="/panel/catalogo"
            className="gloss-btn tight rounded-full px-5 py-2.5 text-[13px] font-medium"
          >
            Explorar catálogo
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-line">
            {rows.map((r) => {
              const estado = ESTADO_LABELS[r.estado] ?? ESTADO_LABELS.pendiente;
              return (
                <li key={r.id}>
                  <Link
                    href={`/panel/pedidos/${r.id}`}
                    className="flex items-center gap-4 px-4 py-3.5 transition hover:bg-cream"
                  >
                    {r.marcaLogo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.marcaLogo}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 shrink-0 rounded-full bg-cream-2 grid place-items-center text-[14px] font-serif-it text-stone">
                        {r.marcaNombre.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[12px] text-ink">
                          {r.numero}
                        </span>
                        <span className="text-[13.5px] tight text-ink">
                          {r.marcaNombre}
                        </span>
                        <span
                          className="pill"
                          style={{ background: estado.bg, color: estado.fg }}
                        >
                          <span
                            className="pill-dot"
                            style={{ background: estado.dot }}
                          />
                          {estado.label}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[12px] text-stone">
                        {formatFecha(r.createdAt)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="tight text-[15px] font-medium text-ink">
                        {Number(r.totalEur).toFixed(2)} €
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
