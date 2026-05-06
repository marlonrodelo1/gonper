import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { profesionales, salones, servicios } from '@/lib/db/schema';
import { calcularSlots } from '@/lib/agenda/slots';
import { getAccentVars } from '@/lib/salon-publico/accent';

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
  const styleVars = getAccentVars(salon.tipoNegocio);

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

  let slots: Date[] | null = null;
  let servicioSel: typeof serviciosActivos[number] | null = null;
  let profesionalSel: typeof profesionalesActivos[number] | null = null;

  if (sp.servicio && sp.profesional && sp.fecha && isValidISODate(sp.fecha)) {
    servicioSel =
      serviciosActivos.find((s) => s.id === sp.servicio) ?? null;
    profesionalSel =
      profesionalesActivos.find((p) => p.id === sp.profesional) ?? null;

    if (servicioSel && profesionalSel) {
      const fechaBase = new Date(`${sp.fecha}T12:00:00.000Z`);
      slots = await calcularSlots({
        salonId: salon.id,
        profesionalId: profesionalSel.id,
        duracionMin: servicioSel.duracionMin,
        fecha: fechaBase,
        timezone: tz,
      });

      const ahora = new Date();
      slots = slots.filter((s) => s.getTime() > ahora.getTime());
    }
  }

  return (
    <div style={styleVars} className="bg-cream text-ink min-h-screen">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10 sm:py-14">
        <header className="flex flex-col gap-3">
          <Link
            href={`/s/${salon.slug}`}
            className="text-[14px] text-stone hover:text-ink transition w-fit"
          >
            ← Volver a {salon.nombre}
          </Link>
          <h1
            className="tight font-medium text-ink"
            style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
          >
            Reservar en <span className="font-serif-it">{salon.nombre}</span>
          </h1>
        </header>

        {sp.error && (
          <div
            className="rounded-2xl px-4 py-3 text-[14px] border"
            style={{
              background: 'var(--gomper-accent-blush)',
              borderColor: 'var(--gomper-accent-soft)',
              color: 'var(--gomper-accent-2)',
            }}
          >
            {sp.error}
          </div>
        )}

        <form
          method="GET"
          action={`/s/${salon.slug}/reservar`}
          className="flex flex-col gap-4 rounded-3xl border border-line bg-paper p-5 sm:p-6"
        >
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="servicio"
              className="text-[13px] uppercase tracking-[0.18em] text-stone/80"
            >
              Servicio
            </label>
            <select
              id="servicio"
              name="servicio"
              required
              defaultValue={sp.servicio ?? ''}
              className="h-11 rounded-xl border border-line bg-paper px-3 text-[15px] text-ink focus:outline-none focus:border-ink/30 focus:ring-2 focus:ring-[color:var(--gomper-accent-soft)]"
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
              className="text-[13px] uppercase tracking-[0.18em] text-stone/80"
            >
              Profesional
            </label>
            <select
              id="profesional"
              name="profesional"
              required
              defaultValue={sp.profesional ?? ''}
              className="h-11 rounded-xl border border-line bg-paper px-3 text-[15px] text-ink focus:outline-none focus:border-ink/30 focus:ring-2 focus:ring-[color:var(--gomper-accent-soft)]"
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
              className="text-[13px] uppercase tracking-[0.18em] text-stone/80"
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
              className="h-11 rounded-xl border border-line bg-paper px-3 text-[15px] text-ink focus:outline-none focus:border-ink/30 focus:ring-2 focus:ring-[color:var(--gomper-accent-soft)]"
            />
          </div>

          <button
            type="submit"
            className="mt-1 inline-flex h-12 items-center justify-center rounded-full px-5 text-[15px] font-medium accent-btn"
          >
            Ver huecos disponibles
          </button>
        </form>

        {slots !== null && servicioSel && profesionalSel && (
          <section className="rounded-3xl border border-line bg-paper p-5 sm:p-6">
            <h2 className="text-[14px] uppercase tracking-[0.22em] text-stone/80">
              Huecos disponibles
            </h2>
            <p className="mt-2 text-[14px] text-stone">
              {servicioSel.nombre} · {profesionalSel.nombre} ·{' '}
              {new Intl.DateTimeFormat('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                timeZone: tz,
              }).format(new Date(`${sp.fecha}T12:00:00.000Z`))}
            </p>

            {slots.length === 0 ? (
              <p className="mt-5 text-[15px] text-stone">
                No hay huecos disponibles ese día. Prueba otra fecha.
              </p>
            ) : (
              <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
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
                      className="inline-flex items-center justify-center rounded-xl border border-line bg-paper px-3 py-2.5 text-[15px] font-medium tabular-nums text-ink transition hover:border-[color:var(--gomper-accent)] hover:text-[color:var(--gomper-accent-2)]"
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
