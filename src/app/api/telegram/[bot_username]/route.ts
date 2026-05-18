import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { salones } from '@/lib/db/schema';
import { compararWebhookSecret } from '@/lib/telegram/webhook-secret';
import { handleBotUpdate, type TgUpdate } from '@/lib/telegram/bot-handler';
import { captureException } from '@/lib/observability';

/**
 * POST /api/telegram/[bot_username]
 *
 * Webhook entrante de Telegram. Sustituye al workflow n8n
 * "Bot del salon (multi-tenant) v2".
 *
 * Seguridad:
 *  - Header `X-Telegram-Bot-Api-Secret-Token` debe coincidir con
 *    `salones.telegram_webhook_secret` (que se genera al hacer setWebhook
 *    desde /panel/config/bot). Comparación en tiempo constante.
 *  - Si el secret no coincide → 401 + Sentry. No respondemos pistas para
 *    no facilitar enumeración.
 *
 * Responde 200 SIEMPRE que el secret sea válido (incluso si el procesado
 * interno falla) para que Telegram no reintente — el error ya quedó
 * registrado en Sentry y los retries de Telegram solo generarían
 * duplicados de mensajes al dueño.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ bot_username: string }> },
) {
  const { bot_username: botUsername } = await params;

  const [salon] = await db
    .select()
    .from(salones)
    .where(eq(salones.telegramBotUsername, botUsername))
    .limit(1);

  if (!salon || !salon.activo || !salon.telegramBotToken) {
    // Devolvemos 200 igual para no enseñar diferencia entre "bot no existe"
    // y "secret inválido" a un atacante que esté escaneando.
    return NextResponse.json({ ok: true });
  }

  // Validar secret antes de parsear el body — si falla, ni siquiera leemos.
  const headerSecret = req.headers.get('x-telegram-bot-api-secret-token');
  const expectedSecret = salon.telegramWebhookSecret;
  if (!expectedSecret || !compararWebhookSecret(expectedSecret, headerSecret)) {
    return NextResponse.json({ ok: true });
  }

  let update: TgUpdate;
  try {
    update = (await req.json()) as TgUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  // Procesamos en el mismo handler — Telegram tiene timeout de ~30s por webhook.
  // Si crece y se queda corto, podemos pasar a `runtime: 'nodejs'` + Promise.race
  // o mover a un background queue. Por ahora, suficiente.
  try {
    await handleBotUpdate(salon, update);
  } catch (err) {
    await captureException(err, {
      module: 'telegram/webhook',
      salonId: salon.id,
      botUsername,
    });
  }

  return NextResponse.json({ ok: true });
}
