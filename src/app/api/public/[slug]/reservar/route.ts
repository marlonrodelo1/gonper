import { NextResponse } from 'next/server';
import { z } from 'zod';

import { crearReservaPublica } from '@/lib/reservas/publica';
import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit';

const bodySchema = z.object({
  servicio_id: z.string().uuid(),
  profesional_id: z.string().uuid().optional(),
  inicio_iso: z.string().min(10),
  cliente_nombre: z.string().trim().min(1).max(120),
  cliente_email: z.string().trim().email().max(200),
  cliente_telefono: z.string().trim().max(40).optional(),
  notas: z.string().trim().max(500).optional(),
});

/**
 * POST /api/public/[slug]/reservar
 *
 * Crea una cita desde la burbuja de chat de la tienda (sin auth).
 * Re-verifica el slot, crea/asocia cliente por email y dispara email
 * de confirmación + Telegram al dueño.
 *
 * Errores semánticos en el campo `code`:
 *  - SLOT_OCUPADO   → el slot ya no está libre (race)
 *  - SERVICIO_NO_DISPONIBLE / PROFESIONAL_NO_DISPONIBLE / SALON_NO_DISPONIBLE
 *  - INICIO_INVALIDO / INICIO_PASADO
 *  - EMAIL_INVALIDO / NOMBRE_INVALIDO
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    // Rate limit por IP — antiabuso del endpoint público.
    const ip = getClientIp(request);
    const limit = await checkRateLimit('ip', `reservar:${ip}`, 30);
    if (!limit.ok) {
      return NextResponse.json(
        {
          error: 'Demasiadas reservas desde tu IP. Inténtalo más tarde.',
          code: 'RATE_LIMIT',
        },
        { status: 429 },
      );
    }

    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parámetros inválidos', detalles: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = parsed.data;

    const result = await crearReservaPublica({
      slug,
      servicioId: data.servicio_id,
      profesionalId: data.profesional_id ?? null,
      inicioIso: data.inicio_iso,
      clienteNombre: data.cliente_nombre,
      clienteEmail: data.cliente_email,
      clienteTelefono: data.cliente_telefono ?? null,
      notas: data.notas ?? null,
      origen: 'chat_tienda',
    });

    if (!result.ok) {
      const status =
        result.error.code === 'SLOT_OCUPADO'
          ? 409
          : result.error.code === 'INTERNO'
            ? 500
            : 400;
      return NextResponse.json(
        { error: result.error.message, code: result.error.code },
        { status },
      );
    }

    return NextResponse.json(
      {
        cita_id: result.citaId,
        inicio_iso: result.inicioIso,
        fin_iso: result.finIso,
        servicio_nombre: result.servicioNombre,
        profesional_id: result.profesionalId,
        profesional_nombre: result.profesionalNombre,
        precio_eur: result.precioEur,
        duracion_min: result.duracionMin,
        timezone: result.timezone,
        email_enviado: result.emailEnviado,
      },
      { status: 201 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
