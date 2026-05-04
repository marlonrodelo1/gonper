import Link from 'next/link';
import { asc, count, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  horarios,
  profesionales,
  servicios,
} from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { Icon } from '@/app/panel/_components/icons';

import { actualizarDatosSalon } from '@/app/panel/config/actions';
import {
  agregarTramo,
  eliminarTramo,
} from '@/app/panel/config/horario/actions';

import { AccordionSection } from './accordion-section';
import { WeekGrid } from './week-grid';

type Salon = {
  id: string;
  slug: string;
  nombre: string;
  tipo_negocio?: string;
  tipoNegocio?: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  timezone: string;
} | null;

const TIPOS_NEGOCIO = [
  { value: 'barberia', label: 'Barbería' },
  { value: 'peluqueria', label: 'Peluquería' },
  { value: 'estetica', label: 'Estética' },
  { value: 'manicura', label: 'Manicura' },
  { value: 'otro', label: 'Otro' },
];

const TIMEZONES = [
  { value: 'Europe/Madrid', label: 'Europe/Madrid (Península)' },
  { value: 'Atlantic/Canary', label: 'Atlantic/Canary (Canarias)' },
  { value: 'Europe/Lisbon', label: 'Europe/Lisbon' },
  { value: 'Europe/London', label: 'Europe/London' },
  { value: 'Europe/Paris', label: 'Europe/Paris' },
];

const DIAS = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

const inputClass =
  'w-full bg-paper border border-line rounded-2xl px-4 py-3 text-[14px] text-ink placeholder:text-stone/50 focus:outline-none focus:border-line-2';
const selectClass =
  'w-full bg-paper border border-line rounded-2xl px-4 py-3 text-[14px] text-ink focus:outline-none focus:border-line-2 appearance-none';
const labelClass =
  'text-[11px] uppercase tracking-[0.2em] text-stone/80';

function fmtTime(t: string) {
  return t.length >= 5 ? t.slice(0, 5) : t;
}

export default async function ReservasConfigPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const params = await searchParams;
  const salon = (await getCurrentSalon()) as Salon;

  if (!salon) {
    return (
      <div className="card mx-auto flex max-w-2xl flex-col items-center gap-3 p-10 text-center">
        <h2 className="tight text-[22px] font-medium text-ink">
          Configura tu salón
        </h2>
        <p className="text-[14px] text-stone">
          Aún no tienes un salón asociado a tu cuenta.
        </p>
      </div>
    );
  }

  // Tipo de negocio puede venir en snake o camelCase según origen
  const tipoNegocio = salon.tipo_negocio ?? salon.tipoNegocio ?? 'otro';

  // Cargas en paralelo
  const [tramos, listaServicios, [{ totalProfesionales }]] = await Promise.all([
    db
      .select()
      .from(horarios)
      .where(eq(horarios.salonId, salon.id))
      .orderBy(asc(horarios.diaSemana), asc(horarios.inicio)),
    db
      .select()
      .from(servicios)
      .where(eq(servicios.salonId, salon.id))
      .orderBy(asc(servicios.orden), asc(servicios.createdAt)),
    db
      .select({ totalProfesionales: count() })
      .from(profesionales)
      .where(eq(profesionales.salonId, salon.id)),
  ]);

  const tramosPorDia = new Map<number, typeof tramos>();
  for (const t of tramos) {
    const arr = tramosPorDia.get(t.diaSemana) ?? [];
    arr.push(t);
    tramosPorDia.set(t.diaSemana, arr);
  }

  const serviciosActivos = listaServicios.filter((s) => s.activo).length;
  const tieneHorario = tramos.length > 0;
  const tieneServicios = listaServicios.length > 0;
  const tieneEquipo = totalProfesionales > 0;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
      {params.ok ? (
        <div className="flex items-center gap-2 rounded-xl border border-sage/40 bg-sage-soft px-4 py-3 text-[13px] text-sage-deep">
          <Icon.Check width="14" height="14" />
          Cambios guardados correctamente.
        </div>
      ) : null}
      {params.error ? (
        <div
          className="rounded-xl border bg-[#F1D6D6] px-4 py-3 text-[13px] text-[#7C2E2E]"
          style={{ borderColor: 'rgba(177,72,72,0.4)' }}
        >
          {params.error}
        </div>
      ) : null}

      <header className="px-1 py-2">
        <p className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
          Configuración de reservas
        </p>
        <h1 className="tight mt-1 text-[22px] font-medium text-ink">
          Cómo aceptas reservas
        </h1>
        <p className="mt-1 text-[13px] text-stone">
          Todo en un sitio: datos del negocio, disponibilidad, servicios,
          opciones de programación y avisos.
        </p>
      </header>

      {/* ===== Básicos ===== */}
      <AccordionSection
        badge="Sección 1"
        titulo="Básicos"
        subtitulo="Lo básico de tu salón: nombre, tipo, contacto, zona horaria"
        estado="ok"
        estadoLabel="Listo"
        defaultOpen
      >
        <form action={actualizarDatosSalon} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="nombre" className={labelClass}>
                Nombre del salón
              </label>
              <input
                id="nombre"
                name="nombre"
                required
                maxLength={120}
                defaultValue={salon.nombre}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="tipo_negocio" className={labelClass}>
                Tipo de negocio
              </label>
              <select
                id="tipo_negocio"
                name="tipo_negocio"
                defaultValue={tipoNegocio}
                className={selectClass}
              >
                {TIPOS_NEGOCIO.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="direccion" className={labelClass}>
              Dirección
            </label>
            <input
              id="direccion"
              name="direccion"
              defaultValue={salon.direccion ?? ''}
              placeholder="Calle, número, ciudad"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="telefono" className={labelClass}>
                Teléfono
              </label>
              <input
                id="telefono"
                name="telefono"
                type="tel"
                defaultValue={salon.telefono ?? ''}
                placeholder="+34 600 000 000"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className={labelClass}>
                Email de contacto
              </label>
              <input
                id="email"
                name="email"
                type="email"
                defaultValue={salon.email ?? ''}
                placeholder="hola@tusalon.es"
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="timezone" className={labelClass}>
              Zona horaria
            </label>
            <select
              id="timezone"
              name="timezone"
              defaultValue={salon.timezone}
              className={selectClass}
            >
              {TIMEZONES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="gloss-btn tight rounded-full px-5 py-2.5 text-[13px] font-medium"
            >
              Guardar cambios
            </button>
          </div>
        </form>
      </AccordionSection>

      {/* ===== Disponibilidad ===== */}
      <AccordionSection
        badge="Sección 2"
        titulo="Disponibilidad"
        subtitulo="¿Cuándo estás abierto? Define los bloques semanales"
        estado={tieneHorario ? 'ok' : 'pendiente'}
        estadoLabel={
          tieneHorario
            ? `${tramos.length} tramo${tramos.length === 1 ? '' : 's'}`
            : 'Sin configurar'
        }
        defaultOpen={!tieneHorario}
      >
        <div className="flex flex-col gap-5">
          <WeekGrid
            tramos={tramos.map((t) => ({
              diaSemana: t.diaSemana,
              inicio: t.inicio,
              fin: t.fin,
            }))}
          />

          <ul className="card-tight flex flex-col divide-y divide-line/70 overflow-hidden p-0">
            {DIAS.map((dia) => {
              const lista = tramosPorDia.get(dia.value) ?? [];
              return (
                <li
                  key={dia.value}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="tight w-24 text-[13.5px] font-medium text-ink">
                    {dia.label}
                  </span>
                  {lista.length === 0 ? (
                    <span className="font-serif-it text-[13px] text-stone/70">
                      cerrado
                    </span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      {lista.map((t) => (
                        <div
                          key={t.id}
                          className="tabular flex items-center gap-2 rounded-full border border-line bg-cream px-3 py-1 font-mono text-[12px] text-ink"
                        >
                          <span>
                            {fmtTime(t.inicio)} – {fmtTime(t.fin)}
                          </span>
                          <form action={eliminarTramo}>
                            <input type="hidden" name="id" value={t.id} />
                            <button
                              type="submit"
                              aria-label="Eliminar tramo"
                              className="text-[#B14848] hover:text-[#7C2E2E]"
                            >
                              <Icon.X width="11" height="11" />
                            </button>
                          </form>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="flex flex-col gap-2.5">
            <h3 className="tight text-[14px] font-medium text-ink">
              Añadir tramo
            </h3>
            <form
              action={agregarTramo}
              className="grid grid-cols-1 gap-2.5 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end"
            >
              <div className="flex flex-col gap-1">
                <label htmlFor="dia_semana" className={labelClass}>
                  Día
                </label>
                <select
                  id="dia_semana"
                  name="dia_semana"
                  defaultValue="1"
                  className={selectClass}
                >
                  {DIAS.map((d) => (
                    <option key={d.value} value={String(d.value)}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="inicio" className={labelClass}>
                  Inicio
                </label>
                <input
                  id="inicio"
                  name="inicio"
                  type="time"
                  required
                  defaultValue="09:00"
                  className={`${inputClass} sm:w-32`}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="fin" className={labelClass}>
                  Fin
                </label>
                <input
                  id="fin"
                  name="fin"
                  type="time"
                  required
                  defaultValue="14:00"
                  className={`${inputClass} sm:w-32`}
                />
              </div>
              <button
                type="submit"
                className="gloss-btn tight rounded-full px-4 py-2.5 text-[13px] font-medium"
              >
                Añadir
              </button>
            </form>
            <p className="text-[11.5px] text-stone/80">
              Si abres mañana y tarde, añade dos tramos.
            </p>
          </div>
        </div>
      </AccordionSection>

      {/* ===== Servicios ===== */}
      <AccordionSection
        badge="Sección 3"
        titulo="Servicios"
        subtitulo="Tu catálogo: corte, barba, color… con duración y precio"
        estado={tieneServicios ? 'ok' : 'pendiente'}
        estadoLabel={
          tieneServicios
            ? `${listaServicios.length} (${serviciosActivos} activos)`
            : 'Sin servicios'
        }
        defaultOpen={!tieneServicios}
      >
        <div className="flex flex-col gap-3">
          {tieneServicios ? (
            <div className="card-tight overflow-hidden">
              <ul className="divide-y divide-line/70">
                {listaServicios.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/panel/servicios/${s.id}/editar`}
                        className="tight block truncate text-[13.5px] font-medium text-ink hover:text-terracotta"
                      >
                        {s.nombre}
                      </Link>
                      {s.descripcion ? (
                        <span className="block truncate text-[11.5px] text-stone">
                          {s.descripcion}
                        </span>
                      ) : null}
                    </div>
                    <div className="tabular hidden font-mono text-[12.5px] text-stone sm:block">
                      {s.duracionMin} min
                    </div>
                    <div className="tabular font-mono text-[13px] text-ink">
                      {Number(s.precioEur).toFixed(2)} €
                    </div>
                    <span
                      className={
                        s.activo
                          ? 'inline-block h-2 w-2 rounded-full bg-sage'
                          : 'inline-block h-2 w-2 rounded-full bg-stone/40'
                      }
                      aria-label={s.activo ? 'Activo' : 'Inactivo'}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-[13px] text-stone">
              Aún no tienes servicios. Crea el primero (corte, barba, color…)
              para que tu agente y tus clientes puedan reservarlo.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Link
              href="/panel/servicios/nuevo"
              className="gloss-btn tight inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium"
            >
              <Icon.Plus width="14" height="14" /> Nuevo servicio
            </Link>
            <Link
              href="/panel/servicios"
              className="tight inline-flex items-center rounded-full border border-line bg-paper px-4 py-2 text-[13px] text-ink hover:bg-cream"
            >
              Ver catálogo completo →
            </Link>
          </div>
        </div>
      </AccordionSection>

      {/* ===== Capacidad ===== */}
      <AccordionSection
        badge="Sección 4"
        titulo="Capacidad"
        subtitulo="¿Cuántas reservas en paralelo? Una por profesional activo"
        estado={tieneEquipo ? 'ok' : 'pendiente'}
        estadoLabel={
          tieneEquipo
            ? `${totalProfesionales} profesional${totalProfesionales === 1 ? '' : 'es'}`
            : 'Sin equipo'
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-[13px] text-stone">
            La capacidad sale del número de profesionales que tengas. Cada
            profesional puede atender una cita a la vez en su horario. Para
            tener varias reservas paralelas, añade más profesionales.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="card-tight flex items-baseline gap-2 px-4 py-2.5">
              <span className="tabular font-mono text-[20px] font-medium text-ink">
                {totalProfesionales}
              </span>
              <span className="text-[12px] text-stone">
                {totalProfesionales === 1 ? 'profesional' : 'profesionales'}
              </span>
            </div>
            <Link
              href="/panel/config/equipo"
              className="tight inline-flex items-center rounded-full border border-line bg-paper px-4 py-2 text-[13px] text-ink hover:bg-cream"
            >
              Gestionar equipo →
            </Link>
          </div>
        </div>
      </AccordionSection>

      {/* ===== Opciones de programación ===== */}
      <AccordionSection
        badge="Sección 5"
        titulo="Opciones de programación"
        subtitulo="Buffer, antelación, límite por día"
        estado="proximamente"
        estadoLabel="Próximamente"
      >
        <div className="flex flex-col gap-4 opacity-90">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Buffer antes (minutos)</label>
              <input
                type="number"
                disabled
                value={0}
                className={`${inputClass} cursor-not-allowed bg-cream-2`}
              />
              <p className="text-[11.5px] text-stone/80">
                Tiempo libre antes de cada cita.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Buffer después (minutos)</label>
              <input
                type="number"
                disabled
                value={0}
                className={`${inputClass} cursor-not-allowed bg-cream-2`}
              />
              <p className="text-[11.5px] text-stone/80">
                Tiempo libre después de cada cita.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Antelación mínima</label>
              <input
                type="text"
                disabled
                value="2 horas"
                className={`${inputClass} cursor-not-allowed bg-cream-2`}
              />
              <p className="text-[11.5px] text-stone/80">
                No permitir reservar con menos de X tiempo.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Antelación máxima</label>
              <input
                type="text"
                disabled
                value="60 días"
                className={`${inputClass} cursor-not-allowed bg-cream-2`}
              />
              <p className="text-[11.5px] text-stone/80">
                No permitir reservar más allá de X.
              </p>
            </div>
          </div>

          <div
            className="rounded-xl border px-4 py-3 text-[13px]"
            style={{
              borderColor: 'rgba(197,142,44,0.4)',
              background: 'rgba(197,142,44,0.10)',
              color: '#7A5A1B',
            }}
          >
            Estas opciones llegan en la próxima actualización. Hoy Juanita
            usa los valores estándar (2 h de antelación mínima, hasta 60 días
            vista, sin buffer).
          </div>
        </div>
      </AccordionSection>

      {/* ===== Avisos ===== */}
      <AccordionSection
        badge="Sección 6"
        titulo="Avisos"
        subtitulo="Confirmaciones y recordatorios automáticos"
        estado="ok"
        estadoLabel="Activos"
      >
        <ul className="card-tight flex flex-col divide-y divide-line/70 overflow-hidden p-0">
          <li className="flex items-start gap-3 px-4 py-3">
            <span
              className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-sage"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div className="tight text-[13.5px] font-medium text-ink">
                Recordatorio al cliente · 1 h antes
              </div>
              <p className="mt-0.5 text-[12px] text-stone">
                Se envía por Telegram al cliente con confirmación / cancelación.
                El cron corre cada 5 minutos.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3 px-4 py-3">
            <span
              className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-sage"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div className="tight text-[13.5px] font-medium text-ink">
                Email de bienvenida al darse de alta
              </div>
              <p className="mt-0.5 text-[12px] text-stone">
                Resumen del salón, link al panel y siguientes pasos.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3 px-4 py-3">
            <span
              className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-stone/40"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div className="tight text-[13.5px] font-medium text-ink/80">
                Notificación al dueño por nueva reserva
              </div>
              <p className="mt-0.5 text-[12px] text-stone">
                Próximamente. Hoy las ves en el panel "Hoy" y en Conversaciones.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3 px-4 py-3">
            <span
              className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-stone/40"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div className="tight text-[13.5px] font-medium text-ink/80">
                Plantillas editables de avisos
              </div>
              <p className="mt-0.5 text-[12px] text-stone">
                Próximamente. Personaliza el texto que envía Juanita.
              </p>
            </div>
          </li>
        </ul>
      </AccordionSection>

      {/* ===== Identificador ===== */}
      <AccordionSection
        badge="Sección 7"
        titulo="Identificador y URL"
        subtitulo="Tu slug y la URL pública del salón"
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <span className={labelClass}>Slug</span>
            <div className="card-tight px-4 py-2.5 font-mono text-[13.5px] text-ink">
              {salon.slug}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className={labelClass}>URL pública</span>
            <div className="card-tight px-4 py-2.5 font-mono text-[13.5px] text-ink">
              gomper.es/{salon.slug}
            </div>
          </div>
          <p className="text-[12px] text-stone">
            Cambiar el slug rompe URLs ya compartidas. Para cambiarlo, contacta
            con soporte.
          </p>
        </div>
      </AccordionSection>
    </div>
  );
}
