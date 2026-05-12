import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import {
  getTiendaProductoBySlug,
  getTiendaSalonBySlug,
} from '@/lib/tienda/query';

import { ProductoFichaClient } from './_components/producto-ficha-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; marca: string; producto: string }>;
}): Promise<Metadata> {
  const { slug, marca, producto } = await params;
  const salon = await getTiendaSalonBySlug(slug);
  if (!salon) return { title: 'Producto no encontrado' };
  const p = await getTiendaProductoBySlug({
    salonId: salon.id,
    marcaSlug: marca,
    productoSlug: producto,
  });
  if (!p) return { title: 'Producto no encontrado' };
  return {
    title: `${p.nombre} · ${p.marca.nombre} · ${salon.nombre}`,
    description:
      p.descripcion?.slice(0, 160) ??
      `Compra ${p.nombre} en ${salon.nombre}. Recogida en tienda.`,
  };
}

export default async function ProductoFichaPage({
  params,
}: {
  params: Promise<{ slug: string; marca: string; producto: string }>;
}) {
  const { slug, marca, producto } = await params;
  const salon = await getTiendaSalonBySlug(slug);
  if (!salon) notFound();
  const p = await getTiendaProductoBySlug({
    salonId: salon.id,
    marcaSlug: marca,
    productoSlug: producto,
  });
  if (!p) notFound();

  return (
    <div className="min-h-screen" style={{ background: 'var(--cream)' }}>
      <header className="border-b border-line bg-paper">
        <div className="mx-auto max-w-[1100px] flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
          <Link
            href={`/s/${salon.slug}/tienda`}
            className="text-[13px] text-stone hover:text-ink tight"
          >
            ← Tienda de {salon.nombre}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-5 py-8 sm:px-6 sm:py-12">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Imágenes */}
          <div
            className="card overflow-hidden bg-cream-2"
            style={{ aspectRatio: '1/1' }}
          >
            {p.imagenes[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.imagenes[0]}
                alt={p.nombre}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full grid place-items-center text-[88px] font-serif-it text-stone/40">
                {p.nombre.charAt(0)}
              </div>
            )}
          </div>

          {/* Info + add to cart */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-[11.5px] uppercase tracking-[0.18em] text-stone">
              {p.marca.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.marca.logoUrl}
                  alt=""
                  className="h-4 w-4 rounded-full object-cover"
                />
              )}
              {p.marca.nombre}
            </div>
            <h1
              className="font-playfair text-ink leading-tight"
              style={{
                fontSize: 'clamp(28px, 4vw, 40px)',
                letterSpacing: '-0.01em',
              }}
            >
              {p.nombre}
            </h1>
            {p.descripcion && (
              <p className="text-[14px] text-stone leading-relaxed">
                {p.descripcion}
              </p>
            )}
            <div className="flex items-baseline gap-3">
              <span className="tight text-[36px] font-medium text-ink">
                {p.precioEur.toFixed(2)} €
              </span>
              <span className="text-[12.5px] text-stone">/ {p.unidad}</span>
            </div>
            <ProductoFichaClient
              salonSlug={salon.slug}
              aceptaPagos={salon.aceptaPagos}
              producto={p}
            />

            <div className="mt-4 rounded-2xl bg-paper border border-line p-4 text-[12.5px] text-stone leading-relaxed">
              <div className="font-medium text-ink mb-1">Recogida en salón</div>
              Compra online y pásate por <strong>{salon.nombre}</strong> a
              recoger tu pedido. Te avisamos por email cuando esté listo.
              Sin envíos ni costes extra.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
