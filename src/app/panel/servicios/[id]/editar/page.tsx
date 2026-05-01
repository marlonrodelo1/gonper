import Link from 'next/link';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { servicios } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { Label } from '@/components/ui/label';
import { actualizarServicio } from '../../actions';

type CurrentSalon = { id: string } | null;

const inputClass =
  'w-full rounded-2xl border border-line bg-paper px-5 py-3.5 text-[14.5px] text-ink placeholder:text-stone/60 focus:border-line-2 focus:outline-none';

export default async function EditarServicioPage({
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
    redirect('/panel/servicios?error=' + encodeURIComponent('No autorizado'));
  }

  const [servicio] = await db
    .select()
    .from(servicios)
    .where(eq(servicios.id, id))
    .limit(1);

  if (!servicio || servicio.salonId !== salon.id) {
    redirect('/panel/servicios?error=' + encodeURIComponent('No autorizado'));
  }

  const action = actualizarServicio.bind(null, id);

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
          Editar servicio
        </p>
        <h1 className="tight text-[28px] font-medium text-ink">
          {servicio.nombre}
        </h1>
      </div>

      {sp.error ? (
        <div
          className="rounded-xl border px-4 py-3 text-[13.5px]"
          style={{
            background: '#F1D6D6',
            borderColor: 'rgba(177,72,72,0.4)',
            color: '#7C2E2E',
          }}
        >
          {sp.error}
        </div>
      ) : null}

      <form action={action} className="card flex flex-col gap-5 p-6">
        <div className="space-y-2">
          <Label htmlFor="nombre" className="text-[12.5px] text-stone">
            Nombre
          </Label>
          <input
            id="nombre"
            name="nombre"
            required
            maxLength={80}
            defaultValue={servicio.nombre}
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
            defaultValue={servicio.descripcion ?? ''}
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
              required
              defaultValue={servicio.duracionMin}
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
              required
              defaultValue={Number(servicio.precioEur).toFixed(2)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            className="gloss-btn tight inline-flex items-center justify-center rounded-full px-5 py-2.5 text-[13.5px] font-medium"
          >
            Guardar cambios
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
