import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireApiToken } from '@/lib/api/auth';
import { getTool, TOOLS } from '@/lib/admin/tool-registry';

/**
 * POST /api/v1/admin/tool
 *
 * Endpoint HTTP dispatcher que ejecuta una tool admin sobre el salón
 * indicado. Hoy lo invocan integraciones externas y tests; el bot
 * Telegram del salón ejecuta las tools inline desde
 * `src/lib/telegram/bot-handler.ts`.
 *
 * Body:
 *   { salon_id, tool, args? }
 *
 * Auth: bearer INTERNAL_API_TOKEN.
 *
 * Las tools disponibles se declaran en `src/lib/admin/tool-registry.ts`.
 * Para listarlas en runtime (útil para debug del workflow):
 *   GET /api/v1/admin/tool
 */

const Body = z.object({
  salon_id: z.string().min(1, 'salon_id requerido'),
  tool: z.string().min(1, 'tool requerido'),
  args: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  const authError = requireApiToken(req);
  if (authError) return authError;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Body inválido', detalles: parsed.error.issues },
      { status: 400 },
    );
  }

  const { salon_id: salonId, tool: toolName, args } = parsed.data;

  const tool = getTool(toolName);
  if (!tool) {
    return NextResponse.json(
      { error: `Tool '${toolName}' no existe` },
      { status: 400 },
    );
  }

  const argsParse = tool.schema.safeParse(args ?? {});
  if (!argsParse.success) {
    return NextResponse.json(
      {
        error: `Args inválidos para '${toolName}'`,
        detalles: argsParse.error.issues,
      },
      { status: 400 },
    );
  }

  try {
    const result = await tool.handler(salonId, argsParse.data);
    return NextResponse.json({ ok: true, tool: toolName, result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno';
    console.error(`[admin/tool:${toolName}]`, e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/**
 * GET — devuelve el catálogo de tools (sólo nombres + descripción + categoría).
 * Útil para debug y para que herramientas externas se autoconfiguren.
 */
export async function GET(req: Request) {
  const authError = requireApiToken(req);
  if (authError) return authError;

  return NextResponse.json({
    ok: true,
    tools: TOOLS.map((t) => ({
      name: t.name,
      categoria: t.categoria,
      descripcion: t.descripcion,
      ejemplos: t.ejemplos,
    })),
  });
}

export const dynamic = 'force-dynamic';
