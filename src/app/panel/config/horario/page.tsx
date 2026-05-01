import { asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { horarios } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { Icon } from '@/app/panel/_components/icons';
import { agregarTramo, eliminarTramo } from './actions';

type CurrentSalon = { id: string } | null;

// 0 = domingo, 1 = lunes, ..., 6 = sábado
const DIAS: { value: number; label: string }[] = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

function fmt(t: string) {
  return t.length >= 5 ? t.slice(0, 5) : t;
}

const inputClass =
  'w-full bg-paper border border-line rounded-2xl px-4 py-3 text-[14px] text-ink focus:outline-none focus:border-line-2';
const selectClass =
  'w-full bg-paper border border-line rounded-2xl px-4 py-3 text-[14px] text-ink focus:outline-none focus:border-line-2 appearance-none';
const labelClass =
  'text-[11px] uppercase tracking-[0.2em] text-stone/80';

export default async function HorarioPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const salon = (await getCurrentSalon()) as CurrentSalon;

  if (!salon) {
    return (
      <div className="card mx-auto flex max-w-2xl flex-col items-center gap-3 p-10 text-center">
        <h2 className="tight text-[22px] font-medium text-ink">
          Configura tu salón
        </h2>
        <p className="text-[14px] text-stone">
          Aún no tienes un salón asociado a tu cuenta.
        </p>
      </div>
    );
  }

  const tramos = await db
    .select()
    .from(horarios)
    .where(eq(horarios.salonId, salon.id))
    .orderBy(asc(horarios.diaSemana), asc(horarios.inicio));

  const tramosPorDia = new Map<number, typeof tramos>();
  for (const t of tramos) {
    const arr = tramosPorDia.get(t.diaSemana) ?? [];
    arr.push(t);
    tramosPorDia.set(t.diaSemana, arr);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      {params.error ? (
        <div
          className="rounded-xl border bg-[#F1D6D6] px-4 py-3 text-[13px] text-[#7C2E2E]"
          style={{ borderColor: 'rgba(177,72,72,0.4)' }}
        >
          {params.error}
        </div>
      ) : null}

      <section className="card flex flex-col gap-5 p-8">
        <header className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
            Horario semanal
          </span>
          <h2 className="tight text-[20px] font-medium text-ink">
            Tramos de apertura
          </h2>
          <p className="text-[13px] text-stone">
            Define cuándo está abierto cada día. Si abres mañana y tarde, añade
            dos tramos.
          </p>
        </header>

        <ul className="card-tight flex flex-col divide-y divide-line/70 overflow-hidden p-0">
          {DIAS.map((dia) => {
            const lista = tramosPorDia.get(dia.value) ?? [];
            return (
              <li
                key={dia.value}
                className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="tight w-24 text-[14px] font-medium text-ink">
                  {dia.label}
                </span>
                {lista.length === 0 ? (
                  <span className="font-serif-it text-[14px] text-stone/70">
                    cerrado
                  </span>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    {lista.map((t) => (
                      <div
                        key={t.id}
                        className="tabular flex items-center gap-2 rounded-full border border-line bg-cream px-3 py-1.5 font-mono text-[12.5px] text-ink"
                      >
                        <span>
                          {fmt(t.inicio)} – {fmt(t.fin)}
                        </span>
                        <form action={eliminarTramo}>
                          <input type="hidden" name="id" value={t.id} />
                          <button
                            type="submit"
                            aria-label="Eliminar tramo"
                            className="text-[#B14848] hover:text-[#7C2E2E]"
                          >
                            <Icon.X width="12" height="12" />
                          </button>
                        </form>
                      </div>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <div className="rule" />

        <div className="flex flex-col gap-3">
          <h3 className="tight text-[15px] font-medium text-ink">
            Añadir tramo
          </h3>
          <form
            action={agregarTramo}
            className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end"
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="dia_semana" className={labelClass}>
                Día
              </label>
              <select
                id="dia_semana"
                name="dia_semana"
                defaultValue="1"
                className={selectClass}
              >
                {DIAS.map((d) => (
                  <option key={d.value} value={String(d.value)}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="inicio" className={labelClass}>
                Inicio
              </label>
              <input
                id="inicio"
                name="inicio"
                type="time"
                required
                defaultValue="09:00"
                className={`${inputClass} sm:w-32`}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="fin" className={labelClass}>
                Fin
              </label>
              <input
                id="fin"
                name="fin"
                type="time"
                required
                defaultValue="14:00"
                className={`${inputClass} sm:w-32`}
              />
            </div>
            <button
              type="submit"
              className="gloss-btn tight rounded-full px-5 py-3 text-[13.5px] font-medium"
            >
              Añadir
            </button>
          </form>
        </div>

        <div
          className="rounded-xl border px-4 py-3 text-[13px]"
          style={{
            borderColor: 'rgba(197,142,44,0.4)',
            background: 'rgba(197,142,44,0.10)',
            color: '#7A5A1B',
          }}
        >
          <strong>Tip:</strong> si abres mañana y tarde, añade dos tramos para
          ese día.
        </div>
      </section>
    </div>
  );
}
