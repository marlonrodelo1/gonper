import Link from 'next/link';
import { and, asc, desc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { clientes, profesionales, servicios } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';

import { crearCita } from '../actions';
import { ConfirmarSwitch } from './_components/confirmar-switch';

const inputClass =
  'w-full bg-paper border border-line rounded-2xl px-5 py-3.5 text-[14.5px] text-ink placeholder:text-stone/50 focus:outline-none focus:border-line-2';
const selectClass =
  'w-full bg-paper border border-line rounded-2xl px-5 py-3.5 text-[14.5px] text-ink focus:outline-none focus:border-line-2 appearance-none';
const textareaClass =
  'w-full bg-paper border border-line rounded-2xl px-5 py-3.5 text-[14.5px] text-ink placeholder:text-stone/50 focus:outline-none focus:border-line-2 resize-y';
const labelClass =
  'text-[11px] uppercase tracking-[0.2em] text-stone/80';

export default async function NuevaCitaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const salon = (await getCurrentSalon()) as
    | { id: string; nombre: string }
    | null;

  if (!salon) {
    return (
      <div className="px-4 py-6 md:px-8">
        <div className="card mx-auto flex max-w-2xl flex-col items-center gap-3 p-10 text-center">
          <h1 className="tight text-[22px] font-medium text-ink">
            Configura tu salón primero
          </h1>
          <p className="text-[14px] text-stone">
            No hay un salón asociado a tu cuenta.
          </p>
        </div>
      </div>
    );
  }

  const [serviciosList, profesionalesList, clientesList] = await Promise.all([
    db
      .select({
        id: servicios.id,
        nombre: servicios.nombre,
        duracionMin: servicios.duracionMin,
        precioEur: servicios.precioEur,
      })
      .from(servicios)
      .where(and(eq(servicios.salonId, salon.id), eq(servicios.activo, true)))
      .orderBy(asc(servicios.orden), asc(servicios.nombre)),
    db
      .select({
        id: profesionales.id,
        nombre: profesionales.nombre,
        colorHex: profesionales.colorHex,
      })
      .from(profesionales)
      .where(
        and(
          eq(profesionales.salonId, salon.id),
          eq(profesionales.activo, true),
        ),
      )
      .orderBy(asc(profesionales.orden), asc(profesionales.nombre)),
    db
      .select({
        id: clientes.id,
        nombre: clientes.nombre,
        telefono: clientes.telefono,
      })
      .from(clientes)
      .where(eq(clientes.salonId, salon.id))
      .orderBy(desc(clientes.ultimaVisita), asc(clientes.nombre))
      .limit(200),
  ]);

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-8">
      <header className="mx-auto flex w-full max-w-2xl items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
            Citas
          </span>
          <h1 className="tight text-[28px] font-medium text-ink">
            Nueva cita
          </h1>
          <p className="font-serif-it text-[15px] text-stone/70">
            crea la cita manualmente
          </p>
        </div>
        <Link
          href="/panel/hoy"
          className="card-tight tight px-4 py-2.5 text-[13px] text-ink hover:bg-cream"
        >
          Cancelar
        </Link>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        {params.error ? (
          <div
            className="rounded-xl border bg-[#F1D6D6] px-4 py-3 text-[13px] text-[#7C2E2E]"
            style={{ borderColor: 'rgba(177,72,72,0.4)' }}
          >
            {params.error}
          </div>
        ) : null}

        <form action={crearCita} className="card flex flex-col gap-6 p-8">
          <section className="flex flex-col gap-4">
            <header className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
                Cliente
              </span>
              <h2 className="tight text-[18px] font-medium text-ink">
                ¿Quién viene?
              </h2>
            </header>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="cliente_id" className={labelClass}>
                Cliente existente
              </label>
              <select
                id="cliente_id"
                name="cliente_id"
                defaultValue=""
                className={selectClass}
              >
                <option value="">— Sin seleccionar —</option>
                {clientesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                    {c.telefono ? ` · ${c.telefono}` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[12px] text-stone/80">
                Mostrando {clientesList.length} cliente
                {clientesList.length === 1 ? '' : 's'} (ordenados por última
                visita).
              </p>
            </div>

            <div className="card-tight flex flex-col gap-3 border-dashed p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-stone/80">
                O crear cliente nuevo
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="cliente_nombre" className={labelClass}>
                    Nombre
                  </label>
                  <input
                    id="cliente_nombre"
                    name="cliente_nombre"
                    maxLength={120}
                    placeholder="Ej. Laura García"
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="cliente_telefono" className={labelClass}>
                    Teléfono
                  </label>
                  <input
                    id="cliente_telefono"
                    name="cliente_telefono"
                    type="tel"
                    maxLength={30}
                    placeholder="+34 600 123 456"
                    className={inputClass}
                  />
                </div>
              </div>
              <p className="text-[12px] text-stone/80">
                Si seleccionas un cliente existente, este bloque se ignora.
              </p>
            </div>
          </section>

          <div className="rule" />

          <section className="flex flex-col gap-4">
            <header className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
                Servicio + Profesional
              </span>
              <h2 className="tight text-[18px] font-medium text-ink">
                Detalles de la cita
              </h2>
            </header>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="servicio_id" className={labelClass}>
                Servicio
              </label>
              <select
                id="servicio_id"
                name="servicio_id"
                required
                defaultValue=""
                className={selectClass}
              >
                <option value="" disabled>
                  — Selecciona —
                </option>
                {serviciosList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre} · {s.duracionMin} min ·{' '}
                    {Number(s.precioEur).toFixed(0)} €
                  </option>
                ))}
              </select>
              {serviciosList.length === 0 ? (
                <p className="text-[12.5px]" style={{ color: '#7A5A1B' }}>
                  No hay servicios activos. Crea uno en{' '}
                  <Link
                    href="/panel/servicios/nuevo"
                    className="text-terracotta underline underline-offset-2"
                  >
                    Servicios
                  </Link>
                  .
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="profesional_id" className={labelClass}>
                Profesional
              </label>
              <select
                id="profesional_id"
                name="profesional_id"
                required
                defaultValue=""
                className={selectClass}
              >
                <option value="" disabled>
                  — Selecciona —
                </option>
                {profesionalesList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
              {profesionalesList.length === 0 ? (
                <p className="text-[12.5px]" style={{ color: '#7A5A1B' }}>
                  No hay profesionales activos. Añade uno en{' '}
                  <Link
                    href="/panel/config/equipo"
                    className="text-terracotta underline underline-offset-2"
                  >
                    Equipo
                  </Link>
                  .
                </p>
              ) : null}
            </div>
          </section>

          <div className="rule" />

          <section className="flex flex-col gap-4">
            <header className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
                Fecha y hora
              </span>
              <h2 className="tight text-[18px] font-medium text-ink">
                ¿Cuándo es?
              </h2>
            </header>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="inicio" className={labelClass}>
                Inicio
              </label>
              <input
                id="inicio"
                name="inicio"
                type="datetime-local"
                required
                className={inputClass}
              />
              <p className="text-[12px] text-stone/80">
                La duración la calcula el servicio elegido.
              </p>
            </div>
          </section>

          <div className="rule" />

          <section className="flex flex-col gap-4">
            <header className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
                Notas
              </span>
            </header>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="notas" className={labelClass}>
                Notas (opcional)
              </label>
              <textarea
                id="notas"
                name="notas"
                rows={3}
                placeholder="Ej. cliente prefiere maquinilla 2"
                className={textareaClass}
              />
            </div>

            <ConfirmarSwitch />
          </section>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Link
              href="/panel/hoy"
              className="card-tight tight px-4 py-2.5 text-[13px] text-ink hover:bg-cream"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              className="gloss-btn tight rounded-full px-5 py-3 text-[13.5px] font-medium"
            >
              Crear cita
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
