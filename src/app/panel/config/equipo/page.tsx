import Link from 'next/link';
import { asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { profesionales } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toggleProfesionalActivo } from './actions';
import { EliminarProfesionalButton } from './eliminar-button';

type CurrentSalon = { id: string } | null;

export default async function EquipoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const salon = (await getCurrentSalon()) as CurrentSalon;

  if (!salon) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Configura tu salón</CardTitle>
          <CardDescription>
            Aún no tienes un salón asociado a tu cuenta.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const filas = await db
    .select()
    .from(profesionales)
    .where(eq(profesionales.salonId, salon.id))
    .orderBy(asc(profesionales.orden), asc(profesionales.createdAt));

  return (
    <div className="space-y-4">
      {params.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {params.error}
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>Equipo</CardTitle>
            <CardDescription>
              Profesionales que atienden citas en este salón.
            </CardDescription>
          </div>
          <Link
            href="/panel/config/equipo/nuevo"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
          >
            <span>+</span>
            <span>Nuevo profesional</span>
          </Link>
        </CardHeader>

        <CardContent>
          {filas.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Aún no hay profesionales
              </p>
              <p className="max-w-sm text-xs text-zinc-600 dark:text-zinc-400">
                Añade al menos uno para poder asignar citas.
              </p>
              <Link
                href="/panel/config/equipo/nuevo"
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
              >
                Añadir profesional
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Color</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="w-[120px]">Estado</TableHead>
                  <TableHead className="w-[280px] text-right">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <span
                        className="inline-block h-5 w-5 rounded-full ring-1 ring-foreground/10"
                        style={{ backgroundColor: p.colorHex ?? '#3b82f6' }}
                        aria-label={`Color ${p.colorHex ?? '#3b82f6'}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {p.fotoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.fotoUrl}
                            alt={p.nombre}
                            className="h-7 w-7 rounded-full object-cover ring-1 ring-foreground/10"
                          />
                        ) : null}
                        <span className="font-medium text-zinc-950 dark:text-zinc-50">
                          {p.nombre}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {p.activo ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300">
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactivo</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/panel/config/equipo/${p.id}/editar`}
                          className="inline-flex h-7 items-center justify-center rounded-md px-2.5 text-[0.8rem] font-medium text-zinc-700 hover:bg-muted hover:text-foreground dark:text-zinc-300"
                        >
                          Editar
                        </Link>
                        <form action={toggleProfesionalActivo}>
                          <input type="hidden" name="id" value={p.id} />
                          <Button type="submit" variant="ghost" size="sm">
                            {p.activo ? 'Desactivar' : 'Activar'}
                          </Button>
                        </form>
                        <EliminarProfesionalButton
                          id={p.id}
                          nombre={p.nombre}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
