import type { Metadata } from 'next';
import Link from 'next/link';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { agentes } from '@/lib/db/schema';
import {
  CATEGORIAS_MARKETPLACE,
  categoriaBy,
  getMarketplaceFiltros,
  listMarketplaceSalones,
  type TipoNegocio,
} from '@/lib/marketplace/query';
import { MarketplaceHero } from '@/components/marketplace/hero';
import { MarketplaceSidebar } from '@/components/marketplace/sidebar';
import { SalonCard } from '@/components/marketplace/salon-card';
import { ActiveFilters } from '@/components/marketplace/active-filters';
import { MarketplaceEmptyState } from '@/components/marketplace/empty-state';
import { MarketplaceShell } from '@/components/marketplace/shell';
import { MarketplaceReveal } from '@/components/marketplace/reveal';
import { MarketplaceFooter } from '@/components/marketplace/footer';
import { RoyceChatWidget } from '@/components/landing/royce-chat-widget';

export const revalidate = 60;

const ROYCE_BIENVENIDA_FALLBACK =
  '¡Hola! Soy Royce. ¿Buscas algo concreto? Puedo ayudarte a filtrar por barrio, categoría o disponibilidad.';

const TIPOS_VALIDOS: ReadonlySet<string> = new Set(
  CATEGORIAS_MARKETPLACE.map((c) => c.key),
);

type SearchParams = {
  categoria?: string;
  ciudad?: string;
  q?: string;
};

async function getRoyceBienvenida(): Promise<string> {
  try {
    const [row] = await db
      .select({ bienvenida: agentes.bienvenida, activo: agentes.activo })
      .from(agentes)
      .where(eq(agentes.slug, 'royce'))
      .limit(1);
    if (!row || !row.activo || !row.bienvenida) return ROYCE_BIENVENIDA_FALLBACK;
    return row.bienvenida;
  } catch {
    return ROYCE_BIENVENIDA_FALLBACK;
  }
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const cat = sp.categoria && TIPOS_VALIDOS.has(sp.categoria) ? sp.categoria : null;
  const ciudad = sp.ciudad ?? null;

  const partes: string[] = [];
  if (cat) partes.push(categoriaBy(cat).label + 's');
  else partes.push('Salones de belleza y peluquería');
  if (ciudad) partes.push(`en ${ciudad}`);

  const title = `${partes.join(' ')} · Gestori`;
  const description =
    'Descubre peluquerías, barberías, manicura y estética en toda España. Reserva sin descargas, en una conversación.';

  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
  };
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const categoria =
    sp.categoria && TIPOS_VALIDOS.has(sp.categoria)
      ? (sp.categoria as TipoNegocio)
      : '';
  const ciudad = sp.ciudad ?? '';
  const q = sp.q ?? '';

  const [{ total, categorias, ciudades }, salones, royceBienvenida] =
    await Promise.all([
      getMarketplaceFiltros(),
      listMarketplaceSalones({
        categoria: categoria || undefined,
        ciudad: ciudad || undefined,
        q: q || undefined,
      }),
      getRoyceBienvenida(),
    ]);

  const ciudadesNombres = ciudades.map((c) => c.value);
  const heroCategorias = categorias.map((c) => {
    const meta = categoriaBy(c.key);
    return { key: c.key, label: meta.label, dot: meta.dot, count: c.count };
  });

  const hasFilters = !!categoria || !!ciudad || !!q.trim();
  const filtersCount =
    (categoria ? 1 : 0) + (ciudad ? 1 : 0) + (q.trim() ? 1 : 0);

  return (
    <div className="min-h-screen pb-[80px] sm:pb-0" style={{ background: 'var(--cream)' }}>
      <MarketplaceReveal />
      <MarketplaceShell
        filtersCount={filtersCount}
        q={q}
        ciudad={ciudad}
        categoria={categoria}
        ciudades={ciudadesNombres}
        hasFilters={hasFilters}
      />

      <MarketplaceHero
        q={q}
        ciudad={ciudad}
        categoria={categoria}
        ciudades={ciudadesNombres}
        categorias={heroCategorias}
        total={total}
      />

      <section className="px-5 sm:px-6">
        <div className="mx-auto max-w-[1240px] flex gap-8">
          <MarketplaceSidebar
            q={q}
            ciudad={ciudad}
            categoria={categoria}
            ciudades={ciudadesNombres}
            hasFilters={hasFilters}
          />
          <div className="flex-1 min-w-0">
            <div className="reveal in flex items-center justify-between gap-4 flex-wrap mb-5">
              <ActiveFilters
                categoria={categoria}
                ciudad={ciudad}
                q={q}
                count={salones.length}
                total={total}
              />
            </div>

            {salones.length === 0 ? (
              <MarketplaceEmptyState />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {salones.map((s, i) => (
                  <div
                    key={s.slug}
                    className="reveal"
                    data-delay={Math.min(i * 40, 320)}
                  >
                    <SalonCard s={s} />
                  </div>
                ))}
              </div>
            )}

            {salones.length > 0 && (
              <div className="reveal mt-12 mb-4 px-6 py-7 rounded-3xl bg-paper border border-line text-center">
                <div
                  className="font-playfair text-ink"
                  style={{ fontSize: '22px', letterSpacing: '-0.01em' }}
                >
                  ¿No encuentras tu <span className="font-serif-it">salón</span>?
                </div>
                <p className="mt-2 text-[13.5px] text-stone max-w-[420px] mx-auto leading-relaxed">
                  Si tu peluquería o barbería favorita no aparece, escríbenos.
                  La añadimos en menos de 24h.
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Link
                    href="/signup"
                    className="px-5 py-2.5 rounded-full bg-cream border border-line text-ink text-[13px] font-medium tight hover:border-line-2 transition"
                  >
                    Recomendar salón
                  </Link>
                  <Link
                    href="/signup"
                    className="px-5 py-2.5 rounded-full gloss-btn text-[13px] font-medium tight"
                  >
                    Soy un salón
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <MarketplaceFooter />
      <RoyceChatWidget bienvenida={royceBienvenida} surface="marketplace" />
    </div>
  );
}
