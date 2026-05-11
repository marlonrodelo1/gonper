import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getTiendaSalonBySlug } from '@/lib/tienda/query';
import { ExitoClient } from './_components/exito-client';

export default async function ExitoPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ numero?: string; payment_intent?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const salon = await getTiendaSalonBySlug(slug);
  if (!salon) notFound();

  return (
    <div className="min-h-screen" style={{ background: 'var(--cream)' }}>
      <main className="mx-auto max-w-[640px] px-5 py-12 sm:px-6 sm:py-16">
        <div className="card flex flex-col items-center gap-4 p-8 text-center">
          <span
            className="grid h-14 w-14 place-items-center rounded-full"
            style={{ background: 'rgba(139,157,122,0.18)' }}
          >
            <svg
              viewBox="0 0 24 24"
              width="28"
              height="28"
              fill="none"
              stroke="#5A6B4D"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </span>
          <h1
            className="font-playfair text-ink"
            style={{ fontSize: 'clamp(26px, 4vw, 36px)' }}
          >
            ¡Pago <span className="font-serif-it">recibido</span>!
          </h1>
          <p className="text-[14px] text-stone leading-relaxed max-w-[440px]">
            Hemos recibido tu pedido{' '}
            {sp.numero ? (
              <span className="font-mono text-ink">{sp.numero}</span>
            ) : (
              'correctamente'
            )}
            . Te hemos enviado un email de confirmación. Pasa por{' '}
            <strong>{salon.nombre}</strong> a recoger cuando te avisemos
            que está listo.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <Link
              href={`/s/${salon.slug}`}
              className="tight rounded-full border border-line bg-paper px-5 py-2.5 text-[13px] font-medium text-ink hover:bg-cream"
            >
              Ver el salón
            </Link>
            <Link
              href={`/s/${salon.slug}/tienda`}
              className="gloss-btn tight rounded-full px-5 py-2.5 text-[13px] font-medium"
            >
              Volver a la tienda
            </Link>
          </div>
        </div>

        <ExitoClient salonSlug={salon.slug} />
      </main>
    </div>
  );
}
