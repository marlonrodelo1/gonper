import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { mensajes, salones } from '@/lib/db/schema';

const querySchema = z.object({
  session_id: z.string().uuid(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      session_id: url.searchParams.get('session_id'),
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'session_id inválido' },
        { status: 400 },
      );
    }

    const [salon] = await db
      .select({ id: salones.id, activo: salones.activo })
      .from(salones)
      .where(eq(salones.slug, slug))
      .limit(1);

    if (!salon || !salon.activo) {
      return NextResponse.json({ error: 'Salón no encontrado' }, { status: 404 });
    }

    const filas = await db
      .select({
        id: mensajes.id,
        direccion: mensajes.direccion,
        contenido: mensajes.contenido,
        createdAt: mensajes.createdAt,
      })
      .from(mensajes)
      .where(
        and(
          eq(mensajes.salonId, salon.id),
          eq(mensajes.canal, 'web'),
          eq(mensajes.sessionId, parsed.data.session_id),
        ),
      )
      .orderBy(asc(mensajes.createdAt))
      .limit(200);

    return NextResponse.json({
      mensajes: filas.map((m) => ({
        id: m.id,
        direccion: m.direccion,
        contenido: m.contenido,
        created_at: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
