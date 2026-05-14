import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import {
  getTiendaSalonBySlug,
  listTiendaProductos,
} from '@/lib/tienda/query';
import { TiendaGrid } from './_components/tienda-grid';
import { CarritoFab } from './_components/carrito-fab';

// Revalidamos cada minuto para que activar/desactivar productos en BD
// se vea reflejado sin esperar un redeploy.
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const salon = await getTiendaSalonBySlug(slug);
  if (!salon) return { title: 'Tienda no encontrada · Gonper Studio' };
  return {
    title: `Tienda · ${salon.nombre} · Gonper Studio`,
    description: `Compra productos de belleza y cosmética en ${salon.nombre}. Recogida en el salón.`,
  };
}

export default async function TiendaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const salon = await getTiendaSalonBySlug(slug);
  if (!salon) notFound();
  const productos = await listTiendaProductos(salon.id);

  return (
    <div className="min-h-screen" style={{ background: 'var(--cream)' }}>
      {/* Header simple */}
      <header className="border-b border-line bg-paper">
        <div className="mx-auto max-w-[1100px] flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
          <Link
            href={`/s/${salon.slug}`}
            className="flex items-center gap-3 text-ink"
          >
            {salon.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={salon.logoUrl}
                alt={salon.nombre}
                className="h-10 w-10 rounded-full object-cover border border-line"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-cream-2 grid place-items-center text-[14px] font-serif-it text-stone">
                {salon.nombre.charAt(0)}
              </div>
            )}
            <div className="leading-tight">
              <div className="tight text-[15px] font-medium">
                {salon.nombre}
              </div>
              <div className="text-[11.5px] text-stone uppercase tracking-[0.2em]">
                Tienda
              </div>
            </div>
          </Link>
          <Link
            href={`/s/${salon.slug}`}
            className="text-[12.5px] text-stone hover:text-ink tight"
          >
            ← Volver al salón
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-5 py-8 sm:px-6 sm:py-12">
        <section className="text-center mb-8 sm:mb-12">
          <h1
            className="font-playfair text-ink"
            style={{
              fontSize: 'clamp(28px, 5vw, 48px)',
              letterSpacing: '-0.01em',
            }}
          >
            La <span className="font-serif-it">tienda</span> de {salon.nombre}
          </h1>
          <p className="mt-3 text-[14px] text-stone max-w-[520px] mx-auto leading-relaxed">
            Compra y pasa a recoger por el salón. Sin costes de envío, sin
            esperas.
          </p>
        </section>

        {!salon.aceptaPagos && (
          <div
            className="rounded-2xl border px-4 py-3 text-[13px] mb-6 text-center"
            style={{
              borderColor: 'rgba(197,142,44,0.45)',
              background: 'rgba(197,142,44,0.10)',
              color: '#7A5A1B',
            }}
          >
            Este salón aún está configurando los pagos. Vuelve en unos días.
          </div>
        )}

        <TiendaGrid
          productos={productos}
          salonSlug={salon.slug}
          aceptaPagos={salon.aceptaPagos}
        />
      </main>

      <CarritoFab salonSlug={salon.slug} aceptaPagos={salon.aceptaPagos} />
    </div>
  );
}
