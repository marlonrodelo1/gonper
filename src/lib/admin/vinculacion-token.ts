import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Tokens firmados (HMAC-SHA256) que vinculan un chat de Telegram con un salón
 * como "dueño". El panel los genera al pulsar "Vincularme como dueño" y los
 * encarga en `t.me/<bot>?start=dueno-<token>`. El bot canjea el token y
 * guarda chat_id en `salones.telegram_chat_id_dueno`.
 *
 * Reusa CITA_TOKEN_SECRET (mismo entorno) — formato: <salonId>.<exp>.<sig>
 * exp = unix seconds (token caduca en 15 minutos).
 */

const TTL_SEGUNDOS = 15 * 60;

function getSecret(): string {
  const s = process.env.CITA_TOKEN_SECRET;
  if (!s) throw new Error('CITA_TOKEN_SECRET no configurado');
  return s;
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

export function signVinculacionToken(salonId: string): string {
  const exp = Math.floor(Date.now() / 1000) + TTL_SEGUNDOS;
  const payload = `${salonId}.${exp}`;
  const sig = createHmac('sha256', getSecret()).update(payload).digest();
  return `${payload}.${b64url(sig)}`;
}

export function verifyVinculacionToken(
  token: string,
): { salonId: string } | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [salonId, expStr, sigPart] = parts;
  if (!salonId || !expStr || !sigPart) return null;

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  const expected = createHmac('sha256', getSecret())
    .update(`${salonId}.${expStr}`)
    .digest();
  let provided: Buffer;
  try {
    provided = fromB64url(sigPart);
  } catch {
    return null;
  }
  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(provided, expected)) return null;

  return { salonId };
}
