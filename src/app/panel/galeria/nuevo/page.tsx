import Link from 'next/link';

import { Label } from '@/components/ui/label';
import { crearImagen } from '../actions';

const inputClass =
  'w-full rounded-2xl border border-line bg-paper px-5 py-3.5 text-[14.5px] text-ink placeholder:text-stone/60 focus:border-line-2 focus:outline-none';

export default async function NuevaImagenPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

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
          Nueva imagen
        </p>
        <h1 className="tight text-[28px] font-medium text-ink">
          Añade una imagen{' '}
          <span className="font-serif-it text-stone/70">a tu galería</span>
        </h1>
        <p className="mt-1 text-[13.5px] text-stone">
          Por ahora se añaden por URL externa (Imgur, Cloudinary…). Próximamente
          subida directa.
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

      <form action={crearImagen} className="card flex flex-col gap-5 p-6">
        <div className="space-y-2">
          <Label htmlFor="url" className="text-[12.5px] text-stone">
            URL de la imagen
          </Label>
          <input
            id="url"
            name="url"
            type="url"
            required
            placeholder="https://i.imgur.com/foo.jpg"
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
              placeholder="Ej. Manicura de gel"
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
              placeholder="Ej. Manicura"
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
            placeholder="Describe la imagen para lectores de pantalla"
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
            defaultValue={0}
            className={inputClass}
          />
        </div>

        <label className="flex items-center gap-3 pt-1">
          <input
            type="checkbox"
            name="activa"
            defaultChecked
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
            Añadir imagen
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
