import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  agentes,
  agenteToolsAsignaciones,
  agenteToolsCatalogo,
} from '@/lib/db/schema';
import { requireApiToken } from '@/lib/api/auth';

/**
 * GET /api/v1/agentes/[slug]/config
 *
 * Devuelve la configuración del agente para que n8n la use al iniciar
 * cada conversación: prompt, modelo, parámetros LLM y catálogo de
 * tools activas con su JSON Schema.
 *
 * Auth: bearer INTERNAL_API_TOKEN.
 *
 * Cache HTTP s-maxage=60 → n8n puede cachear y no martillea la BD.
 * Cuando el super-admin actualiza el prompt, el cambio se propaga
 * en <60s sin invalidación explícita.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const authError = requireApiToken(req);
  if (authError) return authError;

  const { slug } = await params;

  const [agente] = await db
    .select({
      id: agentes.id,
      slug: agentes.slug,
      nombre: agentes.nombre,
      descripcion: agentes.descripcion,
      systemPrompt: agentes.systemPrompt,
      modelo: agentes.modelo,
      temperatura: agentes.temperatura,
      maxTokens: agentes.maxTokens,
      bienvenida: agentes.bienvenida,
      activo: agentes.activo,
    })
    .from(agentes)
    .where(eq(agentes.slug, slug))
    .limit(1);

  if (!agente) {
    return NextResponse.json({ error: 'agente_no_existe' }, { status: 404 });
  }
  if (!agente.activo) {
    return NextResponse.json({ error: 'agente_inactivo' }, { status: 503 });
  }

  const tools = await db
    .select({
      nombre: agenteToolsCatalogo.nombre,
      categoria: agenteToolsCatalogo.categoria,
      descripcion: agenteToolsCatalogo.descripcion,
      schema: agenteToolsCatalogo.schemaJson,
      config: agenteToolsAsignaciones.configJson,
    })
    .from(agenteToolsAsignaciones)
    .innerJoin(
      agenteToolsCatalogo,
      eq(agenteToolsCatalogo.nombre, agenteToolsAsignaciones.toolNombre),
    )
    .where(
      and(
        eq(agenteToolsAsignaciones.agenteId, agente.id),
        eq(agenteToolsAsignaciones.activo, true),
        eq(agenteToolsCatalogo.activo, true),
      ),
    );

  const res = NextResponse.json({
    id: agente.id,
    slug: agente.slug,
    nombre: agente.nombre,
    descripcion: agente.descripcion,
    system_prompt: agente.systemPrompt,
    modelo: agente.modelo,
    temperatura: Number(agente.temperatura),
    max_tokens: agente.maxTokens,
    bienvenida: agente.bienvenida,
    tools,
  });

  res.headers.set(
    'Cache-Control',
    'private, s-maxage=60, stale-while-revalidate=120',
  );
  return res;
}

export const dynamic = 'force-dynamic';
