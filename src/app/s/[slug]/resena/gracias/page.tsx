import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import type { Metadata } from 'next';

import { db } from '@/lib/db';
import { salones } from '@/lib/db/schema';
import { getAccentVars } from '@/lib/salon-publico/accent';
import { Icon } from '@/components/salon-publico/icons';

export const metadata: Metadata = {
  title: 'Gracias por tu reseña',
  robots: { index: false, follow: false },
};

export default async function ResenaGraciasPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [salon] = await db
    .select({
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

  return (
    <div style={styleVars} className="bg-cream text-ink min-h-screen">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-5 px-6 py-16 text-center sm:py-20">
        <span
          className="grid h-16 w-16 place-items-center rounded-full"
          style={{ background: 'var(--gestori-accent-soft)' }}
        >
          <Icon.Check
            width="28"
            height="28"
            style={{ color: 'var(--gestori-accent-2)' }}
          />
        </span>
        <h1
          className="tight font-medium text-ink"
          style={{ fontSize: 'clamp(28px, 4.5vw, 40px)', lineHeight: 1.05 }}
        >
          ¡Gracias por tu <span className="font-serif-it">reseña</span>!
        </h1>
        <p className="text-[15px] text-stone">
          La hemos recibido. Antes de publicarla, {salon.nombre} la revisará.
        </p>
        <Link
          href={`/s/${salon.slug}`}
          className="mt-2 inline-flex h-12 items-center justify-center rounded-full border border-line bg-paper px-5 text-[15px] font-medium text-ink hover:border-ink/30"
        >
          Volver a {salon.nombre}
        </Link>
      </div>
    </div>
  );
}
