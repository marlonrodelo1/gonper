import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { citas, clientes, profesionales, servicios } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  eliminarCliente,
  toggleRequiereDeposito,
} from '../actions';

type EstadoCita =
  | 'pendiente'
  | 'confirmada'
  | 'cancelada'
  | 'no_show'
  | 'completada';

const estadoStyles: Record<EstadoCita, { label: string; className: string }> = {
  completada: {
    label: 'Completada',
    className: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  },
  confirmada: {
    label: 'Confirmada',
    className:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  pendiente: {
    label: 'Pendiente',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  },
  no_show: {
    label: 'No-show',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  },
  cancelada: {
    label: 'Cancelada',
    className: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  },
};

function fmtFecha(fecha: Date | null, tz: string): string {
  if (!fecha) return '—';
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeZone: tz,
  }).format(fecha);
}

function fmtHora(fecha: Date, tz: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
  }).format(fecha);
}

function fmtFechaHora(fecha: Date, tz: string): string {
  const f = new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeZone: tz,
  }).format(fecha);
  return `${f} · ${fmtHora(fecha, tz)}`;
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </dt>
      <dd className="text-sm text-zinc-900 dark:text-zinc-100">
        {value ?? '—'}
      </dd>
    </div>
  );
}

export default async function ClienteFichaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const salon = (await getCurrentSalon()) as
    | { id: string; timezone: string | null }
    | null;
  if (!salon) notFound();

  const tz = salon.timezone ?? 'Europe/Madrid';

  const [cliente] = await db
    .select()
    .from(clientes)
    .where(and(eq(clientes.id, id), eq(clientes.salonId, salon.id)))
    .limit(1);

  if (!cliente) notFound();

  const historial = await db
    .select({ cita: citas, servicio: servicios, profesional: profesionales })
    .from(citas)
    .innerJoin(servicios, eq(citas.servicioId, servicios.id))
    .innerJoin(profesionales, eq(citas.profesionalId, profesionales.id))
    .where(and(eq(citas.salonId, salon.id), eq(citas.clienteId, id)))
    .orderBy(desc(citas.inicio))
    .limit(20);

  const eliminarBound = eliminarCliente.bind(null, id);
  const toggleBound = toggleRequiereDeposito.bind(null, id);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/panel/clientes"
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            ← Clientes
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              {cliente.nombre}
            </h1>
            {cliente.telegramId !== null && cliente.telegramId !== undefined && (
              <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                📱 Telegram
              </span>
            )}
            {cliente.requiereDeposito && (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                Depósito requerido
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Cliente desde {fmtFecha(cliente.createdAt, tz)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/panel/clientes/${id}/editar`}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
          >
            Editar
          </Link>
          <AlertDialog>
            <AlertDialogTrigger
              render={<Button variant="destructive">Eliminar</Button>}
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar a {cliente.nombre}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Si el cliente tiene citas
                  registradas, no podrá eliminarse hasta que se limpie su
                  historial.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <form action={eliminarBound} className="contents">
                  <AlertDialogAction
                    type="submit"
                    variant="destructive"
                  >
                    Eliminar
                  </AlertDialogAction>
                </form>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      {sp.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {sp.error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="mb-4 text-base font-semibold text-zinc-950 dark:text-zinc-50">
              Información personal
            </h2>
            <dl className="grid grid-cols-2 gap-4">
              <Field label="Nombre" value={cliente.nombre} />
              <Field label="Teléfono" value={cliente.telefono} />
              <Field label="Email" value={cliente.email} />
              <Field
                label="Telegram"
                value={
                  cliente.telegramUsername
                    ? `@${cliente.telegramUsername}`
                    : null
                }
              />
              <Field label="WhatsApp" value={cliente.whatsappPhone} />
              <Field
                label="Telegram ID"
                value={
                  cliente.telegramId !== null && cliente.telegramId !== undefined
                    ? String(cliente.telegramId)
                    : null
                }
              />
            </dl>
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="mb-4 text-base font-semibold text-zinc-950 dark:text-zinc-50">
              Métricas
            </h2>
            <dl className="grid grid-cols-2 gap-4">
              <Field label="Total citas" value={cliente.totalCitas} />
              <Field label="No-shows" value={cliente.totalNoShows} />
              <Field
                label="Total facturado"
                value={`${Number(cliente.totalFacturado).toFixed(2)} €`}
              />
              <Field
                label="Última visita"
                value={fmtFecha(cliente.ultimaVisita, tz)}
              />
            </dl>
            <Separator className="my-4" />
            <form
              action={toggleBound}
              className="flex items-center justify-between gap-3"
            >
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Requiere depósito
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {cliente.requiereDeposito
                    ? 'Activado: se le pedirá depósito al reservar.'
                    : 'Desactivado: reservas normales sin depósito.'}
                </p>
              </div>
              <button
                type="submit"
                className={`inline-flex h-8 shrink-0 items-center justify-center rounded-lg border px-3 text-xs font-medium transition-colors ${
                  cliente.requiereDeposito
                    ? 'border-amber-300 bg-amber-100 text-amber-700 hover:bg-amber-200 dark:border-amber-900/40 dark:bg-amber-900/40 dark:text-amber-300'
                    : 'border-border bg-background hover:bg-muted'
                }`}
              >
                {cliente.requiereDeposito ? 'Quitar' : 'Activar'}
              </button>
            </form>
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="mb-2 text-base font-semibold text-zinc-950 dark:text-zinc-50">
              Notas privadas
            </h2>
            {cliente.notasPrivadas ? (
              <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                {cliente.notasPrivadas}
              </p>
            ) : (
              <p className="text-sm italic text-zinc-500 dark:text-zinc-400">
                Sin notas. Edita el cliente para añadir información interna.
              </p>
            )}
          </section>
        </div>

        <div>
          <section className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
                Últimas citas
              </h2>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {historial.length === 20 ? 'Últimas 20' : `${historial.length} totales`}
              </span>
            </div>
            {historial.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
                <span className="text-3xl">📅</span>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Aún no hay citas registradas para este cliente.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {historial.map(({ cita, servicio, profesional }) => {
                  const estado =
                    estadoStyles[cita.estado as EstadoCita] ??
                    estadoStyles.pendiente;
                  return (
                    <li key={cita.id} className="flex flex-col gap-1 px-5 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {fmtFechaHora(cita.inicio, tz)}
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${estado.className}`}
                        >
                          {estado.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <span>{servicio.nombre}</span>
                        <span aria-hidden>·</span>
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="inline-block size-2 rounded-full"
                            style={{
                              backgroundColor: profesional.colorHex ?? '#3b82f6',
                            }}
                            aria-hidden
                          />
                          {profesional.nombre}
                        </span>
                        <span aria-hidden>·</span>
                        <span className="font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
                          {Number(cita.precioEur).toFixed(0)} €
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
