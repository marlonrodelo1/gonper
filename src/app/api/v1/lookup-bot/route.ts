import { NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { salones, servicios, profesionales } from '@/lib/db/schema';
import { requireApiToken } from '@/lib/api/auth';

/**
 * GET /api/v1/lookup-bot?slug=...
 *   o /api/v1/lookup-bot?bot_username=...
 *
 * Devuelve la configuración completa de un salón (datos generales, agente,
 * servicios activos, profesionales activos, telegram_bot_token, etc.) para que
 * un workflow multi-tenant en n8n pueda atender a clientes de cualquier salón
 * usando un único flujo. Es el primer nodo del flujo del bot.
 *
 * Auth: bearer INTERNAL_API_TOKEN.
 */
export async function GET(request: Request) {
  const authError = requireApiToken(request);
  if (authError) return authError;

  try {
    const url = new URL(request.url);
    const slug = url.searchParams.get('slug') ?? undefined;
    const botUsername = url.searchParams.get('bot_username') ?? undefined;

    if (!slug && !botUsername) {
      return NextResponse.json(
        { error: 'Debes pasar ?slug= o ?bot_username=' },
        { status: 400 },
      );
    }

    // Buscar salón por slug (preferente) o por telegram_bot_username
    const filtros = slug
      ? [eq(salones.slug, slug)]
      : [eq(salones.telegramBotUsername, botUsername!)];

    const [salon] = await db
      .select()
      .from(salones)
      .where(and(...filtros))
      .limit(1);

    if (!salon || !salon.activo) {
      return NextResponse.json(
        { error: 'Salón no encontrado o inactivo' },
        { status: 404 },
      );
    }

    // Cargar servicios activos
    const servs = await db
      .select({
        id: servicios.id,
        nombre: servicios.nombre,
        duracion_min: servicios.duracionMin,
        precio_eur: servicios.precioEur,
        descripcion: servicios.descripcion,
        orden: servicios.orden,
      })
      .from(servicios)
      .where(and(eq(servicios.salonId, salon.id), eq(servicios.activo, true)))
      .orderBy(asc(servicios.orden), asc(servicios.nombre));

    // Cargar profesionales activos
    const profs = await db
      .select({
        id: profesionales.id,
        nombre: profesionales.nombre,
        color_hex: profesionales.colorHex,
        orden: profesionales.orden,
      })
      .from(profesionales)
      .where(
        and(
          eq(profesionales.salonId, salon.id),
          eq(profesionales.activo, true),
        ),
      )
      .orderBy(asc(profesionales.orden), asc(profesionales.nombre));

    // Texto plano de servicios para inyectar en el system prompt del LLM
    const serviciosLista = servs
      .map(
        (s) =>
          `- ${s.nombre} (${s.duracion_min} min, ${Number(s.precio_eur).toFixed(2)} €)`,
      )
      .join('\n');

    return NextResponse.json({
      salon: {
        id: salon.id,
        slug: salon.slug,
        nombre: salon.nombre,
        tipo_negocio: salon.tipoNegocio,
        direccion: salon.direccion,
        telefono: salon.telefono,
        email: salon.email,
        timezone: salon.timezone,
        plan: salon.plan,
        agente_nombre: salon.agenteNombre,
        agente_genero: salon.agenteGenero,
        agente_tono: salon.agenteTono,
        agente_bienvenida: salon.agenteBienvenida,
        // Tokens necesarios para que n8n responda con el bot del salón
        telegram_bot_token: salon.telegramBotToken,
        telegram_bot_username: salon.telegramBotUsername,
        telegram_bot_dueno_token: salon.telegramBotDuenoToken,
        telegram_chat_id_dueno: salon.telegramChatIdDueno,
      },
      servicios: servs,
      servicios_lista: serviciosLista,
      profesionales: profs,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
