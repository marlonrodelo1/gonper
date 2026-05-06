import Link from 'next/link';
import { asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { comparativasAntesDespues } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { Label } from '@/components/ui/label';
import { Icon } from '../../_components/icons';
import {
  crearComparativa,
  toggleComparativaActiva,
} from './actions';
import { EliminarComparativaButton } from './eliminar-button';

type CurrentSalon = { id: string; nombre: string } | null;

const inputClass =
  'w-full rounded-2xl border border-line bg-paper px-5 py-3.5 text-[14.5px] text-ink placeholder:text-stone/60 focus:border-line-2 focus:outline-none';

export default async function AntesDespuesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const params = await searchParams;
  const salon = (await getCurrentSalon()) as CurrentSalon;

  if (!salon) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="card mx-auto flex max-w-2xl flex-col items-center gap-3 p-6 text-center md:p-10">
          <h1 className="tight text-[24px] font-medium text-ink md:text-[28px]">
            Configura tu salón
          </h1>
          <p className="max-w-md text-[14px] text-stone">
            Aún no tienes un salón asociado a tu cuenta.
          </p>
        </div>
      </div>
    );
  }

  const filas = await db
    .select()
    .from(comparativasAntesDespues)
    .where(eq(comparativasAntesDespues.salonId, salon.id))
    .orderBy(
      asc(comparativasAntesDespues.orden),
      asc(comparativasAntesDespues.createdAt),
    );

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-8">
      <header className="flex flex-col gap-2">
        <Link
          href="/panel/galeria"
          className="text-[12.5px] text-stone hover:text-ink w-fit"
        >
          ← Galería
        </Link>
        <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-stone/70">
          Web del salón
        </p>
        <h1 className="tight text-[22px] font-medium text-ink md:text-[28px]">
          Antes <span className="font-serif-it text-stone/70">/ Después</span>
        </h1>
        <p className="text-[13.5px] text-stone max-w-xl">
          Pares de fotos que aparecen en tu web pública con el slider deslizante.
          Sube la foto del antes y la del después de un trabajo concreto, y los
          visitantes podrán comparar moviendo el control.
        </p>
      </header>

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

      {/* ============================================
          Formulario para añadir una comparativa
          ============================================ */}
      <form
        action={crearComparativa}
        encType="multipart/form-data"
        className="card flex flex-col gap-5 p-6"
      >
        <div className="flex flex-col gap-1">
          <h2 className="tight text-[17px] font-medium text-ink">
            Añadir nueva comparativa
          </h2>
          <p className="text-[12.5px] text-stone">
            Sube las dos fotos. Recomendado: mismo encuadre y misma luz para que
            el efecto antes/después se vea bien.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="antes" className="text-[12.5px] text-stone">
              Foto del ANTES
            </Label>
            <input
              id="antes"
              name="antes"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/avif"
              required
              className="block w-full cursor-pointer rounded-2xl border border-line bg-paper px-4 py-3 text-[13.5px] text-ink file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-1.5 file:text-[12px] file:font-medium file:text-cream hover:file:opacity-90"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="despues" className="text-[12.5px] text-stone">
              Foto del DESPUÉS
            </Label>
            <input
              id="despues"
              name="despues"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/avif"
              required
              className="block w-full cursor-pointer rounded-2xl border border-line bg-paper px-4 py-3 text-[13.5px] text-ink file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-1.5 file:text-[12px] file:font-medium file:text-cream hover:file:opacity-90"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="descripcion" className="text-[12.5px] text-stone">
            Descripción (opcional)
          </Label>
          <input
            id="descripcion"
            name="descripcion"
            maxLength={200}
            placeholder="Ej. Manicura francesa con uñas naturales"
            className={inputClass}
          />
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-2 sm:max-w-[160px]">
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

          <label className="flex items-center gap-3 pb-3">
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
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            className="gloss-btn tight inline-flex items-center justify-center rounded-full px-5 py-2.5 text-[13.5px] font-medium"
          >
            <Icon.Plus width="14" height="14" /> Añadir comparativa
          </button>
        </div>
      </form>

      {/* ============================================
          Lista de comparativas existentes
          ============================================ */}
      {filas.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-2 p-8 text-center">
          <p className="text-[13.5px] text-stone">
            Aún no hay comparativas. Añade tu primera arriba.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filas.map((c) => (
            <div
              key={c.id}
              className="card flex flex-col overflow-hidden p-0"
            >
              <div className="relative grid grid-cols-2 aspect-[16/9] bg-cream-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.antesUrl}
                  alt="Antes"
                  className="h-full w-full object-cover"
                />
                <div className="border-l border-paper">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.despuesUrl}
                    alt="Después"
                    className="h-full w-full object-cover"
                  />
                </div>
                <span
                  className="absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10.5px] font-medium backdrop-blur"
                  style={{
                    background: 'rgba(255,255,255,0.85)',
                    color: '#7A5A1B',
                  }}
                >
                  Antes
                </span>
                <span
                  className="absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10.5px] font-medium backdrop-blur"
                  style={{
                    background: 'var(--gomper-accent-2, #A8451F)',
                    color: '#FFF',
                  }}
                >
                  Después
                </span>
                {!c.activa && (
                  <span
                    className="absolute bottom-2 left-2 rounded-full px-2 py-0.5 text-[10.5px] font-medium backdrop-blur"
                    style={{
                      background: 'rgba(107,99,86,0.85)',
                      color: '#FFF',
                    }}
                  >
                    Oculta
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-3 p-3">
                {c.descripcion ? (
                  <p className="tight text-[13.5px] text-ink">
                    {c.descripcion}
                  </p>
                ) : (
                  <p className="text-[12px] text-stone/60">Sin descripción</p>
                )}
                <div className="flex items-center justify-between gap-2">
                  <form action={toggleComparativaActiva}>
                    <input type="hidden" name="id" value={c.id} />
                    <button
                      type="submit"
                      className="tight inline-flex h-8 items-center justify-center rounded-full border border-line bg-paper px-3 text-[12.5px] font-medium text-ink hover:bg-cream"
                    >
                      {c.activa ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </form>
                  <EliminarComparativaButton id={c.id} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
