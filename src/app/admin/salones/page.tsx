import Link from 'next/link';
import { and, count, desc, eq, ilike, or, sql } from 'drizzle-orm';

import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { db } from '@/lib/db';
import { citas, salones } from '@/lib/db/schema';

type Filtro = 'activos' | 'trial' | 'pagando' | 'inactivos' | 'todos';

const FILTROS: ReadonlyArray<{ key: Filtro; label: string }> = [
  { key: 'todos', label: 'Todos' },
  { key: 'activos', label: 'Activos' },
  { key: 'trial', label: 'Trial' },
  { key: 'pagando', label: 'Pagando' },
  { key: 'inactivos', label: 'Inactivos' },
];

function formatearFecha(d: Date | null | undefined): string {
  if (!d) return '—';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

function trialRestante(trialUntil: Date | null | undefined): string {
  if (!trialUntil) return '—';
  const ms = trialUntil.getTime() - Date.now();
  if (ms <= 0) return 'Expirado';
  const dias = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return `${dias} día${dias === 1 ? '' : 's'}`;
}

function planPillClasses(plan: string): string {
  if (plan === 'cancelado') {
    return 'bg-terracotta-soft/40 text-terracotta-2 border-terracotta/30';
  }
  if (plan === 'trial') {
    return 'bg-paper text-stone border-line';
  }
  // basico, solo, studio, pro → pagando
  return 'bg-sage-soft/40 text-sage-2 border-sage/30';
}

export default async function AdminSalonesPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string; q?: string }>;
}) {
  await requireSuperAdmin();
  const sp = await searchParams;

  const filtro: Filtro = (() => {
    const f = sp.filtro;
    if (
      f === 'activos' ||
      f === 'trial' ||
      f === 'pagando' ||
      f === 'inactivos' ||
      f === 'todos'
    ) {
      return f;
    }
    return 'todos';
  })();
  const q = (sp.q ?? '').trim();

  // Construir condiciones
  const conds: ReturnType<typeof eq>[] = [];

  if (filtro === 'activos') {
    conds.push(eq(salones.activo, true));
  } else if (filtro === 'inactivos') {
    conds.push(eq(salones.activo, false));
  } else if (filtro === 'trial') {
    conds.push(eq(salones.plan, 'trial'));
  } else if (filtro === 'pagando') {
    conds.push(
      sql`${salones.plan} in ('basico','solo','studio','pro')` as unknown as ReturnType<
        typeof eq
      >,
    );
  }

  if (q) {
    const like = `%${q}%`;
    conds.push(
      or(
        ilike(salones.nombre, like),
        ilike(salones.slug, like),
        ilike(salones.email, like),
      ) as unknown as ReturnType<typeof eq>,
    );
  }

  const filas = await db
    .select({
      id: salones.id,
      slug: salones.slug,
      nombre: salones.nombre,
      tipoNegocio: salones.tipoNegocio,
      plan: salones.plan,
      trialUntil: salones.trialUntil,
      activo: salones.activo,
      createdAt: salones.createdAt,
      citasTotal: count(citas.id),
    })
    .from(salones)
    .leftJoin(citas, eq(citas.salonId, salones.id))
    .where(conds.length > 0 ? and(...conds) : undefined)
    .groupBy(salones.id)
    .orderBy(desc(salones.createdAt));

  // Stats globales (solo cuenta de filtros)
  const [{ totalCount }] = await db
    .select({ totalCount: count(salones.id) })
    .from(salones);

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
            Plataforma
          </div>
          <h1 className="tight mt-1 text-[28px] font-medium text-ink">
            Salones
          </h1>
          <p className="mt-1 text-[13.5px] text-stone">
            {totalCount} salón{totalCount === 1 ? '' : 'es'} en total ·
            mostrando {filas.length}
          </p>
        </div>
        <Link
          href="/admin/salones/nuevo"
          className="gloss-btn tight inline-flex h-10 items-center justify-center rounded-full px-5 text-[13.5px] font-medium"
        >
          + Nuevo salón
        </Link>
      </header>

      <div className="card flex flex-col gap-4 p-5">
        {/* Buscador + filtros */}
        <form
          method="GET"
          className="flex flex-col gap-3 md:flex-row md:items-center"
        >
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre, slug o email…"
            className="w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-[14px] text-ink outline-none transition focus:border-line-2 focus:bg-cream md:max-w-sm"
          />
          {/* Mantener filtro al buscar */}
          <input type="hidden" name="filtro" value={filtro} />
          <button
            type="submit"
            className="tight rounded-full border border-line bg-paper px-4 py-2 text-[12.5px] text-ink hover:bg-cream"
          >
            Buscar
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {FILTROS.map((f) => {
            const params = new URLSearchParams();
            params.set('filtro', f.key);
            if (q) params.set('q', q);
            const active = f.key === filtro;
            return (
              <Link
                key={f.key}
                href={`/admin/salones?${params.toString()}`}
                className={`pill tight inline-flex items-center rounded-full border px-3 py-1.5 text-[12px] transition ${
                  active
                    ? 'border-ink bg-ink text-cream'
                    : 'border-line bg-paper text-stone hover:bg-cream hover:text-ink'
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        {filas.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
            <p className="tight text-[16px] font-medium text-ink">
              Sin salones que mostrar
            </p>
            <p className="max-w-md text-[13px] text-stone">
              No hay resultados con los filtros actuales. Limpia los filtros o
              crea un nuevo salón manualmente.
            </p>
            <Link
              href="/admin/salones/nuevo"
              className="gloss-btn tight inline-flex h-9 items-center rounded-full px-4 text-[12.5px] font-medium"
            >
              + Nuevo salón
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_0.8fr_1fr_72px] gap-3 border-b border-line bg-cream/40 px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-stone/70">
              <div>Salón</div>
              <div>Tipo</div>
              <div>Plan</div>
              <div>Trial</div>
              <div className="text-right">Citas</div>
              <div>Creado</div>
              <div />
            </div>
            <div className="divide-y divide-line/70">
              {filas.map((s) => (
                <div
                  key={s.id}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_0.8fr_1fr_72px] items-center gap-3 px-5 py-3 text-[13.5px] text-ink hover:bg-paper/50"
                >
                  <div className="min-w-0">
                    <div className="tight truncate font-medium text-ink">
                      {s.nombre}
                      {!s.activo && (
                        <span className="ml-2 rounded-full bg-terracotta-soft/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-terracotta-2">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <div className="truncate text-[11.5px] text-stone">
                      /{s.slug}
                    </div>
                  </div>
                  <div className="text-[12.5px] text-stone capitalize">
                    {s.tipoNegocio}
                  </div>
                  <div>
                    <span
                      className={`pill inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] capitalize ${planPillClasses(
                        s.plan,
                      )}`}
                    >
                      {s.plan}
                    </span>
                  </div>
                  <div className="text-[12.5px] text-stone">
                    {s.plan === 'trial' ? trialRestante(s.trialUntil) : '—'}
                  </div>
                  <div className="text-right font-mono text-[12.5px] tabular-nums text-stone">
                    {s.citasTotal}
                  </div>
                  <div className="text-[12px] text-stone">
                    {formatearFecha(s.createdAt)}
                  </div>
                  <div className="text-right">
                    <Link
                      href={`/admin/salones/${s.id}`}
                      className="tight text-[12.5px] text-terracotta hover:text-terracotta-2"
                    >
                      Ver →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

    </div>
  );
}
