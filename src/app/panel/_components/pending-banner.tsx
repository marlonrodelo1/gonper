import Link from 'next/link';

import { Icon } from './icons';

export type PendingBannerProps = {
  count: number;
  next: string;
  hrefVer?: string;
};

export function PendingBanner({
  count,
  next,
  hrefVer = '/panel/hoy#pendientes',
}: PendingBannerProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-4 rounded-2xl border bg-amber-soft px-4 py-3 md:px-5 md:py-4"
      style={{ borderColor: 'rgba(197,142,44,0.4)' }}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{
          background: 'rgba(197,142,44,0.2)',
          color: '#C58E2C',
        }}
      >
        <Icon.Bell width="17" height="17" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="tight text-[14px] font-medium text-ink">
          {count} cita{count === 1 ? '' : 's'} sin confirmar en las próximas horas
        </div>
        <div className="text-[12.5px] text-stone">
          La siguiente: <span className="text-ink">{next}</span> · Juanita las
          recordará 1 h antes automáticamente.
        </div>
      </div>
      <Link
        href={hrefVer}
        className="tight text-[13px] text-ink underline decoration-line-2 underline-offset-4 hover:decoration-ink"
      >
        Ver pendientes
      </Link>
    </div>
  );
}
