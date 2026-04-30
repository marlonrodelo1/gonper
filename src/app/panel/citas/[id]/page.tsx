import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { citas, clientes, profesionales, servicios } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

import {
  confirmarCitaForm,
  completarCitaForm,
  marcarNoShowForm,
} from '../actions';
import { CancelarCitaButton } from '../_components/cancelar-cita-button';
import { NoShowCitaButton } from '../_components/no-show-cita-button';

type EstadoCita =
  | 'pendiente'
  | 'confirmada'
  | 'cancelada'
  | 'no_show'
  | 'completada';

const estadoStyles: Record<EstadoCita, { label: string; className: string }> = {
  completada: {
    label: 'Completada',
    className:
      'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  },
  confirmada: {
    label: 'Confirmada',
    className:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  pendiente: {
    label: 'Pendiente',
    className:
      'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  },
  no_show: {
    label: 'No-show',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  },
  cancelada: {
    label: 'Cancelada',
    className:
      'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  },
};

function fmtFechaLarga(fecha: Date, tz: string): string {
  const txt = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: tz,
  }).format(fecha);
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

function fmtHora(fecha: Date, tz: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
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
  const estadoMeta = estadoStyles[estado] ?? estadoStyles.pendiente;
  const colorProf = profesional.colorHex ?? '#3b82f6';

  const esActiva = estado === 'pendiente' || estado === 'confirmada';

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Cita
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            {fmtFechaLarga(cita.inicio, tz)}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {fmtHora(cita.inicio, tz)} – {fmtHora(cita.fin, tz)} ·{' '}
            {servicio.duracionMin} min
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${estadoMeta.className}`}
        >
          {estadoMeta.label}
        </span>
      </header>

      <section className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:grid-cols-2">
        <Field label="Cliente">
          <Link
            href={`/panel/clientes/${cliente.id}`}
            className="font-medium text-zinc-950 underline underline-offset-2 hover:text-zinc-700 dark:text-zinc-50 dark:hover:text-zinc-300"
          >
            {cliente.nombre}
          </Link>
          {cliente.telefono ? (
            <span className="block text-xs text-zinc-500 dark:text-zinc-400">
              {cliente.telefono}
            </span>
          ) : null}
          {(cliente.totalNoShows ?? 0) >= 2 ? (
            <span className="mt-1 inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
              {cliente.totalNoShows} no-shows
            </span>
          ) : null}
        </Field>

        <Field label="Profesional">
          <span className="inline-flex items-center gap-2 font-medium text-zinc-950 dark:text-zinc-50">
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ backgroundColor: colorProf }}
              aria-hidden
            />
            {profesional.nombre}
          </span>
        </Field>

        <Field label="Servicio">
          <span className="font-medium text-zinc-950 dark:text-zinc-50">
            {servicio.nombre}
          </span>
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">
            {servicio.duracionMin} min
          </span>
        </Field>

        <Field label="Precio">
          <span className="font-medium tabular-nums text-zinc-950 dark:text-zinc-50">
            {Number(cita.precioEur).toFixed(2)} €
          </span>
        </Field>

        <Field label="Origen">
          <span className="text-zinc-700 dark:text-zinc-300">
            {origenLabel[cita.origen] ?? cita.origen}
          </span>
        </Field>

        <Field label="Creada">
          <span className="text-zinc-700 dark:text-zinc-300">
            {fmtFechaHora(cita.createdAt, tz)}
          </span>
        </Field>

        {cita.notas ? (
          <div className="sm:col-span-2">
            <Field label="Notas">
              <p className="whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
                {cita.notas}
              </p>
            </Field>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Cronología
        </h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <Timeline
            label="Recordatorio enviado"
            value={fmtFechaHora(cita.recordatorioEnviadoAt, tz)}
          />
          <Timeline
            label="Confirmada"
            value={fmtFechaHora(cita.confirmadaAt, tz)}
          />
          <Timeline
            label="Cancelada"
            value={fmtFechaHora(cita.canceladaAt, tz)}
          />
          {cita.canceladaPor ? (
            <Timeline
              label="Cancelada por"
              value={cita.canceladaPor}
            />
          ) : null}
          {cita.motivoCancelacion ? (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Motivo cancelación
              </dt>
              <dd className="mt-1 whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
                {cita.motivoCancelacion}
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      {esActiva ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Acciones
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {estado === 'pendiente' ? (
              <form action={confirmarCitaForm}>
                <input type="hidden" name="id" value={cita.id} />
                <Button type="submit">Confirmar</Button>
              </form>
            ) : null}
            {estado === 'confirmada' ? (
              <form action={completarCitaForm}>
                <input type="hidden" name="id" value={cita.id} />
                <Button type="submit">Marcar como completada</Button>
              </form>
            ) : null}
            <Separator orientation="vertical" className="mx-1 h-6" />
            <CancelarCitaButton citaId={cita.id} />
            <NoShowCitaButton citaId={cita.id} />
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
          Esta cita está en estado <strong>{estadoMeta.label.toLowerCase()}</strong>{' '}
          y ya no admite cambios.
        </section>
      )}

      <div className="flex justify-start">
        <Link
          href="/panel/hoy"
          className="inline-flex h-8 items-center justify-center rounded-lg px-2.5 text-sm font-medium text-zinc-700 hover:bg-muted hover:text-foreground dark:text-zinc-300"
        >
          ← Volver a Hoy
        </Link>
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
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}

function Timeline({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-dashed border-zinc-200 py-1.5 last:border-0 dark:border-zinc-800">
      <dt className="text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="font-medium text-zinc-800 dark:text-zinc-200">{value}</dd>
    </div>
  );
}
