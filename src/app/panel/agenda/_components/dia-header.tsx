const NOMBRES_DIAS_LARGOS = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];
const NOMBRES_DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function indiceLunes(d: Date): number {
  return d.getDay() === 0 ? 6 : d.getDay() - 1;
}

export type DiaHeaderProps = {
  fecha: Date;
  esHoy: boolean;
  /**
   * Variantes visuales:
   *  - "grid": header de columna en vista semana desktop (compacto, vertical).
   *  - "section": cabecera de sección en lista mobile (horizontal, prominente).
   */
  variant?: 'grid' | 'section';
  countCitas?: number;
};

export function DiaHeader({
  fecha,
  esHoy,
  variant = 'grid',
  countCitas,
}: DiaHeaderProps) {
  const idx = indiceLunes(fecha);
  const nombreCorto = NOMBRES_DIAS_CORTOS[idx];
  const nombreLargo = NOMBRES_DIAS_LARGOS[idx];
  const numero = fecha.getDate();

  if (variant === 'section') {
    return (
      <div className="flex items-baseline justify-between gap-3 px-1 pb-2">
        <div className="flex items-baseline gap-2.5">
          <span
            className={`tight tabular text-[26px] font-medium leading-none ${
              esHoy ? 'text-terracotta' : 'text-ink'
            }`}
          >
            {numero}
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-stone/70">
              {nombreLargo}
            </span>
            {esHoy && (
              <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-terracotta">
                Hoy
              </span>
            )}
          </div>
        </div>
        {typeof countCitas === 'number' && (
          <span className="text-[11px] tabular text-stone/70">
            {countCitas === 0
              ? 'Sin citas'
              : `${countCitas} cita${countCitas === 1 ? '' : 's'}`}
          </span>
        )}
      </div>
    );
  }

  // variant === 'grid'
  return (
    <div className="flex items-center justify-between gap-2 border-b border-line bg-cream/40 px-3 py-2.5">
      <div className="flex items-baseline gap-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-stone/70">
          {nombreCorto}
        </span>
        {esHoy ? (
          <span className="tabular inline-flex size-7 items-center justify-center rounded-full bg-terracotta text-[13px] font-medium leading-none text-cream">
            {numero}
          </span>
        ) : (
          <span className="tabular text-[18px] font-medium leading-none text-ink">
            {numero}
          </span>
        )}
      </div>
      {typeof countCitas === 'number' && countCitas > 0 && (
        <span className="tabular text-[10px] text-stone/60">
          {countCitas}
        </span>
      )}
    </div>
  );
}
