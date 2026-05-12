import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { marcas } from '@/lib/db/schema';
import { requireApiToken } from '@/lib/api/auth';

/**
 * GET    /api/v1/admin/marcas/[id]
 * PATCH  /api/v1/admin/marcas/[id]
 * DELETE /api/v1/admin/marcas/[id] — soft (activa=false). El DELETE físico
 *        está vetado para no romper FKs históricas con pedidos/ventas.
 */

const IdParam = z.string().uuid();

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = requireApiToken(req);
  if (authError) return authError;
  const { id } = await params;
  const parsed = IdParam.safeParse(id);
  if (!parsed.success) return NextResponse.json({ error: 'id inválido' }, { status: 400 });

  const [marca] = await db.select().from(marcas).where(eq(marcas.id, id)).limit(1);
  if (!marca) return NextResponse.json({ error: 'no_existe' }, { status: 404 });
  return NextResponse.json({ marca });
}

const PatchBody = z.object({
  nombre: z.string().trim().min(1).max(200).optional(),
  descripcion: z.string().max(2000).nullable().optional(),
  logo_url: z.string().url().max(500).nullable().optional(),
  web_url: z.string().url().max(500).nullable().optional(),
  contacto_email: z.string().email().max(200).nullable().optional(),
  contacto_telefono: z.string().max(40).nullable().optional(),
  /** Modelo dropshipping: % que recibe el salón. */
  comision_salon_porcentaje: z.number().min(0).max(100).optional(),
  /** Legacy, no se usa. */
  comision_porcentaje: z.number().min(0).max(100).optional(),
  /** Legacy, no se usa. */
  condiciones_b2b_minimo_eur: z.number().min(0).optional(),
  activa: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = requireApiToken(req);
  if (authError) return authError;
  const { id } = await params;
  if (!IdParam.safeParse(id).success) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 });
  }

  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
  const parsed = PatchBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Body inválido', detalles: parsed.error.issues }, { status: 400 });
  }
  const d = parsed.data;

  const update: Record<string, unknown> = {};
  if (d.nombre !== undefined) update.nombre = d.nombre;
  if (d.descripcion !== undefined) update.descripcion = d.descripcion;
  if (d.logo_url !== undefined) update.logoUrl = d.logo_url;
  if (d.web_url !== undefined) update.webUrl = d.web_url;
  if (d.contacto_email !== undefined) update.contactoEmail = d.contacto_email;
  if (d.contacto_telefono !== undefined) update.contactoTelefono = d.contacto_telefono;
  if (d.comision_salon_porcentaje !== undefined)
    update.comisionSalonPorcentaje = d.comision_salon_porcentaje.toFixed(2);
  if (d.comision_porcentaje !== undefined) update.comisionPorcentaje = d.comision_porcentaje.toFixed(2);
  if (d.condiciones_b2b_minimo_eur !== undefined) update.condicionesB2bMinimoEur = d.condiciones_b2b_minimo_eur.toFixed(2);
  if (d.activa !== undefined) update.activa = d.activa;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'sin_cambios' }, { status: 400 });
  }

  const [updated] = await db.update(marcas).set(update).where(eq(marcas.id, id)).returning();
  if (!updated) return NextResponse.json({ error: 'no_existe' }, { status: 404 });
  return NextResponse.json({ ok: true, marca: updated });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = requireApiToken(req);
  if (authError) return authError;
  const { id } = await params;
  if (!IdParam.safeParse(id).success) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 });
  }

  const [updated] = await db
    .update(marcas)
    .set({ activa: false })
    .where(eq(marcas.id, id))
    .returning({ id: marcas.id });

  if (!updated) return NextResponse.json({ error: 'no_existe' }, { status: 404 });
  return NextResponse.json({ ok: true, soft_deleted: true });
}

export const dynamic = 'force-dynamic';
