import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireApiToken } from '@/lib/api/auth';
import { getRoyceTool, ROYCE_TOOLS } from '@/lib/admin/royce-tool-registry';

/**
 * POST /api/v1/admin/royce-tool
 *
 * Dispatcher HTTP de tools plataforma-wide para Royce. Sobrevive como
 * endpoint para debug e integraciones externas; el bot @Royrogo_bot
 * ejecuta estas tools inline desde `src/lib/royce/orchestrator.ts`.
 *
 * A diferencia de `/api/v1/admin/tool` (que opera sobre 1 salón vía
 * Juanita Pro), aquí NO se requiere salon_id — las tools son globales.
 *
 * Body:
 *   { tool, args? }
 *
 * Auth: bearer INTERNAL_API_TOKEN.
 *
 * GET / devuelve el catálogo (útil para debug del workflow).
 */

const Body = z.object({
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

  const { tool: toolName, args } = parsed.data;

  const tool = getRoyceTool(toolName);
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
    const result = await tool.handler(argsParse.data);
    return NextResponse.json({ ok: true, tool: toolName, result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno';
    console.error(`[admin/royce-tool:${toolName}]`, e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const authError = requireApiToken(req);
  if (authError) return authError;

  return NextResponse.json({
    ok: true,
    tools: ROYCE_TOOLS.map((t) => ({
      name: t.name,
      categoria: t.categoria,
      descripcion: t.descripcion,
      ejemplos: t.ejemplos,
    })),
  });
}

export const dynamic = 'force-dynamic';
