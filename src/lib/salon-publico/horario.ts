import 'server-only';

/**
 * Helpers para calcular el estado horario del salón (abierto/cerrado,
 * próxima apertura, texto del horario de hoy). Compartidos entre la
 * página pública del salón y la tienda, para que el hero se vea igual
 * en ambas.
 */

const DIA_NOMBRES_CORTO = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
] as const;

export type Tramo = { inicio: string; fin: string };
export type HorarioSemana = { dia: number; tramos: Tramo[] };

export function getDiaActualEnTz(tz: string): number {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' });
  const w = fmt.format(new Date());
  const map: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return map[w] ?? new Date().getDay();
}

function minutosEnTz(tz: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return h * 60 + m;
}

function hhmmToMin(hhmmss: string): number {
  const [h, m] = hhmmss.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function nombreDiaCorto(d: number): string {
  return DIA_NOMBRES_CORTO[d] ?? 'día';
}

export type EstadoHorario = {
  abierto: boolean;
  estadoTexto: string;
  horarioHoyTexto: string;
  diaActual: number;
  diasCerrados: number[];
  horariosSemana: HorarioSemana[];
};

/**
 * A partir de los tramos de horario (filas crudas de la tabla `horarios`),
 * calcula todo lo que el Hero necesita mostrar: si está abierto ahora,
 * texto de estado ("Cierra a las 20:00" / "Abre lunes 10:00"), etc.
 */
export function calcularEstadoHorario(
  tramos: Array<{ diaSemana: number; inicio: unknown; fin: unknown }>,
  timezone: string,
): EstadoHorario {
  const tz = timezone || 'Europe/Madrid';

  const horarioPorDia: Record<number, Tramo[]> = {
    0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [],
  };
  for (const t of tramos) {
    horarioPorDia[t.diaSemana]?.push({
      inicio: String(t.inicio),
      fin: String(t.fin),
    });
  }

  const horariosSemana: HorarioSemana[] = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
    dia: d,
    tramos: horarioPorDia[d] ?? [],
  }));

  const diasCerrados = horariosSemana
    .filter((h) => h.tramos.length === 0)
    .map((h) => h.dia);

  const diaActual = getDiaActualEnTz(tz);
  const ahoraMin = minutosEnTz(tz);
  const tramosHoy = horarioPorDia[diaActual] ?? [];

  let abierto = false;
  let cierraA: string | null = null;
  for (const t of tramosHoy) {
    if (ahoraMin >= hhmmToMin(t.inicio) && ahoraMin < hhmmToMin(t.fin)) {
      abierto = true;
      cierraA = t.fin.slice(0, 5);
      break;
    }
  }

  let estadoTexto: string;
  if (abierto && cierraA) {
    estadoTexto = `Cierra a las ${cierraA}`;
  } else {
    const proxHoy = tramosHoy.find((t) => hhmmToMin(t.inicio) > ahoraMin);
    if (proxHoy) {
      estadoTexto = `Abre a las ${proxHoy.inicio.slice(0, 5)}`;
    } else {
      let next: { dia: number; inicio: string } | null = null;
      for (let i = 1; i <= 7; i++) {
        const dd = (diaActual + i) % 7;
        const tt = horarioPorDia[dd]?.[0];
        if (tt) {
          next = { dia: dd, inicio: tt.inicio };
          break;
        }
      }
      estadoTexto = next
        ? `Abre ${nombreDiaCorto(next.dia)} ${next.inicio.slice(0, 5)}`
        : 'Cerrado';
    }
  }

  const horarioHoyTexto =
    tramosHoy.length === 0
      ? 'Cerrado'
      : tramosHoy
          .map((t) => `${t.inicio.slice(0, 5)} – ${t.fin.slice(0, 5)}`)
          .join(' · ');

  return {
    abierto,
    estadoTexto,
    horarioHoyTexto,
    diaActual,
    diasCerrados,
    horariosSemana,
  };
}

export const TIPO_NEGOCIO_LABEL: Record<string, string> = {
  barberia: 'Barbería',
  peluqueria: 'Peluquería',
  estetica: 'Centro de estética',
  manicura: 'Centro de uñas',
  otro: 'Salón',
};

export const ACCENTS = {
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

export type TipoNegocioAccent = keyof typeof ACCENTS;
