/**
 * Orquestador de Royce — compartido por:
 *  - chat de la landing (`POST /api/public/chat/royce`)
 *  - bot Telegram de Marlon (`POST /api/telegram/royce`)
 *
 * Carga sesión, ejecuta el bucle multi-turn con tool calling sobre
 * ROYCE_TOOLS, persiste mensajes en `agente_mensajes`. Antes esta lógica
 * vivía en el workflow n8n "Royce v2".
 */

import 'server-only';

import { and, asc, desc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  agentes,
  agenteSesiones,
  agenteMensajes,
  leads,
} from '@/lib/db/schema';
import { ROYCE_TOOLS_OPENAI } from '@/lib/admin/tool-registry-openai';
import { getRoyceTool } from '@/lib/admin/royce-tool-registry';
import {
  chatDeepSeekWithTools,
  type ToolMsg,
} from '@/lib/llm/deepseek-tools';
import { calcularCosteEur } from '@/lib/llm/deepseek';
import { buildRoyceSystemPrompt } from './system-prompt';
import { captureException } from '@/lib/observability';

const ROYCE_SLUG = 'royce';
const HISTORIAL_LIMITE = 12;
const MAX_TOOL_LOOPS = 4;
const FALLBACK_REPLY =
  'Estoy teniendo un problema, vuelve a probar en un momento.';

export type RoyceCanal = 'landing' | 'admin_telegram';
type Surface = 'landing' | 'marketplace' | 'admin_telegram';

export interface RoyceTurnInput {
  /** session_id externo del cliente. UUID en landing, chat_id stringificado en Telegram. */
  sessionId: string;
  canal: RoyceCanal;
  surface: Surface;
  message: string;
  visitorEmail?: string;
  visitorNombre?: string;
}

export interface RoyceTurnResult {
  reply: string;
  sessionDbId: string;
  modelo: string | null;
  tokensIn: number;
  tokensOut: number;
}

/**
 * Ejecuta un turno completo: persiste IN, llama a LLM con tools (loop),
 * persiste OUT, devuelve la respuesta para el canal.
 *
 * Maneja sus propios errores: si el LLM o una tool falla, devuelve un
 * fallback amable y reporta a Sentry. Nunca lanza.
 */
export async function runRoyceTurn(
  input: RoyceTurnInput,
): Promise<RoyceTurnResult> {
  const agente = await getRoyceAgente();
  if (!agente) {
    return {
      reply: FALLBACK_REPLY,
      sessionDbId: '',
      modelo: null,
      tokensIn: 0,
      tokensOut: 0,
    };
  }

  // upsert sesión
  const sessionDbId = await upsertSesion({
    agenteId: agente.id,
    sessionId: input.sessionId,
    surface: input.surface,
    visitorEmail: input.visitorEmail,
    visitorNombre: input.visitorNombre,
  });

  // Persistir IN antes de procesar
  await db.insert(agenteMensajes).values({
    sesionId: sessionDbId,
    direccion: 'in',
    contenido: input.message,
  });

  // Historial reciente (después del IN que acabamos de insertar)
  const historialDesc = await db
    .select({
      direccion: agenteMensajes.direccion,
      contenido: agenteMensajes.contenido,
    })
    .from(agenteMensajes)
    .where(eq(agenteMensajes.sesionId, sessionDbId))
    .orderBy(desc(agenteMensajes.createdAt))
    .limit(HISTORIAL_LIMITE + 1);

  const historial: ToolMsg[] = historialDesc
    .slice(1) // descartamos el IN actual
    .reverse()
    .map((m) =>
      m.direccion === 'out'
        ? ({ role: 'assistant' as const, content: m.contenido })
        : ({ role: 'user' as const, content: m.contenido }),
    );

  const systemPrompt = buildRoyceSystemPrompt({ canal: input.canal });

  const llmMessages: ToolMsg[] = [
    { role: 'system', content: systemPrompt },
    ...historial,
    { role: 'user', content: input.message },
  ];

  let reply = FALLBACK_REPLY;
  let tokensIn = 0;
  let tokensOut = 0;
  let modelo: string | null = null;

  try {
    for (let i = 0; i < MAX_TOOL_LOOPS; i++) {
      const res = await chatDeepSeekWithTools({
        messages: llmMessages,
        tools: ROYCE_TOOLS_OPENAI,
        temperature: 0.3,
        maxTokens: 800,
      });
      tokensIn += res.tokensIn;
      tokensOut += res.tokensOut;
      modelo = 'deepseek-chat';

      if (res.toolCalls.length > 0) {
        llmMessages.push({
          role: 'assistant',
          content: res.reply || null,
          tool_calls: res.toolCalls,
        });

        for (const tc of res.toolCalls) {
          let parsedArgs: Record<string, unknown> = {};
          try {
            parsedArgs = JSON.parse(tc.function.arguments || '{}');
          } catch {
            parsedArgs = {};
          }
          const toolResult = await ejecutarRoyceTool({
            sesionDbId: sessionDbId,
            toolName: tc.function.name,
            args: parsedArgs,
            canal: input.canal,
          });
          llmMessages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(toolResult),
          });
        }
        continue;
      }

      if (res.reply) reply = res.reply;
      break;
    }
  } catch (err) {
    console.error('[royce:orchestrator]', err);
    await captureException(err, { module: 'royce/orchestrator' });
  }

  // Persistir OUT
  const costeEur = modelo ? calcularCosteEur(tokensIn, tokensOut) : null;
  await db.insert(agenteMensajes).values({
    sesionId: sessionDbId,
    direccion: 'out',
    contenido: reply,
    llmModelo: modelo,
    llmTokensIn: modelo ? tokensIn : null,
    llmTokensOut: modelo ? tokensOut : null,
    llmCosteEur: costeEur !== null ? costeEur.toFixed(6) : null,
  });

  return {
    reply,
    sessionDbId,
    modelo,
    tokensIn,
    tokensOut,
  };
}

// ============================================================
// Lookups
// ============================================================

async function getRoyceAgente(): Promise<{ id: string } | null> {
  const [a] = await db
    .select({ id: agentes.id })
    .from(agentes)
    .where(eq(agentes.slug, ROYCE_SLUG))
    .limit(1);
  if (!a) {
    console.error(`[royce] no existe agente con slug '${ROYCE_SLUG}'`);
  }
  return a ?? null;
}

async function upsertSesion(input: {
  agenteId: string;
  sessionId: string;
  surface: Surface;
  visitorEmail?: string;
  visitorNombre?: string;
}): Promise<string> {
  const [existing] = await db
    .select({ id: agenteSesiones.id })
    .from(agenteSesiones)
    .where(
      and(
        eq(agenteSesiones.agenteId, input.agenteId),
        eq(agenteSesiones.sessionId, input.sessionId),
      ),
    )
    .limit(1);

  if (existing) {
    // completar visitante si llega identificado
    if (input.visitorEmail || input.visitorNombre) {
      await db
        .update(agenteSesiones)
        .set({
          ...(input.visitorEmail ? { visitorEmail: input.visitorEmail } : {}),
          ...(input.visitorNombre ? { visitorNombre: input.visitorNombre } : {}),
        })
        .where(eq(agenteSesiones.id, existing.id));
    }
    return existing.id;
  }

  const [inserted] = await db
    .insert(agenteSesiones)
    .values({
      agenteId: input.agenteId,
      sessionId: input.sessionId,
      surface: input.surface,
      visitorEmail: input.visitorEmail ?? null,
      visitorNombre: input.visitorNombre ?? null,
    })
    .returning({ id: agenteSesiones.id });
  return inserted.id;
}

// ============================================================
// Ejecución de tools (incluye `capturar_lead` que vive aparte)
// ============================================================

async function ejecutarRoyceTool(input: {
  sesionDbId: string;
  toolName: string;
  args: Record<string, unknown>;
  canal: RoyceCanal;
}): Promise<unknown> {
  const tool = getRoyceTool(input.toolName);
  if (!tool) return { error: `tool '${input.toolName}' no existe` };

  // En landing solo se permite `capturar_lead`. Las tools de gestión/métricas
  // son de Marlon — si el LLM intenta llamarlas desde landing, lo bloqueamos.
  if (input.canal === 'landing' && input.toolName !== 'capturar_lead') {
    return {
      error: 'tool_no_disponible_en_landing',
      hint: 'Esta tool solo se ejecuta en el bot interno de Marlon.',
    };
  }

  const parsed = tool.schema.safeParse(input.args);
  if (!parsed.success) {
    return {
      error: 'args_invalidos',
      detalles: parsed.error.issues,
    };
  }

  try {
    // `capturar_lead` lleva además el contexto de la conversación al lead row.
    if (input.toolName === 'capturar_lead') {
      const result = await tool.handler(parsed.data);
      await adjuntarConversacionAlLead({
        sesionDbId: input.sesionDbId,
        leadEmail:
          typeof parsed.data === 'object' && parsed.data !== null
            ? (parsed.data as { email?: string }).email
            : undefined,
      });
      return result;
    }
    return await tool.handler(parsed.data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    console.error(`[royce:tool:${input.toolName}]`, err);
    await captureException(err, {
      module: 'royce/orchestrator:tool',
      tool: input.toolName,
    });
    return { ok: false, error: msg };
  }
}

/**
 * Si la tool `capturar_lead` se ejecutó OK, copiamos los últimos mensajes
 * de la sesión al campo `leads.conversacion_json` para que Marlon vea el
 * contexto cuando contacte al lead.
 */
async function adjuntarConversacionAlLead(input: {
  sesionDbId: string;
  leadEmail: string | undefined;
}): Promise<void> {
  if (!input.leadEmail) return;
  try {
    const mensajesRecientes = await db
      .select({
        direccion: agenteMensajes.direccion,
        contenido: agenteMensajes.contenido,
        createdAt: agenteMensajes.createdAt,
      })
      .from(agenteMensajes)
      .where(eq(agenteMensajes.sesionId, input.sesionDbId))
      .orderBy(asc(agenteMensajes.createdAt))
      .limit(20);

    const conversacion = mensajesRecientes.map((m) => ({
      role: m.direccion === 'in' ? 'user' : 'assistant',
      content: m.contenido,
      at: m.createdAt,
    }));

    await db
      .update(leads)
      .set({ conversacionJson: conversacion })
      .where(eq(leads.email, input.leadEmail));
  } catch (err) {
    // No bloqueante.
    console.warn('[royce:adjuntar-conversacion]', err);
  }
}
