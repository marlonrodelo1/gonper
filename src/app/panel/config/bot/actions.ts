'use server';

import { db } from '@/lib/db';
import { salones } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

type CurrentSalon = { id: string } | null;

const BOT_PATH = '/panel/config/bot';
const TOKEN_RE = /^\d+:[A-Za-z0-9_-]{30,}$/;
const USERNAME_RE = /^[a-z0-9_]+$/;
const CHAT_ID_RE = /^-?\d+$/;

async function requireSalon(): Promise<{ id: string }> {
  const salon = (await getCurrentSalon()) as CurrentSalon;
  if (!salon || !salon.id) {
    redirect(`${BOT_PATH}?error=${encodeURIComponent('No se pudo identificar el salón')}`);
  }
  return salon;
}

function redirectError(msg: string): never {
  redirect(`${BOT_PATH}?error=${encodeURIComponent(msg)}`);
}

export async function actualizarBotSalon(formData: FormData) {
  const salon = await requireSalon();

  const tokenRaw = String(formData.get('telegram_bot_token') || '').trim();
  let usernameRaw = String(formData.get('telegram_bot_username') || '').trim();

  // Permitir borrar: si ambos vacíos -> null
  if (tokenRaw !== '' && !TOKEN_RE.test(tokenRaw)) {
    redirectError('Token de bot inválido. Formato esperado: 123456789:AA...');
  }

  if (usernameRaw !== '') {
    if (usernameRaw.startsWith('@')) usernameRaw = usernameRaw.slice(1);
    usernameRaw = usernameRaw.toLowerCase();
    if (!USERNAME_RE.test(usernameRaw)) {
      redirectError('El username solo puede contener letras, números y guiones bajos.');
    }
    if (usernameRaw.length < 3 || usernameRaw.length > 64) {
      redirectError('El username debe tener entre 3 y 64 caracteres.');
    }
  }

  try {
    const result = await db
      .update(salones)
      .set({
        telegramBotToken: tokenRaw === '' ? null : tokenRaw,
        telegramBotUsername: usernameRaw === '' ? null : usernameRaw,
        updatedAt: new Date(),
      })
      .where(eq(salones.id, salon.id))
      .returning({ id: salones.id });

    if (result.length === 0) {
      redirectError('No autorizado');
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    redirectError(msg);
  }

  revalidatePath(BOT_PATH);
  redirect(`${BOT_PATH}?ok=1`);
}

export async function actualizarBotDueno(formData: FormData) {
  const salon = await requireSalon();

  const tokenRaw = String(formData.get('telegram_bot_dueno_token') || '').trim();
  const chatIdRaw = String(formData.get('telegram_chat_id_dueno') || '').trim();

  if (tokenRaw !== '' && !TOKEN_RE.test(tokenRaw)) {
    redirectError('Token de bot del dueño inválido. Formato: 123456789:AA...');
  }
  if (chatIdRaw !== '' && !CHAT_ID_RE.test(chatIdRaw)) {
    redirectError('El chat_id debe ser un número entero.');
  }

  try {
    const result = await db
      .update(salones)
      .set({
        telegramBotDuenoToken: tokenRaw === '' ? null : tokenRaw,
        telegramChatIdDueno: chatIdRaw === '' ? null : chatIdRaw,
        updatedAt: new Date(),
      })
      .where(eq(salones.id, salon.id))
      .returning({ id: salones.id });

    if (result.length === 0) {
      redirectError('No autorizado');
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    redirectError(msg);
  }

  revalidatePath(BOT_PATH);
  redirect(`${BOT_PATH}?ok=1`);
}
