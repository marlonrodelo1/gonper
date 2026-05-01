import Link from 'next/link';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { promociones } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { Label } from '@/components/ui/label';
import { actualizarPromocion } from '../../actions';

type CurrentSalon = { id: string } | null;

const inputClass =
  'w-full rounded-2xl border border-line bg-paper px-5 py-3.5 text-[14.5px] text-ink placeholder:text-stone/60 focus:border-line-2 focus:outline-none';

export default async function EditarPromocionPage({
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
    redirect('/panel/promociones?error=' + encodeURIComponent('No autorizado'));
  }

  const [promo] = await db
    .select()
    .from(promociones)
    .where(eq(promociones.id, id))
    .limit(1);

  if (!promo || promo.salonId !== salon.id) {
    redirect('/panel/promociones?error=' + encodeURIComponent('No autorizado'));
  }

  const action = actualizarPromocion.bind(null, id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 md:px-8">
      <div className="flex flex-col gap-1">
        <Link
          href="/panel/promociones"
          className="text-[12.5px] text-stone hover:text-ink"
        >
          ← Promociones
        </Link>
        <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-stone/70">
          Editar promoción
        </p>
        <h1 className="tight text-[28px] font-medium text-ink">
          {promo.titulo}
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[140px_1fr]">
          <div className="space-y-2">
            <Label htmlFor="tag" className="text-[12.5px] text-stone">
              Tag (opcional)
            </Label>
            <input
              id="tag"
              name="tag"
              maxLength={40}
              defaultValue={promo.tag ?? ''}
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="titulo" className="text-[12.5px] text-stone">
              Título
            </Label>
            <input
              id="titulo"
              name="titulo"
              required
              maxLength={120}
              defaultValue={promo.titulo}
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="descripcion" className="text-[12.5px] text-stone">
            Descripción (opcional)
          </Label>
          <textarea
            id="descripcion"
            name="descripcion"
            rows={3}
            defaultValue={promo.descripcion ?? ''}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label
              htmlFor="descuento_label"
              className="text-[12.5px] text-stone"
            >
              Descuento
            </Label>
            <input
              id="descuento_label"
              name="descuento_label"
              maxLength={20}
              defaultValue={promo.descuentoLabel ?? ''}
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="precio_eur" className="text-[12.5px] text-stone">
              Precio (€)
            </Label>
            <input
              id="precio_eur"
              name="precio_eur"
              type="number"
              step={0.5}
              min={0}
              defaultValue={
                promo.precioEur !== null
                  ? Number(promo.precioEur).toFixed(2)
                  : ''
              }
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="precio_anterior_eur"
              className="text-[12.5px] text-stone"
            >
              Precio anterior (€)
            </Label>
            <input
              id="precio_anterior_eur"
              name="precio_anterior_eur"
              type="number"
              step={0.5}
              min={0}
              defaultValue={
                promo.precioAnteriorEur !== null
                  ? Number(promo.precioAnteriorEur).toFixed(2)
                  : ''
              }
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="valida_hasta" className="text-[12.5px] text-stone">
              Válida hasta (opcional)
            </Label>
            <input
              id="valida_hasta"
              name="valida_hasta"
              type="date"
              defaultValue={promo.validaHasta ?? ''}
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="orden" className="text-[12.5px] text-stone">
              Orden
            </Label>
            <input
              id="orden"
              name="orden"
              type="number"
              defaultValue={promo.orden}
              className={inputClass}
            />
          </div>
        </div>

        <label className="flex items-center gap-3 pt-1">
          <input
            type="checkbox"
            name="activa"
            defaultChecked={promo.activa}
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
            href="/panel/promociones"
            className="tight text-[13.5px] text-stone hover:text-ink"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
