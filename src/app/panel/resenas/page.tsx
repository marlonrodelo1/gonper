import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { resenas } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { Icon } from '../_components/icons';
import {
  toggleResenaAprobada,
  toggleResenaDestacada,
} from './actions';
import { EliminarResenaButton } from './eliminar-button';

type CurrentSalon = { id: string; nombre: string; timezone: string | null } | null;

function formatearFecha(fecha: string | null, timezone: string): string {
  if (!fecha) return '—';
  const d = new Date(fecha + 'T00:00:00');
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeZone: timezone,
  }).format(d);
}

function Estrellas({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-terracotta">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          aria-hidden
          className={i <= value ? 'opacity-100' : 'opacity-25'}
        >
          ★
        </span>
      ))}
      <span className="sr-only">{value} de 5</span>
    </span>
  );
}

function PillFuente({ fuente }: { fuente: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    manual: { bg: 'rgba(107,99,86,0.10)', color: '#6B6356', label: 'Manual' },
    google: { bg: 'rgba(66,133,244,0.12)', color: '#1A4F9C', label: 'Google' },
    telegram: { bg: 'rgba(36,161,222,0.14)', color: '#0E5E8A', label: 'Telegram' },
    web: { bg: 'rgba(139,157,122,0.15)', color: '#5A6B4D', label: 'Web' },
  };
  const cfg = map[fuente] ?? map.manual;
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

export default async function ResenasPage({
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
    .from(resenas)
    .where(eq(resenas.salonId, salon.id))
    .orderBy(desc(resenas.fecha), desc(resenas.createdAt));

  const aprobadas = filas.filter((r) => r.aprobada).length;

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-8">
      <header className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
            Web del salón
          </p>
          <h1 className="tight mt-1 text-[22px] font-medium text-ink md:text-[28px]">
            {filas.length} {filas.length === 1 ? 'reseña' : 'reseñas'}{' '}
            <span className="font-serif-it text-stone/70">
              {filas.length > 0 ? `· ${aprobadas} aprobadas` : 'en tu salón'}
            </span>
          </h1>
        </div>
        <Link
          href="/panel/resenas/nuevo"
          className="gloss-btn tight inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13.5px] font-medium"
        >
          <Icon.Plus width="15" height="15" /> Nueva reseña
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
            Aún no hay reseñas
          </h2>
          <p className="max-w-md text-[13.5px] text-stone">
            Añade testimonios manualmente o vincúlalos desde Google / Telegram /
            tu web.
          </p>
          <Link
            href="/panel/resenas/nuevo"
            className="gloss-btn tight mt-2 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13.5px] font-medium"
          >
            <Icon.Plus width="15" height="15" /> Añadir primera reseña
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
          <div className="grid min-w-[1100px] grid-cols-[160px_120px_1fr_90px_100px_100px_120px_180px] items-center gap-3 border-b border-line bg-cream/40 px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-stone/70">
            <div>Autor</div>
            <div>Rating</div>
            <div>Texto</div>
            <div>Fuente</div>
            <div>Aprobada</div>
            <div>Destacada</div>
            <div>Fecha</div>
            <div className="text-right">Acciones</div>
          </div>
          <div className="min-w-[1100px] divide-y divide-line/70">
            {filas.map((r) => (
              <div
                key={r.id}
                className="grid grid-cols-[160px_120px_1fr_90px_100px_100px_120px_180px] items-center gap-3 border-l-2 border-l-transparent px-5 py-3.5 transition hover:border-l-terracotta hover:bg-paper/60"
              >
                <div className="min-w-0">
                  <Link
                    href={`/panel/resenas/${r.id}/editar`}
                    className="tight block truncate text-[14px] font-medium text-ink hover:text-terracotta"
                  >
                    {r.autorNombre}
                  </Link>
                </div>
                <div className="text-[14px]">
                  <Estrellas value={r.rating} />
                </div>
                <div className="min-w-0 truncate text-[12.5px] text-stone">
                  {r.texto ?? <span className="text-stone/60">—</span>}
                </div>
                <div>
                  <PillFuente fuente={r.fuente} />
                </div>
                <div>
                  {r.aprobada ? (
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
                      Sí
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
                      No
                    </span>
                  )}
                </div>
                <div>
                  {r.destacada ? (
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={{
                        background: 'rgba(193,78,46,0.14)',
                        color: '#A8451F',
                      }}
                    >
                      ★ Destacada
                    </span>
                  ) : (
                    <span className="text-[11px] text-stone/60">—</span>
                  )}
                </div>
                <div className="text-[12.5px] text-stone">
                  {formatearFecha(r.fecha, timezone)}
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <Link
                    href={`/panel/resenas/${r.id}/editar`}
                    className="tight inline-flex h-7 items-center justify-center rounded-full border border-line bg-paper px-3 text-[12px] font-medium text-ink hover:bg-cream"
                  >
                    Editar
                  </Link>
                  <form action={toggleResenaAprobada}>
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      type="submit"
                      title={r.aprobada ? 'Desaprobar' : 'Aprobar'}
                      className="tight inline-flex h-7 items-center justify-center rounded-full border border-line bg-paper px-2.5 text-[12px] font-medium text-stone hover:bg-cream hover:text-ink"
                    >
                      {r.aprobada ? '✓' : '○'}
                    </button>
                  </form>
                  <form action={toggleResenaDestacada}>
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      type="submit"
                      title={r.destacada ? 'Quitar destacada' : 'Destacar'}
                      className="tight inline-flex h-7 items-center justify-center rounded-full border border-line bg-paper px-2.5 text-[12px] font-medium text-stone hover:bg-cream hover:text-ink"
                    >
                      ★
                    </button>
                  </form>
                  <EliminarResenaButton id={r.id} autor={r.autorNombre} />
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
