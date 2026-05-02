'use server';

import { db } from '@/lib/db';
import { salones } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

type CurrentSalon = { id: string } | null;

const BOT_PATH = '/panel/config/bot';
const TOKEN_RE = /^\d{8,12}:[A-Za-z0-9_-]{30,}$/;

async function requireSalon(): Promise<{ id: string }> {
  const salon = (await getCurrentSalon()) as CurrentSalon;
  if (!salon || !salon.id) {
    redirect(
      `${BOT_PATH}?error=${encodeURIComponent('No se pudo identificar el salón')}`,
    );
  }
  return salon;
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
 * Guarda el token del bot público (clientes finales).
 * Valida formato, hace getMe contra Telegram y guarda token + username.
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

  // Validar contra Telegram + obtener username.
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
