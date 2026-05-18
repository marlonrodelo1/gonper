/**
 * Orquestador del bot Telegram del salón (modo dueño = Juanita Pro).
 *
 * Antes vivía en n8n. Ahora el webhook entra directo a
 * `/api/telegram/[bot_username]` y ese endpoint llama a estas funciones.
 *
 * Responsabilidades:
 *  - Vinculación `/start dueno-<token>` (canjea token HMAC + guarda chat_id).
 *  - Modo dueño: LLM con tool calling sobre el catálogo Juanita Pro.
 *  - Mensajes que no son del dueño: respuesta fija con link a la web.
 *  - callback_query (botones inline): confirmar/cancelar cita.
 *
 * Persiste cada mensaje en `mensajes` (canal='telegram') para que el
 * panel pueda mostrar histórico.
 */

import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { mensajes, salones, type Salon } from '@/lib/db/schema';
import { TOOLS, getTool, renderHelp } from '@/lib/admin/tool-registry';
import { JUANITA_TOOLS_OPENAI } from '@/lib/admin/tool-registry-openai';
import {
  chatDeepSeekWithTools,
  type ToolMsg,
} from '@/lib/llm/deepseek-tools';
import { calcularCosteEur } from '@/lib/llm/deepseek';
import { verifyVinculacionToken } from '@/lib/admin/vinculacion-token';
import { responderCita } from '@/lib/citas/responder';
import {
  tgSendMessage,
  tgSendChatAction,
  tgAnswerCallbackQuery,
} from './send';
import { captureException } from '@/lib/observability';

const HISTORIAL_LIMITE = 12;
const MAX_TOOL_LOOPS = 4;
const FALLBACK_REPLY =
  'Estoy teniendo un problema, vuelve a probar en un momento.';

// ============================================================
// TIPOS Telegram (subset usado)
// ============================================================
interface TgUser {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  username?: string;
}
interface TgChat {
  id: number;
  type: string;
}
interface TgMessage {
  message_id: number;
  from?: TgUser;
  chat: TgChat;
  date: number;
  text?: string;
}
interface TgCallbackQuery {
  id: string;
  from: TgUser;
  message?: TgMessage;
  data?: string;
}
export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  callback_query?: TgCallbackQuery;
}

// ============================================================
// Entry point
// ============================================================

export async function handleBotUpdate(
  salon: Salon,
  update: TgUpdate,
): Promise<void> {
  try {
    if (update.callback_query) {
      await handleCallbackQuery(salon, update.callback_query);
      return;
    }

    const msg = update.message;
    if (!msg || !msg.text) return; // ignoramos stickers, fotos, etc.

    const text = msg.text.trim();
    const chatId = String(msg.chat.id);

    // 1) Vinculación del dueño: `/start dueno-<token>`
    const startMatch = text.match(/^\/start\s+dueno-(.+)$/);
    if (startMatch) {
      await handleVinculacionDueno(salon, chatId, startMatch[1]);
      return;
    }

    // 2) Modo dueño
    if (salon.telegramChatIdDueno && chatId === salon.telegramChatIdDueno) {
      await handleMensajeDueno(salon, chatId, text);
      return;
    }

    // 3) Cualquier otro: respuesta fija con link a la web del salón
    await handleMensajeNoDueno(salon, chatId);
  } catch (err) {
    console.error('[telegram:bot-handler]', err);
    await captureException(err, { module: 'telegram/bot-handler', salonId: salon.id });
  }
}

// ============================================================
// 1) Vinculación del dueño
// ============================================================

async function handleVinculacionDueno(
  salon: Salon,
  chatId: string,
  token: string,
): Promise<void> {
  const botToken = salon.telegramBotToken;
  if (!botToken) return; // sin bot configurado no hay forma de responder

  const payload = verifyVinculacionToken(token);
  if (!payload || payload.salonId !== salon.id) {
    await tgSendMessage({
      botToken,
      chatId,
      text:
        '❌ Este enlace de vinculación no es válido o ha caducado.\n\n' +
        'Vuelve al panel de configuración del bot y genera uno nuevo.',
    });
    return;
  }

  await db
    .update(salones)
    .set({ telegramChatIdDueno: chatId, updatedAt: new Date() })
    .where(eq(salones.id, salon.id));

  await tgSendMessage({
    botToken,
    chatId,
    parseMode: 'Markdown',
    text:
      `✅ *Vinculado a ${escapeMd(salon.nombre)}*\n\n` +
      `A partir de ahora recibirás aquí los avisos de nuevas citas, ` +
      `recordatorios 2h antes y respuestas de tus clientes. ` +
      `También puedes pedirme cosas como _"¿qué citas tengo hoy?"_ o ` +
      `_"ingresos del mes"_.\n\n` +
      `Escribe */help* para ver todo lo que puedo hacer.`,
  });
}

// ============================================================
// 2) Mensaje del dueño — LLM con tools
// ============================================================

async function handleMensajeDueno(
  salon: Salon,
  chatId: string,
  text: string,
): Promise<void> {
  const botToken = salon.telegramBotToken!;
  // Atajo: /help no consume LLM
  if (text === '/help' || text.toLowerCase() === 'help') {
    await tgSendMessage({
      botToken,
      chatId,
      parseMode: 'Markdown',
      text: renderHelp(),
    });
    await persistirMensaje(salon.id, 'in', text);
    await persistirMensaje(salon.id, 'out', renderHelp());
    return;
  }

  // Persistir mensaje IN antes de procesarlo para no perderlo si el LLM falla
  await persistirMensaje(salon.id, 'in', text);
  await tgSendChatAction(botToken, chatId, 'typing');

  // Historial reciente (últimos N mensajes telegram de este salón)
  const historialDesc = await db
    .select({
      direccion: mensajes.direccion,
      contenido: mensajes.contenido,
    })
    .from(mensajes)
    .where(and(eq(mensajes.salonId, salon.id), eq(mensajes.canal, 'telegram')))
    .orderBy(desc(mensajes.createdAt))
    .limit(HISTORIAL_LIMITE + 1); // +1 porque acabamos de insertar el actual

  const historial: ToolMsg[] = historialDesc
    .slice(1) // descartamos el que acabamos de insertar
    .reverse()
    .map((m) =>
      m.direccion === 'out'
        ? ({ role: 'assistant' as const, content: m.contenido })
        : ({ role: 'user' as const, content: m.contenido }),
    );

  const systemPrompt = buildSystemPromptDueno(salon);

  const llmMessages: ToolMsg[] = [
    { role: 'system', content: systemPrompt },
    ...historial,
    { role: 'user', content: text },
  ];

  let reply = FALLBACK_REPLY;
  let tokensIn = 0;
  let tokensOut = 0;
  let modelo: string | null = null;

  try {
    for (let i = 0; i < MAX_TOOL_LOOPS; i++) {
      const res = await chatDeepSeekWithTools({
        messages: llmMessages,
        tools: JUANITA_TOOLS_OPENAI,
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
          const toolResult = await ejecutarTool(salon.id, tc.function.name, parsedArgs);
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
    console.error('[telegram:bot-handler:llm]', err);
    await captureException(err, {
      module: 'telegram/bot-handler:llm',
      salonId: salon.id,
    });
  }

  const costeEur = modelo ? calcularCosteEur(tokensIn, tokensOut) : null;

  await tgSendMessage({
    botToken,
    chatId,
    text: reply,
    parseMode: 'Markdown',
  });

  await persistirMensaje(salon.id, 'out', reply, {
    llmModelo: modelo,
    llmTokensIn: modelo ? tokensIn : null,
    llmTokensOut: modelo ? tokensOut : null,
    llmCosteEur: costeEur !== null ? costeEur.toFixed(6) : null,
  });
}

async function ejecutarTool(
  salonId: string,
  toolName: string,
  rawArgs: Record<string, unknown>,
): Promise<unknown> {
  const tool = getTool(toolName);
  if (!tool) return { error: `tool '${toolName}' no existe` };

  const parsed = tool.schema.safeParse(rawArgs);
  if (!parsed.success) {
    return {
      error: 'args_invalidos',
      detalles: parsed.error.issues,
    };
  }
  try {
    return await tool.handler(salonId, parsed.data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno';
    console.error(`[telegram:tool:${toolName}]`, err);
    await captureException(err, {
      module: 'telegram/bot-handler:tool',
      tool: toolName,
      salonId,
    });
    return { ok: false, error: msg };
  }
}

// ============================================================
// 3) Mensaje de no-dueño
// ============================================================

async function handleMensajeNoDueno(salon: Salon, chatId: string): Promise<void> {
  const botToken = salon.telegramBotToken;
  if (!botToken) return;
  const url = `https://gonperstudio.shop/s/${salon.slug}/reservar`;
  await tgSendMessage({
    botToken,
    chatId,
    parseMode: 'Markdown',
    text:
      'Este bot es solo para el dueño del salón.\n\n' +
      `Si quieres reservar cita en *${escapeMd(salon.nombre)}*, visita ` +
      `${url} — te atendemos por la web en menos de 30 segundos.`,
  });
}

// ============================================================
// 4) callback_query (botones inline)
// ============================================================

async function handleCallbackQuery(
  salon: Salon,
  cb: TgCallbackQuery,
): Promise<void> {
  const botToken = salon.telegramBotToken;
  if (!botToken) return;

  const data = (cb.data ?? '').trim();
  // Formato: "cita:<accion>:<citaId>"  (accion: confirmar|cancelar)
  const match = data.match(/^cita:(confirmar|cancelar):([0-9a-f-]{36})$/i);
  if (!match) {
    await tgAnswerCallbackQuery({
      botToken,
      callbackQueryId: cb.id,
      text: 'Acción no reconocida.',
    });
    return;
  }

  const [, accion, citaId] = match;
  const result = await responderCita({
    citaId,
    accion: accion as 'confirmar' | 'cancelar',
    source: 'telegram',
  });

  if (!result.ok) {
    const msg =
      result.error === 'no_encontrada'
        ? 'No encuentro esa cita.'
        : result.error === 'pasada'
          ? 'Esa cita ya ha pasado.'
          : 'No se pudo aplicar el cambio.';
    await tgAnswerCallbackQuery({
      botToken,
      callbackQueryId: cb.id,
      text: msg,
      showAlert: true,
    });
    return;
  }

  const toast =
    accion === 'confirmar' ? '✅ Cita confirmada' : '❌ Cita cancelada';
  await tgAnswerCallbackQuery({
    botToken,
    callbackQueryId: cb.id,
    text: toast,
  });
}

// ============================================================
// Helpers
// ============================================================

const TIPO_NEGOCIO_LEGIBLE: Record<string, string> = {
  barberia: 'barbería',
  peluqueria: 'peluquería',
  estetica: 'centro de estética',
  manicura: 'salón de manicura',
  otro: 'salón',
};

function buildSystemPromptDueno(salon: Salon): string {
  const tipo = TIPO_NEGOCIO_LEGIBLE[salon.tipoNegocio] ?? salon.tipoNegocio;
  const tz = salon.timezone || 'Europe/Madrid';
  const fechaHoy = new Date().toLocaleDateString('es-ES', {
    timeZone: tz,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const tools = TOOLS.map((t) => `- ${t.name}: ${t.descripcion}`).join('\n');

  return `Eres Juanita Pro, la asistente del dueño de ${salon.nombre}, un ${tipo}.
Hablas SOLO con el dueño, no con clientes finales. Hoy es ${fechaHoy} (TZ ${tz}).

## Reglas
- Habla en español, con frases cortas y útiles. Sin emojis salvo que el dueño los use.
- Cuando el dueño te pida algo concreto (citas, ingresos, crear/mover/cancelar cita, top clientes, no-shows, link de la tienda, etc.), invoca la tool correspondiente. No inventes datos.
- Si la tool devuelve un objeto con datos, presenta lo relevante de forma legible (lista corta, fechas en formato local). No dumpees el JSON.
- Si el dueño pide algo que no tiene tool, dilo claro y sugiere la opción más cercana. Para ayuda general, indica que escriba "/help".
- Antes de mutaciones destructivas (cancelar / mover) confirma con una pregunta breve si la frase es ambigua. Si es clara ("cancela la cita de María a las 16h"), ejecuta.
- Usa formato Markdown legacy de Telegram: *negrita*, _cursiva_, \`código\`. No uses ** ni ##.

## Tools disponibles
${tools}

## Datos del salón
- Slug público: ${salon.slug}
- Teléfono: ${salon.telefono ?? '—'}
- Dirección: ${salon.direccion ?? '—'}
- Plan: ${salon.plan}`;
}

function escapeMd(s: string): string {
  return String(s).replace(/([_*`[\]])/g, '\\$1');
}

interface PersistirOpts {
  llmModelo?: string | null;
  llmTokensIn?: number | null;
  llmTokensOut?: number | null;
  llmCosteEur?: string | null;
}

async function persistirMensaje(
  salonId: string,
  direccion: 'in' | 'out',
  contenido: string,
  opts: PersistirOpts = {},
): Promise<void> {
  try {
    await db.insert(mensajes).values({
      salonId,
      canal: 'telegram',
      direccion,
      contenido,
      llmModelo: opts.llmModelo ?? null,
      llmTokensIn: opts.llmTokensIn ?? null,
      llmTokensOut: opts.llmTokensOut ?? null,
      llmCosteEur: opts.llmCosteEur ?? null,
    });
  } catch (err) {
    // No bloqueamos al usuario si falla la persistencia
    console.warn('[telegram:persistir]', err);
  }
}
