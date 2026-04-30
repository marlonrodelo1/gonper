import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { and, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { profesionales, salones, servicios } from '@/lib/db/schema';
import { crearReservaWeb } from '../../actions';

function formatPrecio(eur: string | number): string {
  const n = typeof eur === 'string' ? Number(eur) : eur;
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(n);
}

function formatFechaCompleta(d: Date, tz: string): string {
  const fecha = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: tz,
  }).format(d);
  const hora = new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
  }).format(d);
  return `${fecha} a las ${hora}`;
}

export default async function DatosReservaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    slot?: string;
    servicio?: string;
    profesional?: string;
  }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  if (!sp.slot || !sp.servicio || !sp.profesional) {
    redirect(`/s/${slug}/reservar`);
  }

  const slotDate = new Date(sp.slot);
  if (isNaN(slotDate.getTime())) {
    redirect(`/s/${slug}/reservar?error=${encodeURIComponent('Hora inválida')}`);
  }

  const [salon] = await db
    .select()
    .from(salones)
    .where(eq(salones.slug, slug))
    .limit(1);

  if (!salon || !salon.activo) {
    notFound();
  }

  const tz = salon.timezone ?? 'Europe/Madrid';

  const [servicio] = await db
    .select()
    .from(servicios)
    .where(
      and(eq(servicios.id, sp.servicio), eq(servicios.salonId, salon.id)),
    )
    .limit(1);

  const [profesional] = await db
    .select()
    .from(profesionales)
    .where(
      and(
        eq(profesionales.id, sp.profesional),
        eq(profesionales.salonId, salon.id),
      ),
    )
    .limit(1);

  if (!servicio || !servicio.activo || !profesional || !profesional.activo) {
    redirect(
      `/s/${slug}/reservar?error=${encodeURIComponent(
        'El servicio o profesional ya no está disponible',
      )}`,
    );
  }

  const fechaTxt = formatFechaCompleta(slotDate, tz);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
        <header className="flex flex-col gap-2">
          <Link
            href={`/s/${salon.slug}/reservar?servicio=${servicio.id}&profesional=${profesional.id}`}
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            ← Cambiar hora
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-3xl">
            Tus datos
          </h1>
        </header>

        <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 text-sm text-purple-900 dark:border-purple-900/50 dark:bg-purple-950/20 dark:text-purple-200">
          <p className="font-medium">
            Reserva: {servicio.nombre} con {profesional.nombre}
          </p>
          <p className="mt-1 text-purple-800 dark:text-purple-300">
            {fechaTxt.charAt(0).toUpperCase() + fechaTxt.slice(1)}
          </p>
          <p className="mt-1 text-xs text-purple-700 dark:text-purple-400">
            {formatPrecio(servicio.precioEur)} · {servicio.duracionMin} min
          </p>
        </div>

        <form
          action={crearReservaWeb}
          className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <input type="hidden" name="slug" value={salon.slug} />
          <input type="hidden" name="slot" value={slotDate.toISOString()} />
          <input type="hidden" name="servicio_id" value={servicio.id} />
          <input
            type="hidden"
            name="profesional_id"
            value={profesional.id}
          />

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="nombre"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              required
              maxLength={120}
              autoComplete="name"
              className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="telefono"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Teléfono <span className="text-red-500">*</span>
            </label>
            <input
              id="telefono"
              name="telefono"
              type="tel"
              required
              maxLength={30}
              autoComplete="tel"
              className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Email{' '}
              <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                (opcional, para recibir confirmación)
              </span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              maxLength={200}
              autoComplete="email"
              className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="notas"
              className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Notas{' '}
              <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                (opcional)
              </span>
            </label>
            <textarea
              id="notas"
              name="notas"
              rows={3}
              maxLength={500}
              className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          <label className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              name="enviar_email"
              defaultChecked
              className="mt-0.5 size-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
            />
            <span>Acepto recibir un email de confirmación</span>
          </label>

          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
          >
            Confirmar reserva
          </button>
        </form>
      </div>
    </div>
  );
}
