import Link from 'next/link';
import { and, asc, eq, gte, lte } from 'drizzle-orm';

import { db } from '@/lib/db';
import { citas, clientes, profesionales, servicios } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';

import { estadoMeta, type EstadoCita } from '@/app/panel/_components/cita-row';
import { Icon } from '@/app/panel/_components/icons';

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
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="card mx-auto flex max-w-2xl flex-col items-center gap-3 p-6 text-center md:p-10">
          <h1 className="tight text-[24px] font-medium text-ink md:text-[28px]">
            Configura tu salón
          </h1>
          <p className="max-w-md text-[14px] text-stone">
            Aún no tienes un salón asociado a tu cuenta.
          </p>
        </div>
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
    const primero = new Date(lunes.getFullYear(), lunes.getMonth(), 1);
    params.set('fecha', toISODate(primero));
    if (profesionalSeleccionado)
      params.set('profesional', profesionalSeleccionado);
    return `/panel/agenda?${params.toString()}`;
  })();

  return (
    <div className="flex flex-col gap-6 px-4 py-4 md:px-8 md:py-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
            Agenda
          </p>
          <h1 className="tight mt-1 text-[22px] font-medium text-ink md:text-[28px]">
            {rango}{' '}
            <span className="font-serif-it text-stone/70">· {salon.nombre}</span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleVista activo="semana" hrefSemana={hrefVistaSemana} hrefMes={hrefVistaMes} />
          <Link
            href="/panel/citas/nueva"
            className="gloss-btn tight inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] text-cream"
          >
            <Icon.Plus width="13" height="13" />
            Nueva cita
          </Link>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap items-center gap-2">
          <Link
            href={buildHref(semanaAnterior)}
            className="card-tight tight px-3 py-2 text-[13px] text-ink transition hover:bg-paper"
          >
            ← Anterior
          </Link>
          <Link
            href={buildHref(semanaHoy)}
            className="card-tight tight px-3 py-2 text-[13px] text-ink transition hover:bg-paper"
          >
            Hoy
          </Link>
          <Link
            href={buildHref(semanaSiguiente)}
            className="card-tight tight px-3 py-2 text-[13px] text-ink transition hover:bg-paper"
          >
            Siguiente →
          </Link>
        </nav>

        <form
          method="GET"
          action="/panel/agenda"
          className="flex flex-wrap items-center gap-2"
        >
          <input type="hidden" name="semana" value={toISODate(lunes)} />
          <label
            htmlFor="profesional"
            className="text-[12px] uppercase tracking-[0.18em] text-stone/70"
          >
            Profesional
          </label>
          <select
            id="profesional"
            name="profesional"
            defaultValue={profesionalSeleccionado ?? 'todos'}
            className="rounded-full border border-line bg-paper px-4 py-2 text-[13px] text-ink"
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
            className="card-tight tight px-3 py-2 text-[13px] text-ink hover:bg-paper"
          >
            Filtrar
          </button>
        </form>
      </div>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-7">
        {dias.map((dia, idx) => {
          const esHoy = mismoDia(dia, hoy);
          const items = citasPorDia[idx];
          return (
            <div key={idx} className="card flex flex-col overflow-hidden">
              <div
                className={`tight border-b border-line bg-cream/40 px-3 py-2.5 text-[13px] font-medium ${
                  esHoy ? 'text-terracotta' : 'text-ink'
                }`}
              >
                {formatearDiaCorto(dia)}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-2">
                {items.length === 0 ? (
                  <p className="px-1 py-2 text-[12px] italic text-stone/60">
                    Sin citas
                  </p>
                ) : (
                  items.map(({ cita, cliente, servicio, profesional }) => {
                    const m =
                      estadoMeta[cita.estado as EstadoCita] ??
                      estadoMeta.pendiente;
                    const hora = formatearHora(cita.inicio, timezone);
                    const colorProfesional =
                      profesional.colorHex ?? '#3b82f6';
                    return (
                      <Link
                        key={cita.id}
                        href={`/panel/citas/${cita.id}`}
                        className="block rounded-xl border border-line bg-paper p-2.5 transition hover:bg-cream"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="tabular font-mono text-[13px] text-ink">
                            {hora}
                          </span>
                          <span
                            className="pill"
                            style={{ background: m.bg, color: m.fg }}
                          >
                            <span
                              className="pill-dot"
                              style={{ background: m.dot }}
                            />
                            {m.label}
                          </span>
                        </div>
                        <div className="tight mt-1 truncate text-[13px] text-ink">
                          {cliente.nombre}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-stone">
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
        <ResumenCard label="Citas en la semana" value={`${totalSemana}`} />
        <ResumenCard
          label="Facturado (completadas)"
          value={`${facturado.toFixed(0)} €`}
        />
        <ResumenCard label="No-shows" value={`${noShows}`} />
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

  const inicioGrid = inicioDeSemana(primerDiaMes);
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

  const citasPorDia: Record<string, typeof filas> = {};
  for (const f of filas) {
    const k = toISODate(f.cita.inicio);
    if (!citasPorDia[k]) citasPorDia[k] = [];
    citasPorDia[k].push(f);
  }

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
    <div className="flex flex-col gap-6 px-4 py-4 md:px-8 md:py-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
            Agenda
          </p>
          <h1 className="tight mt-1 text-[22px] font-medium text-ink md:text-[28px]">
            {formatearMesAno(primerDiaMes)}{' '}
            <span className="font-serif-it text-stone/70">· {salon.nombre}</span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleVista activo="mes" hrefSemana={hrefVistaSemana} hrefMes={hrefVistaMes} />
          <Link
            href="/panel/citas/nueva"
            className="gloss-btn tight inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] text-cream"
          >
            <Icon.Plus width="13" height="13" />
            Nueva cita
          </Link>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap items-center gap-2">
          <Link
            href={buildHref(mesAnterior)}
            className="card-tight tight px-3 py-2 text-[13px] text-ink transition hover:bg-paper"
          >
            ← Anterior
          </Link>
          <Link
            href={buildHref(mesHoy)}
            className="card-tight tight px-3 py-2 text-[13px] text-ink transition hover:bg-paper"
          >
            Hoy
          </Link>
          <Link
            href={buildHref(mesSiguiente)}
            className="card-tight tight px-3 py-2 text-[13px] text-ink transition hover:bg-paper"
          >
            Siguiente →
          </Link>
        </nav>

        <form
          method="GET"
          action="/panel/agenda"
          className="flex flex-wrap items-center gap-2"
        >
          <input type="hidden" name="vista" value="mes" />
          <input type="hidden" name="fecha" value={toISODate(primerDiaMes)} />
          <label
            htmlFor="profesional"
            className="text-[12px] uppercase tracking-[0.18em] text-stone/70"
          >
            Profesional
          </label>
          <select
            id="profesional"
            name="profesional"
            defaultValue={profesionalSeleccionado ?? 'todos'}
            className="rounded-full border border-line bg-paper px-4 py-2 text-[13px] text-ink"
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
            className="card-tight tight px-3 py-2 text-[13px] text-ink hover:bg-paper"
          >
            Filtrar
          </button>
        </form>
      </div>

      {/* Calendario */}
      <section className="card overflow-hidden">
        <div className="overflow-x-auto">
        <div className="grid min-w-[640px] grid-cols-7 border-b border-line bg-cream/40">
          {NOMBRES_DIAS_CORTOS.map((d) => (
            <div
              key={d}
              className="px-2 py-2.5 text-center text-[11px] uppercase tracking-[0.18em] text-stone/70"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid min-w-[640px] grid-cols-7">
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
                  className={`min-h-[110px] border-r border-b border-line p-1.5 transition-colors hover:bg-paper ${
                    dIdx === 6 ? 'border-r-0' : ''
                  } ${sIdx === 5 ? 'border-b-0' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`tabular inline-flex size-6 items-center justify-center rounded-full text-[11px] font-medium ${
                        esHoy
                          ? 'bg-terracotta/15 text-terracotta ring-2 ring-terracotta'
                          : esDelMes
                            ? 'text-ink'
                            : 'text-stone/30'
                      }`}
                    >
                      {dia.getDate()}
                    </span>
                    {items.length > 3 && (
                      <span className="text-[10px] text-stone/60">
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
                          className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px] hover:bg-cream"
                          style={{
                            borderLeft: `3px solid ${colorProfesional}`,
                          }}
                        >
                          <span className="tabular font-mono text-ink">
                            {hora}
                          </span>
                          <span className="truncate text-stone">
                            {cliente.nombre}
                          </span>
                        </Link>
                      );
                    })}
                    {restantes > 0 && (
                      <Link
                        href={`/panel/citas?fecha=${key}`}
                        className="px-1 py-0.5 text-[10px] font-medium text-terracotta hover:underline"
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
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ResumenCard label="Citas en el mes" value={`${totalMes}`} />
        <ResumenCard
          label="Facturado (completadas)"
          value={`${facturadoMes.toFixed(0)} €`}
        />
        <ResumenCard label="No-shows" value={`${noShowsMes}`} />
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
    'tight inline-flex items-center justify-center rounded-full px-3.5 py-1.5 text-[12px] transition';
  const activoCls = 'bg-ink text-cream';
  const inactivoCls = 'text-stone hover:text-ink';
  return (
    <div className="flex items-center gap-1 rounded-full border border-line bg-cream p-1 text-[12px]">
      <Link
        href={hrefSemana}
        className={`${baseCls} ${activo === 'semana' ? activoCls : inactivoCls}`}
      >
        Semana
      </Link>
      <Link
        href={hrefMes}
        className={`${baseCls} ${activo === 'mes' ? activoCls : inactivoCls}`}
      >
        Mes
      </Link>
    </div>
  );
}

function ResumenCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="card p-5">
      <div className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
        {label}
      </div>
      <p
        className="tight tabular mt-2 font-medium text-ink"
        style={{ fontSize: '28px', lineHeight: 1 }}
      >
        {value}
      </p>
    </div>
  );
}
