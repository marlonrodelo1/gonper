import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { crearCliente } from '../actions';

export default async function NuevoClientePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Link
          href="/panel/clientes"
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          ← Clientes
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          Nuevo cliente
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Añade los datos básicos. Podrás editarlos más adelante.
        </p>
      </header>

      {params.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {params.error}
        </div>
      ) : null}

      <form
        action={crearCliente}
        className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre</Label>
          <Input
            id="nombre"
            name="nombre"
            required
            maxLength={120}
            placeholder="Ej. María García"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono (opcional)</Label>
            <Input
              id="telefono"
              name="telefono"
              type="tel"
              placeholder="+34 600 00 00 00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email (opcional)</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="cliente@ejemplo.com"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notasPrivadas">Notas privadas (opcional)</Label>
          <Textarea
            id="notasPrivadas"
            name="notasPrivadas"
            rows={4}
            placeholder="Información interna que solo tú verás (alergias, preferencias, etc.)"
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
          <div>
            <Label
              htmlFor="requiereDeposito"
              className="text-sm font-medium"
            >
              Requiere depósito
            </Label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Si lo activas, se le pedirá depósito al reservar.
            </p>
          </div>
          <Switch id="requiereDeposito" name="requiereDeposito" />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button type="submit">Crear cliente</Button>
          <Link
            href="/panel/clientes"
            className="inline-flex h-8 items-center justify-center rounded-lg px-2.5 text-sm font-medium text-zinc-700 hover:bg-muted hover:text-foreground dark:text-zinc-300"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
