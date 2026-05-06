import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { salones } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { createClient } from '@/lib/supabase/server';
import { signVinculacionToken } from '@/lib/admin/vinculacion-token';

/**
 * POST /api/v1/admin/vinculacion/generar
 *
 * El panel del dueño llama a este endpoint para obtener un link
 * `t.me/<bot>?start=dueno-<token>` que, al ser pulsado, vincula su chat
 * de Telegram como dueño del salón. El token caduca en 15 minutos.
 *
 * Auth: sesión Supabase (dueño con salón asociado).
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const salon = (await getCurrentSalon()) as
    | { id: string; slug: string }
    | null;
  if (!salon || !salon.id) {
    return NextResponse.json(
      { error: 'No tienes un salón asociado' },
      { status: 403 },
    );
  }

  const [row] = await db
    .select({
      botUsername: salones.telegramBotUsername,
      botToken: salones.telegramBotToken,
    })
    .from(salones)
    .where(eq(salones.id, salon.id))
    .limit(1);

  if (!row?.botUsername || !row?.botToken) {
    return NextResponse.json(
      {
        error:
          'Tu salón no tiene bot configurado. Configura el token primero en /panel/config/bot.',
      },
      { status: 400 },
    );
  }

  const token = signVinculacionToken(salon.id);
  const link = `https://t.me/${row.botUsername}?start=dueno-${token}`;

  return NextResponse.json({
    ok: true,
    link,
    bot_username: row.botUsername,
    expira_en_segundos: 15 * 60,
  });
}

export const dynamic = 'force-dynamic';
