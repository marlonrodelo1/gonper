import Link from 'next/link';
import { and, asc, eq, ilike, or } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import { db } from '@/lib/db';
import { clientes } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EliminarClienteButton } from './eliminar-cliente-button';

function formatearFecha(fecha: Date | null, timezone: string): string {
  if (!fecha) return '—';
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeZone: timezone,
  }).format(fecha);
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? '';
  const errorMsg = sp.error;

  const salon = (await getCurrentSalon()) as
    | { id: string; nombre: string; timezone: string | null }
    | null;

  if (!salon) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-4 rounded-xl border border-zinc-200 bg-white p-10 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          Configura tu salón
        </h1>
        <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
          Aún no tienes un salón asociado a tu cuenta.
        </p>
      </div>
    );
  }

  const timezone = salon.timezone ?? 'Europe/Madrid';

  const filtros: SQL[] = [eq(clientes.salonId, salon.id)];
  if (q) {
    const like = `%${q}%`;
    filtros.push(
      or(
        ilike(clientes.nombre, like),
        ilike(clientes.telefono, like),
        ilike(clientes.email, like),
      )!,
    );
  }

  const lista = await db
    .select()
    .from(clientes)
    .where(and(...filtros))
    .orderBy(asc(clientes.nombre));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Clientes · {salon.nombre}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            {lista.length} {lista.length === 1 ? 'cliente' : 'clientes'}
            {q && (
              <span className="ml-2 text-base font-normal text-zinc-500 dark:text-zinc-400">
                para &ldquo;{q}&rdquo;
              </span>
            )}
          </h1>
        </div>
        <Link
          href="/panel/clientes/nuevo"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
        >
          <span>+</span>
          <span>Nuevo cliente</span>
        </Link>
      </header>

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {errorMsg}
        </div>
      )}

      <form
        action="/panel/clientes"
        method="GET"
        className="flex flex-col gap-2 sm:flex-row"
      >
        <Input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre, teléfono o email..."
          className="sm:flex-1"
        />
        <div className="flex gap-2">
          <Button type="submit" variant="default">
            Buscar
          </Button>
          {q && (
            <Link
              href="/panel/clientes"
              className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
            >
              Limpiar
            </Link>
          )}
        </div>
      </form>

      {lista.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-white p-10 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {q ? 'Sin resultados' : 'Aún no tienes clientes'}
          </h2>
          <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
            {q
              ? `No hay clientes que coincidan con "${q}". Prueba con otra búsqueda.`
              : 'Crea tu primer cliente para empezar a llevar el historial.'}
          </p>
          {!q && (
            <Link
              href="/panel/clientes/nuevo"
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
            >
              + Nuevo cliente
            </Link>
          )}
        </div>
      ) : (
        <section className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Total citas</TableHead>
                <TableHead className="text-right">No-shows</TableHead>
                <TableHead>Última visita</TableHead>
                <TableHead className="w-[260px] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/panel/clientes/${c.id}`}
                        className="font-medium text-zinc-950 hover:underline dark:text-zinc-50"
                      >
                        {c.nombre}
                      </Link>
                      {c.requiereDeposito && (
                        <span
                          className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                          title="Requiere depósito"
                        >
                          Depósito
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-700 dark:text-zinc-300">
                    {c.telefono ?? '—'}
                  </TableCell>
                  <TableCell className="text-zinc-700 dark:text-zinc-300">
                    {c.email ?? '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.totalCitas}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.totalNoShows >= 2 ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
                        {c.totalNoShows}
                      </span>
                    ) : (
                      <span className="text-zinc-500 dark:text-zinc-400">
                        {c.totalNoShows}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-zinc-500 dark:text-zinc-400">
                    {formatearFecha(c.ultimaVisita, timezone)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/panel/clientes/${c.id}`}
                        className="inline-flex h-7 items-center justify-center rounded-md px-2.5 text-[0.8rem] font-medium text-zinc-700 hover:bg-muted hover:text-foreground dark:text-zinc-300"
                      >
                        Ver
                      </Link>
                      <Link
                        href={`/panel/clientes/${c.id}/editar`}
                        className="inline-flex h-7 items-center justify-center rounded-md px-2.5 text-[0.8rem] font-medium text-zinc-700 hover:bg-muted hover:text-foreground dark:text-zinc-300"
                      >
                        Editar
                      </Link>
                      <EliminarClienteButton id={c.id} nombre={c.nombre} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}
    </div>
  );
}
