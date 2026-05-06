import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { salones } from '@/lib/db/schema';
import { requireApiToken } from '@/lib/api/auth';
import { verifyVinculacionToken } from '@/lib/admin/vinculacion-token';

/**
 * POST /api/v1/admin/vinculacion/canjear
 *
 * Lo invoca el workflow del bot Telegram cuando el cliente ejecuta
 * `/start dueno-<token>`. Verifica el token, y si es válido, guarda el
 * `chat_id` como `telegram_chat_id_dueno` del salón.
 *
 * Body:
 *   { token, chat_id }
 *
 * Auth: bearer INTERNAL_API_TOKEN.
 */
export async function POST(req: Request) {
  const authError = requireApiToken(req);
  if (authError) return authError;

  let body: { token?: unknown; chat_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const token = typeof body.token === 'string' ? body.token : '';
  const chatId =
    typeof body.chat_id === 'number'
      ? String(body.chat_id)
      : typeof body.chat_id === 'string'
        ? body.chat_id
        : '';

  if (!token || !chatId) {
    return NextResponse.json(
      { error: 'token y chat_id requeridos' },
      { status: 400 },
    );
  }

  const payload = verifyVinculacionToken(token);
  if (!payload) {
    return NextResponse.json(
      { ok: false, error: 'Token inválido o expirado' },
      { status: 400 },
    );
  }

  const updated = await db
    .update(salones)
    .set({ telegramChatIdDueno: chatId, updatedAt: new Date() })
    .where(eq(salones.id, payload.salonId))
    .returning({ id: salones.id, nombre: salones.nombre });

  if (updated.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'Salón no encontrado' },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    salon_nombre: updated[0].nombre,
  });
}

export const dynamic = 'force-dynamic';
