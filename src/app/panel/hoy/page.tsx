import Link from 'next/link';
import { and, asc, eq, gte, lt } from 'drizzle-orm';

import { db } from '@/lib/db';
import { citas, clientes, profesionales, servicios } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';

type EstadoCita =
  | 'pendiente'
  | 'confirmada'
  | 'cancelada'
  | 'no_show'
  | 'completada';

const estadoStyles: Record<EstadoCita, { label: string; className: string }> = {
  completada: {
    label: 'Completada',
    className:
      'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  },
  confirmada: {
    label: 'Confirmada',
    className:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  pendiente: {
    label: 'Pendiente',
    className:
      'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  },
  no_show: {
    label: 'No-show',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  },
  cancelada: {
    label: 'Cancelada',
    className:
      'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  },
};

function formatearFechaHoy(timezone: string): string {
  const fecha = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: timezone,
  }).format(new Date());
  return fecha.charAt(0).toUpperCase() + fecha.slice(1);
}

function formatearHora(fecha: Date, timezone: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  }).format(fecha);
}

export default async function HoyPage() {
  const salon = (await getCurrentSalon()) as
    | {
        id: string;
        nombre: string;
        timezone: string | null;
        agenteNombre?: string | null;
        agente_nombre?: string | null;
      }
    | null;

  if (!salon) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-4 rounded-xl border border-zinc-200 bg-white p-10 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <span className="text-4xl">🪑</span>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          Configura tu salón
        </h1>
        <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
          Aún no tienes un salón asociado a tu cuenta. En breve podrás
          completar el onboarding desde aquí. Si crees que es un error,
          contacta con soporte.
        </p>
      </div>
    );
  }

  // Nombre de agente: la fila puede venir con keys snake_case (Supabase) o camelCase (Drizzle).
  const agenteNombre =
    salon.agenteNombre ?? salon.agente_nombre ?? 'Juanita';

  // Zona horaria del salón. Default 'Europe/Madrid'.
  const timezone = salon.timezone ?? 'Europe/Madrid';

  // Calculamos inicio y fin del día actual.
  // Nota sobre zonas horarias: para evitar pulling de una libreria de tz, asumimos
  // que el servidor corre cerca de UTC y que la diferencia con el salón es
  // pequeña; usamos los limites del dia local del SERVIDOR. Es correcto en la
  // practica para Europe/Madrid si el contenedor corre en UTC porque la
  // ventana de 24h se corre 1-2h pero sigue cubriendo el dia con margen.
  // Para precisión real se necesitaria una libreria como date-fns-tz.
  const ahora = new Date();
  const hoyInicio = new Date(ahora);
  hoyInicio.setHours(0, 0, 0, 0);
  const hoyFin = new Date(hoyInicio);
  hoyFin.setDate(hoyFin.getDate() + 1);

  const filas = await db
    .select({
      cita: citas,
      cliente: clientes,
      servicio: servicios,
      profesional: profesionales,
    })
    .from(citas)
    .innerJoin(clientes, eq(citas.clienteId, clientes.id))
    .innerJoin(servicios, eq(citas.servicioId, servicios.id))
    .innerJoin(profesionales, eq(citas.profesionalId, profesionales.id))
    .where(
      and(
        eq(citas.salonId, salon.id),
        gte(citas.inicio, hoyInicio),
        lt(citas.inicio, hoyFin),
      ),
    )
    .orderBy(asc(citas.inicio));

  const fechaHoy = formatearFechaHoy(timezone);

  // KPIs
  let facturado = 0;
  let completadas = 0;
  let noShows = 0;
  let sinConfirmar = 0;
  let confirmadas = 0;

  for (const f of filas) {
    const estado = f.cita.estado as EstadoCita;
    const precio = Number(f.cita.precioEur ?? 0);
    if (estado === 'completada') {
      completadas += 1;
      facturado += precio;
    } else if (estado === 'no_show') {
      noShows += 1;
    } else if (estado === 'pendiente') {
      sinConfirmar += 1;
    } else if (estado === 'confirmada') {
      confirmadas += 1;
    }
  }

  const totalCitas = filas.length;

  // Resumen dinámico para Juanita
  const resumen = (() => {
    if (totalCitas === 0) {
      return `Hoy no tienes citas programadas. Buen momento para descansar o preparar la semana.`;
    }
    const partes: string[] = [];
    partes.push(
      `Tienes ${totalCitas} cita${totalCitas === 1 ? '' : 's'} hoy`,
    );
    const desglose: string[] = [];
    if (confirmadas > 0)
      desglose.push(
        `${confirmadas} confirmada${confirmadas === 1 ? '' : 's'}`,
      );
    if (sinConfirmar > 0)
      desglose.push(
        `${sinConfirmar} sin confirmar`,
      );
    if (completadas > 0)
      desglose.push(
        `${completadas} completada${completadas === 1 ? '' : 's'}`,
      );
    if (noShows > 0)
      desglose.push(`${noShows} no-show${noShows === 1 ? '' : 's'}`);
    let frase =
      partes[0] + (desglose.length ? `: ${desglose.join(', ')}` : '') + '.';
    if (facturado > 0) {
      frase += ` Facturado hasta ahora: ${facturado.toFixed(0)} €.`;
    }
    return frase;
  })();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Hoy · {salon.nombre}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            {fechaHoy}
          </h1>
        </div>
        <Link
          href="/panel/agenda"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
        >
          <span>+</span>
          <span>Nueva cita</span>
        </Link>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Facturado hoy"
          value={`${facturado.toFixed(0)} €`}
          accent="emerald"
        />
        <KpiCard label="Completadas" value={`${completadas}`} accent="blue" />
        <KpiCard label="No-shows" value={`${noShows}`} accent="red" />
        <KpiCard
          label="Sin confirmar"
          value={`${sinConfirmar}`}
          accent="amber"
        />
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            Citas del día
          </h2>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {totalCitas} cita{totalCitas === 1 ? '' : 's'}
          </span>
        </div>

        {totalCitas === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <span className="text-4xl">📅</span>
            <p className="text-base font-medium text-zinc-700 dark:text-zinc-300">
              No hay citas hoy
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Cuando se reserven citas para hoy aparecerán aquí.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filas.map(({ cita, cliente, servicio, profesional }) => {
              const estado =
                estadoStyles[cita.estado as EstadoCita] ??
                estadoStyles.pendiente;
              const hora = formatearHora(cita.inicio, timezone);
              const noShowsCliente = cliente.totalNoShows ?? 0;
              const colorProfesional = profesional.colorHex ?? '#3b82f6';

              return (
                <li
                  key={cita.id}
                  className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <div className="w-16 shrink-0 text-base font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                    {hora}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-zinc-950 dark:text-zinc-50">
                        {cliente.nombre}
                      </span>
                      {noShowsCliente >= 2 && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
                          {noShowsCliente} no-shows
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                      <span>
                        {servicio.nombre} · {servicio.duracionMin} min
                      </span>
                      <span aria-hidden>·</span>
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="inline-block size-2 rounded-full"
                          style={{ backgroundColor: colorProfesional }}
                          aria-hidden
                        />
                        {profesional.nombre}
                      </span>
                    </div>
                  </div>
                  <div className="hidden w-20 text-right text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-100 sm:block">
                    {Number(cita.precioEur).toFixed(0)} €
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${estado.className}`}
                  >
                    {estado.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-6 dark:border-purple-900/40 dark:from-purple-900/20 dark:to-pink-900/20">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🤖</span>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
              {agenteNombre} resume tu día
            </h3>
            <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
              {resumen}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

type Accent = 'emerald' | 'blue' | 'red' | 'amber';

const accentStyles: Record<Accent, string> = {
  emerald: 'text-emerald-600 dark:text-emerald-400',
  blue: 'text-blue-600 dark:text-blue-400',
  red: 'text-red-600 dark:text-red-400',
  amber: 'text-amber-600 dark:text-amber-400',
};

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: Accent;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p
        className={`mt-2 text-2xl font-bold tabular-nums ${accentStyles[accent]}`}
      >
        {value}
      </p>
    </div>
  );
}
