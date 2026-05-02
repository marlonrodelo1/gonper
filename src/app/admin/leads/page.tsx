import Link from 'next/link';
import { count, desc, eq } from 'drizzle-orm';

import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { db } from '@/lib/db';
import { leads } from '@/lib/db/schema';

const PAGE_SIZE = 50;

function formatearFecha(d: Date | null | undefined): string {
  if (!d) return '—';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function truncar(s: string | null | undefined, max: number): string {
  if (!s) return '—';
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; solo?: string }>;
}) {
  await requireSuperAdmin();
  const sp = await searchParams;

  const pageNum = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const soloNoConvertidos = sp.solo === 'no_convertidos';

  const baseFilter = soloNoConvertidos ? eq(leads.convertido, false) : undefined;

  const [{ totalCount }] = await db
    .select({ totalCount: count(leads.id) })
    .from(leads)
    .where(baseFilter);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(pageNum, totalPages);

  const filas = await db
    .select()
    .from(leads)
    .where(baseFilter)
    .orderBy(desc(leads.createdAt))
    .limit(PAGE_SIZE)
    .offset((safePage - 1) * PAGE_SIZE);

  const buildHref = (p: number, solo: boolean) => {
    const params = new URLSearchParams();
    if (p > 1) params.set('page', String(p));
    if (solo) params.set('solo', 'no_convertidos');
    const qs = params.toString();
    return qs ? `/admin/leads?${qs}` : '/admin/leads';
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-8">
      <header>
        <div className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
          Plataforma
        </div>
        <h1 className="tight mt-1 text-[28px] font-medium text-ink">Leads</h1>
        <p className="mt-1 text-[13.5px] text-stone">
          {totalCount} lead{totalCount === 1 ? '' : 's'}{' '}
          {soloNoConvertidos && '(solo sin convertir) '}· página {safePage} de{' '}
          {totalPages}
        </p>
      </header>

      <div className="card p-5">
        <div className="flex flex-wrap gap-2">
          <Link
            href={buildHref(1, false)}
            className={`pill tight inline-flex items-center rounded-full border px-3 py-1.5 text-[12px] transition ${
              !soloNoConvertidos
                ? 'border-ink bg-ink text-cream'
                : 'border-line bg-paper text-stone hover:bg-cream hover:text-ink'
            }`}
          >
            Todos
          </Link>
          <Link
            href={buildHref(1, true)}
            className={`pill tight inline-flex items-center rounded-full border px-3 py-1.5 text-[12px] transition ${
              soloNoConvertidos
                ? 'border-ink bg-ink text-cream'
                : 'border-line bg-paper text-stone hover:bg-cream hover:text-ink'
            }`}
          >
            Solo no convertidos
          </Link>
        </div>
      </div>

      <div className="card overflow-hidden">
        {filas.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="tight text-[16px] font-medium text-ink">Sin leads</p>
            <p className="mt-1 text-[13px] text-stone">
              No hay leads que mostrar con los filtros actuales.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[2fr_1.2fr_1fr_2.5fr_1fr_1fr_1fr] gap-3 border-b border-line bg-cream/40 px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-stone/70">
              <div>Email</div>
              <div>Nombre</div>
              <div>Tipo</div>
              <div>Dolor principal</div>
              <div>Origen</div>
              <div className="text-center">Convertido</div>
              <div>Creado</div>
            </div>
            <div className="divide-y divide-line/70">
              {filas.map((l) => (
                <div
                  key={l.id}
                  className="grid grid-cols-[2fr_1.2fr_1fr_2.5fr_1fr_1fr_1fr] items-center gap-3 px-5 py-3 text-[13px] text-ink hover:bg-paper/50"
                >
                  <div className="min-w-0 truncate">{l.email}</div>
                  <div className="min-w-0 truncate text-stone">
                    {l.nombre ?? '—'}
                  </div>
                  <div className="text-[12px] capitalize text-stone">
                    {l.tipoNegocio ?? '—'}
                  </div>
                  <div className="min-w-0 truncate text-[12.5px] text-stone">
                    {truncar(l.dolorPrincipal, 60)}
                  </div>
                  <div className="text-[12px] text-stone">
                    {l.origen ?? '—'}
                  </div>
                  <div className="text-center">
                    {l.convertido ? (
                      l.convertidoSalonId ? (
                        <Link
                          href={`/admin/salones/${l.convertidoSalonId}`}
                          className="text-sage-2 hover:underline"
                          title="Ir al salón"
                        >
                          ✓
                        </Link>
                      ) : (
                        <span className="text-sage-2">✓</span>
                      )
                    ) : (
                      <span className="text-stone/40">—</span>
                    )}
                  </div>
                  <div className="text-[12px] text-stone">
                    {formatearFecha(l.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 px-1 text-[13px]">
          {safePage > 1 ? (
            <Link
              href={buildHref(safePage - 1, soloNoConvertidos)}
              className="tight rounded-full border border-line bg-paper px-3 py-1.5 text-stone hover:bg-cream hover:text-ink"
            >
              ← Anterior
            </Link>
          ) : (
            <span className="text-stone/40">← Anterior</span>
          )}
          <span className="text-stone">
            Página {safePage} / {totalPages}
          </span>
          {safePage < totalPages ? (
            <Link
              href={buildHref(safePage + 1, soloNoConvertidos)}
              className="tight rounded-full border border-line bg-paper px-3 py-1.5 text-stone hover:bg-cream hover:text-ink"
            >
              Siguiente →
            </Link>
          ) : (
            <span className="text-stone/40">Siguiente →</span>
          )}
        </div>
      )}
    </div>
  );
}
