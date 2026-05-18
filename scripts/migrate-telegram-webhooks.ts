/**
 * Script one-shot: reapunta los webhooks de Telegram de todos los salones
 * activos del n8n viejo al endpoint nuevo en Next.js.
 *
 * Para cada salón con `telegram_bot_token` no-null:
 *   1. Genera un `telegram_webhook_secret` nuevo.
 *   2. Llama a Telegram setWebhook con la nueva URL + el secret.
 *   3. Persiste el secret en BD.
 *
 * Idempotente: si lo ejecutas dos veces, el primer setWebhook reemplaza el
 * segundo; los secrets se regeneran (no pasa nada, n8n ya no debería estar
 * sirviendo el viejo path).
 *
 * Uso:
 *   tsx --env-file=.env.local scripts/migrate-telegram-webhooks.ts
 *   tsx --env-file=.env.local scripts/migrate-telegram-webhooks.ts --dry-run
 *
 * Variables requeridas: DATABASE_URL (vía --env-file), APP_BASE_URL (opcional;
 * default https://gonperstudio.shop).
 */

import { isNotNull, and, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { salones } from '@/lib/db/schema';
import { generarWebhookSecret } from '@/lib/telegram/webhook-secret';

const APP_BASE_URL = process.env.APP_BASE_URL || 'https://gonperstudio.shop';
const DRY_RUN = process.argv.includes('--dry-run');

async function setWebhook(
  token: string,
  botUsername: string,
  secret: string,
): Promise<{ ok: boolean; description?: string }> {
  const url = `${APP_BASE_URL}/api/telegram/${encodeURIComponent(botUsername)}`;
  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      secret_token: secret,
      allowed_updates: ['message', 'callback_query'],
      drop_pending_updates: true,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    description?: string;
  };
  return { ok: data.ok === true, description: data.description };
}

async function main() {
  const filas = await db
    .select({
      id: salones.id,
      slug: salones.slug,
      nombre: salones.nombre,
      botToken: salones.telegramBotToken,
      botUsername: salones.telegramBotUsername,
    })
    .from(salones)
    .where(
      and(
        eq(salones.activo, true),
        isNotNull(salones.telegramBotToken),
        isNotNull(salones.telegramBotUsername),
      ),
    );

  console.log(`Salones con bot Telegram activo: ${filas.length}`);
  if (DRY_RUN) console.log('(dry-run — no se modifica nada)');

  let ok = 0;
  let fallos = 0;

  for (const s of filas) {
    if (!s.botToken || !s.botUsername) continue;
    const secret = generarWebhookSecret();
    console.log(`\n→ ${s.slug} (${s.nombre}) @${s.botUsername}`);

    if (DRY_RUN) {
      console.log(`  DRY: setWebhook → ${APP_BASE_URL}/api/telegram/${s.botUsername}`);
      console.log(`  DRY: persistir secret (43 chars base64url)`);
      ok += 1;
      continue;
    }

    const r = await setWebhook(s.botToken, s.botUsername, secret);
    if (!r.ok) {
      fallos += 1;
      console.error(`  ❌ setWebhook falló: ${r.description ?? 'sin descripción'}`);
      continue;
    }

    await db
      .update(salones)
      .set({ telegramWebhookSecret: secret, updatedAt: new Date() })
      .where(eq(salones.id, s.id));

    console.log('  ✅ webhook reapuntado + secret persistido');
    ok += 1;
  }

  console.log(`\nResumen: ${ok} OK, ${fallos} fallos.`);
  if (fallos > 0) process.exit(1);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error fatal:', err);
    process.exit(1);
  });
