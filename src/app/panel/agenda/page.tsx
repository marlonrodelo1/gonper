import Link from 'next/link';
import { and, asc, eq, gte, lte } from 'drizzle-orm';

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

const NOMBRES_DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function parseFechaISO(s: string | undefined): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    12,
    0,
    0,
    0,
  );
  return isNaN(d.getTime()) ? null : d;
}

function inicioDeSemana(d: Date): Date {
  const dia = d.getDay(); // 0=dom, 1=lun
  const diff = dia === 0 ? -6 : 1 - dia; // ajustar a lunes
  const lunes = new Date(d);
  lunes.setHours(0, 0, 0, 0);
  lunes.setDate(d.getDate() + diff);
  return lunes;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function mismoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatearDiaCorto(d: Date): string {
  const idx = d.getDay() === 0 ? 6 : d.getDay() - 1;
  return `${NOMBRES_DIAS_CORTOS[idx]} ${d.getDate()}`;
}

function formatearRango(lunes: Date, domingo: Date): string {
  const fmtDia = (d: Date) =>
    new Intl.DateTimeFormat('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
    }).format(d);
  const a = fmtDia(lunes);
  const b = fmtDia(domingo);
  return `${a.charAt(0).toUpperCase() + a.slice(1)} – ${
    b.charAt(0).toUpperCase() + b.slice(1)
  }`;
}

function formatearMesAno(d: Date): string {
  const t = new Intl.DateTimeFormat('es-ES', {
    month: 'long',
    year: 'numeric',
  }).format(d);
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function formatearHora(fecha: Date, timezone: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  }).format(fecha);
}

type Vista = 'semana' | 'mes';

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{
    semana?: string;
    profesional?: string;
    vista?: string;
    fecha?: string;
  }>;
}) {
  const sp = await searchParams;
  const salon = (await getCurrentSalon()) as
    | {
        id: string;
        nombre: string;
        timezone: string | null;
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
          Aún no tienes un salón asociado a tu cuenta.
        </p>
      </div>
    );
  }

  const timezone = salon.timezone ?? 'Europe/Madrid';
  const vista: Vista = sp.vista === 'mes' ? 'mes' : 'semana';
  const hoy = new Date();

  const profesionalSeleccionado =
    sp.profesional && sp.profesional !== 'todos' ? sp.profesional : null;

  // Profesionales activos del salón para el filtro (común)
  const profesionalesSalon = await db
    .select()
    .from(profesionales)
    .where(
      and(
        eq(profesionales.salonId, salon.id),
        eq(profesionales.activo, true),
      ),
    )
    .orderBy(asc(profesionales.orden), asc(profesionales.nombre));

  if (vista === 'mes') {
    return (
      <VistaMes
        salon={salon}
        timezone={timezone}
        sp={sp}
        hoy={hoy}
        profesionalSeleccionado={profesionalSeleccionado}
        profesionalesSalon={profesionalesSalon}
      />
    );
  }

  // ----- Vista semanal (comportamiento original intacto) -----
  const fechaBase = parseFechaISO(sp.semana) ?? hoy;
  const lunes = inicioDeSemana(fechaBase);
  const domingo = addDays(lunes, 6);

  const semanaAnterior = toISODate(addDays(lunes, -7));
  const semanaSiguiente = toISODate(addDays(lunes, 7));
  const semanaHoy = toISODate(hoy);

  const finRango = new Date(domingo);
  finRango.setHours(23, 59, 59, 999);

  const condiciones = [
    eq(citas.salonId, salon.id),
    gte(citas.inicio, lunes),
    lte(citas.inicio, finRango),
  ];
  if (profesionalSeleccionado) {
    condiciones.push(eq(citas.profesionalId, profesionalSeleccionado));
  }

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
    .where(and(...condiciones))
    .orderBy(asc(citas.inicio));

  const dias: Date[] = Array.from({ length: 7 }, (_, i) => addDays(lunes, i));
  const citasPorDia: Record<number, typeof filas> = {};
  for (let i = 0; i < 7; i++) citasPorDia[i] = [];

  for (const f of filas) {
    for (let i = 0; i < 7; i++) {
      if (mismoDia(f.cita.inicio, dias[i])) {
        citasPorDia[i].push(f);
        break;
      }
    }
  }

  let facturado = 0;
  let noShows = 0;
  for (const f of filas) {
    const estado = f.cita.estado as EstadoCita;
    if (estado === 'completada') facturado += Number(f.cita.precioEur ?? 0);
    if (estado === 'no_show') noShows += 1;
  }
  const totalSemana = filas.length;

  const rango = formatearRango(lunes, domingo);

  const buildHref = (semanaISO: string) => {
    const params = new URLSearchParams();
    params.set('semana', semanaISO);
    if (profesionalSeleccionado)
      params.set('profesional', profesionalSeleccionado);
    return `/panel/agenda?${params.toString()}`;
  };

  // Hrefs del toggle semana/mes
  const hrefVistaSemana = (() => {
    const params = new URLSearchParams();
    params.set('semana', toISODate(lunes));
    if (profesionalSeleccionado)
      params.set('profesional', profesionalSeleccionado);
    return `/panel/agenda?${params.toString()}`;
  })();
  const hrefVistaMes = (() => {
    const params = new URLSearchParams();
    params.set('vista', 'mes');
    // usar primer día del mes que contiene a 'lunes'
    const primero = new Date(lunes.getFullYear(), lunes.getMonth(), 1);
    params.set('fecha', toISODate(primero));
    if (profesionalSeleccionado)
      params.set('profesional', profesionalSeleccionado);
    return `/panel/agenda?${params.toString()}`;
  })();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Agenda · {salon.nombre}
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              {rango}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ToggleVista activo="semana" hrefSemana={hrefVistaSemana} hrefMes={hrefVistaMes} />
            <Link
              href="/panel/citas/nueva"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
            >
              <span>+</span>
              <span>Nueva cita</span>
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex items-center gap-2">
            <Link
              href={buildHref(semanaAnterior)}
              className="inline-flex items-center rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              ← Semana anterior
            </Link>
            <Link
              href={buildHref(semanaHoy)}
              className="inline-flex items-center rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Hoy
            </Link>
            <Link
              href={buildHref(semanaSiguiente)}
              className="inline-flex items-center rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Semana siguiente →
            </Link>
          </nav>

          <form
            method="GET"
            action="/panel/agenda"
            className="flex items-center gap-2"
          >
            <input type="hidden" name="semana" value={toISODate(lunes)} />
            <label
              htmlFor="profesional"
              className="text-sm text-zinc-500 dark:text-zinc-400"
            >
              Profesional:
            </label>
            <select
              id="profesional"
              name="profesional"
              defaultValue={profesionalSeleccionado ?? 'todos'}
              className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
            >
              <option value="todos">Todos</option>
              {profesionalesSalon.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="inline-flex items-center rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Filtrar
            </button>
          </form>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-2 md:grid-cols-7">
        {dias.map((dia, idx) => {
          const esHoy = mismoDia(dia, hoy);
          const items = citasPorDia[idx];
          return (
            <div
              key={idx}
              className="flex flex-col rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div
                className={`rounded-t-xl border-b px-3 py-2 text-sm font-semibold ${
                  esHoy
                    ? 'border-purple-200 bg-purple-100 text-purple-900 dark:border-purple-900/40 dark:bg-purple-900/30 dark:text-purple-200'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300'
                }`}
              >
                {formatearDiaCorto(dia)}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-2">
                {items.length === 0 ? (
                  <p className="px-1 py-2 text-xs text-zinc-400 dark:text-zinc-500">
                    Sin citas
                  </p>
                ) : (
                  items.map(({ cita, cliente, servicio, profesional }) => {
                    const estado =
                      estadoStyles[cita.estado as EstadoCita] ??
                      estadoStyles.pendiente;
                    const hora = formatearHora(cita.inicio, timezone);
                    const colorProfesional =
                      profesional.colorHex ?? '#3b82f6';
                    return (
                      <Link
                        key={cita.id}
                        href={`/panel/citas/${cita.id}`}
                        className="block rounded-lg border border-zinc-200 bg-white p-2 text-left transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                            {hora}
                          </span>
                          <span
                            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${estado.className}`}
                          >
                            {estado.label}
                          </span>
                        </div>
                        <div className="mt-1 truncate text-sm font-medium text-zinc-950 dark:text-zinc-50">
                          {cliente.nombre}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                          <span
                            className="inline-block size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: colorProfesional }}
                            aria-hidden
                          />
                          <span className="truncate">{servicio.nombre}</span>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ResumenCard
          label="Citas en la semana"
          value={`${totalSemana}`}
          accent="blue"
        />
        <ResumenCard
          label="Facturado (completadas)"
          value={`${facturado.toFixed(0)} €`}
          accent="emerald"
        />
        <ResumenCard label="No-shows" value={`${noShows}`} accent="red" />
      </section>
    </div>
  );
}

// ============================================================
// Vista Mes
// ============================================================

async function VistaMes({
  salon,
  timezone,
  sp,
  hoy,
  profesionalSeleccionado,
  profesionalesSalon,
}: {
  salon: { id: string; nombre: string; timezone: string | null };
  timezone: string;
  sp: { fecha?: string; profesional?: string; vista?: string; semana?: string };
  hoy: Date;
  profesionalSeleccionado: string | null;
  profesionalesSalon: Array<{ id: string; nombre: string }>;
}) {
  // fecha base = primer día del mes que toca mostrar
  const fechaBase = parseFechaISO(sp.fecha) ?? hoy;
  const primerDiaMes = new Date(fechaBase.getFullYear(), fechaBase.getMonth(), 1, 12, 0, 0, 0);
  const ultimoDiaMes = new Date(
    fechaBase.getFullYear(),
    fechaBase.getMonth() + 1,
    0,
    12,
    0,
    0,
    0,
  );

  // Inicio de la rejilla = lunes anterior (o el mismo si ya es lunes)
  const inicioGrid = inicioDeSemana(primerDiaMes);
  // Fin de rejilla = domingo siguiente al último día. Forzamos 6 semanas (42 días).
  const finGrid = addDays(inicioGrid, 41);
  const finRango = new Date(finGrid);
  finRango.setHours(23, 59, 59, 999);

  const condiciones = [
    eq(citas.salonId, salon.id),
    gte(citas.inicio, inicioGrid),
    lte(citas.inicio, finRango),
  ];
  if (profesionalSeleccionado) {
    condiciones.push(eq(citas.profesionalId, profesionalSeleccionado));
  }

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
    .where(and(...condiciones))
    .orderBy(asc(citas.inicio));

  // Agrupar por clave YYYY-MM-DD
  const citasPorDia: Record<string, typeof filas> = {};
  for (const f of filas) {
    const k = toISODate(f.cita.inicio);
    if (!citasPorDia[k]) citasPorDia[k] = [];
    citasPorDia[k].push(f);
  }

  // Construir 6 semanas x 7 días
  const semanas: Date[][] = [];
  for (let s = 0; s < 6; s++) {
    const fila: Date[] = [];
    for (let d = 0; d < 7; d++) {
      fila.push(addDays(inicioGrid, s * 7 + d));
    }
    semanas.push(fila);
  }

  const mesAnterior = toISODate(addMonths(primerDiaMes, -1));
  const mesSiguiente = toISODate(addMonths(primerDiaMes, 1));
  const mesHoy = toISODate(new Date(hoy.getFullYear(), hoy.getMonth(), 1));

  const buildHref = (fechaISO: string) => {
    const params = new URLSearchParams();
    params.set('vista', 'mes');
    params.set('fecha', fechaISO);
    if (profesionalSeleccionado)
      params.set('profesional', profesionalSeleccionado);
    return `/panel/agenda?${params.toString()}`;
  };

  const hrefVistaSemana = (() => {
    const params = new URLSearchParams();
    // tomar el lunes que contenga al primer día del mes
    const lunesRef = inicioDeSemana(
      mismoDia(primerDiaMes, hoy) || (hoy >= primerDiaMes && hoy <= ultimoDiaMes)
        ? hoy
        : primerDiaMes,
    );
    params.set('semana', toISODate(lunesRef));
    if (profesionalSeleccionado)
      params.set('profesional', profesionalSeleccionado);
    return `/panel/agenda?${params.toString()}`;
  })();
  const hrefVistaMes = buildHref(toISODate(primerDiaMes));

  // Resumen del mes (sólo días dentro del mes actual)
  let totalMes = 0;
  let facturadoMes = 0;
  let noShowsMes = 0;
  for (const f of filas) {
    if (f.cita.inicio.getMonth() !== primerDiaMes.getMonth()) continue;
    if (f.cita.inicio.getFullYear() !== primerDiaMes.getFullYear()) continue;
    totalMes += 1;
    const estado = f.cita.estado as EstadoCita;
    if (estado === 'completada') facturadoMes += Number(f.cita.precioEur ?? 0);
    if (estado === 'no_show') noShowsMes += 1;
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Agenda · {salon.nombre}
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              {formatearMesAno(primerDiaMes)}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ToggleVista activo="mes" hrefSemana={hrefVistaSemana} hrefMes={hrefVistaMes} />
            <Link
              href="/panel/citas/nueva"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
            >
              <span>+</span>
              <span>Nueva cita</span>
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex items-center gap-2">
            <Link
              href={buildHref(mesAnterior)}
              className="inline-flex items-center rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              ← Mes anterior
            </Link>
            <Link
              href={buildHref(mesHoy)}
              className="inline-flex items-center rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Hoy
            </Link>
            <Link
              href={buildHref(mesSiguiente)}
              className="inline-flex items-center rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Mes siguiente →
            </Link>
          </nav>

          <form
            method="GET"
            action="/panel/agenda"
            className="flex items-center gap-2"
          >
            <input type="hidden" name="vista" value="mes" />
            <input type="hidden" name="fecha" value={toISODate(primerDiaMes)} />
            <label
              htmlFor="profesional"
              className="text-sm text-zinc-500 dark:text-zinc-400"
            >
              Profesional:
            </label>
            <select
              id="profesional"
              name="profesional"
              defaultValue={profesionalSeleccionado ?? 'todos'}
              className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
            >
              <option value="todos">Todos</option>
              {profesionalesSalon.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="inline-flex items-center rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Filtrar
            </button>
          </form>
        </div>
      </header>

      {/* Cabecera de días */}
      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
          {NOMBRES_DIAS_CORTOS.map((d) => (
            <div
              key={d}
              className="px-2 py-2 text-center text-xs font-semibold text-zinc-600 dark:text-zinc-400"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {semanas.flatMap((semana, sIdx) =>
            semana.map((dia, dIdx) => {
              const esDelMes =
                dia.getMonth() === primerDiaMes.getMonth() &&
                dia.getFullYear() === primerDiaMes.getFullYear();
              const esHoy = mismoDia(dia, hoy);
              const key = toISODate(dia);
              const items = citasPorDia[key] ?? [];
              const visibles = items.slice(0, 3);
              const restantes = items.length - visibles.length;

              return (
                <div
                  key={`${sIdx}-${dIdx}`}
                  title={
                    items.length > 0
                      ? `${items.length} cita${items.length === 1 ? '' : 's'}`
                      : 'Sin citas'
                  }
                  className={`group min-h-[100px] border-r border-b border-zinc-200 p-1.5 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/50 ${
                    esDelMes
                      ? 'bg-white dark:bg-zinc-950'
                      : 'bg-zinc-50/50 dark:bg-zinc-900/30'
                  } ${dIdx === 6 ? 'border-r-0' : ''} ${
                    sIdx === 5 ? 'border-b-0' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${
                        esHoy
                          ? 'ring-2 ring-purple-500 bg-purple-100 text-purple-900 dark:bg-purple-900/40 dark:text-purple-200'
                          : esDelMes
                            ? 'text-zinc-900 dark:text-zinc-100'
                            : 'text-zinc-400 dark:text-zinc-600'
                      }`}
                    >
                      {dia.getDate()}
                    </span>
                    {items.length > 3 && (
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        {items.length}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-col gap-0.5">
                    {visibles.map(({ cita, cliente, profesional }) => {
                      const colorProfesional =
                        profesional.colorHex ?? '#3b82f6';
                      const hora = formatearHora(cita.inicio, timezone);
                      return (
                        <Link
                          key={cita.id}
                          href={`/panel/citas/${cita.id}`}
                          className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px] hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          style={{
                            borderLeft: `3px solid ${colorProfesional}`,
                          }}
                        >
                          <span className="font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
                            {hora}
                          </span>
                          <span className="truncate text-zinc-600 dark:text-zinc-400">
                            {cliente.nombre}
                          </span>
                        </Link>
                      );
                    })}
                    {restantes > 0 && (
                      <Link
                        href={`/panel/citas?fecha=${key}`}
                        className="px-1 py-0.5 text-[10px] font-medium text-purple-600 hover:underline dark:text-purple-400"
                      >
                        +{restantes} más
                      </Link>
                    )}
                  </div>
                </div>
              );
            }),
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ResumenCard
          label="Citas en el mes"
          value={`${totalMes}`}
          accent="blue"
        />
        <ResumenCard
          label="Facturado (completadas)"
          value={`${facturadoMes.toFixed(0)} €`}
          accent="emerald"
        />
        <ResumenCard label="No-shows" value={`${noShowsMes}`} accent="red" />
      </section>
    </div>
  );
}

function ToggleVista({
  activo,
  hrefSemana,
  hrefMes,
}: {
  activo: Vista;
  hrefSemana: string;
  hrefMes: string;
}) {
  const baseCls =
    'inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium transition-colors';
  const activoCls =
    'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900';
  const inactivoCls =
    'bg-white text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900';
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800">
      <Link
        href={hrefSemana}
        className={`${baseCls} ${activo === 'semana' ? activoCls : inactivoCls}`}
      >
        Semana
      </Link>
      <Link
        href={hrefMes}
        className={`${baseCls} border-l border-zinc-200 dark:border-zinc-800 ${
          activo === 'mes' ? activoCls : inactivoCls
        }`}
      >
        Mes
      </Link>
    </div>
  );
}

type Accent = 'emerald' | 'blue' | 'red';

const accentStyles: Record<Accent, string> = {
  emerald: 'text-emerald-600 dark:text-emerald-400',
  blue: 'text-blue-600 dark:text-blue-400',
  red: 'text-red-600 dark:text-red-400',
};

function ResumenCard({
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
