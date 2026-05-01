import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, asc, eq, gte, sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { mensajes, salones, servicios, horarios } from '@/lib/db/schema';

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

function getDiaActualEnTz(tz: string): number {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' });
  const w = fmt.format(new Date());
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[w] ?? new Date().getDay();
}

function formatPrecio(precioEur: string | number): string {
  const n = typeof precioEur === 'string' ? Number(precioEur) : precioEur;
  if (Number.isNaN(n)) return String(precioEur);
  return n.toFixed(2).replace(/\.00$/, '') + ' €';
}

// TODO: reemplazar con Gemini
async function generarRespuesta(
  salonId: string,
  salonNombre: string,
  agenteNombre: string,
  salonTelefono: string | null,
  timezone: string,
  mensaje: string,
): Promise<string> {
  const lower = mensaje.toLowerCase();

  // Reservas
  if (/(reservar|reserva|cita|hueco|huecos|disponibilidad)/.test(lower)) {
    return 'Genial. Para reservar, ve al calendario debajo y elige día y hora. Si te puedo ayudar con algo más, dime.';
  }

  // Precios
  if (/(precio|precios|cuánto cuesta|cuanto cuesta|tarifa|tarifas|coste)/.test(lower)) {
    const lista = await db
      .select({
        nombre: servicios.nombre,
        precioEur: servicios.precioEur,
        duracionMin: servicios.duracionMin,
      })
      .from(servicios)
      .where(and(eq(servicios.salonId, salonId), eq(servicios.activo, true)))
      .orderBy(asc(servicios.orden), asc(servicios.createdAt))
      .limit(20);

    if (lista.length === 0) {
      return 'Aún no tenemos servicios publicados. Cuéntame qué buscas y te oriento.';
    }
    const filas = lista
      .map((s) => `• ${s.nombre} — ${formatPrecio(s.precioEur)} (${s.duracionMin} min)`)
      .join('\n');
    return `Estos son nuestros servicios:\n${filas}`;
  }

  // Horarios
  if (/(horario|abierto|abierta|abren|abrís|abris|cerrado|cierran)/.test(lower)) {
    const tramos = await db
      .select()
      .from(horarios)
      .where(eq(horarios.salonId, salonId))
      .orderBy(asc(horarios.diaSemana), asc(horarios.inicio));

    if (tramos.length === 0) {
      return 'Aún no tenemos horarios publicados. Pregúntame por reservas y te ayudo.';
    }

    const porDia: Record<number, string[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    for (const t of tramos) {
      const ini = String(t.inicio).slice(0, 5);
      const fin = String(t.fin).slice(0, 5);
      porDia[t.diaSemana]?.push(`${ini}–${fin}`);
    }

    const lineas: string[] = [];
    for (let d = 1; d <= 6; d++) {
      const arr = porDia[d] ?? [];
      lineas.push(`${DIA_NOMBRES[d]}: ${arr.length ? arr.join(' · ') : 'cerrado'}`);
    }
    lineas.push(`${DIA_NOMBRES[0]}: ${porDia[0]?.length ? porDia[0].join(' · ') : 'cerrado'}`);

    const diaActual = getDiaActualEnTz(timezone);
    const hoyTramos = porDia[diaActual] ?? [];
    const hoyTexto = hoyTramos.length ? hoyTramos.join(' · ') : 'Cerrado';

    return `Estos son nuestros horarios:\n${lineas.join('\n')}\n\nHoy: ${hoyTexto}.`;
  }

  // Teléfono / llamar
  if (/(teléfono|telefono|llamar|llamada|móvil|movil|contacto)/.test(lower)) {
    if (salonTelefono) {
      return `Puedes llamarnos al ${salonTelefono}. También puedes escribirme por aquí.`;
    }
    return 'Aún no tenemos teléfono publicado, mejor escríbenos por aquí. ¿Cómo te puedo ayudar?';
  }

  // Saludo
  if (/(hola|buenas|hey|buenos días|buenos dias|buenas tardes|buenas noches)/.test(lower)) {
    return `¡Hola! Soy ${agenteNombre}, la recepcionista de ${salonNombre}. ¿En qué puedo ayudarte?`;
  }

  // Default
  return 'Cuéntame, ¿qué necesitas? Puedo ayudarte con precios, horarios o reservas.';
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

    const [salon] = await db
      .select({
        id: salones.id,
        nombre: salones.nombre,
        timezone: salones.timezone,
        telefono: salones.telefono,
        agenteNombre: salones.agenteNombre,
        activo: salones.activo,
      })
      .from(salones)
      .where(eq(salones.slug, slug))
      .limit(1);

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

    // Generar respuesta del agente (mock)
    let reply = await generarRespuesta(
      salon.id,
      salon.nombre,
      salon.agenteNombre,
      salon.telefono,
      salon.timezone || 'Europe/Madrid',
      message,
    );

    if (esPrimerMensaje) {
      const saludo = `¡Hola! 👋 Soy ${salon.agenteNombre}, la recepcionista de ${salon.nombre}. ¿Cómo te llamas?`;
      reply = `${saludo}\n\n${reply}`;
    }

    // INSERT mensaje OUT
    await db.insert(mensajes).values({
      salonId: salon.id,
      canal: 'web',
      direccion: 'out',
      contenido: reply,
      sessionId: session_id,
      webVisitorNombre: visitor_nombre ?? null,
      webVisitorTelefono: visitor_telefono ?? null,
    });

    return NextResponse.json({ reply, session_id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Evita pre-render estático en build
export const dynamic = 'force-dynamic';
