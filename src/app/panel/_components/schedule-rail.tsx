import Link from 'next/link';

import { Icon } from './icons';
import { estadoMeta, type EstadoCita } from './cita-row';

export type ScheduleRailItem = {
  id: string;
  hora: string;
  cliente: string;
  servicio: string;
  pro: string;
  estado: EstadoCita;
};

export type ScheduleRailProps = {
  proximas: ScheduleRailItem[];
};

export function ScheduleRail({ proximas }: ScheduleRailProps) {
  return (
    <div className="card flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
            A continuación
          </div>
          <div className="tight mt-0.5 text-[18px] font-medium text-ink">
            {proximas.length} cita{proximas.length === 1 ? '' : 's'} restantes
          </div>
        </div>
        <Link
          href="/panel/agenda"
          className="inline-flex items-center gap-1 text-[12px] text-terracotta hover:text-terracotta-2"
        >
          Ver agenda <Icon.Arrow width="11" height="11" />
        </Link>
      </div>
      {proximas.length === 0 ? (
        <div className="card-tight px-3.5 py-6 text-center text-[12.5px] text-stone">
          No hay más citas hoy.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {proximas.slice(0, 5).map((c) => {
            const m = estadoMeta[c.estado];
            return (
              <Link
                key={c.id}
                href={`/panel/citas/${c.id}`}
                className="card-tight flex items-center gap-3 px-3.5 py-3 transition hover:border-line-2"
              >
                <div className="tabular w-12 font-mono text-[14px] text-ink">
                  {c.hora}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="tight truncate text-[13.5px] text-ink">
                    {c.cliente}
                  </div>
                  <div className="truncate text-[11.5px] text-stone">
                    {c.servicio} · {c.pro}
                  </div>
                </div>
                <span
                  className="pill shrink-0"
                  style={{ background: m.bg, color: m.fg }}
                >
                  <span className="pill-dot" style={{ background: m.dot }} />
                  {m.label}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
