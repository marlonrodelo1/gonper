'use client';

import { useState } from 'react';

import { Icon } from '@/app/panel/_components/icons';

export type AccordionSectionProps = {
  badge?: string;
  titulo: string;
  subtitulo?: string;
  estado?: 'ok' | 'pendiente' | 'proximamente';
  estadoLabel?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

const ESTADO_STYLE: Record<
  NonNullable<AccordionSectionProps['estado']>,
  { bg: string; color: string; dot: string }
> = {
  ok: {
    bg: 'rgba(139,157,122,0.15)',
    color: '#5A6B4D',
    dot: '#8B9D7A',
  },
  pendiente: {
    bg: 'rgba(197,142,44,0.15)',
    color: '#7A5A1B',
    dot: '#C58E2C',
  },
  proximamente: {
    bg: 'rgba(107,99,86,0.10)',
    color: '#6B6356',
    dot: '#8A8174',
  },
};

/**
 * Card colapsable estilo Simply Schedule Appointments (cabecera + flecha,
 * fondo verdoso muy suave cuando está expandida). Usa clases del proyecto.
 */
export function AccordionSection({
  badge,
  titulo,
  subtitulo,
  estado,
  estadoLabel,
  defaultOpen = false,
  children,
}: AccordionSectionProps) {
  const [abierto, setAbierto] = useState(defaultOpen);
  const estadoStyle = estado ? ESTADO_STYLE[estado] : null;

  return (
    <section
      className="card overflow-hidden"
      style={
        abierto
          ? {
              borderColor: 'rgba(139,157,122,0.45)',
              background:
                'linear-gradient(180deg, rgba(139,157,122,0.06) 0%, rgba(255,253,250,0) 60%)',
            }
          : undefined
      }
    >
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-paper/40 md:px-6 md:py-5"
      >
        <div className="min-w-0 flex-1">
          {badge ? (
            <div className="text-[10.5px] uppercase tracking-[0.22em] text-stone/70">
              {badge}
            </div>
          ) : null}
          <div className="tight mt-0.5 text-[16.5px] font-medium text-ink md:text-[18px]">
            {titulo}
          </div>
          {subtitulo ? (
            <p className="mt-0.5 text-[12.5px] text-stone">{subtitulo}</p>
          ) : null}
        </div>

        {estadoStyle && estadoLabel ? (
          <span
            className="pill mr-1 hidden sm:inline-flex"
            style={{ background: estadoStyle.bg, color: estadoStyle.color }}
          >
            <span
              className="pill-dot"
              style={{ background: estadoStyle.dot }}
            />
            {estadoLabel}
          </span>
        ) : null}

        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line bg-paper text-stone transition ${
            abierto ? 'rotate-180' : ''
          }`}
          aria-hidden
        >
          <Icon.Caret width="13" height="13" />
        </span>
      </button>

      {abierto ? (
        <div className="border-t border-line/70 bg-paper/40 px-5 py-5 md:px-7 md:py-6">
          {children}
        </div>
      ) : null}
    </section>
  );
}
