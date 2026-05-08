import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { profesionales, salones, servicios } from '@/lib/db/schema';
import { calcularSlots } from '@/lib/agenda/slots';

const querySchema = z.object({
  servicio_id: z.string().uuid(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'fecha debe ser YYYY-MM-DD'),
  profesional_id: z.string().uuid().optional(),
});

/**
 * GET /api/public/[slug]/slots?servicio_id=...&fecha=YYYY-MM-DD[&profesional_id=...]
 *
 * Devuelve los huecos disponibles para reservar ese servicio en esa fecha.
 * Si no se pasa profesional_id, calcula la unión de slots de todos los
 * profesionales activos (cualquiera puede atender).
 *
 * Endpoint público sin auth. Lo usa la burbuja de chat (tool
 * `listar_slots_disponibles`) y se devuelven slots como ISO strings UTC.
 */
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
      profesional_id: url.searchParams.get('profesional_id') ?? undefined,
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
      .select({
        id: servicios.id,
        duracionMin: servicios.duracionMin,
        nombre: servicios.nombre,
      })
      .from(servicios)
      .where(
        and(eq(servicios.id, servicio_id), eq(servicios.salonId, salon.id), eq(servicios.activo, true)),
      )
      .limit(1);

    if (!serv) {
      return NextResponse.json(
        { error: 'Servicio no encontrado en este salón' },
        { status: 400 },
      );
    }

    let listaProfesionales;
    if (profesional_id) {
      listaProfesionales = await db
        .select({ id: profesionales.id, nombre: profesionales.nombre })
        .from(profesionales)
        .where(
          and(
            eq(profesionales.id, profesional_id),
            eq(profesionales.salonId, salon.id),
            eq(profesionales.activo, true),
          ),
        )
        .limit(1);
      if (listaProfesionales.length === 0) {
        return NextResponse.json(
          { error: 'Profesional no disponible' },
          { status: 400 },
        );
      }
    } else {
      listaProfesionales = await db
        .select({ id: profesionales.id, nombre: profesionales.nombre })
        .from(profesionales)
        .where(
          and(eq(profesionales.salonId, salon.id), eq(profesionales.activo, true)),
        )
        .orderBy(asc(profesionales.orden), asc(profesionales.nombre));
    }

    if (listaProfesionales.length === 0) {
      return NextResponse.json({
        slots: [],
        servicio: { id: serv.id, nombre: serv.nombre, duracion_min: serv.duracionMin },
        timezone: salon.timezone,
      });
    }

    // Calcular slots para cada profesional y fundirlos en un set ordenado.
    const fechaBase = new Date(`${fecha}T12:00:00.000Z`);
    const ahora = Date.now();
    const slotMap = new Map<string, string>(); // iso -> iso
    for (const p of listaProfesionales) {
      const ss = await calcularSlots({
        salonId: salon.id,
        profesionalId: p.id,
        duracionMin: serv.duracionMin,
        fecha: fechaBase,
        timezone: salon.timezone,
      });
      for (const s of ss) {
        if (s.getTime() <= ahora) continue;
        const iso = s.toISOString();
        if (!slotMap.has(iso)) slotMap.set(iso, iso);
      }
    }

    const slots = Array.from(slotMap.values()).sort();

    return NextResponse.json({
      slots,
      servicio: {
        id: serv.id,
        nombre: serv.nombre,
        duracion_min: serv.duracionMin,
      },
      fecha,
      timezone: salon.timezone,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
