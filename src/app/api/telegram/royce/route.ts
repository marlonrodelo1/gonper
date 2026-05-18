import { NextResponse } from 'next/server';

import { compararWebhookSecret } from '@/lib/telegram/webhook-secret';
import { runRoyceTurn } from '@/lib/royce/orchestrator';
import {
  tgSendMessage,
  tgSendChatAction,
} from '@/lib/telegram/send';
import { renderRoyceHelp } from '@/lib/admin/royce-tool-registry';
import { captureException } from '@/lib/observability';

/**
 * POST /api/telegram/royce
 *
 * Webhook entrante del bot Telegram de Royce (`@Royrogo_bot`). Antes
 * vivía en n8n, ahora pega directo a Next.js.
 *
 * Seguridad:
 *  - Header `X-Telegram-Bot-Api-Secret-Token` debe coincidir con
 *    `ROYCE_TELEGRAM_WEBHOOK_SECRET` (env Dokploy). Comparación constante.
 *  - Whitelist de `chat_id` en `ROYCE_ALLOWED_CHAT_IDS` (coma-separados).
 *    Cualquier otro chat_id recibe silencio total — no responde nada,
 *    para no exponer la existencia del bot interno.
 *
 * Responde 200 SIEMPRE (excepto en errores de configuración) para que
 * Telegram no haga retries.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface TgUser {
  id: number;
  first_name?: string;
  username?: string;
}
interface TgChat {
  id: number;
  type: string;
}
interface TgMessage {
  message_id: number;
  from?: TgUser;
  chat: TgChat;
  date: number;
  text?: string;
}
interface TgUpdate {
  update_id: number;
  message?: TgMessage;
}

function getAllowedChatIds(): Set<string> {
  const raw = process.env.ROYCE_ALLOWED_CHAT_IDS ?? '';
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

export async function POST(req: Request) {
  const botToken = process.env.ROYCE_TELEGRAM_BOT_TOKEN;
  const expectedSecret = process.env.ROYCE_TELEGRAM_WEBHOOK_SECRET;

  if (!botToken || !expectedSecret) {
    console.error('[telegram/royce] env faltante: ROYCE_TELEGRAM_BOT_TOKEN o ROYCE_TELEGRAM_WEBHOOK_SECRET');
    return NextResponse.json({ ok: true });
  }

  const headerSecret = req.headers.get('x-telegram-bot-api-secret-token');
  if (!compararWebhookSecret(expectedSecret, headerSecret)) {
    return NextResponse.json({ ok: true });
  }

  let update: TgUpdate;
  try {
    update = (await req.json()) as TgUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  try {
    await procesarUpdate(update, botToken);
  } catch (err) {
    await captureException(err, { module: 'telegram/royce' });
  }

  return NextResponse.json({ ok: true });
}

async function procesarUpdate(update: TgUpdate, botToken: string): Promise<void> {
  const msg = update.message;
  if (!msg || !msg.text) return;

  const chatId = String(msg.chat.id);
  const allowed = getAllowedChatIds();
  if (allowed.size > 0 && !allowed.has(chatId)) {
    // Silencio absoluto. No es el bot público.
    return;
  }

  const text = msg.text.trim();

  // /help → menú directo sin llamar al LLM.
  if (text === '/help' || text.toLowerCase() === 'help' || text === '/start') {
    await tgSendMessage({
      botToken,
      chatId,
      parseMode: 'Markdown',
      text: renderRoyceHelp(),
    });
    return;
  }

  await tgSendChatAction(botToken, chatId, 'typing');

  // Usamos el chat_id como session_id para conservar contexto entre mensajes
  // del mismo super admin. Si en el futuro hay varios admins, cada uno
  // tiene su propio chat_id → su propia sesión.
  const result = await runRoyceTurn({
    sessionId: `tg:${chatId}`,
    canal: 'admin_telegram',
    surface: 'admin_telegram',
    message: text,
    visitorNombre: msg.from?.first_name,
  });

  await tgSendMessage({
    botToken,
    chatId,
    parseMode: 'Markdown',
    text: result.reply,
  });
}
