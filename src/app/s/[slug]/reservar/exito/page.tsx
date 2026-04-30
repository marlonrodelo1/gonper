import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { citas, profesionales, salones, servicios } from '@/lib/db/schema';

function formatPrecio(eur: string | number): string {
  const n = typeof eur === 'string' ? Number(eur) : eur;
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(n);
}

export default async function ExitoPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ cita?: string; email?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  if (!sp.cita) {
    notFound();
  }

  const [row] = await db
    .select({
      cita: citas,
      servicio: servicios,
      profesional: profesionales,
      salon: salones,
    })
    .from(citas)
    .innerJoin(servicios, eq(citas.servicioId, servicios.id))
    .innerJoin(profesionales, eq(citas.profesionalId, profesionales.id))
    .innerJoin(salones, eq(citas.salonId, salones.id))
    .where(eq(citas.id, sp.cita))
    .limit(1);

  if (!row || row.salon.slug !== slug) {
    notFound();
  }

  const tz = row.salon.timezone ?? 'Europe/Madrid';
  const fecha = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: tz,
  }).format(row.cita.inicio);
  const hora = new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
  }).format(row.cita.inicio);

  const emailEnviado = sp.email && sp.email !== '';

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12 sm:px-6 sm:py-16">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-5xl">✅</span>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
            ¡Reserva confirmada!
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Te esperamos en {row.salon.nombre}.
          </p>
        </div>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
            Resumen
          </h2>
          <dl className="mt-3 divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
            <div className="flex justify-between gap-3 py-2">
              <dt className="text-zinc-500 dark:text-zinc-400">Servicio</dt>
              <dd className="text-right font-medium text-zinc-900 dark:text-zinc-100">
                {row.servicio.nombre}
              </dd>
            </div>
            <div className="flex justify-between gap-3 py-2">
              <dt className="text-zinc-500 dark:text-zinc-400">Profesional</dt>
              <dd className="text-right font-medium text-zinc-900 dark:text-zinc-100">
                {row.profesional.nombre}
              </dd>
            </div>
            <div className="flex justify-between gap-3 py-2">
              <dt className="text-zinc-500 dark:text-zinc-400">Fecha</dt>
              <dd className="text-right font-medium text-zinc-900 dark:text-zinc-100">
                {fecha.charAt(0).toUpperCase() + fecha.slice(1)}
              </dd>
            </div>
            <div className="flex justify-between gap-3 py-2">
              <dt className="text-zinc-500 dark:text-zinc-400">Hora</dt>
              <dd className="text-right font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                {hora}
              </dd>
            </div>
            <div className="flex justify-between gap-3 py-2">
              <dt className="text-zinc-500 dark:text-zinc-400">Precio</dt>
              <dd className="text-right font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                {formatPrecio(row.cita.precioEur)}
              </dd>
            </div>
          </dl>
        </section>

        {emailEnviado && (
          <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            Te hemos enviado un email a <strong>{sp.email}</strong> con los
            detalles.
          </p>
        )}

        <Link
          href={`/s/${row.salon.slug}`}
          className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Volver a la web del salón
        </Link>
      </div>
    </div>
  );
}
