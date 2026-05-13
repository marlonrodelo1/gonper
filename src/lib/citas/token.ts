import { createHmac, timingSafeEqual } from 'node:crypto';

export type AccionCita = 'confirmar' | 'cancelar';

interface Payload {
  citaId: string;
  accion: AccionCita;
}

/**
 * Genera un token firmado con HMAC-SHA256 que prueba que el portador puede
 * actuar sobre una cita concreta con una acción concreta. Pensado para
 * incrustar en links de email del recordatorio:
 *   https://gonperstudio.shop/c/<token>   → confirmar
 *   https://gonperstudio.shop/x/<token>   → cancelar
 *
 * No incluye expiración — la cita en sí tiene fecha y el endpoint rechaza
 * citas en estados terminales.
 */
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

export function signCitaToken(citaId: string, accion: AccionCita): string {
  const payload = `${citaId}.${accion}`;
  const sig = createHmac('sha256', getSecret()).update(payload).digest();
  return `${payload}.${b64url(sig)}`;
}

export function verifyCitaToken(token: string): Payload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [citaId, accion, sigPart] = parts;
  if (accion !== 'confirmar' && accion !== 'cancelar') return null;
  if (!citaId || !sigPart) return null;

  const expected = createHmac('sha256', getSecret())
    .update(`${citaId}.${accion}`)
    .digest();
  let provided: Buffer;
  try {
    provided = fromB64url(sigPart);
  } catch {
    return null;
  }
  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(provided, expected)) return null;

  return { citaId, accion };
}
