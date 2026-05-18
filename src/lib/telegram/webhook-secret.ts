/**
 * Generador y validador del `secret_token` que Telegram envía en cada
 * webhook como header `X-Telegram-Bot-Api-Secret-Token`.
 *
 * Límites de Telegram: 1-256 chars del set [A-Za-z0-9_-]. Usamos 32 bytes
 * de entropía codificados en base64url → 43 chars, dentro de límites.
 */

import { randomBytes, timingSafeEqual } from 'node:crypto';

/** Genera un secret nuevo aleatorio (43 chars base64url). */
export function generarWebhookSecret(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Comparación en tiempo constante para evitar timing attacks. Tolera que
 * `actual` venga `null`/`undefined` (devuelve false sin lanzar).
 */
export function compararWebhookSecret(
  esperado: string,
  actual: string | null | undefined,
): boolean {
  if (!actual || actual.length !== esperado.length) return false;
  try {
    return timingSafeEqual(Buffer.from(esperado), Buffer.from(actual));
  } catch {
    return false;
  }
}
