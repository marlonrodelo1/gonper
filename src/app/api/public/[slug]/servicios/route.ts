import { NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { salones, servicios } from '@/lib/db/schema';

/**
 * GET /api/public/[slug]/servicios
 * Devuelve los servicios activos del salón (id, nombre, precio, duración).
 *
 * Endpoint público, sin auth. Lo usa la burbuja de chat de la tienda
 * (tool `listar_servicios`) y cualquier UI pública que quiera el catálogo.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    const [salon] = await db
      .select({ id: salones.id, activo: salones.activo })
      .from(salones)
      .where(eq(salones.slug, slug))
      .limit(1);

    if (!salon || !salon.activo) {
      return NextResponse.json({ error: 'Salón no encontrado' }, { status: 404 });
    }

    const lista = await db
      .select({
        id: servicios.id,
        nombre: servicios.nombre,
        descripcion: servicios.descripcion,
        precio_eur: servicios.precioEur,
        duracion_min: servicios.duracionMin,
      })
      .from(servicios)
      .where(and(eq(servicios.salonId, salon.id), eq(servicios.activo, true)))
      .orderBy(asc(servicios.orden), asc(servicios.createdAt))
      .limit(100);

    return NextResponse.json({ servicios: lista });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
