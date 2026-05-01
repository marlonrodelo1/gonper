import Link from 'next/link';

import { Label } from '@/components/ui/label';
import { crearServicio } from '../actions';

const inputClass =
  'w-full rounded-2xl border border-line bg-paper px-5 py-3.5 text-[14.5px] text-ink placeholder:text-stone/60 focus:border-line-2 focus:outline-none';

export default async function NuevoServicioPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 md:px-8">
      <div className="flex flex-col gap-1">
        <Link
          href="/panel/servicios"
          className="text-[12.5px] text-stone hover:text-ink"
        >
          ← Catálogo
        </Link>
        <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-stone/70">
          Nuevo servicio
        </p>
        <h1 className="tight text-[28px] font-medium text-ink">
          Añade un servicio{' '}
          <span className="font-serif-it text-stone/70">a tu catálogo</span>
        </h1>
        <p className="mt-1 text-[13.5px] text-stone">
          Define cómo aparecerá en la agenda y en las reservas.
        </p>
      </div>

      {params.error ? (
        <div
          className="rounded-xl border px-4 py-3 text-[13.5px]"
          style={{
            background: '#F1D6D6',
            borderColor: 'rgba(177,72,72,0.4)',
            color: '#7C2E2E',
          }}
        >
          {params.error}
        </div>
      ) : null}

      <form action={crearServicio} className="card flex flex-col gap-5 p-6">
        <div className="space-y-2">
          <Label htmlFor="nombre" className="text-[12.5px] text-stone">
            Nombre
          </Label>
          <input
            id="nombre"
            name="nombre"
            required
            maxLength={80}
            placeholder="Ej. Corte de pelo"
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="descripcion" className="text-[12.5px] text-stone">
            Descripción (opcional)
          </Label>
          <textarea
            id="descripcion"
            name="descripcion"
            rows={3}
            placeholder="Detalles que verá el cliente al reservar"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label
              htmlFor="duracion_min"
              className="text-[12.5px] text-stone"
            >
              Duración (minutos)
            </Label>
            <input
              id="duracion_min"
              name="duracion_min"
              type="number"
              min={1}
              max={480}
              defaultValue={30}
              required
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="precio_eur"
              className="text-[12.5px] text-stone"
            >
              Precio (€)
            </Label>
            <input
              id="precio_eur"
              name="precio_eur"
              type="number"
              step={0.5}
              min={0}
              defaultValue={15}
              required
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            className="gloss-btn tight inline-flex items-center justify-center rounded-full px-5 py-2.5 text-[13.5px] font-medium"
          >
            Crear servicio
          </button>
          <Link
            href="/panel/servicios"
            className="tight text-[13.5px] text-stone hover:text-ink"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
