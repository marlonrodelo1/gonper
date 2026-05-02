import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { createClient } from '@/lib/supabase/server';

const bodySchema = z.object({
  message: z.string().trim().min(1).max(2000),
  session_id: z.string().trim().max(120).optional(),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Parámetros inválidos', detalles: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const salon = (await getCurrentSalon()) as
    | { id: string; nombre: string }
    | null;
  if (!salon || !salon.id) {
    return NextResponse.json(
      { error: 'No tienes un salón asociado' },
      { status: 403 },
    );
  }

  const webhookUrl = process.env.N8N_JUANITA_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json(
      {
        error:
          'Asistente no configurado. Falta N8N_JUANITA_WEBHOOK_URL en el servidor.',
      },
      { status: 503 },
    );
  }

  const sessionId =
    parsed.data.session_id?.trim() || `${salon.id}:${user.id}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  const internalToken = process.env.INTERNAL_API_TOKEN;
  if (internalToken) {
    headers['Authorization'] = `Bearer ${internalToken}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const upstream = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      cache: 'no-store',
      signal: controller.signal,
      body: JSON.stringify({
        salon_id: salon.id,
        user_id: user.id,
        message: parsed.data.message,
        session_id: sessionId,
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text().catch(() => '');
      return NextResponse.json(
        {
          error: 'El asistente no pudo responder ahora mismo.',
          upstream_status: upstream.status,
          detalle: errText.slice(0, 500),
        },
        { status: 502 },
      );
    }

    const data = (await upstream.json().catch(() => null)) as
      | { reply?: string; session_id?: string }
      | null;

    const reply =
      typeof data?.reply === 'string' && data.reply.trim().length > 0
        ? data.reply
        : 'No tengo respuesta para eso ahora mismo.';

    return NextResponse.json({
      reply,
      session_id: data?.session_id ?? sessionId,
    });
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    return NextResponse.json(
      {
        error: aborted
          ? 'El asistente tardó demasiado en responder.'
          : 'Error contactando con el asistente.',
      },
      { status: 504 },
    );
  } finally {
    clearTimeout(timeout);
  }
}

export const dynamic = 'force-dynamic';
