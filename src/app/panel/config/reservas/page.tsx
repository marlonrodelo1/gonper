import { asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { horarios, salones } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { Icon } from '@/app/panel/_components/icons';

import {
  actualizarProgramacionReservas,
} from '@/app/panel/config/actions';
import {
  agregarTramo,
  eliminarTramo,
} from '@/app/panel/config/horario/actions';

import { WeekGrid } from './week-grid';

type CurrentSalon = { id: string; slug?: string } | null;

const DIAS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

const inputClass =
  'w-full bg-paper border border-line rounded-2xl px-4 py-3 text-[14px] text-ink placeholder:text-stone/50 focus:outline-none focus:border-line-2';
const selectClass =
  'w-full bg-paper border border-line rounded-2xl px-4 py-3 text-[14px] text-ink focus:outline-none focus:border-line-2 appearance-none';
const labelClass = 'text-[11px] uppercase tracking-[0.2em] text-stone/80';

function fmtTime(t: string): string {
  return t.length >= 5 ? t.slice(0, 5) : t;
}

export default async function ReservasConfigPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const params = await searchParams;
  const current = (await getCurrentSalon()) as CurrentSalon;

  if (!current) {
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

  const [salonRow] = await db
    .select({
      id: salones.id,
      slotIntervalMin: salones.slotIntervalMin,
      leadTimeMin: salones.leadTimeMin,
      maxAdvanceDays: salones.maxAdvanceDays,
      bufferMin: salones.bufferMin,
    })
    .from(salones)
    .where(eq(salones.id, current.id))
    .limit(1);

  const tramos = await db
    .select()
    .from(horarios)
    .where(eq(horarios.salonId, current.id))
    .orderBy(asc(horarios.diaSemana), asc(horarios.inicio));

  const tramosPorDia = new Map<number, typeof tramos>();
  for (const t of tramos) {
    const arr = tramosPorDia.get(t.diaSemana) ?? [];
    arr.push(t);
    tramosPorDia.set(t.diaSemana, arr);
  }

  const slotIntervalActual = salonRow?.slotIntervalMin ?? 0; // 0 = auto
  const leadTimeActual = salonRow?.leadTimeMin ?? 5;
  const maxAdvanceActual = salonRow?.maxAdvanceDays ?? 90;
  const bufferActual = salonRow?.bufferMin ?? 0;

  return (
    <div className="flex w-full flex-col gap-4">
      {params.ok ? (
        <div className="flex items-center gap-2 rounded-xl border border-sage/40 bg-sage-soft px-4 py-3 text-[13px] text-sage-deep">
          <Icon.Check width="14" height="14" />
          Cambios guardados correctamente.
        </div>
      ) : null}
      {params.error ? (
        <div
          className="rounded-xl border bg-[#F1D6D6] px-4 py-3 text-[13px] text-[#7C2E2E]"
          style={{ borderColor: 'rgba(177,72,72,0.4)' }}
        >
          {params.error}
        </div>
      ) : null}

      <header className="px-1 py-1">
        <p className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
          Reservas
        </p>
        <h1 className="tight mt-1 text-[22px] font-medium text-ink">
          Disponibilidad y programación
        </h1>
        <p className="mt-1 text-[13px] text-stone">
          Cuándo abres y cómo se ofrecen los huecos a tus clientes.
        </p>
      </header>

      {/* ============================================
          1. DISPONIBILIDAD (horarios semanales)
          ============================================ */}
      <section className="card flex flex-col gap-5 p-5 md:p-7">
        <header className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
            Horario semanal
          </span>
          <h2 className="tight text-[19px] font-medium text-ink">
            ¿Cuándo abres?
          </h2>
          <p className="text-[13px] text-stone">
            Define los bloques de cada día. Si abres mañana y tarde, añade dos
            tramos. Los días sin tramos se consideran cerrados.
          </p>
        </header>

        <WeekGrid
          tramos={tramos.map((t) => ({
            diaSemana: t.diaSemana,
            inicio: t.inicio,
            fin: t.fin,
          }))}
        />

        <div className="card-tight flex flex-col divide-y divide-line/70 overflow-hidden p-0">
          {DIAS.map((dia) => {
            const lista = tramosPorDia.get(dia.value) ?? [];
            return (
              <div
                key={dia.value}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="tight w-24 text-[13.5px] font-medium text-ink">
                  {dia.label}
                </span>
                {lista.length === 0 ? (
                  <span className="font-serif-it text-[13px] text-stone/70">
                    cerrado
                  </span>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    {lista.map((t) => (
                      <div
                        key={t.id}
                        className="tabular flex items-center gap-2 rounded-full border border-line bg-cream px-3 py-1 font-mono text-[12px] text-ink"
                      >
                        <span>
                          {fmtTime(t.inicio)} – {fmtTime(t.fin)}
                        </span>
                        <form action={eliminarTramo}>
                          <input type="hidden" name="id" value={t.id} />
                          <button
                            type="submit"
                            aria-label="Eliminar tramo"
                            className="text-[#B14848] hover:text-[#7C2E2E]"
                          >
                            <Icon.X width="11" height="11" />
                          </button>
                        </form>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <form
          action={agregarTramo}
          className="grid grid-cols-1 items-end gap-2.5 sm:grid-cols-[1fr_auto_auto_auto]"
        >
          <div className="flex flex-col gap-1">
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
          <div className="flex flex-col gap-1">
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
          <div className="flex flex-col gap-1">
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
            className="gloss-btn tight rounded-full px-4 py-2.5 text-[13px] font-medium"
          >
            Añadir tramo
          </button>
        </form>
      </section>

      {/* ============================================
          2. PROGRAMACIÓN (slot interval, lead time, etc.)
          ============================================ */}
      <section className="card flex flex-col gap-5 p-5 md:p-7">
        <header className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
            Programación
          </span>
          <h2 className="tight text-[19px] font-medium text-ink">
            Cómo se ofrecen los huecos
          </h2>
          <p className="text-[13px] text-stone">
            Controla la granularidad y los límites de las reservas online.
          </p>
        </header>

        <form
          action={actualizarProgramacionReservas}
          className="flex flex-col gap-5"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="slot_interval_min" className={labelClass}>
                Cada cuánto ofrecer turnos
              </label>
              <select
                id="slot_interval_min"
                name="slot_interval_min"
                defaultValue={String(slotIntervalActual)}
                className={selectClass}
              >
                <option value="0">Auto (según duración del servicio)</option>
                <option value="15">Cada 15 minutos</option>
                <option value="30">Cada 30 minutos</option>
                <option value="60">Cada hora</option>
              </select>
              <p className="text-[12px] text-stone/80">
                <strong>Auto</strong> (recomendado): 15 min para servicios cortos,
                30 min para los de hasta 1h, 60 min para los más largos. Si lo
                fuerzas a 60, los servicios cortos saldrán cada hora.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="lead_time_min" className={labelClass}>
                Antelación mínima
              </label>
              <select
                id="lead_time_min"
                name="lead_time_min"
                defaultValue={String(leadTimeActual)}
                className={selectClass}
              >
                <option value="5">5 minutos (casi inmediato)</option>
                <option value="30">30 minutos</option>
                <option value="60">1 hora</option>
                <option value="120">2 horas</option>
                <option value="240">4 horas</option>
                <option value="1440">24 horas (un día completo)</option>
              </select>
              <p className="text-[12px] text-stone/80">
                Tiempo mínimo que necesitas entre que reservan y la cita.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="max_advance_days" className={labelClass}>
                Antelación máxima
              </label>
              <select
                id="max_advance_days"
                name="max_advance_days"
                defaultValue={String(maxAdvanceActual)}
                className={selectClass}
              >
                <option value="7">7 días</option>
                <option value="14">14 días</option>
                <option value="30">30 días</option>
                <option value="60">60 días</option>
                <option value="90">90 días</option>
                <option value="180">180 días</option>
                <option value="365">1 año</option>
              </select>
              <p className="text-[12px] text-stone/80">
                Cuánto se puede ver en el calendario hacia adelante.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="buffer_min" className={labelClass}>
                Tiempo entre citas (buffer)
              </label>
              <select
                id="buffer_min"
                name="buffer_min"
                defaultValue={String(bufferActual)}
                className={selectClass}
              >
                <option value="0">Sin buffer (citas pegadas)</option>
                <option value="5">5 minutos</option>
                <option value="10">10 minutos</option>
                <option value="15">15 minutos</option>
                <option value="30">30 minutos</option>
                <option value="60">1 hora</option>
              </select>
              <p className="text-[12px] text-stone/80">
                Tiempo libre obligatorio después de cada cita (limpieza,
                preparación, descanso).
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="gloss-btn tight rounded-full px-5 py-2.5 text-[13px] font-medium"
            >
              Guardar cambios
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
