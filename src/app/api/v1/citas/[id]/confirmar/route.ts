import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  citas,
  servicios,
  profesionales,
  clientes,
} from '@/lib/db/schema';
import { requireApiToken } from '@/lib/api/auth';

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

    const [cita] = await db
      .select({ id: citas.id, estado: citas.estado, salonId: citas.salonId })
      .from(citas)
      .where(eq(citas.id, id))
      .limit(1);
    if (!cita) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }
    if (cita.estado !== 'pendiente') {
      return NextResponse.json(
        {
          error: `Solo se puede confirmar una cita pendiente (estado actual: ${cita.estado})`,
        },
        { status: 409 },
      );
    }

    const ahora = new Date();
    await db
      .update(citas)
      .set({
        estado: 'confirmada',
        confirmadaAt: ahora,
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
        confirmadaAt: citas.confirmadaAt,
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
