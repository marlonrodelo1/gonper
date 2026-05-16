import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import type { Metadata } from 'next';

import { db } from '@/lib/db';
import { salones } from '@/lib/db/schema';
import { getAccentVars } from '@/lib/salon-publico/accent';
import { ResenaForm } from './_components/resena-form';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [salon] = await db
    .select({ nombre: salones.nombre })
    .from(salones)
    .where(eq(salones.slug, slug))
    .limit(1);

  if (!salon) return { title: 'Reseña · Gonper Studio' };
  return {
    title: `Deja tu reseña · ${salon.nombre}`,
    description: `Comparte tu experiencia en ${salon.nombre}.`,
    robots: { index: false, follow: false },
  };
}

export default async function ResenaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    error?: string;
    nombre?: string;
    rating?: string;
    texto?: string;
  }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const [salon] = await db
    .select({
      id: salones.id,
      slug: salones.slug,
      nombre: salones.nombre,
      tipoNegocio: salones.tipoNegocio,
      activo: salones.activo,
    })
    .from(salones)
    .where(eq(salones.slug, slug))
    .limit(1);

  if (!salon || !salon.activo) notFound();

  const styleVars = getAccentVars(salon.tipoNegocio);
  const ratingInicial = sp.rating ? Number(sp.rating) : 0;

  return (
    <div style={styleVars} className="bg-cream text-ink min-h-screen">
      <div className="mx-auto flex max-w-xl flex-col gap-6 px-6 py-12 sm:py-16">
        <div>
          <p className="text-[12px] uppercase tracking-[0.22em] text-stone/80">
            {salon.nombre}
          </p>
          <h1
            className="tight mt-2 font-medium text-ink"
            style={{ fontSize: 'clamp(28px, 4.5vw, 40px)', lineHeight: 1.05 }}
          >
            Deja tu <span className="font-serif-it">reseña</span>
          </h1>
          <p className="mt-3 text-[14.5px] text-stone">
            Cuéntanos cómo fue tu experiencia. La revisaremos antes de
            publicarla en la web.
          </p>
        </div>

        {sp.error ? (
          <div
            className="rounded-2xl border px-4 py-3 text-[13.5px]"
            style={{
              background: '#F1D6D6',
              borderColor: 'rgba(177,72,72,0.4)',
              color: '#7C2E2E',
            }}
          >
            {sp.error}
          </div>
        ) : null}

        <ResenaForm
          slug={salon.slug}
          ratingInicial={Number.isFinite(ratingInicial) ? ratingInicial : 0}
          nombreInicial={sp.nombre ?? ''}
          textoInicial={sp.texto ?? ''}
        />

        <Link
          href={`/s/${salon.slug}`}
          className="text-center text-[13px] text-stone hover:text-ink"
        >
          ← Volver a {salon.nombre}
        </Link>
      </div>
    </div>
  );
}
