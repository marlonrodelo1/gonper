/**
 * Wrappers mínimos sobre la Bot API de Telegram. Todos son best-effort:
 * si la llamada falla, devuelven false (o null) y logean. Nunca lanzan
 * para no romper el flujo del webhook handler.
 */

const TIMEOUT_MS = 8_000;

interface InlineKeyboard {
  inline_keyboard: Array<
    Array<
      | { text: string; url: string }
      | { text: string; callback_data: string }
    >
  >;
}

interface SendMessageOptions {
  botToken: string;
  chatId: string | number;
  text: string;
  parseMode?: 'Markdown' | 'HTML';
  replyMarkup?: InlineKeyboard;
  disableWebPagePreview?: boolean;
}

/**
 * Envía un mensaje de texto. Devuelve true si la API respondió 2xx.
 * Si parseMode='Markdown' y el contenido tiene caracteres especiales que
 * Telegram rechaza, reintentamos sin parseMode (texto plano) — Markdown
 * de Telegram es estricto y romperíamos con contenido del LLM.
 */
export async function tgSendMessage(opts: SendMessageOptions): Promise<boolean> {
  const body: Record<string, unknown> = {
    chat_id: opts.chatId,
    text: opts.text,
    disable_web_page_preview: opts.disableWebPagePreview ?? true,
  };
  if (opts.parseMode) body.parse_mode = opts.parseMode;
  if (opts.replyMarkup) body.reply_markup = opts.replyMarkup;

  const url = `https://api.telegram.org/bot${opts.botToken}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.ok) return true;

    // Si el LLM produjo Markdown roto, reintenta sin parse_mode.
    if (opts.parseMode) {
      const txt = await res.text().catch(() => '');
      console.warn('[tg:send] Markdown rechazado, reintentando plano:', res.status, txt.slice(0, 200));
      const retry = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, parse_mode: undefined }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      return retry.ok;
    }

    const txt = await res.text().catch(() => '');
    console.warn('[tg:send] no-OK', res.status, txt.slice(0, 200));
    return false;
  } catch (err) {
    console.warn('[tg:send] error', err);
    return false;
  }
}

/**
 * Indicador "typing..." en Telegram. Best-effort, sin retries.
 * Caduca a los ~5s o cuando se envía el siguiente mensaje.
 */
export async function tgSendChatAction(
  botToken: string,
  chatId: string | number,
  action: 'typing' = 'typing',
): Promise<void> {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendChatAction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, action }),
      signal: AbortSignal.timeout(3_000),
    });
  } catch {
    // ignorar — typing es decorativo
  }
}

/**
 * Cierra el "loading spinner" de un inline button. Debe llamarse siempre
 * que recibimos un callback_query, idealmente con un toast informativo.
 */
export async function tgAnswerCallbackQuery(opts: {
  botToken: string;
  callbackQueryId: string;
  text?: string;
  showAlert?: boolean;
}): Promise<void> {
  try {
    await fetch(
      `https://api.telegram.org/bot${opts.botToken}/answerCallbackQuery`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: opts.callbackQueryId,
          text: opts.text,
          show_alert: opts.showAlert ?? false,
        }),
        signal: AbortSignal.timeout(5_000),
      },
    );
  } catch (err) {
    console.warn('[tg:answerCallback] error', err);
  }
}
