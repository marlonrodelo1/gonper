import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { citas, clientes, profesionales, servicios } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
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
import { Icon } from '../../_components/icons';
import { estadoMeta, type EstadoCita } from '../../_components/cita-row';
import {
  eliminarCliente,
  toggleRequiereDeposito,
} from '../actions';

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

function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-[0.22em] text-stone/70">
        {label}
      </span>
      <span className="tight tabular text-[24px] font-medium text-ink">
        {value}
      </span>
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

  const totalFacturado = `${Number(cliente.totalFacturado).toFixed(0)} €`;

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-8">
      <Link
        href="/panel/clientes"
        className="text-[12.5px] text-stone hover:text-ink"
      >
        ← Clientes
      </Link>

      <header className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-line bg-cream-2 text-[18px] font-medium text-ink/80">
            {iniciales(cliente.nombre) || '·'}
          </div>
          <div>
            <h1 className="tight text-[28px] font-medium text-ink">
              {cliente.nombre}
            </h1>
            <p className="mt-1 text-[13.5px] text-stone">
              <span className="font-serif-it">con</span>{' '}
              <span className="tabular text-ink">{cliente.totalCitas}</span>{' '}
              visita{cliente.totalCitas === 1 ? '' : 's'},{' '}
              <span className="tabular text-ink">{totalFacturado}</span> totales
              <span className="font-serif-it text-stone/70">
                {' '}
                · cliente desde {fmtFecha(cliente.createdAt, tz)}
              </span>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {cliente.telegramId !== null &&
                cliente.telegramId !== undefined && (
                  <span
                    className="pill"
                    style={{
                      background: 'rgba(43,40,35,0.06)',
                      color: '#2B2823',
                    }}
                  >
                    <Icon.Tg width="11" height="11" />
                    Telegram
                  </span>
                )}
              {cliente.requiereDeposito && (
                <span
                  className="pill"
                  style={{
                    background: 'rgba(197,142,44,0.14)',
                    color: '#7A5A1B',
                  }}
                >
                  <span
                    className="pill-dot"
                    style={{ background: '#C58E2C' }}
                  />
                  Depósito requerido
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href={`/panel/clientes/${id}/editar`}
            className="tight inline-flex items-center justify-center gap-1.5 rounded-full border border-line bg-paper px-4 py-2 text-[13px] font-medium text-ink hover:bg-cream"
          >
            Editar
          </Link>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <button
                  type="button"
                  className="tight inline-flex items-center justify-center rounded-full border border-line bg-paper px-4 py-2 text-[13px] font-medium hover:bg-paper/80"
                  style={{ color: '#B14848' }}
                >
                  Eliminar
                </button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  ¿Eliminar a {cliente.nombre}?
                </AlertDialogTitle>
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
                    className="bg-[#B14848] text-white hover:bg-[#7C2E2E]"
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
        <div
          className="rounded-xl border px-4 py-3 text-[13.5px]"
          style={{
            background: '#F1D6D6',
            borderColor: 'rgba(177,72,72,0.4)',
            color: '#7C2E2E',
          }}
        >
          {sp.error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <section className="card p-6">
            <div className="mb-4 text-[11px] uppercase tracking-[0.22em] text-stone/70">
              Datos de contacto
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cream-2 text-stone">
                  <Icon.Phone width="13" height="13" />
                </span>
                <span className="text-[14px] text-ink">
                  {cliente.telefono ?? (
                    <span className="text-stone">— sin teléfono</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cream-2 text-stone text-[12px]">
                  @
                </span>
                <span className="text-[14px] text-ink">
                  {cliente.email ?? (
                    <span className="text-stone">— sin email</span>
                  )}
                </span>
              </div>
              {cliente.whatsappPhone && (
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cream-2 text-stone text-[11px]">
                    WA
                  </span>
                  <span className="text-[14px] text-ink">
                    {cliente.whatsappPhone}
                  </span>
                </div>
              )}
              {(cliente.telegramUsername ||
                cliente.telegramId !== null) && (
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cream-2 text-stone">
                    <Icon.Tg width="13" height="13" />
                  </span>
                  <span className="text-[14px] text-ink">
                    {cliente.telegramUsername
                      ? `@${cliente.telegramUsername}`
                      : `Telegram ID ${String(cliente.telegramId)}`}
                  </span>
                </div>
              )}
            </div>
            {cliente.notasPrivadas ? (
              <>
                <div className="rule my-5" />
                <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-stone/70">
                  Notas privadas
                </div>
                <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink">
                  {cliente.notasPrivadas}
                </p>
              </>
            ) : (
              <>
                <div className="rule my-5" />
                <p className="font-serif-it text-[13px] text-stone/70">
                  Sin notas. Edita el cliente para añadir información interna.
                </p>
              </>
            )}
          </section>

          <section className="card p-6">
            <div className="mb-4 text-[11px] uppercase tracking-[0.22em] text-stone/70">
              Métricas
            </div>
            <div className="grid grid-cols-2 gap-5">
              <Stat label="Total citas" value={String(cliente.totalCitas)} />
              <Stat label="No-shows" value={String(cliente.totalNoShows)} />
              <Stat label="Total facturado" value={totalFacturado} />
              <Stat
                label="Última visita"
                value={fmtFecha(cliente.ultimaVisita, tz)}
              />
            </div>
            <div className="rule my-5" />
            <form
              action={toggleBound}
              className="flex items-center justify-between gap-3"
            >
              <div>
                <p className="tight text-[14px] font-medium text-ink">
                  Requiere depósito
                </p>
                <p className="text-[12px] text-stone">
                  {cliente.requiereDeposito
                    ? 'Activado: se le pedirá depósito al reservar.'
                    : 'Desactivado: reservas normales sin depósito.'}
                </p>
              </div>
              <button
                type="submit"
                className={`tight inline-flex h-8 shrink-0 items-center justify-center rounded-full border px-4 text-[12px] font-medium transition-colors ${
                  cliente.requiereDeposito
                    ? 'border-transparent text-[#7A5A1B] hover:opacity-80'
                    : 'border-line bg-paper text-ink hover:bg-cream'
                }`}
                style={
                  cliente.requiereDeposito
                    ? { background: 'rgba(197,142,44,0.14)' }
                    : undefined
                }
              >
                {cliente.requiereDeposito ? 'Quitar' : 'Activar'}
              </button>
            </form>
          </section>
        </div>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
                Historial de citas
              </div>
              <div className="tight mt-0.5 text-[16px] font-medium text-ink">
                {historial.length === 20
                  ? 'Últimas 20'
                  : `${historial.length} ${historial.length === 1 ? 'cita' : 'citas'}`}
              </div>
            </div>
          </div>
          {historial.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <p className="tight text-[15px] font-medium text-ink">
                Sin historial
              </p>
              <p className="mt-1 text-[12.5px] text-stone">
                Aún no hay citas registradas para este cliente.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-line/70">
              {historial.map(({ cita, servicio, profesional }) => {
                const m =
                  estadoMeta[cita.estado as EstadoCita] ??
                  estadoMeta.pendiente;
                return (
                  <li
                    key={cita.id}
                    className="flex flex-col gap-1 px-5 py-3.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="tight tabular font-mono text-[13.5px] text-ink">
                        {fmtFechaHora(cita.inicio, tz)}
                      </span>
                      <span
                        className="pill"
                        style={{ background: m.bg, color: m.fg }}
                      >
                        <span
                          className="pill-dot"
                          style={{ background: m.dot }}
                        />
                        {m.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[12px] text-stone">
                      <span>{servicio.nombre}</span>
                      <span aria-hidden>·</span>
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="inline-block size-2 rounded-full"
                          style={{
                            backgroundColor:
                              profesional.colorHex ?? '#C5562C',
                          }}
                          aria-hidden
                        />
                        {profesional.nombre}
                      </span>
                      <span aria-hidden>·</span>
                      <span className="tabular font-mono font-medium text-ink">
                        {Number(cita.precioEur).toFixed(0)}€
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
  );
}
