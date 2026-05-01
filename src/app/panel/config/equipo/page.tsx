import Link from 'next/link';
import { asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { profesionales } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { Icon } from '@/app/panel/_components/icons';
import { toggleProfesionalActivo } from './actions';
import { EliminarProfesionalButton } from './eliminar-button';

type CurrentSalon = { id: string } | null;

export default async function EquipoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const salon = (await getCurrentSalon()) as CurrentSalon;

  if (!salon) {
    return (
      <div className="card mx-auto flex max-w-2xl flex-col items-center gap-3 p-10 text-center">
        <h2 className="tight text-[22px] font-medium text-ink">
          Configura tu salón
        </h2>
        <p className="text-[14px] text-stone">
          Aún no tienes un salón asociado a tu cuenta.
        </p>
      </div>
    );
  }

  const filas = await db
    .select()
    .from(profesionales)
    .where(eq(profesionales.salonId, salon.id))
    .orderBy(asc(profesionales.orden), asc(profesionales.createdAt));

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      {params.error ? (
        <div
          className="rounded-xl border bg-[#F1D6D6] px-4 py-3 text-[13px] text-[#7C2E2E]"
          style={{ borderColor: 'rgba(177,72,72,0.4)' }}
        >
          {params.error}
        </div>
      ) : null}

      <section className="card flex flex-col gap-5 p-6">
        <header className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
              Equipo
            </span>
            <h2 className="tight text-[20px] font-medium text-ink">
              Profesionales del salón
            </h2>
            <p className="text-[13px] text-stone">
              Quien atiende cada cita.
            </p>
          </div>
          <Link
            href="/panel/config/equipo/nuevo"
            className="gloss-btn tight inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-medium"
          >
            <Icon.Plus width="13" height="13" />
            Nuevo profesional
          </Link>
        </header>

        {filas.length === 0 ? (
          <div className="card-tight flex flex-col items-center justify-center gap-2 border-dashed p-10 text-center">
            <p className="tight text-[15px] font-medium text-ink">
              Aún no hay profesionales
            </p>
            <p className="max-w-sm text-[12.5px] text-stone">
              Añade al menos uno para poder asignar citas.
            </p>
            <Link
              href="/panel/config/equipo/nuevo"
              className="gloss-btn tight mt-2 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-medium"
            >
              Añadir profesional
            </Link>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-line/70">
            <div className="grid grid-cols-[44px_1fr_120px_220px] gap-3 bg-cream/40 px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-stone/70">
              <div>Color</div>
              <div>Nombre</div>
              <div>Estado</div>
              <div className="text-right">Acciones</div>
            </div>
            {filas.map((p) => (
              <div
                key={p.id}
                className="grid grid-cols-[44px_1fr_120px_220px] items-center gap-3 px-4 py-3.5"
              >
                <div>
                  <span
                    className="inline-block h-6 w-6 rounded-full ring-1 ring-line"
                    style={{ backgroundColor: p.colorHex ?? '#3b82f6' }}
                    aria-label={`Color ${p.colorHex ?? '#3b82f6'}`}
                  />
                </div>
                <div className="flex items-center gap-3">
                  {p.fotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.fotoUrl}
                      alt={p.nombre}
                      className="h-8 w-8 rounded-full object-cover ring-1 ring-line"
                    />
                  ) : null}
                  <span className="tight text-[14px] font-medium text-ink">
                    {p.nombre}
                  </span>
                </div>
                <div>
                  {p.activo ? (
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
                    href={`/panel/config/equipo/${p.id}/editar`}
                    className="card-tight tight px-3 py-1.5 text-[12.5px] text-ink hover:bg-cream"
                  >
                    Editar
                  </Link>
                  <form action={toggleProfesionalActivo}>
                    <input type="hidden" name="id" value={p.id} />
                    <button
                      type="submit"
                      className="card-tight tight px-3 py-1.5 text-[12.5px] text-stone hover:text-ink hover:bg-cream"
                    >
                      {p.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </form>
                  <EliminarProfesionalButton id={p.id} nombre={p.nombre} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
