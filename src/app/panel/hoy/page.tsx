import Link from 'next/link';
import { and, asc, eq, gte, lt } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  citas,
  clientes,
  listaEspera,
  profesionales,
  servicios,
} from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';

import { CitaRow, type EstadoCita } from '../_components/cita-row';
import { Icon } from '../_components/icons';
import { JuanitaPro } from '../_components/juanita-pro';
import { PanelTopbar } from '../_components/panel-topbar';
import { PendingBanner } from '../_components/pending-banner';
import { ScheduleRail } from '../_components/schedule-rail';
import { StatCard } from '../_components/stat-card';

const SPARK_PATHS = {
  facturado: 'M 0 40 L 25 38 L 50 30 L 75 32 L 100 22 L 125 20 L 150 14 L 175 18 L 200 8',
  citas: 'M 0 30 L 30 32 L 60 28 L 90 22 L 120 26 L 150 20 L 180 24 L 200 18',
  noshows: 'M 0 50 L 30 48 L 60 50 L 90 46 L 120 48 L 150 44 L 180 46 L 200 42',
  confirmadas: 'M 0 20 L 25 22 L 50 18 L 75 14 L 100 16 L 125 10 L 150 12 L 175 8 L 200 6',
} as const;

function formatearFechaTopbar(timezone: string): string {
  // ej "Jueves 30 abril"
  const fecha = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: timezone,
  }).format(new Date());
  return fecha.charAt(0).toUpperCase() + fecha.slice(1);
}

function formatearHora(fecha: Date, timezone: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
    hour12: false,
  }).format(fecha);
}

function saludoPorHora(timezone: string): string {
  const hora = parseInt(
    new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      hour12: false,
      timeZone: timezone,
    }).format(new Date()),
    10,
  );
  if (hora >= 6 && hora < 13) return 'Buenos días';
  if (hora >= 13 && hora < 21) return 'Buenas tardes';
  return 'Buenas noches';
}

export default async function HoyPage() {
  const salon = (await getCurrentSalon()) as
    | {
        id: string;
        nombre: string;
        timezone: string | null;
        agenteNombre?: string | null;
        agente_nombre?: string | null;
      }
    | null;

  if (!salon) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="card mx-auto flex max-w-2xl flex-col items-center gap-3 p-6 text-center md:p-10">
          <h1 className="tight text-[24px] font-medium text-ink md:text-[28px]">
            Configura tu salón
          </h1>
          <p className="max-w-md text-[14px] text-stone">
            Aún no tienes un salón asociado a tu cuenta. En breve podrás
            completar el onboarding desde aquí. Si crees que es un error,
            contacta con soporte.
          </p>
        </div>
      </div>
    );
  }

  const timezone = salon.timezone ?? 'Europe/Madrid';
  const ownerName = (salon.nombre ?? 'tu salón').split(' ')[0] ?? 'tu salón';

  // Ventana de hoy (mismo cálculo simple que la versión actual).
  const ahora = new Date();
  const hoyInicio = new Date(ahora);
  hoyInicio.setHours(0, 0, 0, 0);
  const hoyFin = new Date(hoyInicio);
  hoyFin.setDate(hoyFin.getDate() + 1);

  const filas = await db
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
    .where(
      and(
        eq(citas.salonId, salon.id),
        gte(citas.inicio, hoyInicio),
        lt(citas.inicio, hoyFin),
      ),
    )
    .orderBy(asc(citas.inicio));

  // Lista de espera (top 3 activas, orden ASC por createdAt).
  const filasEspera = await db
    .select({ espera: listaEspera, cliente: clientes, servicio: servicios })
    .from(listaEspera)
    .innerJoin(clientes, eq(listaEspera.clienteId, clientes.id))
    .innerJoin(servicios, eq(listaEspera.servicioId, servicios.id))
    .where(and(eq(listaEspera.salonId, salon.id), eq(listaEspera.activa, true)))
    .orderBy(asc(listaEspera.createdAt))
    .limit(3);

  // KPIs
  let facturado = 0;
  let completadas = 0;
  let noShows = 0;
  let sinConfirmar = 0;
  let confirmadas = 0;

  for (const f of filas) {
    const estado = f.cita.estado as EstadoCita;
    const precio = Number(f.cita.precioEur ?? 0);
    if (estado === 'completada') {
      completadas += 1;
      facturado += precio;
    } else if (estado === 'no_show') {
      noShows += 1;
    } else if (estado === 'pendiente') {
      sinConfirmar += 1;
    } else if (estado === 'confirmada') {
      confirmadas += 1;
    }
  }

  const total = filas.length;
  const restantes = Math.max(total - completadas - noShows, 0);

  // Próximas (pendiente / confirmada), ya están ordenadas por inicio asc.
  const proximasFilas = filas.filter((f) => {
    const e = f.cita.estado as EstadoCita;
    return e === 'pendiente' || e === 'confirmada';
  });

  const proximasItems = proximasFilas.map((f) => ({
    id: f.cita.id,
    hora: formatearHora(f.cita.inicio, timezone),
    cliente: f.cliente.nombre,
    servicio: f.servicio.nombre,
    pro: f.profesional.nombre,
    estado: f.cita.estado as EstadoCita,
  }));

  // Pendientes en próximas 4 horas
  const ventana4h = new Date(ahora.getTime() + 4 * 60 * 60 * 1000);
  const pendientesProximas = filas.filter((f) => {
    const e = f.cita.estado as EstadoCita;
    return (
      e === 'pendiente' && f.cita.inicio >= ahora && f.cita.inicio <= ventana4h
    );
  });

  let pendientesAlerta: { count: number; next: string } | null = null;
  if (pendientesProximas.length > 0) {
    const siguiente = pendientesProximas[0];
    const horaSig = formatearHora(siguiente.cita.inicio, timezone);
    pendientesAlerta = {
      count: pendientesProximas.length,
      next: `${siguiente.cliente.nombre} · ${horaSig} · ${siguiente.servicio.nombre} con ${siguiente.profesional.nombre}`,
    };
  }

  // Primer no-show del día (para foot del KPI).
  const primerNoShow = filas.find((f) => f.cita.estado === 'no_show');
  const noShowFoot = primerNoShow
    ? `${primerNoShow.cliente.nombre} · ${formatearHora(primerNoShow.cita.inicio, timezone)}`
    : 'Sin incidencias hoy';

  // Resumen Juanita (frase corta basada en KPIs).
  const resumenJuanita = (() => {
    if (total === 0) {
      return 'Hoy no tienes citas programadas. Buen momento para descansar o preparar la semana.';
    }
    const partes: string[] = [
      `Hoy llevas ${completadas}/${total} hechas, ${facturado.toFixed(0)} € en caja.`,
    ];
    if (noShows > 0) {
      partes.push(
        `${noShows} no-show${noShows === 1 ? '' : 's'} — pídele depósito desde ahora.`,
      );
    }
    if (sinConfirmar > 0) {
      partes.push(
        `${sinConfirmar} sin confirmar; las recuerdo 1 h antes.`,
      );
    }
    return partes.join(' ');
  })();

  const fechaTopbar = formatearFechaTopbar(timezone);
  const saludo = `${saludoPorHora(timezone)}, ${ownerName}.`;

  return (
    <>
      <PanelTopbar
        titulo="Hoy."
        saludoSegundaLinea={saludo}
        subtitulo={fechaTopbar}
      />

      <div className="flex flex-col gap-6 px-4 py-6 md:px-8">
        {pendientesAlerta && (
          <PendingBanner
            count={pendientesAlerta.count}
            next={pendientesAlerta.next}
            hrefVer="#pendientes"
          />
        )}

        {/* Stats */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            id="spark-facturado"
            label="Facturado hoy"
            value={`${facturado.toFixed(0)} €`}
            delta="+12% vs media"
            foot={`${completadas} cita${completadas === 1 ? '' : 's'} completada${completadas === 1 ? '' : 's'}`}
            sparkPath={SPARK_PATHS.facturado}
          />
          <StatCard
            id="spark-citas"
            label="Citas hoy"
            value={total}
            delta={`${completadas} completada${completadas === 1 ? '' : 's'}`}
            foot={`${restantes} restante${restantes === 1 ? '' : 's'}`}
            sparkPath={SPARK_PATHS.citas}
          />
          <StatCard
            id="spark-noshows"
            label="No-shows"
            value={noShows}
            delta="Estable"
            deltaPositive={false}
            foot={noShowFoot}
            sparkPath={SPARK_PATHS.noshows}
          />
          {(() => {
            // Tasa de confirmación real: confirmadas / (confirmadas + sin confirmar).
            // Si todavía no hay base estadística (muy pocas citas), mostramos "—"
            // en vez de inventar un porcentaje.
            const baseEstadistica = confirmadas + sinConfirmar;
            const ratio =
              baseEstadistica > 0
                ? Math.round((confirmadas / baseEstadistica) * 100)
                : null;
            const valor = ratio !== null ? String(ratio) : '—';
            const delta =
              ratio !== null
                ? ratio >= 80
                  ? '↑ excelente'
                  : ratio >= 60
                    ? 'estable'
                    : '↓ baja'
                : 'sin datos';
            const foot =
              baseEstadistica > 0
                ? `${confirmadas}/${baseEstadistica} hoy`
                : 'aún sin citas';
            return (
              <StatCard
                id="spark-confirmadas"
                label="Confirmadas por Juanita"
                value={valor}
                suffix={ratio !== null ? '%' : ''}
                delta={delta}
                deltaPositive={ratio !== null ? ratio >= 60 : true}
                foot={foot}
                sparkPath={SPARK_PATHS.confirmadas}
              />
            );
          })()}
        </section>

        {/* Two-col main */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_400px]">
          <div className="card flex flex-col overflow-hidden">
            <div className="flex items-center gap-3 border-b border-line px-5 py-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
                  Agenda del día
                </div>
                <div className="tight mt-0.5 text-[18px] font-medium text-ink">
                  {total} cita{total === 1 ? '' : 's'} · {fechaTopbar.toLowerCase()}
                </div>
              </div>
            </div>

            {total === 0 ? (
              <div className="px-5 py-16 text-center">
                <p className="tight text-[16px] font-medium text-ink">
                  No hay citas hoy
                </p>
                <p className="mt-1 text-[13px] text-stone">
                  Cuando se reserven citas para hoy aparecerán aquí.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="grid min-w-[760px] grid-cols-[80px_44px_1fr_140px_120px_92px_28px] gap-3 border-b border-line bg-cream/40 px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-stone/70">
                  <div>Hora</div>
                  <div />
                  <div>Cliente</div>
                  <div>Servicio</div>
                  <div>Profesional</div>
                  <div>Estado</div>
                  <div className="text-right">€</div>
                </div>
                <div className="min-w-[760px] divide-y divide-line/70">
                  {filas.map(
                    ({ cita, cliente, servicio, profesional }) => (
                      <CitaRow
                        key={cita.id}
                        citaId={cita.id}
                        hora={formatearHora(cita.inicio, timezone)}
                        duracionMin={servicio.duracionMin}
                        clienteNombre={cliente.nombre}
                        clienteTelefono={cliente.telefono}
                        visitas={cliente.totalCitas ?? 0}
                        noShowsTotales={cliente.totalNoShows ?? 0}
                        servicioNombre={servicio.nombre}
                        profesionalNombre={profesional.nombre}
                        estado={cita.estado as EstadoCita}
                        precio={Number(cita.precioEur ?? 0)}
                        alerta={cita.estado === 'pendiente'}
                      />
                    ),
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <JuanitaPro mensajeInicial={resumenJuanita} />
            <ScheduleRail proximas={proximasItems} />
          </div>
        </div>

        {/* Bottom row: insights + lista de espera */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="card grain col-span-1 p-6 lg:col-span-2">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-terracotta/15 text-terracotta">
                <Icon.Sparkle width="16" height="16" />
              </div>
              <div className="flex-1">
                <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-stone/70">
                  Juanita resume tu día
                </div>
                <p className="tight max-w-[640px] text-[20px] leading-snug text-ink">
                  {resumenJuanita}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="tight rounded-full bg-ink px-3 py-1.5 text-[12.5px] text-cream hover:opacity-90"
                  >
                    {primerNoShow
                      ? `Activar depósito a ${primerNoShow.cliente.nombre.split(' ')[0]}`
                      : 'Activar depósito'}
                  </button>
                  <button
                    type="button"
                    className="tight rounded-full border border-line px-3 py-1.5 text-[12.5px] text-ink hover:bg-paper"
                  >
                    Ver detalle
                  </button>
                  <button
                    type="button"
                    className="tight rounded-full border border-line px-3 py-1.5 text-[12.5px] text-stone hover:bg-paper"
                  >
                    Más tarde
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-3 text-[11px] uppercase tracking-[0.22em] text-stone/70">
              Lista de espera
            </div>
            {filasEspera.length === 0 ? (
              <div className="text-[12.5px] text-stone">
                Nadie en lista de espera ahora mismo.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {filasEspera.map((row, i) => (
                  <div key={row.espera.id} className="flex items-center gap-3">
                    <span className="tabular w-4 font-mono text-[11px] text-stone">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="tight truncate text-[13px] text-ink">
                        {row.cliente.nombre}
                      </div>
                      <div className="text-[11px] text-stone">
                        {row.servicio.nombre} · cualquiera
                      </div>
                    </div>
                    <button
                      type="button"
                      className="rounded-full border border-line bg-cream px-2.5 py-1 text-[11.5px] text-stone hover:text-ink"
                    >
                      Ofrecer
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Link
              href="/panel/clientes"
              className="mt-4 inline-flex items-center gap-1 text-[12px] text-terracotta hover:text-terracotta-2"
            >
              Ver lista completa <Icon.Arrow width="11" height="11" />
            </Link>
          </div>
        </div>

        <div className="pt-4 pb-8 text-center">
          <Link
            href="/"
            className="tight text-[12px] text-stone hover:text-ink"
          >
            ← Volver a la landing
          </Link>
        </div>
      </div>
    </>
  );
}
