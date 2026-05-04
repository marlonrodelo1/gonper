import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, asc, desc, eq, gte, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { mensajes, salones, servicios, horarios } from '@/lib/db/schema';
import {
  chatDeepSeek,
  calcularCosteEur,
  type ChatMessage,
} from '@/lib/llm/deepseek';
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
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
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
  lista: Array<{ nombre: string; duracionMin: number; precioEur: string }>,
): string {
  if (lista.length === 0) return '(sin servicios publicados)';
  return lista
    .map(
      (s) =>
        `- ${s.nombre} — ${s.duracionMin} min — ${formatPrecio(s.precioEur)}`,
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
}): string {
  const tipo = TIPO_NEGOCIO_LEGIBLE[args.tipoNegocio] ?? args.tipoNegocio;
  const lugar = args.direccion ?? 'España';
  return `Eres ${args.agenteNombre}, la recepcionista virtual de ${args.salonNombre}, un ${tipo} en ${lugar}.
Tono: ${args.agenteTono}. Habla SIEMPRE en español, con frases cortas y útiles.
Tu rol: atender clientes que escriben por la web del salón. Puedes responder sobre precios, horarios, servicios. Para reservar dile que use el calendario que tiene debajo.
Lo que NO sabes / debes preguntar al usuario, no inventes.
Hoy es ${args.fechaHoy}.

## Datos del salón
Servicios:
${args.serviciosTexto}
Horarios:
${args.horariosTexto}
Teléfono: ${args.telefono ?? '—'}`;
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
    const { session_id, message, visitor_nombre, visitor_telefono } =
      parsed.data;

    // Rate limit por IP (anti-abuso): 100 mensajes/día/IP es generoso
    // para uso real y bloquea ataques de spam contra DeepSeek.
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

    // Carga salón + servicios + horarios en paralelo
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
          activo: salones.activo,
        })
        .from(salones)
        .where(eq(salones.slug, slug))
        .limit(1),
      // Para servicios y horarios necesitamos el salonId; los pediremos por slug via subquery sería más limpio,
      // pero como aún no lo tenemos hacemos un join explícito.
      db
        .select({
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

    // Rate limit: > 30 mensajes IN del mismo session_id en últimos 10 min
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

    // Detectar si es el primer mensaje de la sesión (en este salón)
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

    // Cargar historial (últimos 10) en orden cronológico para mandar al LLM
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

    const historial: ChatMessage[] = historialDesc
      .slice()
      .reverse()
      .map((m) => ({
        role: m.direccion === 'out' ? ('assistant' as const) : ('user' as const),
        content: m.contenido,
      }));

    // INSERT mensaje IN
    await db.insert(mensajes).values({
      salonId: salon.id,
      canal: 'web',
      direccion: 'in',
      contenido: message,
      sessionId: session_id,
      webVisitorNombre: visitor_nombre ?? null,
      webVisitorTelefono: visitor_telefono ?? null,
    });

    // Construir prompt y llamar a DeepSeek
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
      salonNombre: salon.nombre,
      tipoNegocio: salon.tipoNegocio,
      direccion: salon.direccion,
      telefono: salon.telefono,
      serviciosTexto: formatServicios(listaServicios),
      horariosTexto: formatHorarios(listaHorarios),
      fechaHoy,
    });

    // Mensajes para el LLM: historial + mensaje actual
    const llmMessages: ChatMessage[] = [
      ...historial,
      { role: 'user', content: message },
    ];

    let reply = FALLBACK_REPLY;
    let tokensIn = 0;
    let tokensOut = 0;
    let modelo: string | null = null;

    try {
      const result = await chatDeepSeek({
        systemPrompt,
        messages: llmMessages,
        temperature: 0.5,
        maxTokens: 400,
      });
      reply = result.reply;
      tokensIn = result.tokensIn;
      tokensOut = result.tokensOut;
      modelo = 'deepseek-chat';
    } catch (e) {
      // No tirar 500 al cliente: log y respuesta de fallback
      console.error('[chat][deepseek] error:', e);
    }

    if (esPrimerMensaje) {
      const saludo = `¡Hola! 👋 Soy ${salon.agenteNombre}, la recepcionista de ${salon.nombre}. ¿Cómo te llamas?`;
      reply = `${saludo}\n\n${reply}`;
    }

    // INSERT mensaje OUT (con métricas LLM si hubo respuesta del modelo)
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

    return NextResponse.json({ reply, session_id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Evita pre-render estático en build
export const dynamic = 'force-dynamic';
