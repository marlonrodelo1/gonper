import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, asc, desc, eq, gte, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { mensajes, salones, servicios, horarios } from '@/lib/db/schema';
import { calcularCosteEur } from '@/lib/llm/deepseek';
import {
  chatDeepSeekWithTools,
  type ToolMsg,
} from '@/lib/llm/deepseek-tools';
import {
  TOOLS_TIENDA,
  executeChatTiendaTool,
  type ToolEjecutada,
} from '@/lib/chat-tienda/tools';
import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit';

const bodySchema = z.object({
  session_id: z.string().uuid(),
  message: z.string().trim().min(1).max(1000),
  visitor_nombre: z.string().trim().max(120).optional(),
  visitor_telefono: z.string().trim().max(40).optional(),
});

const DIA_NOMBRES = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];

const TIPO_NEGOCIO_LEGIBLE: Record<string, string> = {
  barberia: 'barbería',
  peluqueria: 'peluquería',
  estetica: 'centro de estética',
  manicura: 'salón de manicura',
  otro: 'salón',
};

const FALLBACK_REPLY =
  'Estoy teniendo un problema, vuelve a probar en un momento.';
const HISTORIAL_LIMITE = 10;
const MAX_TOOL_LOOPS = 4; // protección contra bucles infinitos

function formatPrecio(precioEur: string | number): string {
  const n = typeof precioEur === 'string' ? Number(precioEur) : precioEur;
  if (Number.isNaN(n)) return String(precioEur);
  return n.toFixed(2).replace(/\.00$/, '') + ' €';
}

function formatHorarios(
  tramos: Array<{ diaSemana: number; inicio: unknown; fin: unknown }>,
): string {
  if (tramos.length === 0) return '(sin horarios publicados)';
  const porDia: Record<number, string[]> = {
    0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [],
  };
  for (const t of tramos) {
    const ini = String(t.inicio).slice(0, 5);
    const fin = String(t.fin).slice(0, 5);
    porDia[t.diaSemana]?.push(`${ini}–${fin}`);
  }
  const lineas: string[] = [];
  for (let d = 1; d <= 6; d++) {
    const arr = porDia[d] ?? [];
    lineas.push(`- ${DIA_NOMBRES[d]}: ${arr.length ? arr.join(' · ') : 'cerrado'}`);
  }
  lineas.push(
    `- ${DIA_NOMBRES[0]}: ${porDia[0]?.length ? porDia[0].join(' · ') : 'cerrado'}`,
  );
  return lineas.join('\n');
}

function formatServicios(
  lista: Array<{ id: string; nombre: string; duracionMin: number; precioEur: string }>,
): string {
  if (lista.length === 0) return '(sin servicios publicados)';
  return lista
    .map(
      (s) =>
        `- ${s.nombre} — ${s.duracionMin} min — ${formatPrecio(s.precioEur)} (id: ${s.id})`,
    )
    .join('\n');
}

function buildSystemPrompt(args: {
  agenteNombre: string;
  agenteTono: string;
  salonNombre: string;
  tipoNegocio: string;
  direccion: string | null;
  telefono: string | null;
  serviciosTexto: string;
  horariosTexto: string;
  fechaHoy: string;
  timezone: string;
  instruccionesDueno: string | null;
}): string {
  const tipo = TIPO_NEGOCIO_LEGIBLE[args.tipoNegocio] ?? args.tipoNegocio;
  const lugar = args.direccion ?? 'España';
  const bloqueInstrucciones =
    args.instruccionesDueno && args.instruccionesDueno.trim()
      ? `\n## Instrucciones del dueño del salón (prioritarias)\n${args.instruccionesDueno.trim()}\n`
      : '';

  return `Eres ${args.agenteNombre}, la asistente virtual de ${args.salonNombre}, un ${tipo} en ${lugar}.
Tono: ${args.agenteTono}. Habla SIEMPRE en español, con frases cortas, claras y útiles.
Hoy es ${args.fechaHoy}. Zona horaria del salón: ${args.timezone}.

## Tu rol
Atender clientes que escriben por la web del salón. Puedes responder sobre precios, horarios, servicios y ubicación.
**Puedes RESERVAR la cita aquí mismo, dentro del chat.** No mandes nunca al cliente a otra URL.

## Cómo reservar (paso a paso)
1. Si el cliente pregunta qué servicios hay, llama a la tool \`listar_servicios\` y resume con su precio y duración.
2. Cuando el cliente quiera coger cita, recopila por el chat:
   - **servicio** (usa los ids exactos de \`listar_servicios\`).
   - **fecha** preferida (en formato YYYY-MM-DD; si dicen "mañana" o "el martes", calcula la fecha real).
3. Llama a \`listar_slots_disponibles\` con servicio_id y fecha. Si no hay huecos, sugiere otra fecha cercana.
4. Pregunta cuál hueco prefieren (muestra solo unos pocos para no saturar).
5. Pide los datos del cliente: **nombre completo**, **email** (obligatorio para enviar la confirmación) y **teléfono** (opcional).
6. Llama a \`reservar_cita_publica\` con el inicio_iso EXACTO devuelto por listar_slots_disponibles.
7. Si la tool devuelve \`ok: true\`, confirma con frase corta del tipo: "Listo, te he reservado el [día] a las [hora]. Te he enviado un email de confirmación a [email]."
8. Si devuelve \`code: SLOT_OCUPADO\`, discúlpate y vuelve a llamar a \`listar_slots_disponibles\` para ofrecer otros huecos del mismo día u otra fecha.

## Reglas duras
- NUNCA inventes ids ni horas; saca todo de las tools.
- NUNCA des una URL para reservar — la reserva se hace aquí.
- Si te piden algo que no sabes (precio extra, política de cancelación específica, etc.), dilo claro y ofrece llamar al teléfono del salón.
- Email es obligatorio para reservar. Si el cliente se niega, explica que se usa para mandar confirmación + recordatorio.
- **Si el cliente acaba de elegir un hueco específico** (por ejemplo "16:00", "quiero las 18h", "el de las 16:30"), NO vuelvas a llamar \`listar_slots_disponibles\` para "verificar". Confía en que el slot existía cuando lo listaste. Pasa directamente al paso 5 (pedir nombre, email, teléfono). Si la reserva falla con SLOT_OCUPADO, ahí sí vuelves a listar.
- Una vez que llamas a \`reservar_cita_publica\` y devuelve \`ok: true\`, **da solo la confirmación final y termina el flujo**. No ofrezcas más servicios, no listes huecos, no preguntes "¿algo más?".
${bloqueInstrucciones}
## Datos del salón
Servicios:
${args.serviciosTexto}

Horarios:
${args.horariosTexto}

Teléfono del salón: ${args.telefono ?? '—'}`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parámetros inválidos', detalles: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { session_id, message, visitor_nombre, visitor_telefono } = parsed.data;

    const ip = getClientIp(request);
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

    const [salonRows, listaServicios, listaHorarios] = await Promise.all([
      db
        .select({
          id: salones.id,
          nombre: salones.nombre,
          tipoNegocio: salones.tipoNegocio,
          direccion: salones.direccion,
          timezone: salones.timezone,
          telefono: salones.telefono,
          agenteNombre: salones.agenteNombre,
          agenteTono: salones.agenteTono,
          agenteInstrucciones: salones.agenteInstrucciones,
          activo: salones.activo,
        })
        .from(salones)
        .where(eq(salones.slug, slug))
        .limit(1),
      db
        .select({
          id: servicios.id,
          nombre: servicios.nombre,
          precioEur: servicios.precioEur,
          duracionMin: servicios.duracionMin,
        })
        .from(servicios)
        .innerJoin(salones, eq(salones.id, servicios.salonId))
        .where(and(eq(salones.slug, slug), eq(servicios.activo, true)))
        .orderBy(asc(servicios.orden), asc(servicios.createdAt))
        .limit(50),
      db
        .select({
          diaSemana: horarios.diaSemana,
          inicio: horarios.inicio,
          fin: horarios.fin,
        })
        .from(horarios)
        .innerJoin(salones, eq(salones.id, horarios.salonId))
        .where(eq(salones.slug, slug))
        .orderBy(asc(horarios.diaSemana), asc(horarios.inicio)),
    ]);

    const salon = salonRows[0];
    if (!salon || !salon.activo) {
      return NextResponse.json({ error: 'Salón no encontrado' }, { status: 404 });
    }

    // Rate limit por sesión
    const desde = new Date(Date.now() - 10 * 60 * 1000);
    const [{ total } = { total: 0 }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(mensajes)
      .where(
        and(
          eq(mensajes.canal, 'web'),
          eq(mensajes.direccion, 'in'),
          eq(mensajes.sessionId, session_id),
          gte(mensajes.createdAt, desde),
        ),
      );

    if ((total ?? 0) >= 30) {
      return NextResponse.json(
        { error: 'Demasiados mensajes, espera unos minutos.' },
        { status: 429 },
      );
    }

    const previos = await db
      .select({ id: mensajes.id })
      .from(mensajes)
      .where(
        and(
          eq(mensajes.salonId, salon.id),
          eq(mensajes.sessionId, session_id),
          eq(mensajes.direccion, 'in'),
        ),
      )
      .limit(1);
    const esPrimerMensaje = previos.length === 0;

    // Historial (últimos 10)
    const historialDesc = await db
      .select({
        direccion: mensajes.direccion,
        contenido: mensajes.contenido,
      })
      .from(mensajes)
      .where(
        and(
          eq(mensajes.salonId, salon.id),
          eq(mensajes.sessionId, session_id),
        ),
      )
      .orderBy(desc(mensajes.createdAt))
      .limit(HISTORIAL_LIMITE);

    const historial: ToolMsg[] = historialDesc
      .slice()
      .reverse()
      .map((m) =>
        m.direccion === 'out'
          ? ({ role: 'assistant' as const, content: m.contenido })
          : ({ role: 'user' as const, content: m.contenido }),
      );

    // Persistir mensaje IN
    await db.insert(mensajes).values({
      salonId: salon.id,
      canal: 'web',
      direccion: 'in',
      contenido: message,
      sessionId: session_id,
      webVisitorNombre: visitor_nombre ?? null,
      webVisitorTelefono: visitor_telefono ?? null,
    });

    const fechaHoy = new Date().toLocaleDateString('es-ES', {
      timeZone: salon.timezone || 'Europe/Madrid',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const systemPrompt = buildSystemPrompt({
      agenteNombre: salon.agenteNombre,
      agenteTono: salon.agenteTono,
      instruccionesDueno: salon.agenteInstrucciones,
      salonNombre: salon.nombre,
      tipoNegocio: salon.tipoNegocio,
      direccion: salon.direccion,
      telefono: salon.telefono,
      serviciosTexto: formatServicios(listaServicios),
      horariosTexto: formatHorarios(listaHorarios),
      fechaHoy,
      timezone: salon.timezone || 'Europe/Madrid',
    });

    // Loop de tool calling — hasta MAX_TOOL_LOOPS iteraciones.
    const llmMessages: ToolMsg[] = [
      { role: 'system', content: systemPrompt },
      ...historial,
      { role: 'user', content: message },
    ];

    let reply = FALLBACK_REPLY;
    let tokensIn = 0;
    let tokensOut = 0;
    let modelo: string | null = null;
    const uiEvents: NonNullable<ToolEjecutada['ui']>[] = [];

    try {
      for (let i = 0; i < MAX_TOOL_LOOPS; i++) {
        const res = await chatDeepSeekWithTools({
          messages: llmMessages,
          tools: TOOLS_TIENDA,
          temperature: 0.4,
          maxTokens: 600,
        });
        tokensIn += res.tokensIn;
        tokensOut += res.tokensOut;
        modelo = 'deepseek-chat';

        if (res.toolCalls.length > 0) {
          // Append assistant message con tool_calls
          llmMessages.push({
            role: 'assistant',
            content: res.reply || null,
            tool_calls: res.toolCalls,
          });

          // Ejecutar cada tool y appendear su resultado
          for (const tc of res.toolCalls) {
            let parsedArgs: Record<string, unknown> = {};
            try {
              parsedArgs = JSON.parse(tc.function.arguments || '{}');
            } catch {
              parsedArgs = {};
            }
            const ejecutada = await executeChatTiendaTool({
              slug,
              toolName: tc.function.name,
              toolArgs: parsedArgs,
            });
            if (ejecutada.ui) uiEvents.push(ejecutada.ui);

            llmMessages.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: JSON.stringify(ejecutada.result),
            });
          }
          // Continuar el loop para que el LLM produzca la respuesta final.
          continue;
        }

        // Sin tool calls → respuesta final.
        if (res.reply) reply = res.reply;
        break;
      }
    } catch (e) {
      console.error('[chat-tienda][deepseek] error:', e);
    }

    if (esPrimerMensaje) {
      const saludo = `¡Hola! 👋 Soy ${salon.agenteNombre}, la asistente de ${salon.nombre}. ¿Cómo te llamas?`;
      reply = `${saludo}\n\n${reply}`;
    }

    const costeEur = modelo ? calcularCosteEur(tokensIn, tokensOut) : null;
    await db.insert(mensajes).values({
      salonId: salon.id,
      canal: 'web',
      direccion: 'out',
      contenido: reply,
      sessionId: session_id,
      webVisitorNombre: visitor_nombre ?? null,
      webVisitorTelefono: visitor_telefono ?? null,
      llmModelo: modelo,
      llmTokensIn: modelo ? tokensIn : null,
      llmTokensOut: modelo ? tokensOut : null,
      llmCosteEur: costeEur !== null ? costeEur.toFixed(6) : null,
    });

    // Filtrar UI redundante: si la reserva se confirmó, no tiene sentido
    // re-mostrar paneles de slots o catálogo. Si hay múltiples paneles de
    // slots para el mismo servicio+fecha (típico cuando el LLM verifica
    // dos veces), quedarse solo con el último.
    const tieneReservaOk = uiEvents.some((u) => u.kind === 'reserva_ok');
    let uiFiltered: typeof uiEvents;
    if (tieneReservaOk) {
      uiFiltered = uiEvents.filter((u) => u.kind === 'reserva_ok');
    } else {
      const vistos = new Set<string>();
      const acumulado: typeof uiEvents = [];
      for (let i = uiEvents.length - 1; i >= 0; i--) {
        const u = uiEvents[i];
        if (u.kind === 'slots') {
          const key = `${u.fecha}|${u.servicio_nombre}`;
          if (vistos.has(key)) continue;
          vistos.add(key);
        }
        acumulado.unshift(u);
      }
      uiFiltered = acumulado;
    }

    return NextResponse.json({ reply, session_id, ui: uiFiltered });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
