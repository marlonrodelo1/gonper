import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, asc, desc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  agentes,
  agenteSesiones,
  agenteMensajes,
  agenteToolsAsignaciones,
  agenteToolsCatalogo,
  leads,
} from '@/lib/db/schema';
import { requireApiToken } from '@/lib/api/auth';

/**
 * POST /api/v1/agentes/[slug]/tool
 *
 * Despachador HTTP de tools del agente. Sobrevive como endpoint público
 * para debug y para invocaciones externas; el chat de Royce ejecuta las
 * tools inline desde `src/lib/royce/orchestrator.ts` sin pasar por aquí.
 *
 * Body:
 *   { session_id, tool, args }
 *
 * v1: solo `capturar_lead` está implementada. El resto del catálogo
 * (slack_post, hubspot_create_contact, gmail_send, n8n_trigger,
 * resend_email) se conectará en fase 2.
 *
 * Auth: bearer INTERNAL_API_TOKEN.
 */

const Body = z.object({
  session_id: z.string().min(1).max(120),
  tool: z.string().min(1).max(80),
  args: z.record(z.string(), z.unknown()).optional(),
});

const CapturarLeadArgs = z.object({
  email: z.string().email().max(200),
  nombre: z.string().max(120).optional(),
  tipo_negocio: z
    .enum(['barberia', 'peluqueria', 'estetica', 'manicura', 'otro'])
    .optional(),
  dolor: z.string().max(2000).optional(),
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
  const { session_id, tool: toolName, args } = parsed.data;

  const [agente] = await db
    .select({ id: agentes.id })
    .from(agentes)
    .where(eq(agentes.slug, slug))
    .limit(1);
  if (!agente) {
    return NextResponse.json({ error: 'agente_no_existe' }, { status: 404 });
  }

  // Verificar que la tool está asignada y activa
  const [asignacion] = await db
    .select({ activo: agenteToolsAsignaciones.activo })
    .from(agenteToolsAsignaciones)
    .innerJoin(
      agenteToolsCatalogo,
      eq(agenteToolsCatalogo.nombre, agenteToolsAsignaciones.toolNombre),
    )
    .where(
      and(
        eq(agenteToolsAsignaciones.agenteId, agente.id),
        eq(agenteToolsAsignaciones.toolNombre, toolName),
        eq(agenteToolsCatalogo.activo, true),
      ),
    )
    .limit(1);

  if (!asignacion || !asignacion.activo) {
    return NextResponse.json(
      { error: 'tool_no_disponible', tool: toolName },
      { status: 400 },
    );
  }

  // Resolver sesión (si no existe, devolvemos error — la tool solo se
  // invoca después de al menos un mensaje IN, así que la sesión debe existir)
  const [sesion] = await db
    .select({
      id: agenteSesiones.id,
      visitorEmail: agenteSesiones.visitorEmail,
      visitorNombre: agenteSesiones.visitorNombre,
      surface: agenteSesiones.surface,
    })
    .from(agenteSesiones)
    .where(
      and(
        eq(agenteSesiones.agenteId, agente.id),
        eq(agenteSesiones.sessionId, session_id),
      ),
    )
    .limit(1);

  if (!sesion) {
    return NextResponse.json(
      { error: 'sesion_no_existe' },
      { status: 404 },
    );
  }

  try {
    let result: unknown;

    if (toolName === 'capturar_lead') {
      const argsParsed = CapturarLeadArgs.safeParse(args ?? {});
      if (!argsParsed.success) {
        return NextResponse.json(
          { error: 'args_invalidos', detalles: argsParsed.error.issues },
          { status: 400 },
        );
      }
      result = await capturarLead({
        sesionId: sesion.id,
        args: argsParsed.data,
      });
    } else {
      return NextResponse.json(
        { error: 'tool_no_implementada', tool: toolName },
        { status: 501 },
      );
    }

    return NextResponse.json({ ok: true, tool: toolName, result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno';
    console.error(`[agentes/tool:${toolName}]`, e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

// ============================================================
// Handlers de tools (v1)
// ============================================================

async function capturarLead(input: {
  sesionId: string;
  args: z.infer<typeof CapturarLeadArgs>;
}): Promise<{ lead_id: string; ya_existia: boolean }> {
  // últimos 10 mensajes de la sesión para contexto
  const mensajesRecientes = await db
    .select({
      direccion: agenteMensajes.direccion,
      contenido: agenteMensajes.contenido,
      createdAt: agenteMensajes.createdAt,
    })
    .from(agenteMensajes)
    .where(eq(agenteMensajes.sesionId, input.sesionId))
    .orderBy(desc(agenteMensajes.createdAt))
    .limit(10);

  const conversacion = mensajesRecientes.slice().reverse().map((m) => ({
    role: m.direccion === 'in' ? 'user' : 'assistant',
    content: m.contenido,
    at: m.createdAt,
  }));

  // Idempotencia básica por email — si ya hay lead con ese email en las
  // últimas 24h, actualizamos en vez de duplicar.
  const existing = await db
    .select({ id: leads.id })
    .from(leads)
    .where(eq(leads.email, input.args.email))
    .orderBy(asc(leads.createdAt))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(leads)
      .set({
        nombre: input.args.nombre ?? null,
        tipoNegocio: input.args.tipo_negocio ?? null,
        dolorPrincipal: input.args.dolor ?? null,
        conversacionJson: conversacion,
      })
      .where(eq(leads.id, existing[0].id));
    return { lead_id: existing[0].id, ya_existia: true };
  }

  const [inserted] = await db
    .insert(leads)
    .values({
      email: input.args.email,
      nombre: input.args.nombre ?? null,
      tipoNegocio: input.args.tipo_negocio ?? null,
      dolorPrincipal: input.args.dolor ?? null,
      origen: 'landing_chat',
      conversacionJson: conversacion,
    })
    .returning({ id: leads.id });

  return { lead_id: inserted.id, ya_existia: false };
}

export const dynamic = 'force-dynamic';
