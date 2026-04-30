import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { horarios, profesionales, salones, servicios } from '@/lib/db/schema';

const NOMBRES_DIAS = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];

function formatPrecio(eur: string | number): string {
  const n = typeof eur === 'string' ? Number(eur) : eur;
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(n);
}

function formatDuracion(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

function formatHora(hhmmss: string): string {
  // postgres time es 'HH:MM:SS'
  return hhmmss.slice(0, 5);
}

const TIPO_NEGOCIO_LABEL: Record<string, string> = {
  barberia: 'Barbería',
  peluqueria: 'Peluquería',
  estetica: 'Centro de estética',
  manicura: 'Manicura',
  otro: 'Salón',
};

export default async function SalonPublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [salon] = await db
    .select()
    .from(salones)
    .where(eq(salones.slug, slug))
    .limit(1);

  if (!salon || !salon.activo) {
    notFound();
  }

  const [serviciosActivos, profesionalesActivos, tramosHorario] =
    await Promise.all([
      db
        .select()
        .from(servicios)
        .where(
          and(eq(servicios.salonId, salon.id), eq(servicios.activo, true)),
        )
        .orderBy(asc(servicios.orden), asc(servicios.createdAt)),
      db
        .select()
        .from(profesionales)
        .where(
          and(
            eq(profesionales.salonId, salon.id),
            eq(profesionales.activo, true),
          ),
        )
        .orderBy(asc(profesionales.orden), asc(profesionales.nombre)),
      db
        .select()
        .from(horarios)
        .where(eq(horarios.salonId, salon.id))
        .orderBy(asc(horarios.diaSemana), asc(horarios.inicio)),
    ]);

  // Agrupar horarios por día (1=Lunes ... 0=Domingo) → orden Lun-Dom
  const horarioPorDia: Record<number, { inicio: string; fin: string }[]> = {
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
    0: [],
  };
  for (const t of tramosHorario) {
    horarioPorDia[t.diaSemana]?.push({
      inicio: t.inicio as string,
      fin: t.fin as string,
    });
  }

  const ordenDias: number[] = [1, 2, 3, 4, 5, 6, 0];

  const tipoLabel =
    TIPO_NEGOCIO_LABEL[salon.tipoNegocio] ?? salon.tipoNegocio;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14">
        {/* Hero */}
        <header className="flex flex-col items-center gap-3 text-center">
          <h1 className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
            {salon.nombre}
          </h1>
          <p className="text-base text-zinc-600 dark:text-zinc-400">
            {tipoLabel}
          </p>
          {salon.direccion && (
            <p className="text-sm text-zinc-500 dark:text-zinc-500">
              📍 {salon.direccion}
            </p>
          )}
        </header>

        {/* Reservar */}
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            Reservar tu cita
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Elige el canal que prefieras.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            {salon.telegramBotUsername && (
              <a
                href={`https://t.me/${salon.telegramBotUsername}?start=${salon.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-[#0088cc] px-4 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
              >
                📱 Reservar por Telegram
              </a>
            )}
            <Link
              href={`/s/${salon.slug}/reservar`}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
            >
              🌐 Reservar por web
            </Link>
          </div>
        </section>

        {/* Servicios */}
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            Servicios
          </h2>
          {serviciosActivos.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
              Aún no hay servicios publicados.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
              {serviciosActivos.map((s) => (
                <li
                  key={s.id}
                  className="flex items-start justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-950 dark:text-zinc-50">
                      {s.nombre}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {formatDuracion(s.duracionMin)}
                    </p>
                  </div>
                  <div className="shrink-0 text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                    {formatPrecio(s.precioEur)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Equipo */}
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            Equipo
          </h2>
          {profesionalesActivos.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
              Aún no hay profesionales publicados.
            </p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2">
              {profesionalesActivos.map((p) => (
                <li
                  key={p.id}
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                >
                  <span
                    className="inline-block size-2.5 rounded-full"
                    style={{ backgroundColor: p.colorHex ?? '#3b82f6' }}
                    aria-hidden
                  />
                  {p.nombre}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Horario */}
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            Horario
          </h2>
          <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800">
            {ordenDias.map((d, idx) => {
              const tramos = horarioPorDia[d];
              return (
                <li
                  key={d}
                  className="flex items-start justify-between gap-3 py-2 text-sm"
                >
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {NOMBRES_DIAS[idx]}
                  </span>
                  <span className="text-right text-zinc-600 dark:text-zinc-400">
                    {tramos.length === 0 ? (
                      <span className="text-zinc-400 dark:text-zinc-500">
                        Cerrado
                      </span>
                    ) : (
                      tramos
                        .map(
                          (t) =>
                            `${formatHora(t.inicio)} – ${formatHora(t.fin)}`,
                        )
                        .join(' · ')
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Footer */}
        {(salon.telefono || salon.email) && (
          <footer className="flex flex-col items-center gap-1 pt-2 text-center text-xs text-zinc-500 dark:text-zinc-500">
            {salon.telefono && (
              <a
                href={`tel:${salon.telefono}`}
                className="hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                📞 {salon.telefono}
              </a>
            )}
            {salon.email && (
              <a
                href={`mailto:${salon.email}`}
                className="hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                ✉️ {salon.email}
              </a>
            )}
          </footer>
        )}
      </div>
    </div>
  );
}
