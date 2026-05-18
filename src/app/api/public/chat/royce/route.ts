import { NextResponse } from 'next/server';
import { z } from 'zod';

import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit';
import { runRoyceTurn } from '@/lib/royce/orchestrator';

/**
 * POST /api/public/chat/royce
 *
 * Chat de Royce desde el widget de la landing/marketplace. Hasta 2026-05-19
 * proxeaba a un workflow n8n; ahora el orquestador (LLM + tools) vive en
 * `src/lib/royce/orchestrator.ts` y se ejecuta inline.
 *
 * Rate limit: 100 mensajes/día por IP (igual que el chat de tienda).
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  session_id: z.string().uuid(),
  message: z.string().trim().min(1).max(1000),
  visitor_email: z.string().email().max(200).optional(),
  visitor_nombre: z.string().trim().max(120).optional(),
  surface: z.enum(['landing', 'marketplace']).default('landing'),
});

const FALLBACK_REPLY =
  'Estoy teniendo un problema, vuelve a probar en un momento.';

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Parámetros inválidos', detalles: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // Rate limit por IP — 100 mensajes/día (igual que chat tienda)
  const ip = getClientIp(req);
  const limit = await checkRateLimit('ip', ip, 100);
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: 'Has alcanzado el límite diario de mensajes. Vuelve mañana.',
        code: 'RATE_LIMIT',
      },
      { status: 429 },
    );
  }

  try {
    const result = await runRoyceTurn({
      sessionId: data.session_id,
      canal: 'landing',
      // En BD, `agente_sesiones.surface` admite landing/marketplace/admin_test/admin_telegram.
      // El widget puede mandar landing o marketplace; el canal del prompt es siempre `landing`.
      surface: data.surface,
      message: data.message,
      visitorEmail: data.visitor_email,
      visitorNombre: data.visitor_nombre,
    });

    return NextResponse.json({
      reply: result.reply || FALLBACK_REPLY,
      session_id: data.session_id,
    });
  } catch (err) {
    console.error('[chat/royce]', err);
    return NextResponse.json(
      {
        reply: FALLBACK_REPLY,
        session_id: data.session_id,
        error: 'internal',
      },
      { status: 200 },
    );
  }
}
