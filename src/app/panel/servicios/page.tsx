import Link from 'next/link';
import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { servicios } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toggleServicioActivo } from './actions';
import { EliminarServicioButton } from './eliminar-servicio-button';

type CurrentSalon = { id: string; nombre: string } | null;

export default async function ServiciosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const salon = (await getCurrentSalon()) as CurrentSalon;

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

  const filas = await db
    .select()
    .from(servicios)
    .where(eq(servicios.salonId, salon.id))
    .orderBy(asc(servicios.orden), asc(servicios.createdAt));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Catálogo · {salon.nombre}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            Servicios
          </h1>
        </div>
        <Link
          href="/panel/servicios/nuevo"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
        >
          <span>+</span>
          <span>Nuevo servicio</span>
        </Link>
      </header>

      {params.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {params.error}
        </div>
      ) : null}

      {filas.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-white p-10 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Aún no hay servicios
          </h2>
          <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
            Crea el primero (corte, barba, color…) para que tu agente y tus
            clientes puedan reservarlo.
          </p>
          <Link
            href="/panel/servicios/nuevo"
            className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
          >
            Crear primer servicio
          </Link>
        </div>
      ) : (
        <section className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="w-[120px]">Duración</TableHead>
                <TableHead className="w-[120px]">Precio</TableHead>
                <TableHead className="w-[120px]">Estado</TableHead>
                <TableHead className="w-[260px] text-right">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-zinc-950 dark:text-zinc-50">
                        {s.nombre}
                      </span>
                      {s.descripcion ? (
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {s.descripcion}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="tabular-nums text-zinc-700 dark:text-zinc-300">
                    {s.duracionMin} min
                  </TableCell>
                  <TableCell className="tabular-nums text-zinc-700 dark:text-zinc-300">
                    {Number(s.precioEur).toFixed(2)} €
                  </TableCell>
                  <TableCell>
                    {s.activo ? (
                      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        Inactivo
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/panel/servicios/${s.id}/editar`}
                        className="inline-flex h-7 items-center justify-center rounded-md px-2.5 text-[0.8rem] font-medium text-zinc-700 hover:bg-muted hover:text-foreground dark:text-zinc-300"
                      >
                        Editar
                      </Link>
                      <form action={toggleServicioActivo}>
                        <input type="hidden" name="id" value={s.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                        >
                          {s.activo ? 'Desactivar' : 'Activar'}
                        </Button>
                      </form>
                      <EliminarServicioButton id={s.id} nombre={s.nombre} />
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
