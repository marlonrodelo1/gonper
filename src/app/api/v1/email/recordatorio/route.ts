import { NextResponse } from 'next/server';

import { requireApiToken } from '@/lib/api/auth';
import { enviarRecordatorioCita } from '@/lib/email/resend';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/v1/email/recordatorio
 *
 * Lo invoca el workflow n8n de Recordatorios cuando el cliente NO tiene
 * Telegram pero SÍ tiene email. Manda el recordatorio por email vía Resend.
 *
 * Body esperado:
 * {
 *   to: string,                  // email del cliente
 *   clienteNombre: string,
 *   salonNombre: string,
 *   salonSlug: string,
 *   inicioIso: string,           // ISO 8601 UTC
 *   servicioNombre: string,
 *   duracionMin: number,
 *   profesionalNombre: string,
 *   timezone?: string            // TZ del salón, default Europe/Madrid
 * }
 */
export async function POST(req: Request) {
  const authError = requireApiToken(req);
  if (authError) return authError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const data = body as Partial<{
    to: string;
    clienteNombre: string;
    salonNombre: string;
    salonSlug: string;
    inicioIso: string;
    servicioNombre: string;
    duracionMin: number;
    profesionalNombre: string;
    timezone: string;
  }>;

  const requeridos: (keyof typeof data)[] = [
    'to',
    'clienteNombre',
    'salonNombre',
    'salonSlug',
    'inicioIso',
    'servicioNombre',
    'duracionMin',
    'profesionalNombre',
  ];
  for (const k of requeridos) {
    if (data[k] === undefined || data[k] === null || data[k] === '') {
      return NextResponse.json(
        { error: `Falta el campo: ${String(k)}` },
        { status: 400 },
      );
    }
  }

  const result = await enviarRecordatorioCita({
    to: String(data.to),
    clienteNombre: String(data.clienteNombre),
    salonNombre: String(data.salonNombre),
    salonSlug: String(data.salonSlug),
    inicioIso: String(data.inicioIso),
    servicioNombre: String(data.servicioNombre),
    duracionMin: Number(data.duracionMin),
    profesionalNombre: String(data.profesionalNombre),
    timezone: data.timezone ? String(data.timezone) : undefined,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? 'Error enviando email' },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true });
}
