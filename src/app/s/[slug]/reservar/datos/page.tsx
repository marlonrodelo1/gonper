import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { and, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { profesionales, salones, servicios } from '@/lib/db/schema';
import { getAccentVars } from '@/lib/salon-publico/accent';
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
  const styleVars = getAccentVars(salon.tipoNegocio);

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
    <div style={styleVars} className="bg-cream text-ink min-h-screen">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10 sm:py-14">
        <header className="flex flex-col gap-3">
          <Link
            href={`/s/${salon.slug}/reservar?servicio=${servicio.id}&profesional=${profesional.id}`}
            className="text-[13px] text-stone hover:text-ink transition w-fit"
          >
            ← Cambiar hora
          </Link>
          <h1
            className="tight font-medium text-ink"
            style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
          >
            Tus <span className="font-serif-it">datos</span>
          </h1>
        </header>

        <div
          className="rounded-3xl p-5 border"
          style={{
            background: 'var(--gomper-accent-blush)',
            borderColor: 'var(--gomper-accent-soft)',
          }}
        >
          <p className="text-[14px] font-medium text-ink">
            {servicio.nombre} con {profesional.nombre}
          </p>
          <p className="mt-1 text-[13px] text-ink/80">
            {fechaTxt.charAt(0).toUpperCase() + fechaTxt.slice(1)}
          </p>
          <p className="mt-1 text-[12px] text-stone tabular-nums">
            {formatPrecio(servicio.precioEur)} · {servicio.duracionMin} min
          </p>
        </div>

        <form
          action={crearReservaWeb}
          className="flex flex-col gap-4 rounded-3xl border border-line bg-paper p-5 sm:p-6"
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
              className="text-[12px] uppercase tracking-[0.18em] text-stone/80"
            >
              Nombre <span style={{ color: 'var(--gomper-accent-2)' }}>*</span>
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              required
              maxLength={120}
              autoComplete="name"
              className="h-11 rounded-xl border border-line bg-paper px-3 text-[14px] text-ink focus:outline-none focus:border-ink/30 focus:ring-2 focus:ring-[color:var(--gomper-accent-soft)]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="telefono"
              className="text-[12px] uppercase tracking-[0.18em] text-stone/80"
            >
              Teléfono <span style={{ color: 'var(--gomper-accent-2)' }}>*</span>
            </label>
            <input
              id="telefono"
              name="telefono"
              type="tel"
              required
              maxLength={30}
              autoComplete="tel"
              className="h-11 rounded-xl border border-line bg-paper px-3 text-[14px] text-ink focus:outline-none focus:border-ink/30 focus:ring-2 focus:ring-[color:var(--gomper-accent-soft)]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              className="text-[12px] uppercase tracking-[0.18em] text-stone/80"
            >
              Email <span style={{ color: 'var(--gomper-accent-2)' }}>*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              maxLength={200}
              autoComplete="email"
              className="h-11 rounded-xl border border-line bg-paper px-3 text-[14px] text-ink focus:outline-none focus:border-ink/30 focus:ring-2 focus:ring-[color:var(--gomper-accent-soft)]"
            />
            <p className="text-[12px] text-stone/80">
              Usaremos tu email para enviarte la confirmación y el recordatorio de la cita.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="notas"
              className="text-[12px] uppercase tracking-[0.18em] text-stone/80"
            >
              Notas{' '}
              <span className="text-[10px] font-normal tracking-normal text-stone/60 normal-case">
                (opcional)
              </span>
            </label>
            <textarea
              id="notas"
              name="notas"
              rows={3}
              maxLength={500}
              className="rounded-xl border border-line bg-paper px-3 py-2.5 text-[14px] text-ink focus:outline-none focus:border-ink/30 focus:ring-2 focus:ring-[color:var(--gomper-accent-soft)]"
            />
          </div>

          <input type="hidden" name="enviar_email" value="1" />

          <button
            type="submit"
            className="mt-1 inline-flex h-12 items-center justify-center rounded-full px-5 text-[14px] font-medium accent-btn"
          >
            Confirmar reserva
          </button>
        </form>
      </div>
    </div>
  );
}
