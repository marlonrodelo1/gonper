import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { agentes, agenteSesiones, agenteMensajes } from '@/lib/db/schema';
import { requireApiToken } from '@/lib/api/auth';

/**
 * POST /api/v1/agentes/[slug]/mensaje
 *
 * Persiste un mensaje de la conversación. Lo invoca n8n al recibir
 * un mensaje del visitante (direccion='in') y al enviar la respuesta
 * del LLM (direccion='out').
 *
 * Si la sesión no existe la crea on-the-fly.
 *
 * Auth: bearer INTERNAL_API_TOKEN.
 */

const Body = z.object({
  session_id: z.string().min(1).max(120),
  surface: z.enum(['landing', 'marketplace', 'admin_test']).default('landing'),
  direccion: z.enum(['in', 'out']),
  contenido: z.string().min(1).max(8000),
  visitor_email: z.string().email().max(200).optional(),
  visitor_nombre: z.string().max(120).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  llm_modelo: z.string().max(80).optional(),
  llm_tokens_in: z.number().int().nonnegative().optional(),
  llm_tokens_out: z.number().int().nonnegative().optional(),
  llm_coste_eur: z.number().nonnegative().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const authError = requireApiToken(req);
  if (authError) return authError;

  const { slug } = await params;

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
  const data = parsed.data;

  const [agente] = await db
    .select({ id: agentes.id })
    .from(agentes)
    .where(eq(agentes.slug, slug))
    .limit(1);
  if (!agente) {
    return NextResponse.json({ error: 'agente_no_existe' }, { status: 404 });
  }

  // upsert sesión: get or create
  let [sesion] = await db
    .select({ id: agenteSesiones.id })
    .from(agenteSesiones)
    .where(
      and(
        eq(agenteSesiones.agenteId, agente.id),
        eq(agenteSesiones.sessionId, data.session_id),
      ),
    )
    .limit(1);

  if (!sesion) {
    const inserted = await db
      .insert(agenteSesiones)
      .values({
        agenteId: agente.id,
        sessionId: data.session_id,
        surface: data.surface,
        visitorEmail: data.visitor_email ?? null,
        visitorNombre: data.visitor_nombre ?? null,
      })
      .returning({ id: agenteSesiones.id });
    sesion = inserted[0];
  } else if (data.visitor_email || data.visitor_nombre) {
    // si ya existe pero el visitante acaba de identificarse, completamos
    await db
      .update(agenteSesiones)
      .set({
        ...(data.visitor_email ? { visitorEmail: data.visitor_email } : {}),
        ...(data.visitor_nombre ? { visitorNombre: data.visitor_nombre } : {}),
      })
      .where(eq(agenteSesiones.id, sesion.id));
  }

  await db.insert(agenteMensajes).values({
    sesionId: sesion.id,
    direccion: data.direccion,
    contenido: data.contenido,
    metadata: data.metadata ?? null,
    llmModelo: data.llm_modelo ?? null,
    llmTokensIn: data.llm_tokens_in ?? null,
    llmTokensOut: data.llm_tokens_out ?? null,
    llmCosteEur:
      data.llm_coste_eur !== undefined
        ? data.llm_coste_eur.toFixed(6)
        : null,
  });

  return NextResponse.json({ ok: true, sesion_id: sesion.id });
}

export const dynamic = 'force-dynamic';
