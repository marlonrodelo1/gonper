import Link from 'next/link';

import { estadoMeta, type EstadoCita } from '@/app/panel/_components/cita-row';

export type CitaCardProps = {
  citaId: string;
  hora: string;
  estado: EstadoCita;
  clienteNombre: string;
  servicioNombre: string;
  profesionalColor?: string | null;
  /**
   * "compact": variante para celdas estrechas del grid semanal
   * (sólo dot + texto largo en title/tooltip).
   * "full": variante para listado mobile y tablet,
   * con pill completo legible.
   */
  variant?: 'compact' | 'full';
};

/**
 * Card de cita para la vista de agenda.
 *
 * Jerarquía visual:
 *   1. Hora (text-base font-medium, tabular)
 *   2. Cliente (text-sm font-medium)
 *   3. Servicio (text-xs stone)
 *
 * El estado se representa con un pill compacto en variante "compact"
 * (sólo dot + abreviatura), o pill completo en "full".
 */
export function CitaCard({
  citaId,
  hora,
  estado,
  clienteNombre,
  servicioNombre,
  profesionalColor,
  variant = 'compact',
}: CitaCardProps) {
  const m = estadoMeta[estado] ?? estadoMeta.pendiente;
  const dotColor = profesionalColor ?? '#3b82f6';

  // Texto corto del estado para celdas estrechas
  const labelCorto: Record<EstadoCita, string> = {
    confirmada: 'Conf.',
    pendiente: 'Pend.',
    completada: 'OK',
    cancelada: 'Canc.',
    no_show: 'NS',
  };

  return (
    <Link
      href={`/panel/citas/${citaId}`}
      title={`${hora} · ${clienteNombre} · ${servicioNombre} · ${m.label}`}
      className="group relative block rounded-xl border border-line bg-paper p-3 transition hover:-translate-y-px hover:border-line/80 hover:bg-cream hover:shadow-sm"
      style={{
        borderLeftColor: dotColor,
        borderLeftWidth: 3,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="tabular tight font-mono text-[15px] font-medium leading-none text-ink">
          {hora}
        </span>
        {variant === 'full' ? (
          <span
            className="pill"
            style={{ background: m.bg, color: m.fg }}
          >
            <span className="pill-dot" style={{ background: m.dot }} />
            {m.label}
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
            style={{ background: m.bg, color: m.fg }}
            aria-label={m.label}
          >
            <span
              className="inline-block size-1.5 rounded-full"
              style={{ background: m.dot }}
              aria-hidden
            />
            <span className="hidden xl:inline">{labelCorto[estado]}</span>
          </span>
        )}
      </div>
      <div className="tight mt-2 truncate text-[13.5px] font-medium text-ink">
        {clienteNombre}
      </div>
      <div className="mt-0.5 truncate text-[11.5px] text-stone">
        {servicioNombre}
      </div>
    </Link>
  );
}
