import { NextResponse } from 'next/server';
import { z } from 'zod';
import { asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { marcas } from '@/lib/db/schema';
import { requireApiToken } from '@/lib/api/auth';

/**
 * GET  /api/v1/admin/marcas → listado de marcas
 * POST /api/v1/admin/marcas → crear marca
 *
 * Consumido por el repo super-admin (admin.gestori.es).
 * Auth: bearer INTERNAL_API_TOKEN.
 */

export async function GET(req: Request) {
  const authError = requireApiToken(req);
  if (authError) return authError;

  const rows = await db
    .select()
    .from(marcas)
    .orderBy(asc(marcas.nombre));

  return NextResponse.json({ marcas: rows });
}

const CreateBody = z.object({
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/, 'Slug inválido (a-z, 0-9, guiones)'),
  nombre: z.string().trim().min(1).max(200),
  descripcion: z.string().max(2000).nullable().optional(),
  logo_url: z.string().url().max(500).nullable().optional(),
  web_url: z.string().url().max(500).nullable().optional(),
  contacto_email: z.string().email().max(200).nullable().optional(),
  contacto_telefono: z.string().max(40).nullable().optional(),
  comision_porcentaje: z.number().min(0).max(100).optional(),
  condiciones_b2b_minimo_eur: z.number().min(0).optional(),
  activa: z.boolean().optional(),
});

export async function POST(req: Request) {
  const authError = requireApiToken(req);
  if (authError) return authError;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }
  const parsed = CreateBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Body inválido', detalles: parsed.error.issues },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const existing = await db
    .select({ id: marcas.id })
    .from(marcas)
    .where(eq(marcas.slug, data.slug))
    .limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ error: 'slug_ya_existe' }, { status: 409 });
  }

  const [created] = await db
    .insert(marcas)
    .values({
      slug: data.slug,
      nombre: data.nombre,
      descripcion: data.descripcion ?? null,
      logoUrl: data.logo_url ?? null,
      webUrl: data.web_url ?? null,
      contactoEmail: data.contacto_email ?? null,
      contactoTelefono: data.contacto_telefono ?? null,
      comisionPorcentaje:
        data.comision_porcentaje !== undefined
          ? data.comision_porcentaje.toFixed(2)
          : undefined,
      condicionesB2bMinimoEur:
        data.condiciones_b2b_minimo_eur !== undefined
          ? data.condiciones_b2b_minimo_eur.toFixed(2)
          : undefined,
      activa: data.activa ?? undefined,
    })
    .returning();

  return NextResponse.json({ ok: true, marca: created }, { status: 201 });
}

export const dynamic = 'force-dynamic';
