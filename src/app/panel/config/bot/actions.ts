'use server';

import { db } from '@/lib/db';
import { salones } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

type CurrentSalon = { id: string; slug: string } | null;

const BOT_PATH = '/panel/config/bot';
const TOKEN_RE = /^\d{8,12}:[A-Za-z0-9_-]{30,}$/;

const N8N_BOT_WEBHOOK_BASE =
  process.env.N8N_BOT_CLIENTE_WEBHOOK_URL ||
  'https://rogotech-n8n.qyklvu.easypanel.host/webhook/gomper-bot';

async function requireSalon(): Promise<{ id: string; slug: string }> {
  const salon = (await getCurrentSalon()) as CurrentSalon;
  if (!salon || !salon.id || !salon.slug) {
    redirect(
      `${BOT_PATH}?error=${encodeURIComponent('No se pudo identificar el salón')}`,
    );
  }
  return { id: salon.id, slug: salon.slug };
}

function redirectError(msg: string): never {
  redirect(`${BOT_PATH}?error=${encodeURIComponent(msg)}`);
}

function isRedirectError(e: unknown): boolean {
  return (
    e instanceof Error &&
    typeof e.message === 'string' &&
    e.message.startsWith('NEXT_REDIRECT')
  );
}

/**
 * Configura el webhook del bot Telegram para que apunte al workflow n8n
 * multi-tenant. Best effort: lanza si Telegram dice no.
 */
async function setBotWebhook(token: string, slug: string): Promise<void> {
  const webhookUrl = `${N8N_BOT_WEBHOOK_BASE}?slug=${encodeURIComponent(slug)}`;
  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      allowed_updates: ['message', 'callback_query'],
      drop_pending_updates: true,
    }),
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    description?: string;
  };
  if (!data.ok) {
    throw new Error(
      data.description
        ? `Telegram setWebhook falló: ${data.description}`
        : 'Telegram no aceptó el webhook',
    );
  }
}

/**
 * Borra el webhook del bot. Best effort, no falla si Telegram rechaza.
 */
async function deleteBotWebhook(token: string): Promise<void> {
  try {
    await fetch(
      `https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=true`,
      { cache: 'no-store' },
    );
  } catch {
    // Silencioso. Si el token ya no es válido o no hay red, no rompemos.
  }
}

/**
 * Desvincula el chat de Telegram del dueño: pone el campo a null para que
 * Juanita Pro deje de mandarle avisos hasta que se vuelva a vincular.
 */
export async function desvincularTelegramDueno() {
  const salon = await requireSalon();

  try {
    const result = await db
      .update(salones)
      .set({
        telegramChatIdDueno: null,
        updatedAt: new Date(),
      })
      .where(eq(salones.id, salon.id))
      .returning({ id: salones.id });

    if (result.length === 0) {
      redirectError('No autorizado');
    }
  } catch (e) {
    if (isRedirectError(e)) throw e;
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    redirectError(msg);
  }

  revalidatePath(BOT_PATH);
  redirect(`${BOT_PATH}?ok=1`);
}

/**
 * Guarda el token del bot del salón.
 *
 * Pasos:
 *  1. Valida formato.
 *  2. Llama a Telegram getMe para validar y obtener username.
 *  3. Si había un token previo distinto, hace deleteWebhook al viejo.
 *  4. Hace setWebhook al nuevo apuntando a n8n con ?slug=<slug>.
 *  5. Persiste token + username en la BD.
 *
 * Esto deja el bot operativo automáticamente — los clientes ya pueden
 * escribirle y el dueño puede vincularse con /start CODIGO desde su
 * propio bot.
 */
export async function guardarTokenBotCliente(formData: FormData) {
  const salon = await requireSalon();

  const tokenRaw = String(formData.get('bot_token') || '').trim();

  if (!tokenRaw) {
    redirectError('Tienes que pegar el token del bot');
  }

  if (!TOKEN_RE.test(tokenRaw)) {
    redirectError(
      'El formato del token no es válido (debe ser 123456789:AA...)',
    );
  }

  // 1. Validar contra Telegram + obtener username.
  let username: string | null = null;
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${tokenRaw}/getMe`,
      { cache: 'no-store' },
    );
    const data = (await res.json()) as {
      ok: boolean;
      result?: { username?: string };
      description?: string;
    };
    if (!data.ok || !data.result?.username) {
      redirectError(
        data.description
          ? `Telegram rechazó el token: ${data.description}`
          : 'Telegram no validó el token. Revísalo e inténtalo de nuevo.',
      );
    }
    username = data.result.username ?? null;
  } catch (e) {
    if (isRedirectError(e)) throw e;
    redirectError(
      'No se pudo contactar con Telegram para validar el token. Inténtalo de nuevo.',
    );
  }

  // 2. Borrar webhook antiguo si había otro token configurado.
  try {
    const [previo] = await db
      .select({ tokenAntiguo: salones.telegramBotToken })
      .from(salones)
      .where(eq(salones.id, salon.id))
      .limit(1);
    if (previo?.tokenAntiguo && previo.tokenAntiguo !== tokenRaw) {
      await deleteBotWebhook(previo.tokenAntiguo);
    }
  } catch {
    // No bloqueamos por esto.
  }

  // 3. Configurar webhook al nuevo token.
  try {
    await setBotWebhook(tokenRaw, salon.slug);
  } catch (e) {
    if (isRedirectError(e)) throw e;
    const msg = e instanceof Error ? e.message : 'No pudimos configurar el webhook del bot';
    redirectError(msg);
  }

  // 4. Persistir token + username.
  try {
    const result = await db
      .update(salones)
      .set({
        telegramBotToken: tokenRaw,
        telegramBotUsername: username,
        updatedAt: new Date(),
      })
      .where(eq(salones.id, salon.id))
      .returning({ id: salones.id });

    if (result.length === 0) {
      redirectError('No autorizado');
    }
  } catch (e) {
    if (isRedirectError(e)) throw e;
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    redirectError(msg);
  }

  revalidatePath(BOT_PATH);
  redirect(`${BOT_PATH}?ok=1`);
}

/**
 * Desconecta el bot del salón completamente: borra webhook en Telegram,
 * pone token y username a null, y desvincula al dueño (porque sin bot no
 * hay canal Juanita Pro Telegram).
 */
export async function desconectarBotSalon() {
  const salon = await requireSalon();

  // Leer token actual para borrar webhook antes de limpiar la BD.
  const [row] = await db
    .select({ token: salones.telegramBotToken })
    .from(salones)
    .where(eq(salones.id, salon.id))
    .limit(1);

  if (row?.token) {
    await deleteBotWebhook(row.token);
  }

  try {
    await db
      .update(salones)
      .set({
        telegramBotToken: null,
        telegramBotUsername: null,
        telegramChatIdDueno: null,
        updatedAt: new Date(),
      })
      .where(eq(salones.id, salon.id));
  } catch (e) {
    if (isRedirectError(e)) throw e;
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    redirectError(msg);
  }

  revalidatePath(BOT_PATH);
  redirect(`${BOT_PATH}?ok=1`);
}
