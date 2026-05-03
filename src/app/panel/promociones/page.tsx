import Link from 'next/link';
import { asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { promociones } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { Icon } from '../_components/icons';
import { togglePromocionActiva } from './actions';
import { EliminarPromocionButton } from './eliminar-button';

type CurrentSalon = { id: string; nombre: string; timezone: string | null } | null;

function formatearFecha(fecha: string | null, timezone: string): string {
  if (!fecha) return '—';
  const d = new Date(fecha + 'T00:00:00');
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeZone: timezone,
  }).format(d);
}

export default async function PromocionesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const salon = (await getCurrentSalon()) as CurrentSalon;

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

  const filas = await db
    .select()
    .from(promociones)
    .where(eq(promociones.salonId, salon.id))
    .orderBy(asc(promociones.orden), asc(promociones.createdAt));

  const activas = filas.filter((p) => p.activa).length;

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-8">
      <header className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
            Web del salón
          </p>
          <h1 className="tight mt-1 text-[22px] font-medium text-ink md:text-[28px]">
            {filas.length} {filas.length === 1 ? 'promoción' : 'promociones'}{' '}
            <span className="font-serif-it text-stone/70">
              {filas.length > 0 ? `· ${activas} activas` : 'en tu web'}
            </span>
          </h1>
        </div>
        <Link
          href="/panel/promociones/nuevo"
          className="gloss-btn tight inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13.5px] font-medium"
        >
          <Icon.Plus width="15" height="15" /> Nueva promoción
        </Link>
      </header>

      {params.error ? (
        <div
          className="rounded-xl border px-4 py-3 text-[13.5px]"
          style={{
            background: '#F1D6D6',
            borderColor: 'rgba(177,72,72,0.4)',
            color: '#7C2E2E',
          }}
        >
          {params.error}
        </div>
      ) : null}

      {filas.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 p-12 text-center">
          <h2 className="tight text-[18px] font-medium text-ink">
            Aún no hay promociones
          </h2>
          <p className="max-w-md text-[13.5px] text-stone">
            Crea ofertas para destacar en la web de tu salón (descuentos, packs,
            2x1…).
          </p>
          <Link
            href="/panel/promociones/nuevo"
            className="gloss-btn tight mt-2 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13.5px] font-medium"
          >
            <Icon.Plus width="15" height="15" /> Crear primera promoción
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
          <div className="grid min-w-[1020px] grid-cols-[100px_1fr_120px_140px_120px_110px_220px] items-center gap-3 border-b border-line bg-cream/40 px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-stone/70">
            <div>Tag</div>
            <div>Título</div>
            <div>Descuento</div>
            <div className="text-right">Precio</div>
            <div>Válida hasta</div>
            <div>Estado</div>
            <div className="text-right">Acciones</div>
          </div>
          <div className="min-w-[1020px] divide-y divide-line/70">
            {filas.map((p) => (
              <div
                key={p.id}
                className="grid grid-cols-[100px_1fr_120px_140px_120px_110px_220px] items-center gap-3 border-l-2 border-l-transparent px-5 py-3.5 transition hover:border-l-terracotta hover:bg-paper/60"
              >
                <div className="truncate">
                  {p.tag ? (
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                      style={{
                        background: 'rgba(197,142,44,0.14)',
                        color: '#7A5A1B',
                      }}
                    >
                      {p.tag}
                    </span>
                  ) : (
                    <span className="text-stone/60">—</span>
                  )}
                </div>
                <div className="min-w-0">
                  <Link
                    href={`/panel/promociones/${p.id}/editar`}
                    className="tight block truncate text-[14.5px] font-medium text-ink hover:text-terracotta"
                  >
                    {p.titulo}
                  </Link>
                  {p.descripcion ? (
                    <span className="block truncate text-[12px] text-stone">
                      {p.descripcion}
                    </span>
                  ) : null}
                </div>
                <div className="truncate text-[13px] text-ink">
                  {p.descuentoLabel ? (
                    <span
                      className="rounded-md px-2 py-0.5 text-[12px] font-medium"
                      style={{
                        background: 'rgba(177,72,72,0.10)',
                        color: '#7C2E2E',
                      }}
                    >
                      {p.descuentoLabel}
                    </span>
                  ) : (
                    <span className="text-stone/60">—</span>
                  )}
                </div>
                <div className="tabular text-right font-mono text-[13px]">
                  {p.precioEur !== null ? (
                    <div className="flex flex-col items-end">
                      <span className="text-ink">
                        {Number(p.precioEur).toFixed(2)} €
                      </span>
                      {p.precioAnteriorEur !== null ? (
                        <span className="text-[11px] text-stone line-through">
                          {Number(p.precioAnteriorEur).toFixed(2)} €
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-stone/60">—</span>
                  )}
                </div>
                <div className="text-[12.5px] text-stone">
                  {formatearFecha(p.validaHasta, timezone)}
                </div>
                <div>
                  {p.activa ? (
                    <span
                      className="pill"
                      style={{
                        background: 'rgba(139,157,122,0.15)',
                        color: '#5A6B4D',
                      }}
                    >
                      <span
                        className="pill-dot"
                        style={{ background: '#8B9D7A' }}
                      />
                      Activa
                    </span>
                  ) : (
                    <span
                      className="pill"
                      style={{
                        background: 'rgba(107,99,86,0.10)',
                        color: '#6B6356',
                      }}
                    >
                      <span
                        className="pill-dot"
                        style={{ background: '#8A8174' }}
                      />
                      Inactiva
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <Link
                    href={`/panel/promociones/${p.id}/editar`}
                    className="tight inline-flex h-7 items-center justify-center rounded-full border border-line bg-paper px-3 text-[12px] font-medium text-ink hover:bg-cream"
                  >
                    Editar
                  </Link>
                  <form action={togglePromocionActiva}>
                    <input type="hidden" name="id" value={p.id} />
                    <button
                      type="submit"
                      className="tight inline-flex h-7 items-center justify-center rounded-full border border-line bg-paper px-3 text-[12px] font-medium text-stone hover:bg-cream hover:text-ink"
                    >
                      {p.activa ? 'Desactivar' : 'Activar'}
                    </button>
                  </form>
                  <EliminarPromocionButton id={p.id} titulo={p.titulo} />
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
