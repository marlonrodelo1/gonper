import { notFound } from 'next/navigation';
import Link from 'next/link';
import { eq } from 'drizzle-orm';
import type { Metadata } from 'next';

import { db } from '@/lib/db';
import { salones } from '@/lib/db/schema';
import { FarmasiIframe } from '@/components/farmasi/farmasi-iframe';

// Revalidamos cada 60s para que cambios de farmasi_username del dueño
// se reflejen rápido sin esperar redeploy.
export const revalidate = 60;

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
  return {
    title: salon
      ? `Tienda · ${salon.nombre} · Gonper Studio`
      : 'Tienda no encontrada',
    description: salon
      ? `Cosmética Farmasi recomendada por ${salon.nombre}.`
      : '',
    robots: { index: false, follow: true },
  };
}

/**
 * Tienda Farmasi del salón embebida vía iframe. Se sirve dentro de
 * Gonper Studio para que el cliente no salga visualmente. El iframe
 * apunta a farmasi.es/{farmasi_username} del salón.
 *
 * Si el salón no tiene farmasi_username configurado, muestra un mensaje
 * en vez del iframe (no debería pasar — el botón "Visitar tienda" del
 * banner solo aparece si está configurado).
 */
export default async function SalonTiendaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [salon] = await db
    .select({
      nombre: salones.nombre,
      slug: salones.slug,
      activo: salones.activo,
      farmasiUsername: salones.farmasiUsername,
    })
    .from(salones)
    .where(eq(salones.slug, slug))
    .limit(1);

  if (!salon || !salon.activo) {
    notFound();
  }

  if (!salon.farmasiUsername) {
    return (
      <div className="min-h-screen bg-cream text-ink flex flex-col">
        <header className="border-b border-line bg-paper/95 px-4 py-3 backdrop-blur">
          <Link
            href={`/s/${salon.slug}`}
            className="tight inline-flex items-center gap-1.5 text-[13px] font-medium text-ink hover:text-terracotta-2"
          >
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5" />
              <path d="M11 6l-6 6 6 6" />
            </svg>
            Volver a {salon.nombre}
          </Link>
        </header>
        <main className="mx-auto flex max-w-[640px] flex-1 flex-col items-center justify-center px-5 py-20 text-center">
          <h1 className="tight text-[22px] font-medium text-ink">
            Tienda no disponible
          </h1>
          <p className="mt-2 text-[13.5px] text-stone">
            Este salón aún no ha activado su tienda Farmasi.
          </p>
        </main>
      </div>
    );
  }

  return (
    <FarmasiIframe
      username={salon.farmasiUsername}
      titulo={salon.nombre}
      volverHref={`/s/${salon.slug}`}
      volverLabel={`Volver a ${salon.nombre}`}
    />
  );
}
