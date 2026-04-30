import { asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { horarios } from '@/lib/db/schema';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { agregarTramo, eliminarTramo } from './actions';

type CurrentSalon = { id: string } | null;

// 0 = domingo, 1 = lunes, ..., 6 = sábado
const DIAS: { value: number; label: string }[] = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

function fmt(t: string) {
  // 'HH:mm:ss' -> 'HH:mm'
  return t.length >= 5 ? t.slice(0, 5) : t;
}

export default async function HorarioPage({
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

  const tramos = await db
    .select()
    .from(horarios)
    .where(eq(horarios.salonId, salon.id))
    .orderBy(asc(horarios.diaSemana), asc(horarios.inicio));

  const tramosPorDia = new Map<number, typeof tramos>();
  for (const t of tramos) {
    const arr = tramosPorDia.get(t.diaSemana) ?? [];
    arr.push(t);
    tramosPorDia.set(t.diaSemana, arr);
  }

  return (
    <div className="space-y-4">
      {params.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {params.error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Horario semanal</CardTitle>
          <CardDescription>
            Tramos de apertura por día de la semana.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {DIAS.map((dia) => {
              const lista = tramosPorDia.get(dia.value) ?? [];
              return (
                <li
                  key={dia.value}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="w-24 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {dia.label}
                  </span>
                  {lista.length === 0 ? (
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                      Cerrado
                    </span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      {lista.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center gap-1.5 rounded-md bg-zinc-100 px-2.5 py-1 text-sm tabular-nums text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                        >
                          <span>
                            {fmt(t.inicio)} – {fmt(t.fin)}
                          </span>
                          <form action={eliminarTramo}>
                            <input type="hidden" name="id" value={t.id} />
                            <button
                              type="submit"
                              aria-label="Eliminar tramo"
                              className="text-red-600 hover:text-red-700"
                            >
                              ✕
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

          <Separator />

          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Añadir tramo
            </h3>
            <form
              action={agregarTramo}
              className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end"
            >
              <div className="space-y-1.5">
                <Label htmlFor="dia_semana">Día</Label>
                <Select name="dia_semana" defaultValue="1">
                  <SelectTrigger className="w-full" id="dia_semana">
                    <SelectValue placeholder="Día de la semana" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIAS.map((d) => (
                      <SelectItem key={d.value} value={String(d.value)}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inicio">Inicio</Label>
                <Input
                  id="inicio"
                  name="inicio"
                  type="time"
                  required
                  defaultValue="09:00"
                  className="w-32"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fin">Fin</Label>
                <Input
                  id="fin"
                  name="fin"
                  type="time"
                  required
                  defaultValue="14:00"
                  className="w-32"
                />
              </div>
              <Button type="submit">Añadir</Button>
            </form>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
            <strong>Tip:</strong> si abres mañana y tarde, añade dos tramos
            para ese día.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
