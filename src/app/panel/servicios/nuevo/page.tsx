import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { crearServicio } from '../actions';

export default async function NuevoServicioPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Catálogo
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          Nuevo servicio
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Define cómo aparecerá en la agenda y en las reservas.
        </p>
      </header>

      {params.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {params.error}
        </div>
      ) : null}

      <form
        action={crearServicio}
        className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre</Label>
          <Input
            id="nombre"
            name="nombre"
            required
            maxLength={80}
            placeholder="Ej. Corte de pelo"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="descripcion">Descripción (opcional)</Label>
          <Textarea
            id="descripcion"
            name="descripcion"
            rows={3}
            placeholder="Detalles que verá el cliente al reservar"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="duracion_min">Duración (minutos)</Label>
            <Input
              id="duracion_min"
              name="duracion_min"
              type="number"
              min={1}
              max={480}
              defaultValue={30}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="precio_eur">Precio (€)</Label>
            <Input
              id="precio_eur"
              name="precio_eur"
              type="number"
              step={0.5}
              min={0}
              defaultValue={15}
              required
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button type="submit">Crear servicio</Button>
          <Link
            href="/panel/servicios"
            className="inline-flex h-8 items-center justify-center rounded-lg px-2.5 text-sm font-medium text-zinc-700 hover:bg-muted hover:text-foreground dark:text-zinc-300"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
