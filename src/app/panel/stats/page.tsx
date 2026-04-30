import Link from 'next/link';
import { and, eq, gte, lte, sql, asc } from 'drizzle-orm';

import { db } from '@/lib/db';
import { citas, clientes, profesionales, servicios } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';

type Periodo = '7' | '30' | '90';

const PERIODOS: { value: Periodo; label: string }[] = [
  { value: '7', label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 90 días' },
];

const eurFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

function formatEur(valor: number | string | null | undefined): string {
  const n = typeof valor === 'string' ? Number(valor) : Number(valor ?? 0);
  if (!Number.isFinite(n)) return eurFormatter.format(0);
  return eurFormatter.format(n);
}

function medalla(pos: number): string {
  if (pos === 1) return '🥇';
  if (pos === 2) return '🥈';
  if (pos === 3) return '🥉';
  return `${pos}`;
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: Periodo }>;
}) {
  const params = await searchParams;
  const periodo: Periodo =
    params.periodo === '7' || params.periodo === '90' ? params.periodo : '30';

  const salon = (await getCurrentSalon()) as
    | { id: string; nombre: string; timezone?: string | null }
    | null;

  if (!salon) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-4 rounded-xl border border-zinc-200 bg-white p-10 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <span className="text-4xl">📊</span>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          Configura tu salón
        </h1>
        <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
          Aún no tienes un salón asociado a tu cuenta. Cuando completes el
          onboarding aparecerán aquí tus estadísticas.
        </p>
      </div>
    );
  }

  const dias = Number(periodo);
  const hasta = new Date();
  const desde = new Date(hasta.getTime() - dias * 24 * 60 * 60 * 1000);

  const baseRange = and(
    eq(citas.salonId, salon.id),
    gte(citas.inicio, desde),
    lte(citas.inicio, hasta),
  );

  // 1. Facturación + completadas + clientes únicos en una sola query
  const completadasRow = await db
    .select({
      total: sql<number>`count(*)::int`.as('total'),
      facturado: sql<string>`coalesce(sum(${citas.precioEur}),0)::numeric`.as(
        'facturado',
      ),
      clientesUnicos: sql<number>`count(distinct ${citas.clienteId})::int`.as(
        'clientes_unicos',
      ),
    })
    .from(citas)
    .where(and(baseRange, eq(citas.estado, 'completada')));

  const completadas = Number(completadasRow[0]?.total ?? 0);
  const facturado = Number(completadasRow[0]?.facturado ?? 0);
  const clientesUnicos = Number(completadasRow[0]?.clientesUnicos ?? 0);

  // 2. No-shows (para tasa de no-show)
  const noShowRow = await db
    .select({ total: sql<number>`count(*)::int`.as('total') })
    .from(citas)
    .where(and(baseRange, eq(citas.estado, 'no_show')));
  const noShows = Number(noShowRow[0]?.total ?? 0);

  const denomNoShow = completadas + noShows;
  const tasaNoShow =
    denomNoShow === 0 ? null : (noShows / denomNoShow) * 100;

  // 3. Top 5 servicios
  const topServicios = await db
    .select({
      servicioId: citas.servicioId,
      nombre: servicios.nombre,
      total: sql<number>`count(*)::int`.as('total'),
      facturado: sql<string>`coalesce(sum(${citas.precioEur}),0)::numeric`.as(
        'facturado',
      ),
    })
    .from(citas)
    .innerJoin(servicios, eq(citas.servicioId, servicios.id))
    .where(and(baseRange, eq(citas.estado, 'completada')))
    .groupBy(citas.servicioId, servicios.nombre)
    .orderBy(sql`count(*) desc`)
    .limit(5);

  // 4. Top 5 clientes
  const topClientes = await db
    .select({
      clienteId: citas.clienteId,
      nombre: clientes.nombre,
      total: sql<number>`count(*)::int`.as('total'),
      facturado: sql<string>`coalesce(sum(${citas.precioEur}),0)::numeric`.as(
        'facturado',
      ),
    })
    .from(citas)
    .innerJoin(clientes, eq(citas.clienteId, clientes.id))
    .where(and(baseRange, eq(citas.estado, 'completada')))
    .groupBy(citas.clienteId, clientes.nombre)
    .orderBy(sql`count(*) desc`)
    .limit(5);

  // 5. Profesionales: completadas, no_shows y facturación.
  // Usamos FILTER para combinar agregados en una sola pasada por profesional.
  const filasProfesionales = await db
    .select({
      profesionalId: profesionales.id,
      nombre: profesionales.nombre,
      colorHex: profesionales.colorHex,
      completadas: sql<number>`coalesce(sum(case when ${citas.estado} = 'completada' then 1 else 0 end),0)::int`.as(
        'completadas',
      ),
      noShows: sql<number>`coalesce(sum(case when ${citas.estado} = 'no_show' then 1 else 0 end),0)::int`.as(
        'no_shows',
      ),
      facturado: sql<string>`coalesce(sum(case when ${citas.estado} = 'completada' then ${citas.precioEur} else 0 end),0)::numeric`.as(
        'facturado',
      ),
    })
    .from(profesionales)
    .leftJoin(
      citas,
      and(
        eq(citas.profesionalId, profesionales.id),
        gte(citas.inicio, desde),
        lte(citas.inicio, hasta),
      ),
    )
    .where(and(eq(profesionales.salonId, salon.id), eq(profesionales.activo, true)))
    .groupBy(profesionales.id, profesionales.nombre, profesionales.colorHex)
    .orderBy(asc(profesionales.orden));

  const profesionalesData = filasProfesionales
    .map((p) => ({
      id: p.profesionalId,
      nombre: p.nombre,
      colorHex: p.colorHex ?? '#3b82f6',
      completadas: Number(p.completadas) || 0,
      noShows: Number(p.noShows) || 0,
      facturado: Number(p.facturado) || 0,
    }))
    .sort((a, b) => b.facturado - a.facturado);

  // Estilo del badge de tasa de no-show
  const tasaNoShowBadge = (() => {
    if (tasaNoShow === null) {
      return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
    }
    if (tasaNoShow > 10) {
      return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
    }
    if (tasaNoShow < 5) {
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
    }
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
  })();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Estadísticas · {salon.nombre}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            Estadísticas
          </h1>
        </div>
        <nav
          aria-label="Periodo"
          className="inline-flex flex-wrap gap-2"
        >
          {PERIODOS.map((p) => {
            const active = p.value === periodo;
            return (
              <Link
                key={p.value}
                href={`/panel/stats?periodo=${p.value}`}
                className={
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ' +
                  (active
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900')
                }
              >
                {p.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* KPIs principales */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Facturación"
          value={formatEur(facturado)}
          accent="emerald"
        />
        <KpiCard
          label="Citas completadas"
          value={completadas.toString()}
          accent="blue"
        />
        <KpiCardConBadge
          label="Tasa de no-show"
          value={tasaNoShow === null ? 'N/A' : `${tasaNoShow.toFixed(1)}%`}
          badgeClassName={tasaNoShowBadge}
        />
        <KpiCard
          label="Clientes únicos"
          value={clientesUnicos.toString()}
          accent="amber"
        />
      </section>

      {/* Top 5 servicios y Top 5 clientes */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card titulo="Top 5 servicios">
          {topServicios.length === 0 ? (
            <EmptyTabla mensaje="No hay servicios completados en este periodo." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <tr>
                    <th className="px-6 py-3 font-medium">#</th>
                    <th className="px-6 py-3 font-medium">Servicio</th>
                    <th className="px-6 py-3 text-right font-medium">Citas</th>
                    <th className="px-6 py-3 text-right font-medium">
                      Facturación
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {topServicios.map((s, idx) => (
                    <tr key={s.servicioId}>
                      <td className="px-6 py-3 text-base">
                        {medalla(idx + 1)}
                      </td>
                      <td className="px-6 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                        {s.nombre}
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                        {Number(s.total) || 0}
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums font-semibold text-zinc-950 dark:text-zinc-50">
                        {formatEur(s.facturado)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card titulo="Top 5 clientes">
          {topClientes.length === 0 ? (
            <EmptyTabla mensaje="No hay clientes con citas completadas en este periodo." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <tr>
                    <th className="px-6 py-3 font-medium">#</th>
                    <th className="px-6 py-3 font-medium">Cliente</th>
                    <th className="px-6 py-3 text-right font-medium">Citas</th>
                    <th className="px-6 py-3 text-right font-medium">
                      Facturación
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {topClientes.map((c, idx) => (
                    <tr key={c.clienteId}>
                      <td className="px-6 py-3 text-base">
                        {medalla(idx + 1)}
                      </td>
                      <td className="px-6 py-3 font-medium">
                        <Link
                          href={`/panel/clientes/${c.clienteId}`}
                          className="text-zinc-900 hover:text-purple-600 hover:underline dark:text-zinc-100 dark:hover:text-purple-400"
                        >
                          {c.nombre}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                        {Number(c.total) || 0}
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums font-semibold text-zinc-950 dark:text-zinc-50">
                        {formatEur(c.facturado)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      {/* Profesionales */}
      <section>
        <Card titulo="Profesionales">
          {profesionalesData.length === 0 ? (
            <EmptyTabla mensaje="No hay profesionales activos." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <tr>
                    <th className="px-6 py-3 font-medium">Profesional</th>
                    <th className="px-6 py-3 text-right font-medium">
                      Completadas
                    </th>
                    <th className="px-6 py-3 text-right font-medium">
                      No-shows
                    </th>
                    <th className="px-6 py-3 text-right font-medium">
                      Facturación
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {profesionalesData.map((p) => (
                    <tr key={p.id}>
                      <td className="px-6 py-3">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="inline-block size-2.5 rounded-full"
                            style={{ backgroundColor: p.colorHex }}
                            aria-hidden
                          />
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">
                            {p.nombre}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                        {p.completadas}
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                        {p.noShows}
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums font-semibold text-zinc-950 dark:text-zinc-50">
                        {formatEur(p.facturado)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Datos en tiempo real. Las citas pendientes y canceladas no cuentan en
        la facturación.
      </p>
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

function KpiCardConBadge({
  label,
  value,
  badgeClassName,
}: {
  label: string;
  value: string;
  badgeClassName: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-2">
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xl font-bold tabular-nums ${badgeClassName}`}
        >
          {value}
        </span>
      </p>
    </div>
  );
}

function Card({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          {titulo}
        </h2>
      </div>
      {children}
    </div>
  );
}

function EmptyTabla({ mensaje }: { mensaje: string }) {
  return (
    <p className="px-6 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
      {mensaje}
    </p>
  );
}
