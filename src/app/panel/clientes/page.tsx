import Link from 'next/link';
import { and, asc, eq, ilike, or } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import { db } from '@/lib/db';
import { clientes } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { Icon } from '../_components/icons';
import { EliminarClienteButton } from './eliminar-cliente-button';

function formatearFecha(fecha: Date | null, timezone: string): string {
  if (!fecha) return '—';
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeZone: timezone,
  }).format(fecha);
}

function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? '';
  const errorMsg = sp.error;

  const salon = (await getCurrentSalon()) as
    | { id: string; nombre: string; timezone: string | null }
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

  const filtros: SQL[] = [eq(clientes.salonId, salon.id)];
  if (q) {
    const like = `%${q}%`;
    filtros.push(
      or(
        ilike(clientes.nombre, like),
        ilike(clientes.telefono, like),
        ilike(clientes.email, like),
      )!,
    );
  }

  const lista = await db
    .select()
    .from(clientes)
    .where(and(...filtros))
    .orderBy(asc(clientes.nombre));

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-8">
      <header className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
            Clientes
          </p>
          <h1 className="tight mt-1 text-[22px] font-medium text-ink md:text-[28px]">
            {lista.length} {lista.length === 1 ? 'cliente' : 'clientes'}{' '}
            <span className="font-serif-it text-stone/70">
              {q ? `para "${q}"` : 'en tu salón'}
            </span>
          </h1>
        </div>
        <Link
          href="/panel/clientes/nuevo"
          className="gloss-btn tight inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13.5px] font-medium"
        >
          <Icon.Plus width="15" height="15" /> Nuevo cliente
        </Link>
      </header>

      {errorMsg && (
        <div
          className="rounded-xl border px-4 py-3 text-[13.5px]"
          style={{
            background: '#F1D6D6',
            borderColor: 'rgba(177,72,72,0.4)',
            color: '#7C2E2E',
          }}
        >
          {errorMsg}
        </div>
      )}

      <form
        action="/panel/clientes"
        method="GET"
        className="flex flex-col gap-2 sm:flex-row"
      >
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone/60">
            <Icon.Search width="15" height="15" />
          </span>
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre, teléfono o email…"
            className="w-full rounded-full border border-line bg-paper px-11 py-3 text-[14px] text-ink placeholder:text-stone/60 focus:border-line-2 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="tight rounded-full border border-line bg-cream px-5 py-3 text-[13.5px] font-medium text-ink hover:bg-paper"
          >
            Buscar
          </button>
          {q && (
            <Link
              href="/panel/clientes"
              className="tight inline-flex items-center justify-center rounded-full px-4 py-3 text-[13.5px] font-medium text-stone hover:text-ink"
            >
              Limpiar
            </Link>
          )}
        </div>
      </form>

      {lista.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 p-12 text-center">
          <h2 className="tight text-[18px] font-medium text-ink">
            {q ? 'Sin resultados' : 'Aún no hay clientes'}
          </h2>
          <p className="max-w-md text-[13.5px] text-stone">
            {q
              ? `No hay clientes que coincidan con "${q}". Prueba con otra búsqueda.`
              : 'Crea tu primer cliente para empezar a llevar el historial.'}
          </p>
          {!q && (
            <Link
              href="/panel/clientes/nuevo"
              className="gloss-btn tight mt-2 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13.5px] font-medium"
            >
              <Icon.Plus width="15" height="15" /> Nuevo cliente
            </Link>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
          <div className="grid min-w-[920px] grid-cols-[44px_1fr_140px_140px_80px_80px_120px_64px] items-center gap-3 border-b border-line bg-cream/40 px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-stone/70">
            <div />
            <div>Nombre</div>
            <div>Teléfono</div>
            <div>Email</div>
            <div className="text-right">Citas</div>
            <div className="text-right">No-shows</div>
            <div>Última visita</div>
            <div className="text-right">·</div>
          </div>
          <div className="min-w-[920px] divide-y divide-line/70">
            {lista.map((c) => (
              <div
                key={c.id}
                className="grid grid-cols-[44px_1fr_140px_140px_80px_80px_120px_64px] items-center gap-3 border-l-2 border-l-transparent px-5 py-3.5 transition hover:border-l-terracotta hover:bg-paper/60"
              >
                <Link
                  href={`/panel/clientes/${c.id}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-cream-2 text-[12px] font-medium text-ink/80"
                >
                  {iniciales(c.nombre) || '·'}
                </Link>
                <div className="min-w-0">
                  <Link
                    href={`/panel/clientes/${c.id}`}
                    className="tight flex items-center gap-2 truncate text-[14.5px] font-medium text-ink hover:text-terracotta"
                  >
                    <span className="truncate">{c.nombre}</span>
                    {c.requiereDeposito && (
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-[0.16em]"
                        style={{
                          background: 'rgba(197,142,44,0.14)',
                          color: '#7A5A1B',
                        }}
                      >
                        Depósito
                      </span>
                    )}
                  </Link>
                </div>
                <div className="truncate text-[13px] text-stone">
                  {c.telefono ?? '—'}
                </div>
                <div className="truncate text-[13px] text-stone">
                  {c.email ?? '—'}
                </div>
                <div className="tabular text-right font-mono text-[13px] text-ink">
                  {c.totalCitas}
                </div>
                <div className="tabular text-right font-mono text-[13px]">
                  {c.totalNoShows >= 2 ? (
                    <span
                      className="inline-block rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={{
                        background: 'rgba(177,72,72,0.12)',
                        color: '#7C2E2E',
                      }}
                    >
                      {c.totalNoShows}
                    </span>
                  ) : (
                    <span className="text-stone">{c.totalNoShows}</span>
                  )}
                </div>
                <div className="text-[12.5px] text-stone">
                  {formatearFecha(c.ultimaVisita, timezone)}
                </div>
                <div className="flex items-center justify-end gap-1">
                  <EliminarClienteButton id={c.id} nombre={c.nombre} />
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
