import { asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { cierres } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { agregarCierre } from './actions';
import { EliminarCierreButton } from './eliminar-button';

type CurrentSalon = { id: string; timezone: string } | null;

const inputClass =
  'w-full bg-paper border border-line rounded-2xl px-4 py-3 text-[14px] text-ink focus:outline-none focus:border-line-2';
const labelClass =
  'text-[11px] uppercase tracking-[0.2em] text-stone/80';

export default async function CierresPage({
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

  const filas = await db
    .select()
    .from(cierres)
    .where(eq(cierres.salonId, salon.id))
    .orderBy(asc(cierres.fechaInicio));

  const tz = salon.timezone || 'Europe/Madrid';
  const fechaFmt = new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
  });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
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
            Cierres y vacaciones
          </span>
          <h2 className="tight text-[20px] font-medium text-ink">
            Días en los que el salón estará cerrado
          </h2>
          <p className="text-[13px] text-stone">
            El agente no aceptará citas en esos rangos.
          </p>
        </header>

        {filas.length === 0 ? (
          <div className="card-tight flex flex-col items-center justify-center gap-2 border-dashed p-10 text-center">
            <p className="tight text-[15px] font-medium text-ink">
              Sin cierres programados
            </p>
            <p className="max-w-sm text-[12.5px] text-stone">
              Añade vacaciones, festivos o cierres puntuales.
            </p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-line/70">
            <div className="grid grid-cols-[1fr_1fr_1.2fr_120px] gap-3 bg-cream/40 px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-stone/70">
              <div>Desde</div>
              <div>Hasta</div>
              <div>Motivo</div>
              <div className="text-right">Acciones</div>
            </div>
            {filas.map((c) => {
              const desde = fechaFmt.format(c.fechaInicio);
              const hasta = fechaFmt.format(c.fechaFin);
              return (
                <div
                  key={c.id}
                  className="grid grid-cols-[1fr_1fr_1.2fr_120px] items-center gap-3 px-4 py-3.5"
                >
                  <div className="tabular font-mono text-[13px] text-ink">
                    {desde}
                  </div>
                  <div className="tabular font-mono text-[13px] text-ink">
                    {hasta}
                  </div>
                  <div className="text-[13px] text-stone">
                    {c.motivo ?? <span className="text-stone/50">—</span>}
                  </div>
                  <div className="text-right">
                    <EliminarCierreButton
                      id={c.id}
                      resumen={`${desde} → ${hasta}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="rule" />

        <div className="flex flex-col gap-3">
          <h3 className="tight text-[15px] font-medium text-ink">
            Añadir cierre
          </h3>
          <form
            action={agregarCierre}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="fecha_inicio" className={labelClass}>
                Desde
              </label>
              <input
                id="fecha_inicio"
                name="fecha_inicio"
                type="datetime-local"
                required
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="fecha_fin" className={labelClass}>
                Hasta
              </label>
              <input
                id="fecha_fin"
                name="fecha_fin"
                type="datetime-local"
                required
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label htmlFor="motivo" className={labelClass}>
                Motivo (opcional)
              </label>
              <input
                id="motivo"
                name="motivo"
                maxLength={200}
                placeholder="Ej. Vacaciones de verano"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                className="gloss-btn tight rounded-full px-5 py-3 text-[13.5px] font-medium"
              >
                Añadir cierre
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
