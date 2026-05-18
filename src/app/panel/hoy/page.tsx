import Link from 'next/link';
import { and, asc, eq, gte, lt } from 'drizzle-orm';

import { db } from '@/lib/db';
import { citas, clientes, profesionales, servicios } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';

import { CitaRow, type EstadoCita } from '../_components/cita-row';
import { FarmasiBanner } from '../_components/farmasi-banner';
import { PanelTopbar } from '../_components/panel-topbar';
import { PendingBanner } from '../_components/pending-banner';
import {
  RecordatoriosWhatsApp,
  type RecordatorioCita,
} from '../_components/recordatorios-whatsapp';

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
        agenteAvatarUrl?: string | null;
        agente_avatar_url?: string | null;
        farmasiUsername?: string | null;
        farmasi_username?: string | null;
        configJson?: Record<string, unknown> | null;
        config_json?: Record<string, unknown> | null;
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

  // KPIs operativos del día (números crudos, sin spark/delta artificiales).
  let facturado = 0;
  let completadas = 0;
  let noShows = 0;

  for (const f of filas) {
    const estado = f.cita.estado as EstadoCita;
    const precio = Number(f.cita.precioEur ?? 0);
    if (estado === 'completada') {
      completadas += 1;
      facturado += precio;
    } else if (estado === 'no_show') {
      noShows += 1;
    }
  }

  const total = filas.length;
  const restantes = Math.max(total - completadas - noShows, 0);

  // Pendientes en próximas 4 horas
  const ventana4h = new Date(ahora.getTime() + 4 * 60 * 60 * 1000);
  const pendientesProximas = filas.filter((f) => {
    const e = f.cita.estado as EstadoCita;
    return (
      e === 'pendiente' && f.cita.inicio >= ahora && f.cita.inicio <= ventana4h
    );
  });

  // Recordatorios WhatsApp: citas en las próximas 2h con cliente que tiene
  // teléfono. Excluye canceladas, no-show y completadas (no tiene sentido
  // recordar lo que ya pasó o se anuló).
  const ventana2h = new Date(ahora.getTime() + 2 * 60 * 60 * 1000);
  const recordatoriosWhatsApp: RecordatorioCita[] = filas
    .filter((f) => {
      const e = f.cita.estado as EstadoCita;
      if (e === 'cancelada' || e === 'no_show' || e === 'completada') {
        return false;
      }
      return (
        f.cita.inicio >= ahora &&
        f.cita.inicio <= ventana2h &&
        !!f.cliente.telefono
      );
    })
    .map((f) => ({
      citaId: f.cita.id,
      clienteNombre: f.cliente.nombre,
      clienteTelefono: f.cliente.telefono,
      servicioNombre: f.servicio.nombre,
      profesionalNombre: f.profesional.nombre,
      horaTexto: formatearHora(f.cita.inicio, timezone),
      salonNombre: salon.nombre,
    }));

  let pendientesAlerta: { count: number; next: string } | null = null;
  if (pendientesProximas.length > 0) {
    const siguiente = pendientesProximas[0];
    const horaSig = formatearHora(siguiente.cita.inicio, timezone);
    pendientesAlerta = {
      count: pendientesProximas.length,
      next: `${siguiente.cliente.nombre} · ${horaSig} · ${siguiente.servicio.nombre} con ${siguiente.profesional.nombre}`,
    };
  }

  const fechaTopbar = formatearFechaTopbar(timezone);
  const saludo = `${saludoPorHora(timezone)}, ${ownerName}.`;

  // Banner Farmasi: oculto si ya está activado o si el dueño lo descartó.
  const farmasiUsername =
    salon.farmasiUsername ?? salon.farmasi_username ?? null;
  const configJson =
    (salon.configJson ?? salon.config_json ?? {}) as Record<string, unknown>;
  const farmasiBannerOculto =
    !!farmasiUsername || configJson.farmasiBannerDismissed === true;

  return (
    <>
      <PanelTopbar
        titulo="Hoy."
        saludoSegundaLinea={saludo}
        subtitulo={fechaTopbar}
      />

      <div className="flex flex-col gap-6 px-4 py-6 md:px-8">
        <FarmasiBanner oculto={farmasiBannerOculto} />

        {pendientesAlerta && (
          <PendingBanner
            count={pendientesAlerta.count}
            next={pendientesAlerta.next}
            hrefVer="#pendientes"
          />
        )}

        <RecordatoriosWhatsApp citas={recordatoriosWhatsApp} />

        {/* Agenda principal */}
        <div className="card flex flex-col overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
                  Agenda del día
                </div>
                <div className="tight mt-0.5 text-[18px] font-medium text-ink">
                  {total} cita{total === 1 ? '' : 's'} · {fechaTopbar.toLowerCase()}
                </div>
              </div>
              {total > 0 && (
                <div className="tabular flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-stone">
                  <span>
                    <span className="font-medium text-ink">{completadas}</span>{' '}
                    completada{completadas === 1 ? '' : 's'}
                  </span>
                  <span className="text-line-2">·</span>
                  <span>
                    <span className="font-medium text-ink">{restantes}</span>{' '}
                    restante{restantes === 1 ? '' : 's'}
                  </span>
                  <span className="text-line-2">·</span>
                  <span>
                    <span className="font-medium text-ink">
                      {facturado.toFixed(0)} €
                    </span>{' '}
                    facturado
                  </span>
                  {noShows > 0 && (
                    <>
                      <span className="text-line-2">·</span>
                      <span style={{ color: '#7C2E2E' }}>
                        <span className="font-medium">{noShows}</span> no-show
                        {noShows === 1 ? '' : 's'}
                      </span>
                    </>
                  )}
                  <span className="text-line-2">·</span>
                  <Link
                    href="/panel/stats"
                    className="text-stone/70 hover:text-ink"
                    title="Ver métricas históricas (7/30/90 días)"
                  >
                    Ver métricas →
                  </Link>
                </div>
              )}
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
