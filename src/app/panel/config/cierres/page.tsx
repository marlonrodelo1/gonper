import { asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { cierres } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { agregarCierre } from './actions';
import { EliminarCierreButton } from './eliminar-button';

type CurrentSalon = { id: string; timezone: string } | null;

export default async function CierresPage({
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
    .from(cierres)
    .where(eq(cierres.salonId, salon.id))
    .orderBy(asc(cierres.fechaInicio));

  const tz = salon.timezone || 'Europe/Madrid';
  const fechaFmt = new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
  });

  return (
    <div className="space-y-4">
      {params.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {params.error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Cierres y vacaciones</CardTitle>
          <CardDescription>
            Días u horas en los que el salón permanecerá cerrado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {filas.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Sin cierres programados
              </p>
              <p className="max-w-sm text-xs text-zinc-600 dark:text-zinc-400">
                Añade vacaciones, festivos o cierres puntuales para que el
                agente no acepte citas en esos rangos.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Desde</TableHead>
                  <TableHead>Hasta</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="w-[120px] text-right">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((c) => {
                  const desde = fechaFmt.format(c.fechaInicio);
                  const hasta = fechaFmt.format(c.fechaFin);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="tabular-nums text-zinc-700 dark:text-zinc-300">
                        {desde}
                      </TableCell>
                      <TableCell className="tabular-nums text-zinc-700 dark:text-zinc-300">
                        {hasta}
                      </TableCell>
                      <TableCell className="text-zinc-700 dark:text-zinc-300">
                        {c.motivo ?? (
                          <span className="text-zinc-400 dark:text-zinc-500">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <EliminarCierreButton
                          id={c.id}
                          resumen={`${desde} → ${hasta}`}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          <Separator />

          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Añadir cierre
            </h3>
            <form
              action={agregarCierre}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            >
              <div className="space-y-1.5">
                <Label htmlFor="fecha_inicio">Desde</Label>
                <Input
                  id="fecha_inicio"
                  name="fecha_inicio"
                  type="datetime-local"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fecha_fin">Hasta</Label>
                <Input
                  id="fecha_fin"
                  name="fecha_fin"
                  type="datetime-local"
                  required
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="motivo">Motivo (opcional)</Label>
                <Input
                  id="motivo"
                  name="motivo"
                  maxLength={200}
                  placeholder="Ej. Vacaciones de verano"
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit">Añadir cierre</Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
