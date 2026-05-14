'use client';

import { CircularGallery, type GalleryItem } from '@/components/ui/circular-gallery';
import type { ProductoDestacado } from '@/lib/tienda/query';

type Props = {
  salonSlug: string;
  productos: ProductoDestacado[];
};

const eurFmt = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

function formatPrecio(precio: number): string {
  if (Number.isInteger(precio)) return `${precio}€`;
  return eurFmt.format(precio);
}

export function ProductosDestacados({ salonSlug, productos }: Props) {
  if (productos.length === 0) return null;

  const items: GalleryItem[] = productos.map((p) => ({
    image: p.imagen as string,
    text: `${p.nombre} · ${formatPrecio(p.precioEur)}`,
    href: `/s/${salonSlug}/tienda/${p.marcaSlug}/${p.productoSlug}`,
  }));

  return (
    <section className="px-0 sm:px-6 pt-14 sm:pt-20">
      <div className="mx-auto max-w-[1400px]">
        <div className="reveal mb-6 sm:mb-8 px-6 sm:px-0">
          <div className="text-[12.5px] uppercase tracking-[0.22em] text-stone/80 mb-2">
            Productos destacados
          </div>
          <h2
            className="tight font-medium text-ink"
            style={{ fontSize: 'clamp(26px,3.4vw,38px)', lineHeight: 1.1 }}
          >
            Lo que <span className="font-serif-it">usamos contigo</span>
          </h2>
        </div>

        <div className="reveal h-[480px] sm:h-[560px]" data-delay="80">
          <CircularGallery items={items} bend={2} borderRadius={0.05} />
        </div>

        <div className="text-center mt-6 px-6 sm:px-0">
          <a
            href={`/s/${salonSlug}/tienda`}
            className="inline-flex items-center gap-2 text-[14px] text-stone hover:text-ink tight transition"
          >
            Ver toda la tienda
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14" />
              <path d="M13 6l6 6-6 6" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
