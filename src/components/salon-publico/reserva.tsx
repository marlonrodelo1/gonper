'use client';

import { useEffect, useMemo, useState } from 'react';
import { Icon } from './icons';
import { crearReservaWeb } from '@/app/s/[slug]/actions';
import type { ServicioReal } from './servicios';
import type { ProfReal } from './equipo';

type Props = {
  slug: string;
  servicios: ServicioReal[];
  profesionales: ProfReal[];
  timezone: string;
  diasCerrados: number[]; // 0=Dom ... 6=Sab (días sin tramos en `horarios`)
  initialServicioId?: string | null;
};

const DOWS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

function fechaYMD(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function formatHoraTz(iso: string, tz: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

export function Reserva({
  slug,
  servicios,
  profesionales,
  timezone,
  diasCerrados,
  initialServicioId,
}: Props) {
  const firstServicioId =
    servicios.find((s) => s.id === initialServicioId)?.id ?? servicios[0]?.id ?? '';

  const [servicioId, setServicioId] = useState<string>(firstServicioId);
  const [profesionalId, setProfesionalId] = useState<string>('any');
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedSlotIso, setSelectedSlotIso] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Sincronizar pre-selección desde fuera
  useEffect(() => {
    if (initialServicioId && servicios.some((s) => s.id === initialServicioId)) {
      setServicioId(initialServicioId);
      setSelectedDay(null);
      setSelectedSlotIso(null);
      setSlots([]);
    }
  }, [initialServicioId, servicios]);

  // Reset al cambiar servicio o profesional
  useEffect(() => {
    setSelectedDay(null);
    setSelectedSlotIso(null);
    setSlots([]);
  }, [servicioId, profesionalId]);

  const today = useMemo(() => new Date(), []);
  const monthDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const monthName = monthDate.toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  });
  const daysInMonth = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth() + 1,
    0,
  ).getDate();
  const firstWeekday = (monthDate.getDay() + 6) % 7; // Lunes = 0

  type Status = 'open' | 'past' | 'closed';
  const availabilityFor = (d: number): Status => {
    const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), d);
    const past =
      date <
      new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (past) return 'past';
    const dow = date.getDay(); // 0=Dom..6=Sab
    if (diasCerrados.includes(dow)) return 'closed';
    return 'open';
  };

  // Profesional efectivo: si 'any' usa el primero
  const profesionalEfectivoId =
    profesionalId === 'any' ? profesionales[0]?.id ?? '' : profesionalId;

  // Cargar slots cuando cambia día seleccionado
  useEffect(() => {
    if (!selectedDay || !servicioId || !profesionalEfectivoId) {
      setSlots([]);
      return;
    }
    const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), selectedDay);
    const fechaStr = fechaYMD(date, timezone);
    const ctrl = new AbortController();
    setLoadingSlots(true);
    fetch(
      `/api/public/salones/${slug}/disponibilidad?servicio_id=${encodeURIComponent(
        servicioId,
      )}&profesional_id=${encodeURIComponent(profesionalEfectivoId)}&fecha=${fechaStr}`,
      { signal: ctrl.signal },
    )
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data: { slots: string[] }) => setSlots(data.slots ?? []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay, servicioId, profesionalEfectivoId, monthOffset, slug, timezone]);

  return (
    <section id="reservar" className="py-24 px-6 bg-cream">
      <div className="mx-auto max-w-[1200px]">
        <div className="reveal flex items-end justify-between gap-6 flex-wrap mb-10">
          <div>
            <div className="text-[12px] uppercase tracking-[0.22em] text-stone/80 mb-3">
              Reserva tu cita
            </div>
            <h2
              className="tight font-medium text-ink"
              style={{ fontSize: 'clamp(36px,5vw,56px)', lineHeight: 1 }}
            >
              Sin <span className="font-serif-it">descargar</span> nada.
            </h2>
            <p className="mt-4 text-[15px] text-stone leading-relaxed max-w-[480px]">
              Elige servicio, día y hora. Te confirmamos al instante.
            </p>
          </div>
        </div>

        <div
          className="reveal grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6 items-start"
          data-delay="80"
        >
          {/* LEFT — calendar */}
          <div className="bg-paper border border-line rounded-3xl p-6 sm:p-8">
            <div className="mb-7">
              <label className="text-[11px] uppercase tracking-[0.2em] text-stone/80">
                Servicio
              </label>
              <div className="mt-2 relative">
                <select
                  value={servicioId}
                  onChange={(e) => setServicioId(e.target.value)}
                  className="w-full appearance-none bg-cream border border-line rounded-2xl px-5 py-4 text-[15px] tight text-ink focus:outline-none focus:border-gomper-accent pr-10 cursor-pointer"
                >
                  {servicios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} · {s.duracionMin} min
                    </option>
                  ))}
                </select>
                <Icon.Arrow
                  width="14"
                  height="14"
                  className="absolute right-5 top-1/2 -translate-y-1/2 rotate-90 text-stone pointer-events-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div
                className="text-ink tight font-medium"
                style={{ fontSize: '18px', textTransform: 'capitalize' }}
              >
                {monthName}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setMonthOffset((o) => Math.max(0, o - 1));
                    setSelectedDay(null);
                    setSelectedSlotIso(null);
                  }}
                  disabled={monthOffset === 0}
                  className="w-9 h-9 rounded-full border border-line flex items-center justify-center text-stone hover:text-ink hover:border-line-2 transition disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Icon.ArrowL width="14" height="14" />
                </button>
                <button
                  onClick={() => {
                    setMonthOffset((o) => o + 1);
                    setSelectedDay(null);
                    setSelectedSlotIso(null);
                  }}
                  className="w-9 h-9 rounded-full border border-line flex items-center justify-center text-stone hover:text-ink hover:border-line-2 transition"
                >
                  <Icon.ArrowR width="14" height="14" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5 mb-2">
              {DOWS.map((d) => (
                <div
                  key={d}
                  className="text-center text-[10px] uppercase tracking-[0.18em] text-stone/60 py-1"
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: firstWeekday }).map((_, i) => (
                <div key={`e${i}`}></div>
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const d = i + 1;
                const status = availabilityFor(d);
                const isSelected = selectedDay === d;
                const disabled = status === 'past' || status === 'closed';
                let cls = 'bg-cream/60 text-stone/40 cursor-not-allowed';
                if (status === 'open') cls = 'bg-cream text-ink hover:bg-gomper-accent-blush';
                if (isSelected) cls = 'bg-ink text-paper hover:bg-ink';
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setSelectedDay(d);
                      setSelectedSlotIso(null);
                    }}
                    className={`day-cell aspect-square rounded-xl text-[13.5px] tight relative ${cls} ${disabled ? 'disabled' : ''}`}
                  >
                    <span>{d}</span>
                    {status === 'open' && !isSelected && (
                      <span
                        className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                        style={{ background: 'var(--sage)' }}
                      ></span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex items-center gap-4 text-[11px] text-stone flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sage"></span>Disponible
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-stone/40"></span>Cerrado
              </span>
            </div>
          </div>

          {/* RIGHT — slots / form */}
          <div className="flex flex-col gap-4">
            {/* Profesional */}
            <div className="bg-paper border border-line rounded-3xl p-6">
              <label className="text-[11px] uppercase tracking-[0.2em] text-stone/80">
                Profesional
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setProfesionalId('any')}
                  className={`px-4 py-2 rounded-full text-[13px] tight transition border ${
                    profesionalId === 'any'
                      ? 'bg-ink text-paper border-ink'
                      : 'bg-cream text-stone border-line hover:text-ink hover:border-line-2'
                  }`}
                >
                  Cualquier profesional
                </button>
                {profesionales.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setProfesionalId(p.id)}
                    className={`px-4 py-2 rounded-full text-[13px] tight transition border ${
                      profesionalId === p.id
                        ? 'bg-ink text-paper border-ink'
                        : 'bg-cream text-stone border-line hover:text-ink hover:border-line-2'
                    }`}
                  >
                    {p.nombre}
                  </button>
                ))}
              </div>
            </div>

            {/* Time slots */}
            <div className="bg-paper border border-line rounded-3xl p-6">
              <label className="text-[11px] uppercase tracking-[0.2em] text-stone/80">
                Hora
              </label>
              {!selectedDay ? (
                <div className="mt-4 text-[13.5px] text-stone/70">
                  Selecciona primero un día en el calendario.
                </div>
              ) : loadingSlots ? (
                <div className="mt-4 text-[13.5px] text-stone/70">
                  Buscando huecos disponibles...
                </div>
              ) : slots.length === 0 ? (
                <div className="mt-4 text-[13.5px] text-stone/70">
                  No hay huecos disponibles ese día. Prueba otro.
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {slots.map((iso) => {
                    const label = formatHoraTz(iso, timezone);
                    const sel = selectedSlotIso === iso;
                    return (
                      <button
                        type="button"
                        key={iso}
                        onClick={() => setSelectedSlotIso(iso)}
                        className={`py-2.5 rounded-xl text-[13px] tight transition border ${
                          sel
                            ? 'bg-ink text-paper border-ink'
                            : 'bg-cream text-ink border-line hover:bg-gomper-accent-blush hover:border-gomper-accent'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Form */}
            {selectedDay && selectedSlotIso && (
              <form
                action={crearReservaWeb}
                className="bg-paper border border-line rounded-3xl p-6 flex flex-col gap-3"
              >
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="slot" value={selectedSlotIso} />
                <input type="hidden" name="servicio_id" value={servicioId} />
                <input
                  type="hidden"
                  name="profesional_id"
                  value={profesionalEfectivoId}
                />
                <label className="text-[11px] uppercase tracking-[0.2em] text-stone/80">
                  Tus datos
                </label>
                <input
                  type="text"
                  name="nombre"
                  required
                  placeholder="Nombre"
                  className="bg-cream border border-line rounded-2xl px-5 py-3.5 text-[14.5px] text-ink focus:outline-none focus:border-gomper-accent placeholder:text-stone/50"
                />
                <input
                  type="tel"
                  name="telefono"
                  required
                  placeholder="Móvil (te recordamos antes de la cita)"
                  className="bg-cream border border-line rounded-2xl px-5 py-3.5 text-[14.5px] text-ink focus:outline-none focus:border-gomper-accent placeholder:text-stone/50"
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Email (opcional)"
                  className="bg-cream border border-line rounded-2xl px-5 py-3.5 text-[14.5px] text-ink focus:outline-none focus:border-gomper-accent placeholder:text-stone/50"
                />
                <label className="flex items-center gap-2 text-[12.5px] text-stone mt-1">
                  <input
                    type="checkbox"
                    name="enviar_email"
                    defaultChecked
                    className="accent-[var(--gomper-accent)]"
                  />
                  Enviarme la confirmación por email
                </label>
                <button
                  type="submit"
                  className="mt-2 py-3.5 rounded-full text-[14px] font-medium tight transition accent-btn"
                >
                  Confirmar reserva
                </button>
                <div className="text-[11px] text-stone/70 text-center">
                  Sin pago previo. Pagas en el local.
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
