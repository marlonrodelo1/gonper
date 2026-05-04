import Link from 'next/link';

import { crearProfesional } from '../actions';

const inputClass =
  'w-full bg-paper border border-line rounded-2xl px-5 py-3.5 text-[14.5px] text-ink placeholder:text-stone/50 focus:outline-none focus:border-line-2';
const fileInputClass =
  'block w-full cursor-pointer rounded-2xl border border-line bg-paper px-4 py-3 text-[13.5px] text-ink file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-1.5 file:text-[12px] file:font-medium file:text-cream hover:file:opacity-90';
const labelClass =
  'text-[11px] uppercase tracking-[0.2em] text-stone/80';

export default async function NuevoProfesionalPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex w-full flex-col gap-5">
      {params.error ? (
        <div
          className="rounded-xl border bg-[#F1D6D6] px-4 py-3 text-[13px] text-[#7C2E2E]"
          style={{ borderColor: 'rgba(177,72,72,0.4)' }}
        >
          {params.error}
        </div>
      ) : null}

      <section className="card flex flex-col gap-5 p-5 md:p-8">
        <header className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
            Equipo
          </span>
          <h2 className="tight text-[20px] font-medium text-ink">
            Nuevo profesional
          </h2>
          <p className="text-[13px] text-stone">
            Se mostrará en la agenda con el color elegido y en tu web pública
            con su foto.
          </p>
        </header>

        <form
          action={crearProfesional}
          encType="multipart/form-data"
          className="flex flex-col gap-5"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="nombre" className={labelClass}>
              Nombre
            </label>
            <input
              id="nombre"
              name="nombre"
              required
              maxLength={80}
              placeholder="Ej. María"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="color_hex" className={labelClass}>
                Color en agenda
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="color_hex"
                  name="color_hex"
                  type="color"
                  defaultValue="#3b82f6"
                  className="h-11 w-14 cursor-pointer rounded-2xl border border-line bg-paper p-1"
                />
                <span className="text-[12px] text-stone">Formato #RRGGBB</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="orden" className={labelClass}>
                Orden
              </label>
              <input
                id="orden"
                name="orden"
                type="number"
                min={0}
                defaultValue={0}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="foto" className={labelClass}>
              Foto del profesional (opcional)
            </label>
            <input
              id="foto"
              name="foto"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/avif"
              className={fileInputClass}
            />
            <div
              className="mt-1 rounded-xl border px-4 py-2.5 text-[12px]"
              style={{
                borderColor: 'rgba(197,142,44,0.4)',
                background: 'rgba(197,142,44,0.10)',
                color: '#7A5A1B',
              }}
            >
              <strong>Tamaño recomendado:</strong> cuadrada, 600×600 px o
              superior. Máx. 3 MB. JPG, PNG, WEBP o AVIF. Se mostrará circular
              en la web pública.
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Link
              href="/panel/config/equipo"
              className="card-tight tight px-4 py-2.5 text-[13px] text-ink hover:bg-cream"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              className="gloss-btn tight rounded-full px-5 py-3 text-[13.5px] font-medium"
            >
              Crear profesional
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
