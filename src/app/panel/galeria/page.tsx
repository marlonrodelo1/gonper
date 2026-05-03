import Link from 'next/link';
import { asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { galeriaImagenes } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { Icon } from '../_components/icons';
import { EliminarImagenButton } from './eliminar-button';

type CurrentSalon = { id: string; nombre: string } | null;

export default async function GaleriaPage({
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

  const filas = await db
    .select()
    .from(galeriaImagenes)
    .where(eq(galeriaImagenes.salonId, salon.id))
    .orderBy(asc(galeriaImagenes.orden), asc(galeriaImagenes.createdAt));

  const activas = filas.filter((g) => g.activa).length;

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-8">
      <header className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
            Web del salón
          </p>
          <h1 className="tight mt-1 text-[22px] font-medium text-ink md:text-[28px]">
            {filas.length} {filas.length === 1 ? 'imagen' : 'imágenes'}{' '}
            <span className="font-serif-it text-stone/70">
              {filas.length > 0 ? `· ${activas} visibles` : 'en tu galería'}
            </span>
          </h1>
        </div>
        <Link
          href="/panel/galeria/nuevo"
          className="gloss-btn tight inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13.5px] font-medium"
        >
          <Icon.Plus width="15" height="15" /> Nueva imagen
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
            Aún no hay imágenes
          </h2>
          <p className="max-w-md text-[13.5px] text-stone">
            Añade fotos del salón, trabajos realizados o ambiente para que se
            vean en tu web pública.
          </p>
          <Link
            href="/panel/galeria/nuevo"
            className="gloss-btn tight mt-2 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13.5px] font-medium"
          >
            <Icon.Plus width="15" height="15" /> Añadir primera imagen
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filas.map((g) => (
            <div
              key={g.id}
              className="card group relative flex flex-col overflow-hidden"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-cream-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={g.url}
                  alt={g.alt ?? g.titulo ?? 'Imagen de galería'}
                  className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                />
                <div className="absolute top-2 left-2 flex flex-wrap items-center gap-1.5">
                  {g.tag ? (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10.5px] font-medium backdrop-blur"
                      style={{
                        background: 'rgba(255,255,255,0.85)',
                        color: '#7A5A1B',
                      }}
                    >
                      {g.tag}
                    </span>
                  ) : null}
                  {!g.activa && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10.5px] font-medium backdrop-blur"
                      style={{
                        background: 'rgba(107,99,86,0.85)',
                        color: '#FFF',
                      }}
                    >
                      Oculta
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 p-3">
                <div className="min-w-0">
                  <div className="tight truncate text-[13.5px] font-medium text-ink">
                    {g.titulo ?? <span className="text-stone/60">Sin título</span>}
                  </div>
                  {g.alt ? (
                    <div className="truncate text-[11.5px] text-stone">
                      {g.alt}
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    {g.activa ? (
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
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/panel/galeria/${g.id}/editar`}
                      className="tight inline-flex h-7 items-center justify-center rounded-full border border-line bg-paper px-3 text-[12px] font-medium text-ink hover:bg-cream"
                    >
                      Editar
                    </Link>
                    <EliminarImagenButton id={g.id} titulo={g.titulo ?? ''} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
