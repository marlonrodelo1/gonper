import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, asc, count, desc, eq, gte, ilike, lte, or, type SQL } from 'drizzle-orm';

import { db } from '@/lib/db';
import { salones } from '@/lib/db/schema';
import { requireApiToken } from '@/lib/api/auth';

/**
 * GET /api/v1/admin/salones
 *
 * Listado paginado de salones registrados en la plataforma. Pensado para
 * que el repo super-admin (admin.gonperstudio.shop) pueda revisar quién
 * está usando Gonper, en qué plan, y desde cuándo.
 *
 * Query params (todos opcionales):
 *   - q                 → búsqueda en nombre/slug/email (ilike)
 *   - plan              → trial|basico|solo|studio|pro|cancelado
 *   - activo            → true|false (booleano hard-delete soft)
 *   - tipo_negocio      → barberia|peluqueria|estetica|manicura|otro
 *   - marketplace       → visible|oculto|destacado
 *   - desde             → YYYY-MM-DD (filtra por created_at >= desde)
 *   - hasta             → YYYY-MM-DD (filtra por created_at < hasta+1d)
 *   - order             → recientes (default) | nombre | trial_pronto
 *   - page              → 1..N (default 1)
 *   - page_size         → 10..100 (default 50)
 *
 * Devuelve `{ salones, total, page, page_size }`.
 *
 * Auth: bearer INTERNAL_API_TOKEN.
 */

const QuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  plan: z
    .enum(['trial', 'basico', 'solo', 'studio', 'pro', 'cancelado'])
    .optional(),
  activo: z.enum(['true', 'false']).optional(),
  tipo_negocio: z
    .enum(['barberia', 'peluqueria', 'estetica', 'manicura', 'otro'])
    .optional(),
  marketplace: z.enum(['visible', 'oculto', 'destacado']).optional(),
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  order: z.enum(['recientes', 'nombre', 'trial_pronto']).default('recientes'),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(10).max(100).default(50),
});

export async function GET(req: Request) {
  const authError = requireApiToken(req);
  if (authError) return authError;

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse(
    Object.fromEntries(url.searchParams.entries()),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'query_invalida', detalles: parsed.error.issues },
      { status: 400 },
    );
  }
  const q = parsed.data;

  const conds: SQL[] = [];
  if (q.q) {
    const pattern = `%${q.q}%`;
    conds.push(
      // SQL booleano: alguna de las 3 columnas
      or(
        ilike(salones.nombre, pattern),
        ilike(salones.slug, pattern),
        ilike(salones.email, pattern),
      ) as SQL,
    );
  }
  if (q.plan) conds.push(eq(salones.plan, q.plan));
  if (q.activo) conds.push(eq(salones.activo, q.activo === 'true'));
  if (q.tipo_negocio) conds.push(eq(salones.tipoNegocio, q.tipo_negocio));
  if (q.marketplace === 'visible')
    conds.push(eq(salones.marketplaceVisible, true));
  if (q.marketplace === 'oculto')
    conds.push(eq(salones.marketplaceVisible, false));
  if (q.marketplace === 'destacado')
    conds.push(eq(salones.marketplaceDestacado, true));
  if (q.desde) conds.push(gte(salones.createdAt, new Date(`${q.desde}T00:00:00Z`)));
  if (q.hasta) {
    const fin = new Date(`${q.hasta}T00:00:00Z`);
    fin.setUTCDate(fin.getUTCDate() + 1);
    conds.push(lte(salones.createdAt, fin));
  }

  const whereClause = conds.length > 0 ? and(...conds) : undefined;

  const orderBy =
    q.order === 'nombre'
      ? [asc(salones.nombre)]
      : q.order === 'trial_pronto'
        ? [asc(salones.trialUntil), desc(salones.createdAt)]
        : [desc(salones.createdAt)];

  const offset = (q.page - 1) * q.page_size;

  const [rows, totals] = await Promise.all([
    db
      .select({
        id: salones.id,
        slug: salones.slug,
        nombre: salones.nombre,
        email: salones.email,
        telefono: salones.telefono,
        tipoNegocio: salones.tipoNegocio,
        ciudad: salones.ciudad,
        provincia: salones.provincia,
        plan: salones.plan,
        trialUntil: salones.trialUntil,
        stripeCustomerId: salones.stripeCustomerId,
        stripeSubscriptionId: salones.stripeSubscriptionId,
        stripeConnectOnboarded: salones.stripeConnectOnboarded,
        marketplaceVisible: salones.marketplaceVisible,
        marketplaceDestacado: salones.marketplaceDestacado,
        activo: salones.activo,
        telegramBotUsername: salones.telegramBotUsername,
        telegramChatIdDueno: salones.telegramChatIdDueno,
        createdAt: salones.createdAt,
        updatedAt: salones.updatedAt,
      })
      .from(salones)
      .where(whereClause)
      .orderBy(...orderBy)
      .limit(q.page_size)
      .offset(offset),
    db.select({ value: count() }).from(salones).where(whereClause),
  ]);

  const total = Number(totals[0]?.value ?? 0);

  return NextResponse.json({
    salones: rows,
    total,
    page: q.page,
    page_size: q.page_size,
    pages: Math.max(1, Math.ceil(total / q.page_size)),
  });
}

export const dynamic = 'force-dynamic';
