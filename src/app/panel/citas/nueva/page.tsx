import Link from 'next/link';
import { and, asc, desc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { clientes, profesionales, servicios } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

import { crearCita } from '../actions';
import { ConfirmarSwitch } from './_components/confirmar-switch';

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
      <div className="mx-auto max-w-2xl rounded-xl border border-zinc-200 bg-white p-10 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-xl font-semibold">Configura tu salón primero</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          No hay un salón asociado a tu cuenta.
        </p>
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

  const selectClass =
    'flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30';

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Citas
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            Nueva cita
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Crea la cita manualmente. Puedes elegir un cliente existente o crear
            uno nuevo al vuelo.
          </p>
        </div>
        <Link
          href="/panel/hoy"
          className="inline-flex h-8 items-center justify-center rounded-lg px-2.5 text-sm font-medium text-zinc-700 hover:bg-muted hover:text-foreground dark:text-zinc-300"
        >
          Cancelar
        </Link>
      </header>

      {params.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {params.error}
        </div>
      ) : null}

      <form
        action={crearCita}
        className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Cliente
          </h2>

          <div className="space-y-2">
            <Label htmlFor="cliente_id">Cliente existente</Label>
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
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Mostrando {clientesList.length} cliente
              {clientesList.length === 1 ? '' : 's'} (ordenados por última
              visita).
            </p>
          </div>

          <div className="rounded-lg border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              O crear cliente nuevo
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cliente_nombre">Nombre</Label>
                <Input
                  id="cliente_nombre"
                  name="cliente_nombre"
                  maxLength={120}
                  placeholder="Ej. Laura García"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cliente_telefono">Teléfono</Label>
                <Input
                  id="cliente_telefono"
                  name="cliente_telefono"
                  type="tel"
                  maxLength={30}
                  placeholder="Ej. +34 600 123 456"
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Si seleccionas un cliente existente, este bloque se ignora.
            </p>
          </div>
        </section>

        <Separator />

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Detalles
          </h2>

          <div className="space-y-2">
            <Label htmlFor="servicio_id">Servicio</Label>
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
                  {s.nombre} · {s.duracionMin} min · {Number(s.precioEur).toFixed(0)} €
                </option>
              ))}
            </select>
            {serviciosList.length === 0 ? (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                No hay servicios activos. Crea uno en{' '}
                <Link
                  href="/panel/servicios/nuevo"
                  className="underline underline-offset-2"
                >
                  Servicios
                </Link>
                .
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="profesional_id">Profesional</Label>
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
              <p className="text-xs text-amber-700 dark:text-amber-400">
                No hay profesionales activos. Añade uno en{' '}
                <Link
                  href="/panel/config/equipo"
                  className="underline underline-offset-2"
                >
                  Equipo
                </Link>
                .
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="inicio">Fecha y hora de inicio</Label>
            <Input
              id="inicio"
              name="inicio"
              type="datetime-local"
              required
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              La duración la calcula el servicio elegido.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Notas (opcional)</Label>
            <Textarea
              id="notas"
              name="notas"
              rows={3}
              placeholder="Ej. cliente prefiere maquinilla 2"
            />
          </div>

          <ConfirmarSwitch />
        </section>

        <div className="flex items-center gap-2 pt-2">
          <Button type="submit">Crear cita</Button>
          <Link
            href="/panel/hoy"
            className="inline-flex h-8 items-center justify-center rounded-lg px-2.5 text-sm font-medium text-zinc-700 hover:bg-muted hover:text-foreground dark:text-zinc-300"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
