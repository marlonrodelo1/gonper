type Tramo = {
  diaSemana: number;
  inicio: string; // HH:mm:ss
  fin: string;
};

const DIAS = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
];

const HORAS = Array.from({ length: 14 }, (_, i) => 8 + i); // 8h - 21h

function toMinutos(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m ?? 0);
}

/**
 * Visualización del horario semanal: grid días × horas con bloques verdes
 * en las franjas con tramo activo. Read-only: la edición se hace abajo
 * con el form de añadir tramo.
 */
export function WeekGrid({ tramos }: { tramos: Tramo[] }) {
  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[560px] gap-y-0 rounded-2xl border border-line bg-paper text-[12px]"
        style={{
          gridTemplateColumns: '60px repeat(7, 1fr)',
        }}
      >
        {/* Cabecera días */}
        <div className="border-b border-line bg-cream/40" />
        {DIAS.map((d) => (
          <div
            key={d.value}
            className="border-b border-line bg-cream/40 px-2 py-2 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-stone/80"
          >
            {d.label}
          </div>
        ))}

        {/* Filas de horas */}
        {HORAS.map((h, idxH) => (
          <FilaHora
            key={h}
            hora={h}
            ultima={idxH === HORAS.length - 1}
            tramos={tramos}
          />
        ))}
      </div>
    </div>
  );
}

function FilaHora({
  hora,
  ultima,
  tramos,
}: {
  hora: number;
  ultima: boolean;
  tramos: Tramo[];
}) {
  const minInicio = hora * 60;
  const minFin = (hora + 1) * 60;
  return (
    <>
      <div
        className={`px-2 py-3 text-right font-mono text-[11px] tabular text-stone/70 ${
          ultima ? '' : 'border-b border-line/50'
        }`}
      >
        {String(hora).padStart(2, '0')}:00
      </div>
      {DIAS.map((d) => {
        const cubierto = tramos.some((t) => {
          if (t.diaSemana !== d.value) return false;
          const inicioMin = toMinutos(t.inicio);
          const finMin = toMinutos(t.fin);
          // celda cubierta si hay solapamiento ≥ 30 min
          return finMin > minInicio && inicioMin < minFin;
        });
        return (
          <div
            key={d.value}
            className={`${ultima ? '' : 'border-b border-line/50'} ${
              d.value === 0 ? '' : 'border-r border-line/50'
            } ${
              cubierto
                ? 'bg-sage/55'
                : ''
            }`}
            style={{ height: 32 }}
          />
        );
      })}
    </>
  );
}
