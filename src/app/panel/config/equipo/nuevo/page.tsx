import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { crearProfesional } from '../actions';

export default async function NuevoProfesionalPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {params.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {params.error}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Nuevo profesional</CardTitle>
          <CardDescription>
            Se mostrará en la agenda con el color elegido.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={crearProfesional} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                name="nombre"
                required
                maxLength={80}
                placeholder="Ej. María"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="color_hex">Color en agenda</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="color_hex"
                    name="color_hex"
                    type="color"
                    defaultValue="#3b82f6"
                    className="h-9 w-14 cursor-pointer p-1"
                  />
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    Formato #RRGGBB
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="orden">Orden</Label>
                <Input
                  id="orden"
                  name="orden"
                  type="number"
                  min={0}
                  defaultValue={0}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="foto_url">Foto (URL, opcional)</Label>
              <Input
                id="foto_url"
                name="foto_url"
                type="url"
                placeholder="https://…"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button type="submit">Crear profesional</Button>
              <Link
                href="/panel/config/equipo"
                className="inline-flex h-8 items-center justify-center rounded-lg px-2.5 text-sm font-medium text-zinc-700 hover:bg-muted hover:text-foreground dark:text-zinc-300"
              >
                Cancelar
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
