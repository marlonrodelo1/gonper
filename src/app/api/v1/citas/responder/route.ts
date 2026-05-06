import { NextResponse } from 'next/server';

import { requireApiToken } from '@/lib/api/auth';
import { responderCita, type SourceRespuesta } from '@/lib/citas/responder';
import type { AccionCita } from '@/lib/citas/token';

/**
 * POST /api/v1/citas/responder
 *
 * Lo invocan los workflows de n8n cuando el cliente pulsa los botones
 * inline del recordatorio (Telegram / WhatsApp). El usuario que llega por
 * email no usa este endpoint — usa /c/[token] o /x/[token] que validan
 * mediante token firmado y no requieren API token.
 *
 * Body JSON:
 *   { citaId: string, accion: 'confirmar'|'cancelar', source?: 'telegram'|'whatsapp'|'web' }
 *
 * Auth: bearer INTERNAL_API_TOKEN.
 */
export async function POST(request: Request) {
  const authError = requireApiToken(request);
  if (authError) return authError;

  let body: { citaId?: unknown; accion?: unknown; source?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const citaId = typeof body.citaId === 'string' ? body.citaId.trim() : '';
  const accion = body.accion === 'confirmar' || body.accion === 'cancelar' ? body.accion : null;
  const sourceRaw = typeof body.source === 'string' ? body.source : 'telegram';
  const source: SourceRespuesta =
    sourceRaw === 'whatsapp' || sourceRaw === 'web' || sourceRaw === 'email'
      ? sourceRaw
      : 'telegram';

  if (!citaId) {
    return NextResponse.json({ error: 'citaId requerido' }, { status: 400 });
  }
  if (!accion) {
    return NextResponse.json(
      { error: "accion debe ser 'confirmar' o 'cancelar'" },
      { status: 400 },
    );
  }

  const result = await responderCita({
    citaId,
    accion: accion as AccionCita,
    source,
  });

  if (!result.ok) {
    const status =
      result.error === 'no_encontrada'
        ? 404
        : result.error === 'pasada'
          ? 410
          : 409;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    ok: true,
    accion: result.accion,
    estado: result.estado,
  });
}
