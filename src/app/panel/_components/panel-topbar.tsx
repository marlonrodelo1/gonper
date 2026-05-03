import Link from 'next/link';

import { Icon } from './icons';

export type PanelTopbarProps = {
  titulo: string;
  subtitulo: string;
  saludoSegundaLinea?: string;
  nuevaCitaHref?: string;
};

export function PanelTopbar({
  titulo,
  subtitulo,
  saludoSegundaLinea,
  nuevaCitaHref = '/panel/citas/nueva',
}: PanelTopbarProps) {
  return (
    <div className="sticky top-0 z-30 border-b border-line bg-cream/85 backdrop-blur-md">
      <div className="flex items-center gap-3 px-4 py-3 pl-14 md:gap-6 md:px-8 md:py-4 md:pl-8">
        <div className="flex min-w-0 flex-col">
          <div className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
            {subtitulo}
          </div>
          <h1 className="tight truncate text-[20px] leading-tight font-medium text-ink md:text-[26px]">
            {titulo}
            {saludoSegundaLinea && (
              <>
                {' '}
                <span className="font-serif-it text-stone/70">
                  {saludoSegundaLinea}
                </span>
              </>
            )}
          </h1>
        </div>
        <div className="flex-1" />

        {/* Search */}
        <div className="hidden w-[280px] items-center gap-2 rounded-full border border-line bg-paper px-3.5 py-2 md:flex">
          <Icon.Search width="15" height="15" className="text-stone/70" />
          <input
            placeholder="Buscar cliente, cita, servicio…"
            className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-stone/50"
          />
          <span className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-stone/50">
            ⌘K
          </span>
        </div>

        {/* Bell */}
        <button
          type="button"
          aria-label="Notificaciones"
          className="relative hidden h-10 w-10 items-center justify-center rounded-full border border-line bg-paper text-stone transition hover:text-ink sm:flex"
        >
          <Icon.Bell width="17" height="17" />
          <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-terracotta" />
        </button>

        {/* Nueva cita */}
        <Link
          href={nuevaCitaHref}
          className="gloss-btn tight inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-[12.5px] font-medium md:px-4 md:py-2.5 md:text-[13.5px]"
          aria-label="Nueva cita"
        >
          <Icon.Plus width="15" height="15" />
          <span className="hidden sm:inline">Nueva cita</span>
        </Link>
      </div>
    </div>
  );
}
