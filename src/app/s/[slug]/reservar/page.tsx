import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { profesionales, salones, servicios } from '@/lib/db/schema';
import { calcularSlots } from '@/lib/agenda/slots';

function formatPrecio(eur: string | number): string {
  const n = typeof eur === 'string' ? Number(eur) : eur;
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(n);
}

function formatDuracion(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

function todayISO(tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function isValidISODate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export default async function ReservarPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    servicio?: string;
    profesional?: string;
    fecha?: string;
    error?: string;
  }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const [salon] = await db
    .select()
    .from(salones)
    .where(eq(salones.slug, slug))
    .limit(1);

  if (!salon || !salon.activo) {
    notFound();
  }

  const tz = salon.timezone ?? 'Europe/Madrid';

  const [serviciosActivos, profesionalesActivos] = await Promise.all([
    db
      .select()
      .from(servicios)
      .where(and(eq(servicios.salonId, salon.id), eq(servicios.activo, true)))
      .orderBy(asc(servicios.orden), asc(servicios.createdAt)),
    db
      .select()
      .from(profesionales)
      .where(
        and(eq(profesionales.salonId, salon.id), eq(profesionales.activo, true)),
      )
      .orderBy(asc(profesionales.orden), asc(profesionales.nombre)),
  ]);

  const hoyISO = todayISO(tz);
  const maxISO = addDaysISO(hoyISO, 90);

  // Validar searchParams para mostrar slots
  let slots: Date[] | null = null;
  let servicioSel: typeof serviciosActivos[number] | null = null;
  let profesionalSel: typeof profesionalesActivos[number] | null = null;

  if (sp.servicio && sp.profesional && sp.fecha && isValidISODate(sp.fecha)) {
    servicioSel =
      serviciosActivos.find((s) => s.id === sp.servicio) ?? null;
    profesionalSel =
      profesionalesActivos.find((p) => p.id === sp.profesional) ?? null;

    if (servicioSel && profesionalSel) {
      // Construir fecha al mediodía local del salón para evitar issues TZ
      const fechaBase = new Date(`${sp.fecha}T12:00:00.000Z`);
      slots = await calcularSlots({
        salonId: salon.id,
        profesionalId: profesionalSel.id,
        duracionMin: servicioSel.duracionMin,
        fecha: fechaBase,
        timezone: tz,
      });

      // Filtrar slots en el pasado (si fecha = hoy)
      const ahora = new Date();
      slots = slots.filter((s) => s.getTime() > ahora.getTime());
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
        <header className="flex flex-col gap-2">
          <Link
            href={`/s/${salon.slug}`}
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            ← Volver
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-3xl">
            Reservar en {salon.nombre}
          </h1>
        </header>

        {sp.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {sp.error}
          </div>
        )}

        <form
          method="GET"
          action={`/s/${salon.slug}/reservar`}
          className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="servicio"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Servicio
            </label>
            <select
              id="servicio"
              name="servicio"
              required
              defaultValue={sp.servicio ?? ''}
              className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            >
              <option value="" disabled>
                Selecciona un servicio
              </option>
              {serviciosActivos.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} — {formatDuracion(s.duracionMin)} ·{' '}
                  {formatPrecio(s.precioEur)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="profesional"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Profesional
            </label>
            <select
              id="profesional"
              name="profesional"
              required
              defaultValue={sp.profesional ?? ''}
              className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            >
              <option value="" disabled>
                Selecciona un profesional
              </option>
              {profesionalesActivos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="fecha"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Fecha
            </label>
            <input
              id="fecha"
              name="fecha"
              type="date"
              required
              min={hoyISO}
              max={maxISO}
              defaultValue={sp.fecha ?? hoyISO}
              className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
          >
            Ver huecos disponibles
          </button>
        </form>

        {slots !== null && servicioSel && profesionalSel && (
          <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
              Huecos disponibles
            </h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {servicioSel.nombre} · {profesionalSel.nombre} ·{' '}
              {new Intl.DateTimeFormat('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                timeZone: tz,
              }).format(new Date(`${sp.fecha}T12:00:00.000Z`))}
            </p>

            {slots.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                No hay huecos disponibles ese día. Prueba otra fecha.
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {slots.map((slot) => {
                  const iso = slot.toISOString();
                  const horaTxt = new Intl.DateTimeFormat('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: tz,
                  }).format(slot);
                  const qs = new URLSearchParams({
                    slot: iso,
                    servicio: servicioSel.id,
                    profesional: profesionalSel.id,
                  });
                  return (
                    <Link
                      key={iso}
                      href={`/s/${salon.slug}/reservar/datos?${qs.toString()}`}
                      className="inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium tabular-nums text-zinc-800 shadow-sm transition-colors hover:border-purple-300 hover:bg-purple-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-purple-700 dark:hover:bg-purple-950/30"
                    >
                      {horaTxt}
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
