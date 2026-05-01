import Link from 'next/link';
import { asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { servicios } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { Icon } from '../_components/icons';
import { toggleServicioActivo } from './actions';
import { EliminarServicioButton } from './eliminar-servicio-button';

type CurrentSalon = { id: string; nombre: string } | null;

export default async function ServiciosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const salon = (await getCurrentSalon()) as CurrentSalon;

  if (!salon) {
    return (
      <div className="px-8 py-12">
        <div className="card mx-auto flex max-w-2xl flex-col items-center gap-3 p-10 text-center">
          <h1 className="tight text-[28px] font-medium text-ink">
            Configura tu salón
          </h1>
          <p className="max-w-md text-[14px] text-stone">
            Aún no tienes un salón asociado a tu cuenta.
          </p>
        </div>
      </div>
    );
  }

  const filas = await db
    .select()
    .from(servicios)
    .where(eq(servicios.salonId, salon.id))
    .orderBy(asc(servicios.orden), asc(servicios.createdAt));

  const activos = filas.filter((s) => s.activo).length;

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-8">
      <header className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
            Catálogo
          </p>
          <h1 className="tight mt-1 text-[28px] font-medium text-ink">
            {filas.length} {filas.length === 1 ? 'servicio' : 'servicios'}{' '}
            <span className="font-serif-it text-stone/70">
              {filas.length > 0 ? `· ${activos} activos` : 'en tu salón'}
            </span>
          </h1>
        </div>
        <Link
          href="/panel/servicios/nuevo"
          className="gloss-btn tight inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13.5px] font-medium"
        >
          <Icon.Plus width="15" height="15" /> Nuevo servicio
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
            Aún no hay servicios
          </h2>
          <p className="max-w-md text-[13.5px] text-stone">
            Crea el primero (corte, barba, color…) para que tu agente y tus
            clientes puedan reservarlo.
          </p>
          <Link
            href="/panel/servicios/nuevo"
            className="gloss-btn tight mt-2 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13.5px] font-medium"
          >
            <Icon.Plus width="15" height="15" /> Crear primer servicio
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-[1fr_120px_120px_120px_220px] items-center gap-3 border-b border-line bg-cream/40 px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-stone/70">
            <div>Nombre</div>
            <div className="text-right">Duración</div>
            <div className="text-right">Precio</div>
            <div>Estado</div>
            <div className="text-right">Acciones</div>
          </div>
          <div className="divide-y divide-line/70">
            {filas.map((s) => (
              <div
                key={s.id}
                className="grid grid-cols-[1fr_120px_120px_120px_220px] items-center gap-3 border-l-2 border-l-transparent px-5 py-3.5 transition hover:border-l-terracotta hover:bg-paper/60"
              >
                <div className="min-w-0">
                  <Link
                    href={`/panel/servicios/${s.id}/editar`}
                    className="tight block truncate text-[14.5px] font-medium text-ink hover:text-terracotta"
                  >
                    {s.nombre}
                  </Link>
                  {s.descripcion ? (
                    <span className="block truncate text-[12px] text-stone">
                      {s.descripcion}
                    </span>
                  ) : null}
                </div>
                <div className="tabular text-right font-mono text-[13px] text-ink">
                  {s.duracionMin} min
                </div>
                <div className="tabular text-right font-mono text-[13px] text-ink">
                  {Number(s.precioEur).toFixed(2)} €
                </div>
                <div>
                  {s.activo ? (
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
                      Activo
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
                      Inactivo
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <Link
                    href={`/panel/servicios/${s.id}/editar`}
                    className="tight inline-flex h-7 items-center justify-center rounded-full border border-line bg-paper px-3 text-[12px] font-medium text-ink hover:bg-cream"
                  >
                    Editar
                  </Link>
                  <form action={toggleServicioActivo}>
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      type="submit"
                      className="tight inline-flex h-7 items-center justify-center rounded-full border border-line bg-paper px-3 text-[12px] font-medium text-stone hover:bg-cream hover:text-ink"
                    >
                      {s.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </form>
                  <EliminarServicioButton id={s.id} nombre={s.nombre} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
