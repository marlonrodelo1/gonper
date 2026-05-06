import type { CSSProperties } from 'react';

const ACCENTS = {
  manicura: {
    accent: '#D88EA0',
    accent2: '#C77389',
    accentSoft: '#F3DEE3',
    accentBlush: '#FAEBEE',
  },
  barberia: {
    accent: '#C5562C',
    accent2: '#A8451F',
    accentSoft: '#F1D9CC',
    accentBlush: '#FAEFEA',
  },
  peluqueria: {
    accent: '#C58E2C',
    accent2: '#A6741F',
    accentSoft: '#F2E4C7',
    accentBlush: '#FBF6E8',
  },
  estetica: {
    accent: '#8B9D7A',
    accent2: '#6B7C5A',
    accentSoft: '#DDE3D3',
    accentBlush: '#EEF1E9',
  },
  otro: {
    accent: '#C5562C',
    accent2: '#A8451F',
    accentSoft: '#F1D9CC',
    accentBlush: '#FAEFEA',
  },
} as const;

export function getAccentVars(tipoNegocio: string | null | undefined): CSSProperties {
  const accent = ACCENTS[tipoNegocio as keyof typeof ACCENTS] ?? ACCENTS.otro;
  return {
    ['--gestori-accent' as string]: accent.accent,
    ['--gestori-accent-2' as string]: accent.accent2,
    ['--gestori-accent-soft' as string]: accent.accentSoft,
    ['--gestori-accent-blush' as string]: accent.accentBlush,
  } as CSSProperties;
}
