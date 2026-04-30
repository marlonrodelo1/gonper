import Link from 'next/link';

export type EstadoCita =
  | 'pendiente'
  | 'confirmada'
  | 'cancelada'
  | 'no_show'
  | 'completada';

type EstadoStyle = { label: string; bg: string; fg: string; dot: string };

export const estadoMeta: Record<EstadoCita, EstadoStyle> = {
  completada: {
    label: 'Completada',
    bg: 'rgba(139,157,122,0.15)',
    fg: '#5A6B4D',
    dot: '#8B9D7A',
  },
  confirmada: {
    label: 'Confirmada',
    bg: 'rgba(43,40,35,0.06)',
    fg: '#2B2823',
    dot: '#2B2823',
  },
  pendiente: {
    label: 'Pendiente',
    bg: 'rgba(197,142,44,0.14)',
    fg: '#7A5A1B',
    dot: '#C58E2C',
  },
  no_show: {
    label: 'No-show',
    bg: 'rgba(177,72,72,0.12)',
    fg: '#7C2E2E',
    dot: '#B14848',
  },
  cancelada: {
    label: 'Cancelada',
    bg: 'rgba(107,99,86,0.10)',
    fg: '#6B6356',
    dot: '#8A8174',
  },
};

function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export type CitaRowProps = {
  citaId: string;
  hora: string;
  duracionMin: number;
  clienteNombre: string;
  clienteTelefono: string | null;
  visitas: number;
  noShowsTotales: number;
  servicioNombre: string;
  profesionalNombre: string;
  estado: EstadoCita;
  precio: number;
  alerta?: boolean;
};

export function CitaRow({
  citaId,
  hora,
  duracionMin,
  clienteNombre,
  clienteTelefono,
  visitas,
  noShowsTotales,
  servicioNombre,
  profesionalNombre,
  estado,
  precio,
  alerta,
}: CitaRowProps) {
  const m = estadoMeta[estado];

  return (
    <Link
      href={`/panel/citas/${citaId}`}
      className="grid grid-cols-[80px_44px_1fr_140px_120px_92px_28px] items-center gap-3 border-l-2 border-l-transparent px-5 py-4 transition hover:border-l-terracotta hover:bg-paper/60"
    >
      <div className="flex flex-col">
        <span className="tight tabular font-mono text-[15px] text-ink">
          {hora}
        </span>
        <span className="tabular text-[11px] text-stone">{duracionMin} min</span>
      </div>
      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-cream-2 text-[12px] font-medium text-ink/80">
        {iniciales(clienteNombre) || '·'}
      </div>
      <div className="min-w-0">
        <div className="tight flex items-center gap-2 truncate text-[14.5px] font-medium text-ink">
          <span className="truncate">{clienteNombre}</span>
          {alerta && (
            <span
              className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-[0.16em]"
              style={{
                background: 'rgba(197,142,44,0.12)',
                color: '#C58E2C',
              }}
            >
              Sin confirmar
            </span>
          )}
          {noShowsTotales > 1 && (
            <span
              className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-[0.16em]"
              style={{
                background: 'rgba(177,72,72,0.10)',
                color: '#B14848',
              }}
            >
              {noShowsTotales} no-shows
            </span>
          )}
        </div>
        <div className="truncate text-[12px] text-stone">
          {clienteTelefono ?? '—'} · {visitas} visita{visitas === 1 ? '' : 's'}
        </div>
      </div>
      <div className="tight text-[13px] text-ink">{servicioNombre}</div>
      <div className="text-[13px] text-stone">con {profesionalNombre}</div>
      <div className="flex items-center gap-2">
        <span
          className="pill"
          style={{ background: m.bg, color: m.fg }}
        >
          <span className="pill-dot" style={{ background: m.dot }} />
          {m.label}
        </span>
      </div>
      <span className="tabular text-right font-mono text-[14px] text-ink">
        {precio.toFixed(0)}€
      </span>
    </Link>
  );
}
