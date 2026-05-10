import { NextResponse } from 'next/server';
import { z } from 'zod';

import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit';

/**
 * POST /api/public/chat/royce
 *
 * Proxy del widget de la landing/marketplace hacia el workflow n8n
 * "Royce — agente landing". El widget no llama directo a n8n para
 * evitar exponer la URL del webhook al cliente y para meter rate
 * limit + timeout/fallback aquí.
 *
 * Seguridad v1:
 *   - URL del webhook n8n vive solo en `N8N_ROYCE_WEBHOOK_URL` (env Dokploy).
 *   - Header `X-Source: gestori-landing` que n8n valida en el primer paso.
 *   No usamos HMAC en v1: la URL es secret-by-config y el server-side proxy
 *   garantiza que el cliente no la ve. Si en el futuro queremos endurecer,
 *   añadimos HMAC en ambos lados sin romper nada.
 *
 * Si n8n falla o tarda >15s, devolvemos un fallback amable y log Sentry.
 */

const Body = z.object({
  session_id: z.string().uuid(),
  message: z.string().trim().min(1).max(1000),
  visitor_email: z.string().email().max(200).optional(),
  visitor_nombre: z.string().trim().max(120).optional(),
  surface: z.enum(['landing', 'marketplace']).default('landing'),
});

const FALLBACK_REPLY =
  'Estoy teniendo un problema, vuelve a probar en un momento.';
const TIMEOUT_MS = 15_000;

export async function POST(req: Request) {
  const webhookUrl = process.env.N8N_ROYCE_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('[chat/royce] N8N_ROYCE_WEBHOOK_URL no configurado');
    return NextResponse.json(
      { reply: FALLBACK_REPLY, error: 'config' },
      { status: 200 },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Parámetros inválidos', detalles: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // Rate limit por IP — 100 mensajes/día (igual que chat tienda)
  const ip = getClientIp(req);
  const limit = await checkRateLimit('ip', ip, 100);
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: 'Has alcanzado el límite diario de mensajes. Vuelve mañana.',
        code: 'RATE_LIMIT',
      },
      { status: 429 },
    );
  }

  const payload = JSON.stringify(data);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Source': 'gestori-landing',
      },
      body: payload,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[chat/royce] n8n respondió', res.status, body);
      return NextResponse.json(
        { reply: FALLBACK_REPLY, session_id: data.session_id, error: 'upstream' },
        { status: 200 },
      );
    }

    const json = (await res.json().catch(() => null)) as
      | { reply?: string; ui?: unknown }
      | null;

    return NextResponse.json({
      reply: json?.reply ?? FALLBACK_REPLY,
      session_id: data.session_id,
      ui: json?.ui,
    });
  } catch (e) {
    clearTimeout(timer);
    const aborted = e instanceof Error && e.name === 'AbortError';
    console.error('[chat/royce]', aborted ? 'timeout' : 'error', e);
    return NextResponse.json(
      {
        reply: FALLBACK_REPLY,
        session_id: data.session_id,
        error: aborted ? 'timeout' : 'network',
      },
      { status: 200 },
    );
  }
}

export const dynamic = 'force-dynamic';
