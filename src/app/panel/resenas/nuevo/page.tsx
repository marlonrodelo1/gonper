import Link from 'next/link';

import { Label } from '@/components/ui/label';
import { crearResena } from '../actions';

const inputClass =
  'w-full rounded-2xl border border-line bg-paper px-5 py-3.5 text-[14.5px] text-ink placeholder:text-stone/60 focus:border-line-2 focus:outline-none';

export default async function NuevaResenaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 md:px-8">
      <div className="flex flex-col gap-1">
        <Link
          href="/panel/resenas"
          className="text-[12.5px] text-stone hover:text-ink"
        >
          ← Reseñas
        </Link>
        <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-stone/70">
          Nueva reseña
        </p>
        <h1 className="tight text-[22px] font-medium text-ink md:text-[28px]">
          Añade una reseña{' '}
          <span className="font-serif-it text-stone/70">manualmente</span>
        </h1>
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

      <form action={crearResena} className="card flex flex-col gap-5 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_180px]">
          <div className="space-y-2">
            <Label htmlFor="autor_nombre" className="text-[12.5px] text-stone">
              Nombre del autor
            </Label>
            <input
              id="autor_nombre"
              name="autor_nombre"
              required
              maxLength={120}
              placeholder="Ej. María Pérez"
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rating" className="text-[12.5px] text-stone">
              Valoración
            </Label>
            <select
              id="rating"
              name="rating"
              required
              defaultValue="5"
              className={inputClass}
            >
              <option value="5">★★★★★ (5)</option>
              <option value="4">★★★★☆ (4)</option>
              <option value="3">★★★☆☆ (3)</option>
              <option value="2">★★☆☆☆ (2)</option>
              <option value="1">★☆☆☆☆ (1)</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="texto" className="text-[12.5px] text-stone">
            Texto de la reseña (opcional)
          </Label>
          <textarea
            id="texto"
            name="texto"
            rows={4}
            placeholder="Escribe el testimonio del cliente"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fecha" className="text-[12.5px] text-stone">
              Fecha
            </Label>
            <input
              id="fecha"
              name="fecha"
              type="date"
              defaultValue={hoy}
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fuente" className="text-[12.5px] text-stone">
              Fuente
            </Label>
            <select
              id="fuente"
              name="fuente"
              defaultValue="manual"
              className={inputClass}
            >
              <option value="manual">Manual</option>
              <option value="google">Google</option>
              <option value="telegram">Telegram</option>
              <option value="web">Web</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-1">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="aprobada"
              defaultChecked
              className="h-4 w-4 rounded border-line"
            />
            <span className="text-[13.5px] text-ink">
              Aprobada (visible en la web)
            </span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="destacada"
              className="h-4 w-4 rounded border-line"
            />
            <span className="text-[13.5px] text-ink">
              Destacada (aparece arriba)
            </span>
          </label>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            className="gloss-btn tight inline-flex items-center justify-center rounded-full px-5 py-2.5 text-[13.5px] font-medium"
          >
            Crear reseña
          </button>
          <Link
            href="/panel/resenas"
            className="tight text-[13.5px] text-stone hover:text-ink"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
