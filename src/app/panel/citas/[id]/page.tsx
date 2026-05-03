import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { citas, clientes, profesionales, servicios } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';

import { Icon } from '@/app/panel/_components/icons';
import {
  estadoMeta,
  type EstadoCita,
} from '@/app/panel/_components/cita-row';

import {
  confirmarCitaForm,
  completarCitaForm,
} from '../actions';
import { CancelarCitaButton } from '../_components/cancelar-cita-button';
import { NoShowCitaButton } from '../_components/no-show-cita-button';

function fmtHora(fecha: Date, tz: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
    hour12: false,
  }).format(fecha);
}

function fmtFechaHora(fecha: Date | null, tz: string): string {
  if (!fecha) return '—';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
  }).format(fecha);
}

function fechaRelativa(fecha: Date, tz: string): string {
  const fmt = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: tz,
  });
  const hoy = new Date();
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);
  const manana = new Date(hoy);
  manana.setDate(hoy.getDate() + 1);

  const dia = (d: Date) =>
    new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: tz,
    }).format(d);

  if (dia(fecha) === dia(hoy)) return 'Hoy';
  if (dia(fecha) === dia(manana)) return 'Mañana';
  if (dia(fecha) === dia(ayer)) return 'Ayer';
  const txt = fmt.format(fecha);
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

function shortId(id: string): string {
  // muestra los últimos 4 chars como "#XXXX"
  return `#${id.slice(-4).toUpperCase()}`;
}

function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const origenLabel: Record<string, string> = {
  manual: 'Manual',
  dueno: 'Dueño',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  web: 'Web',
};

export default async function DetalleCitaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const salon = (await getCurrentSalon()) as
    | { id: string; timezone: string | null }
    | null;
  if (!salon) notFound();

  const tz = salon.timezone ?? 'Europe/Madrid';

  const [row] = await db
    .select({
      cita: citas,
      cliente: clientes,
      servicio: servicios,
      profesional: profesionales,
    })
    .from(citas)
    .innerJoin(clientes, eq(citas.clienteId, clientes.id))
    .innerJoin(servicios, eq(citas.servicioId, servicios.id))
    .innerJoin(profesionales, eq(citas.profesionalId, profesionales.id))
    .where(and(eq(citas.id, id), eq(citas.salonId, salon.id)))
    .limit(1);

  if (!row) notFound();

  const { cita, cliente, servicio, profesional } = row;
  const estado = cita.estado as EstadoCita;
  const m = estadoMeta[estado];

  const esPendiente = estado === 'pendiente';
  const esConfirmada = estado === 'confirmada';
  const esActiva = esPendiente || esConfirmada;

  const sugerirDeposito = (cliente.totalNoShows ?? 0) >= 2;
  const dia = fechaRelativa(cita.inicio, tz);

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-8">
      {/* Header */}
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="pill"
            style={{ background: m.bg, color: m.fg }}
          >
            <span className="pill-dot" style={{ background: m.dot }} />
            {m.label}
          </span>
          <span className="font-mono text-[12.5px] text-stone">
            {shortId(cita.id)}
          </span>
        </div>
        <Link
          href="/panel/hoy"
          className="card-tight tight inline-flex items-center gap-2 px-4 py-2.5 text-[13px] text-ink hover:bg-cream"
        >
          <Icon.X width="13" height="13" />
          Volver
        </Link>
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        {/* Hero */}
        <section className="card flex flex-col gap-4 p-5 md:p-8">
          <div className="flex flex-col gap-2">
            <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
              Cita
            </span>
            <h1 className="tight text-[24px] font-medium leading-tight text-ink md:text-[32px]">
              {servicio.nombre}{' '}
              <span className="font-serif-it text-stone/70">
                con {profesional.nombre}
              </span>
            </h1>
            <p className="text-[14px] text-stone">
              {dia} ·{' '}
              <span className="tabular font-mono text-ink">
                {fmtHora(cita.inicio, tz)}
              </span>{' '}
              ·{' '}
              <span className="tabular">
                {servicio.duracionMin} min
              </span>{' '}
              ·{' '}
              <span className="tabular font-mono text-ink">
                {Number(cita.precioEur).toFixed(0)} €
              </span>
            </p>
          </div>
        </section>

        <div className="rule" />

        {/* Cliente */}
        <section className="card-tight flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line bg-cream-2 text-[14px] font-medium text-ink">
            {iniciales(cliente.nombre) || '·'}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="tight flex items-center gap-2 text-[15px] font-medium text-ink">
              <span className="truncate">{cliente.nombre}</span>
              {(cliente.totalNoShows ?? 0) >= 2 ? (
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] uppercase tracking-[0.16em]"
                  style={{
                    background: 'rgba(177,72,72,0.10)',
                    color: '#B14848',
                  }}
                >
                  {cliente.totalNoShows} no-shows
                </span>
              ) : null}
            </div>
            <div className="text-[12.5px] text-stone">
              {cliente.telefono ?? '—'} · {cliente.totalCitas ?? 0} visita
              {(cliente.totalCitas ?? 0) === 1 ? '' : 's'}
            </div>
          </div>
          <Link
            href={`/panel/clientes/${cliente.id}`}
            className="tight inline-flex items-center gap-1.5 text-[12.5px] text-terracotta hover:text-terracotta-2"
          >
            Ver ficha
            <Icon.Arrow width="12" height="12" />
          </Link>
        </section>

        {/* Sugerencia de depósito */}
        {sugerirDeposito ? (
          <div
            className="flex items-start gap-3 rounded-2xl border px-5 py-4"
            style={{
              borderColor: 'rgba(177,72,72,0.35)',
              background: '#F1D6D6',
              color: '#7C2E2E',
            }}
          >
            <span className="mt-0.5 text-terracotta">
              <Icon.Sparkle width="16" height="16" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="tight text-[14px] font-medium">
                Cliente con histórico de no-shows
              </p>
              <p className="text-[13px] text-[#7C2E2E]/85">
                Considera pedir depósito para esta cita. Reduce el riesgo de
                ausencia.
              </p>
            </div>
          </div>
        ) : null}

        <div className="rule" />

        {/* Cita info */}
        <section className="card-tight flex flex-col gap-4 p-6">
          <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
            Detalle
          </span>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-[13.5px]">
            <Field label="Notas">
              {cita.notas ? (
                <p className="whitespace-pre-wrap text-ink/85">{cita.notas}</p>
              ) : (
                <span className="text-stone/60">Sin notas</span>
              )}
            </Field>
            <Field label="Origen">
              <span className="text-ink/85">
                {origenLabel[cita.origen] ?? cita.origen}
              </span>
            </Field>
            <Field label="Recordatorio enviado">
              <span className="tabular font-mono text-ink/85">
                {fmtFechaHora(cita.recordatorioEnviadoAt, tz)}
              </span>
            </Field>
            <Field label="Confirmada">
              <span className="tabular font-mono text-ink/85">
                {fmtFechaHora(cita.confirmadaAt, tz)}
              </span>
            </Field>
            <Field label="Cancelada">
              <span className="tabular font-mono text-ink/85">
                {fmtFechaHora(cita.canceladaAt, tz)}
              </span>
            </Field>
            {cita.canceladaPor ? (
              <Field label="Cancelada por">
                <span className="text-ink/85">{cita.canceladaPor}</span>
              </Field>
            ) : null}
            {cita.motivoCancelacion ? (
              <div className="sm:col-span-2">
                <Field label="Motivo cancelación">
                  <p className="whitespace-pre-wrap text-ink/85">
                    {cita.motivoCancelacion}
                  </p>
                </Field>
              </div>
            ) : null}
          </dl>
        </section>

        <div className="rule" />

        {/* Acciones */}
        <section className="card-tight flex flex-col gap-4 p-6">
          <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
            Acciones
          </span>

          {esActiva ? (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {esPendiente ? (
                <form action={confirmarCitaForm}>
                  <input type="hidden" name="id" value={cita.id} />
                  <button
                    type="submit"
                    className="gloss-btn tight w-full rounded-full px-5 py-3 text-[13.5px] font-medium"
                  >
                    Confirmar
                  </button>
                </form>
              ) : null}
              {esConfirmada ? (
                <form action={completarCitaForm}>
                  <input type="hidden" name="id" value={cita.id} />
                  <button
                    type="submit"
                    className="gloss-btn tight w-full rounded-full px-5 py-3 text-[13.5px] font-medium"
                  >
                    Marcar como completada
                  </button>
                </form>
              ) : null}
              <CancelarCitaButton
                citaId={cita.id}
                className="card-tight tight w-full rounded-full px-5 py-3 text-[13.5px] font-medium text-[#7C2E2E] hover:bg-[#F1D6D6]/40"
              />
              <NoShowCitaButton
                citaId={cita.id}
                className="card-tight tight w-full rounded-full px-5 py-3 text-[13.5px] font-medium text-[#7C2E2E] hover:bg-[#F1D6D6]/40"
              />
            </div>
          ) : (
            <p className="text-[13.5px] text-stone">
              Esta cita está en estado{' '}
              <strong className="text-ink">{m.label.toLowerCase()}</strong> y
              ya no admite cambios.
            </p>
          )}
        </section>

        <section className="flex justify-start pt-2">
          <Link
            href="/panel/hoy"
            className="tight text-[12.5px] text-stone hover:text-ink"
          >
            ← Volver a Hoy
          </Link>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[10px] uppercase tracking-[0.2em] text-stone/70">
        {label}
      </dt>
      <dd className="text-[13.5px]">{children}</dd>
    </div>
  );
}
