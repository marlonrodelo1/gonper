import type { ProductoCatalogo } from '@/lib/catalogo/types';
import { toggleProductoEnMiTienda } from '../actions';

export function ProductoCard({
  producto: p,
  returnTo,
}: {
  producto: ProductoCatalogo;
  returnTo: string;
}) {
  return (
    <article className="card flex flex-col overflow-hidden">
      <div
        className="relative w-full bg-cream-2"
        style={{ aspectRatio: '4/3' }}
      >
        {p.imagenes[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.imagenes[0]}
            alt={p.nombre}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-[28px] font-serif-it text-stone/60">
            {p.nombre.charAt(0).toUpperCase()}
          </div>
        )}
        {p.enMiTienda && (
          <span
            className="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10.5px] font-medium tight"
            style={{ background: 'rgba(139,157,122,0.92)', color: '#FBF8F2' }}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: '#FBF8F2' }}
            />
            En mi tienda
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <h3
          className="font-playfair leading-tight text-ink line-clamp-2"
          style={{ fontSize: '15px', letterSpacing: '-0.01em' }}
        >
          {p.nombre}
        </h3>

        <div className="flex items-baseline gap-2">
          <span className="tight text-[18px] font-medium text-ink">
            {p.precioPublicoEur.toFixed(2)} €
          </span>
          <span className="text-[11px] text-stone/70">/ {p.unidadMedida}</span>
        </div>

        <div className="text-[11.5px] text-sage-deep">
          Te llevas{' '}
          <span className="font-medium tabular-nums">
            {p.comisionSalonEur.toFixed(2)} €
          </span>{' '}
          por venta
        </div>

        <form action={toggleProductoEnMiTienda} className="mt-auto pt-2">
          <input type="hidden" name="producto_id" value={p.id} />
          <input type="hidden" name="return_to" value={returnTo} />
          <button
            type="submit"
            className={`tight inline-flex w-full items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[12.5px] font-medium transition ${
              p.enMiTienda
                ? 'border border-line bg-paper text-stone hover:text-ink'
                : 'gloss-btn'
            }`}
          >
            {p.enMiTienda ? 'Quitar de mi tienda' : 'Vender en mi tienda'}
          </button>
        </form>
      </div>
    </article>
  );
}
