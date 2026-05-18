/**
 * Configura el webhook del bot Telegram de Royce (`@Royrogo_bot`) para que
 * apunte al endpoint Next.js (`/api/telegram/royce`) con el secret
 * compartido (`ROYCE_TELEGRAM_WEBHOOK_SECRET`).
 *
 * One-shot: ejecuta una sola vez tras el primer deploy de Fase 4. Si el
 * secret cambia en env, vuelve a ejecutar para resincronizar.
 *
 * Uso:
 *   tsx --env-file=.env.local scripts/setup-royce-telegram-webhook.ts
 *
 * Variables requeridas:
 *   - ROYCE_TELEGRAM_BOT_TOKEN
 *   - ROYCE_TELEGRAM_WEBHOOK_SECRET
 *   - APP_BASE_URL (opcional, default https://gonperstudio.shop)
 */

const APP_BASE_URL = process.env.APP_BASE_URL || 'https://gonperstudio.shop';

async function main() {
  const token = process.env.ROYCE_TELEGRAM_BOT_TOKEN;
  const secret = process.env.ROYCE_TELEGRAM_WEBHOOK_SECRET;

  if (!token || !secret) {
    console.error(
      'Faltan variables: ROYCE_TELEGRAM_BOT_TOKEN y/o ROYCE_TELEGRAM_WEBHOOK_SECRET',
    );
    process.exit(1);
  }

  const url = `${APP_BASE_URL}/api/telegram/royce`;
  console.log(`Configurando webhook de @Royrogo_bot → ${url}`);

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      secret_token: secret,
      allowed_updates: ['message'],
      drop_pending_updates: true,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    description?: string;
  };

  if (!data.ok) {
    console.error(`❌ setWebhook falló: ${data.description ?? 'sin descripción'}`);
    process.exit(1);
  }
  console.log('✅ Webhook configurado correctamente');
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
