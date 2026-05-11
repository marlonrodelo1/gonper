import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getTiendaSalonBySlug } from '@/lib/tienda/query';
import { CheckoutClient } from './_components/checkout-client';

export const dynamic = 'force-dynamic';

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const salon = await getTiendaSalonBySlug(slug);
  if (!salon) notFound();

  return (
    <div className="min-h-screen" style={{ background: 'var(--cream)' }}>
      <header className="border-b border-line bg-paper">
        <div className="mx-auto max-w-[900px] flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
          <Link
            href={`/s/${salon.slug}/tienda/carrito`}
            className="text-[13px] text-stone hover:text-ink tight"
          >
            ← Volver al carrito
          </Link>
          <div className="text-[11.5px] uppercase tracking-[0.2em] text-stone">
            Pago · {salon.nombre}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[900px] px-5 py-8 sm:px-6 sm:py-12">
        <CheckoutClient
          salonSlug={salon.slug}
          salonNombre={salon.nombre}
          salonDireccion={salon.direccion}
          aceptaPagoOnline={salon.aceptaPagoOnline}
          aceptaEfectivo={salon.aceptaEfectivo}
          costeEnvioEur={salon.costeEnvioEur}
          zonaEnvio={salon.zonaEnvio}
        />
      </main>
    </div>
  );
}
