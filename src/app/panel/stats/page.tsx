import Link from 'next/link';
import { and, eq, gte, lte, sql, asc } from 'drizzle-orm';

import { db } from '@/lib/db';
import { citas, clientes, profesionales, servicios } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';

import { StatCard } from '@/app/panel/_components/stat-card';

type Periodo = '7' | '30' | '90';

const PERIODOS: { value: Periodo; label: string; corto: string }[] = [
  { value: '7', label: 'Últimos 7 días', corto: '7 días' },
  { value: '30', label: 'Últimos 30 días', corto: '30 días' },
  { value: '90', label: 'Últimos 90 días', corto: '90 días' },
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
      <div className="px-8 py-12">
        <div className="card mx-auto flex max-w-2xl flex-col items-center gap-3 p-10 text-center">
          <h1 className="tight text-[28px] font-medium text-ink">
            Configura tu salón
          </h1>
          <p className="max-w-md text-[14px] text-stone">
            Aún no tienes un salón asociado a tu cuenta. Cuando completes el
            onboarding aparecerán aquí tus estadísticas.
          </p>
        </div>
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

  // Estilo del pill de tasa de no-show
  const tasaNoShowStyle = (() => {
    if (tasaNoShow === null) {
      return { bg: 'rgba(107,99,86,0.10)', fg: '#6B6356' };
    }
    if (tasaNoShow > 10) {
      return { bg: 'rgba(177,72,72,0.15)', fg: '#7C2E2E' };
    }
    if (tasaNoShow < 5) {
      return { bg: 'rgba(139,157,122,0.15)', fg: '#5A6B4D' };
    }
    return { bg: 'rgba(197,142,44,0.14)', fg: '#7A5A1B' };
  })();

  const periodoActual = PERIODOS.find((p) => p.value === periodo)!;

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
            Estadísticas
          </p>
          <h1 className="tight mt-1 text-[28px] font-medium text-ink">
            {periodoActual.label}{' '}
            <span className="font-serif-it text-stone/70">
              · {salon.nombre}
            </span>
          </h1>
        </div>
        <nav
          aria-label="Periodo"
          className="flex items-center gap-1 rounded-full border border-line bg-cream p-1 text-[12px]"
        >
          {PERIODOS.map((p) => {
            const active = p.value === periodo;
            return (
              <Link
                key={p.value}
                href={`/panel/stats?periodo=${p.value}`}
                className={
                  'tight inline-flex items-center justify-center rounded-full px-3.5 py-1.5 transition ' +
                  (active
                    ? 'bg-ink text-cream'
                    : 'text-stone hover:text-ink')
                }
              >
                {p.corto}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* KPIs principales */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          id="stat-facturacion"
          label="Facturación"
          value={facturado.toFixed(0)}
          suffix="€"
        />
        <StatCard
          id="stat-completadas"
          label="Citas completadas"
          value={completadas}
        />
        <TasaNoShowCard
          value={tasaNoShow === null ? 'N/A' : `${tasaNoShow.toFixed(1)}%`}
          style={tasaNoShowStyle}
        />
        <StatCard
          id="stat-clientes"
          label="Clientes únicos"
          value={clientesUnicos}
        />
      </section>

      {/* Top 5 servicios y Top 5 clientes */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card titulo="Top 5 servicios" subtitulo="por nº de citas completadas">
          {topServicios.length === 0 ? (
            <EmptyTabla mensaje="No hay servicios completados en este periodo." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line bg-cream/40 text-left text-[10px] uppercase tracking-[0.2em] text-stone/70">
                    <th className="px-5 py-3 font-medium">#</th>
                    <th className="px-5 py-3 font-medium">Servicio</th>
                    <th className="px-5 py-3 text-right font-medium">Citas</th>
                    <th className="px-5 py-3 text-right font-medium">
                      Facturación
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {topServicios.map((s, idx) => (
                    <tr key={s.servicioId}>
                      <td className="px-5 py-3 text-base">
                        {medalla(idx + 1)}
                      </td>
                      <td className="tight px-5 py-3 text-[14px] text-ink">
                        {s.nombre}
                      </td>
                      <td className="tabular px-5 py-3 text-right text-[13px] text-stone">
                        {Number(s.total) || 0}
                      </td>
                      <td className="tabular px-5 py-3 text-right text-[13px] text-ink">
                        {formatEur(s.facturado)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card titulo="Top 5 clientes" subtitulo="por nº de citas completadas">
          {topClientes.length === 0 ? (
            <EmptyTabla mensaje="No hay clientes con citas completadas en este periodo." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line bg-cream/40 text-left text-[10px] uppercase tracking-[0.2em] text-stone/70">
                    <th className="px-5 py-3 font-medium">#</th>
                    <th className="px-5 py-3 font-medium">Cliente</th>
                    <th className="px-5 py-3 text-right font-medium">Citas</th>
                    <th className="px-5 py-3 text-right font-medium">
                      Facturación
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {topClientes.map((c, idx) => (
                    <tr key={c.clienteId}>
                      <td className="px-5 py-3 text-base">
                        {medalla(idx + 1)}
                      </td>
                      <td className="tight px-5 py-3 text-[14px]">
                        <Link
                          href={`/panel/clientes/${c.clienteId}`}
                          className="text-ink hover:text-terracotta"
                        >
                          {c.nombre}
                        </Link>
                      </td>
                      <td className="tabular px-5 py-3 text-right text-[13px] text-stone">
                        {Number(c.total) || 0}
                      </td>
                      <td className="tabular px-5 py-3 text-right text-[13px] text-ink">
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
        <Card titulo="Profesionales" subtitulo="ranking por facturación">
          {profesionalesData.length === 0 ? (
            <EmptyTabla mensaje="No hay profesionales activos." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line bg-cream/40 text-left text-[10px] uppercase tracking-[0.2em] text-stone/70">
                    <th className="px-5 py-3 font-medium">Profesional</th>
                    <th className="px-5 py-3 text-right font-medium">
                      Completadas
                    </th>
                    <th className="px-5 py-3 text-right font-medium">
                      No-shows
                    </th>
                    <th className="px-5 py-3 text-right font-medium">
                      Facturación
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {profesionalesData.map((p) => (
                    <tr key={p.id}>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="inline-block size-2.5 rounded-full"
                            style={{ backgroundColor: p.colorHex }}
                            aria-hidden
                          />
                          <span className="tight text-[14px] text-ink">
                            {p.nombre}
                          </span>
                        </span>
                      </td>
                      <td className="tabular px-5 py-3 text-right text-[13px] text-stone">
                        {p.completadas}
                      </td>
                      <td className="tabular px-5 py-3 text-right text-[13px] text-stone">
                        {p.noShows}
                      </td>
                      <td className="tabular px-5 py-3 text-right text-[13px] text-ink">
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

      <p className="mt-6 text-center text-[11px] text-stone/60">
        Datos en tiempo real. Las citas pendientes y canceladas no cuentan en
        la facturación.
      </p>
    </div>
  );
}

function TasaNoShowCard({
  value,
  style,
}: {
  value: string;
  style: { bg: string; fg: string };
}) {
  return (
    <div className="card relative flex flex-col gap-3 overflow-hidden p-5">
      <div className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
        Tasa de no-show
      </div>
      <div>
        <span
          className="tight tabular inline-flex items-center rounded-full px-4 py-1.5 font-medium"
          style={{
            background: style.bg,
            color: style.fg,
            fontSize: '28px',
            lineHeight: 1.1,
          }}
        >
          {value}
        </span>
      </div>
      <div className="text-[12px] text-stone">
        no_shows / (completadas + no_shows)
      </div>
    </div>
  );
}

function Card({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <h2 className="tight text-[18px] font-medium text-ink">
          {titulo}
          {subtitulo && (
            <span className="font-serif-it ml-2 text-[14px] text-stone/70">
              · {subtitulo}
            </span>
          )}
        </h2>
      </div>
      {children}
    </div>
  );
}

function EmptyTabla({ mensaje }: { mensaje: string }) {
  return (
    <p className="px-5 py-10 text-center text-[12px] italic text-stone/60">
      {mensaje}
    </p>
  );
}
