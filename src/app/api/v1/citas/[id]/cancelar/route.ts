import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  citas,
  servicios,
  profesionales,
  clientes,
} from '@/lib/db/schema';
import { requireApiToken } from '@/lib/api/auth';

const bodySchema = z.object({
  motivo: z.string().optional(),
  cancelada_por: z.enum(['cliente', 'sistema']).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = requireApiToken(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ error: 'id inválido' }, { status: 400 });
    }

    const raw = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(raw ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Body inválido', detalles: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { motivo, cancelada_por } = parsed.data;

    const [cita] = await db
      .select({ id: citas.id, estado: citas.estado, salonId: citas.salonId })
      .from(citas)
      .where(eq(citas.id, id))
      .limit(1);
    if (!cita) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }
    if (cita.estado === 'cancelada') {
      return NextResponse.json(
        { error: 'La cita ya estaba cancelada' },
        { status: 409 },
      );
    }

    const ahora = new Date();
    await db
      .update(citas)
      .set({
        estado: 'cancelada',
        canceladaAt: ahora,
        canceladaPor: cancelada_por ?? 'cliente',
        motivoCancelacion: motivo ?? null,
        updatedAt: ahora,
      })
      .where(and(eq(citas.id, id), eq(citas.salonId, cita.salonId)));

    const [actualizada] = await db
      .select({
        id: citas.id,
        salonId: citas.salonId,
        inicio: citas.inicio,
        fin: citas.fin,
        estado: citas.estado,
        canceladaAt: citas.canceladaAt,
        canceladaPor: citas.canceladaPor,
        motivoCancelacion: citas.motivoCancelacion,
        servicio: {
          id: servicios.id,
          nombre: servicios.nombre,
        },
        profesional: {
          id: profesionales.id,
          nombre: profesionales.nombre,
        },
        cliente: {
          id: clientes.id,
          nombre: clientes.nombre,
          telegramId: clientes.telegramId,
          telefono: clientes.telefono,
        },
      })
      .from(citas)
      .innerJoin(servicios, eq(servicios.id, citas.servicioId))
      .innerJoin(profesionales, eq(profesionales.id, citas.profesionalId))
      .innerJoin(clientes, eq(clientes.id, citas.clienteId))
      .where(and(eq(citas.id, id), eq(citas.salonId, cita.salonId)))
      .limit(1);

    return NextResponse.json({
      ok: true,
      cita: actualizada
        ? {
            ...actualizada,
            cliente: {
              ...actualizada.cliente,
              telegramId: actualizada.cliente.telegramId
                ? actualizada.cliente.telegramId.toString()
                : null,
            },
          }
        : null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
