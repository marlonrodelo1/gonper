import { notFound } from 'next/navigation';
import { and, asc, eq } from 'drizzle-orm';
import type { Metadata } from 'next';
import type { CSSProperties } from 'react';

import { db } from '@/lib/db';
import { horarios, salones, servicios } from '@/lib/db/schema';
import {
  ACCENTS,
  TIPO_NEGOCIO_LABEL,
  calcularEstadoHorario,
} from '@/lib/salon-publico/horario';
import {
  getTiendaSalonBySlug,
  listTiendaProductos,
} from '@/lib/tienda/query';
import { TopNav } from '@/components/salon-publico/top-nav';
import { Hero } from '@/components/salon-publico/hero';
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

  // Cargamos el salón completo (necesario para el Hero: bannerUrl,
  // telefono, email, agente, etc.) junto con horarios y servicios top.
  const [salonRow] = await db
    .select()
    .from(salones)
    .where(eq(salones.slug, slug))
    .limit(1);

  if (!salonRow || !salonRow.activo) {
    notFound();
  }

  const [serviciosActivos, tramosHorario, productos] = await Promise.all([
    db
      .select({
        id: servicios.id,
        nombre: servicios.nombre,
        descripcion: servicios.descripcion,
        duracionMin: servicios.duracionMin,
        precioEur: servicios.precioEur,
        activo: servicios.activo,
      })
      .from(servicios)
      .where(and(eq(servicios.salonId, salonRow.id), eq(servicios.activo, true)))
      .orderBy(asc(servicios.orden), asc(servicios.createdAt)),
    db
      .select()
      .from(horarios)
      .where(eq(horarios.salonId, salonRow.id))
      .orderBy(asc(horarios.diaSemana), asc(horarios.inicio)),
    listTiendaProductos(salonRow.id),
  ]);

  const estadoHorario = calcularEstadoHorario(
    tramosHorario,
    salonRow.timezone || 'Europe/Madrid',
  );

  const tipoNegocioLabel =
    TIPO_NEGOCIO_LABEL[salonRow.tipoNegocio] ?? salonRow.tipoNegocio;

  const accent =
    ACCENTS[salonRow.tipoNegocio as keyof typeof ACCENTS] ?? ACCENTS.otro;

  const styleVars: CSSProperties = {
    ['--gestori-accent' as string]: accent.accent,
    ['--gestori-accent-2' as string]: accent.accent2,
    ['--gestori-accent-soft' as string]: accent.accentSoft,
    ['--gestori-accent-blush' as string]: accent.accentBlush,
  } as CSSProperties;

  // `aceptaPagos` (Stripe Connect onboarded) lo usa el carrito para
  // habilitar/deshabilitar el checkout. Lo reusamos del salón directo.
  const aceptaPagos = Boolean(salonRow.stripeConnectOnboarded);

  return (
    <div
      style={styleVars}
      className="bg-cream text-ink min-h-screen"
    >
      <TopNav salonNombre={salonRow.nombre} logoUrl={salonRow.logoUrl} />
      <Hero
        salon={salonRow}
        abierto={estadoHorario.abierto}
        estadoTexto={estadoHorario.estadoTexto}
        tipoNegocioLabel={tipoNegocioLabel}
        horarioHoyTexto={estadoHorario.horarioHoyTexto}
        servicios={serviciosActivos}
        tieneTienda={true}
        enTienda
        mostrarInfoRow={false}
      />

      <main className="mx-auto max-w-[1200px] px-5 py-10 sm:px-6 sm:py-14">
        <section className="text-center mb-8 sm:mb-12">
          <h1
            className="font-playfair text-ink"
            style={{
              fontSize: 'clamp(28px, 5vw, 48px)',
              letterSpacing: '-0.01em',
            }}
          >
            La <span className="font-serif-it">tienda</span> de {salonRow.nombre}
          </h1>
          <p className="mt-3 text-[14px] text-stone max-w-[520px] mx-auto leading-relaxed">
            Compra los productos que usamos en el salón. Recogida en el salón
            o envío a domicilio.
          </p>
        </section>

        {!aceptaPagos && (
          <div
            className="rounded-2xl border px-4 py-3 text-[13px] mb-6 text-center max-w-[600px] mx-auto"
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
          salonSlug={salonRow.slug}
          aceptaPagos={aceptaPagos}
        />
      </main>

      <CarritoFab salonSlug={salonRow.slug} aceptaPagos={aceptaPagos} />
    </div>
  );
}
