import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { citas, profesionales, salones, servicios } from '@/lib/db/schema';
import { getAccentVars } from '@/lib/salon-publico/accent';
import { Icon } from '@/components/salon-publico/icons';

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
  const styleVars = getAccentVars(row.salon.tipoNegocio);

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
    <div style={styleVars} className="bg-cream text-ink min-h-screen">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12 sm:py-16">
        <div className="flex flex-col items-center gap-4 text-center">
          <span
            className="grid h-16 w-16 place-items-center rounded-full"
            style={{ background: 'var(--gestori-accent-soft)' }}
          >
            <Icon.Check
              width="28"
              height="28"
              style={{ color: 'var(--gestori-accent-2)' }}
            />
          </span>
          <h1
            className="tight font-medium text-ink"
            style={{ fontSize: 'clamp(32px, 5vw, 48px)', lineHeight: 1.05 }}
          >
            ¡Reserva <span className="font-serif-it">confirmada</span>!
          </h1>
          <p className="text-[15px] text-stone">
            Te esperamos en {row.salon.nombre}.
          </p>
        </div>

        <section className="rounded-3xl border border-line bg-paper p-5 sm:p-6">
          <h2 className="text-[13px] uppercase tracking-[0.22em] text-stone/80">
            Resumen
          </h2>
          <dl className="mt-4 divide-y divide-line text-[15px]">
            <div className="flex justify-between gap-3 py-2.5">
              <dt className="text-stone">Servicio</dt>
              <dd className="text-right font-medium text-ink">
                {row.servicio.nombre}
              </dd>
            </div>
            <div className="flex justify-between gap-3 py-2.5">
              <dt className="text-stone">Profesional</dt>
              <dd className="text-right font-medium text-ink">
                {row.profesional.nombre}
              </dd>
            </div>
            <div className="flex justify-between gap-3 py-2.5">
              <dt className="text-stone">Fecha</dt>
              <dd className="text-right font-medium text-ink">
                {fecha.charAt(0).toUpperCase() + fecha.slice(1)}
              </dd>
            </div>
            <div className="flex justify-between gap-3 py-2.5">
              <dt className="text-stone">Hora</dt>
              <dd className="text-right font-medium tabular-nums text-ink">
                {hora}
              </dd>
            </div>
            <div className="flex justify-between gap-3 py-2.5">
              <dt className="text-stone">Precio</dt>
              <dd className="text-right font-medium tabular-nums text-ink">
                {formatPrecio(row.cita.precioEur)}
              </dd>
            </div>
          </dl>
        </section>

        {emailEnviado && (
          <p className="text-center text-[14px] text-stone">
            Te hemos enviado un email a <strong className="text-ink">{sp.email}</strong> con
            los detalles.
          </p>
        )}

        <Link
          href={`/s/${row.salon.slug}`}
          className="inline-flex h-12 items-center justify-center rounded-full border border-line bg-paper px-5 text-[15px] font-medium text-ink transition hover:border-ink/30"
        >
          Volver a {row.salon.nombre}
        </Link>
      </div>
    </div>
  );
}
