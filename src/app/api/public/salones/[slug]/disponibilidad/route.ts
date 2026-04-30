import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { salones, servicios, profesionales } from '@/lib/db/schema';
import { calcularSlots } from '@/lib/agenda/slots';

const querySchema = z.object({
  servicio_id: z.string().uuid(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'fecha debe ser YYYY-MM-DD'),
  profesional_id: z.string().uuid(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      servicio_id: url.searchParams.get('servicio_id'),
      fecha: url.searchParams.get('fecha'),
      profesional_id: url.searchParams.get('profesional_id'),
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parámetros inválidos', detalles: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { servicio_id, fecha, profesional_id } = parsed.data;

    const [salon] = await db
      .select({
        id: salones.id,
        timezone: salones.timezone,
        activo: salones.activo,
      })
      .from(salones)
      .where(eq(salones.slug, slug))
      .limit(1);
    if (!salon || !salon.activo) {
      return NextResponse.json({ error: 'Salón no encontrado' }, { status: 404 });
    }

    const [serv] = await db
      .select({ id: servicios.id, duracionMin: servicios.duracionMin })
      .from(servicios)
      .where(and(eq(servicios.id, servicio_id), eq(servicios.salonId, salon.id)))
      .limit(1);
    if (!serv) {
      return NextResponse.json(
        { error: 'Servicio no encontrado en este salón' },
        { status: 400 },
      );
    }

    const [prof] = await db
      .select({ id: profesionales.id })
      .from(profesionales)
      .where(
        and(
          eq(profesionales.id, profesional_id),
          eq(profesionales.salonId, salon.id),
        ),
      )
      .limit(1);
    if (!prof) {
      return NextResponse.json(
        { error: 'Profesional no encontrado en este salón' },
        { status: 400 },
      );
    }

    const slots = await calcularSlots({
      salonId: salon.id,
      profesionalId: prof.id,
      duracionMin: serv.duracionMin,
      fecha: new Date(`${fecha}T12:00:00Z`),
      timezone: salon.timezone,
    });

    return NextResponse.json({
      slots: slots.map((d) => d.toISOString()),
      duracionMin: serv.duracionMin,
      timezone: salon.timezone,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
