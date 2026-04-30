import Link from 'next/link';
import { redirect } from 'next/navigation';
import { and, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { clientes } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { actualizarCliente } from '../../actions';

type CurrentSalon = { id: string } | null;

export default async function EditarClientePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const salon = (await getCurrentSalon()) as CurrentSalon;
  if (!salon) {
    redirect('/panel/clientes?error=' + encodeURIComponent('No autorizado'));
  }

  const [cliente] = await db
    .select()
    .from(clientes)
    .where(and(eq(clientes.id, id), eq(clientes.salonId, salon.id)))
    .limit(1);

  if (!cliente) {
    redirect('/panel/clientes?error=' + encodeURIComponent('Cliente no encontrado'));
  }

  const action = actualizarCliente.bind(null, id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Link
          href={`/panel/clientes/${id}`}
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          ← {cliente.nombre}
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          Editar cliente
        </h1>
      </header>

      {sp.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {sp.error}
        </div>
      ) : null}

      <form
        action={action}
        className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre</Label>
          <Input
            id="nombre"
            name="nombre"
            required
            maxLength={120}
            defaultValue={cliente.nombre}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono (opcional)</Label>
            <Input
              id="telefono"
              name="telefono"
              type="tel"
              defaultValue={cliente.telefono ?? ''}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email (opcional)</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={cliente.email ?? ''}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notasPrivadas">Notas privadas (opcional)</Label>
          <Textarea
            id="notasPrivadas"
            name="notasPrivadas"
            rows={4}
            defaultValue={cliente.notasPrivadas ?? ''}
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
          <Switch
            id="requiereDeposito"
            name="requiereDeposito"
            defaultChecked={cliente.requiereDeposito}
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button type="submit">Guardar cambios</Button>
          <Link
            href={`/panel/clientes/${id}`}
            className="inline-flex h-8 items-center justify-center rounded-lg px-2.5 text-sm font-medium text-zinc-700 hover:bg-muted hover:text-foreground dark:text-zinc-300"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
