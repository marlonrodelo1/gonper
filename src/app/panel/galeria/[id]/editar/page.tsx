import Link from 'next/link';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { galeriaImagenes } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { Label } from '@/components/ui/label';
import { actualizarImagen } from '../../actions';

type CurrentSalon = { id: string } | null;

const inputClass =
  'w-full rounded-2xl border border-line bg-paper px-5 py-3.5 text-[14.5px] text-ink placeholder:text-stone/60 focus:border-line-2 focus:outline-none';

export default async function EditarImagenPage({
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
    redirect('/panel/galeria?error=' + encodeURIComponent('No autorizado'));
  }

  const [imagen] = await db
    .select()
    .from(galeriaImagenes)
    .where(eq(galeriaImagenes.id, id))
    .limit(1);

  if (!imagen || imagen.salonId !== salon.id) {
    redirect('/panel/galeria?error=' + encodeURIComponent('No autorizado'));
  }

  const action = actualizarImagen.bind(null, id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 md:px-8">
      <div className="flex flex-col gap-1">
        <Link
          href="/panel/galeria"
          className="text-[12.5px] text-stone hover:text-ink"
        >
          ← Galería
        </Link>
        <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-stone/70">
          Editar imagen
        </p>
        <h1 className="tight text-[22px] font-medium text-ink md:text-[28px]">
          {imagen.titulo ?? 'Imagen sin título'}
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

      <div className="card overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imagen.url}
          alt={imagen.alt ?? imagen.titulo ?? 'Imagen'}
          className="aspect-[16/9] w-full object-cover"
        />
      </div>

      <form action={action} className="card flex flex-col gap-5 p-6">
        <div className="space-y-2">
          <Label htmlFor="url" className="text-[12.5px] text-stone">
            URL de la imagen
          </Label>
          <input
            id="url"
            name="url"
            type="url"
            required
            defaultValue={imagen.url}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="titulo" className="text-[12.5px] text-stone">
              Título (opcional)
            </Label>
            <input
              id="titulo"
              name="titulo"
              maxLength={120}
              defaultValue={imagen.titulo ?? ''}
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tag" className="text-[12.5px] text-stone">
              Tag (opcional)
            </Label>
            <input
              id="tag"
              name="tag"
              maxLength={40}
              defaultValue={imagen.tag ?? ''}
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="alt" className="text-[12.5px] text-stone">
            Texto alternativo (accesibilidad)
          </Label>
          <input
            id="alt"
            name="alt"
            maxLength={200}
            defaultValue={imagen.alt ?? ''}
            className={inputClass}
          />
        </div>

        <div className="space-y-2 sm:max-w-[200px]">
          <Label htmlFor="orden" className="text-[12.5px] text-stone">
            Orden
          </Label>
          <input
            id="orden"
            name="orden"
            type="number"
            defaultValue={imagen.orden}
            className={inputClass}
          />
        </div>

        <label className="flex items-center gap-3 pt-1">
          <input
            type="checkbox"
            name="activa"
            defaultChecked={imagen.activa}
            className="h-4 w-4 rounded border-line"
          />
          <span className="text-[13.5px] text-ink">
            Activa (visible en la web)
          </span>
        </label>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            className="gloss-btn tight inline-flex items-center justify-center rounded-full px-5 py-2.5 text-[13.5px] font-medium"
          >
            Guardar cambios
          </button>
          <Link
            href="/panel/galeria"
            className="tight text-[13.5px] text-stone hover:text-ink"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
