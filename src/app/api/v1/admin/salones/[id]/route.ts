import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, count, eq, gte, sum } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  citas,
  clientes,
  mensajes,
  productosSalon,
  resenas,
  salones,
  servicios,
  usuariosSalon,
  ventasB2c,
} from '@/lib/db/schema';
import { requireApiToken } from '@/lib/api/auth';

/**
 * GET   /api/v1/admin/salones/[id]   → detalle + stats agregadas
 * PATCH /api/v1/admin/salones/[id]   → modificar plan/activo/marketplace/trial
 *
 * Permite al super-admin (admin.gonperstudio.shop) ver el detalle de un
 * salón y hacer ajustes manuales sin pasar por Stripe Portal:
 *   - Cambiar plan (gracia, downgrade forzado, marcar test, etc.)
 *   - Activar / desactivar el salón (sin borrar datos)
 *   - Toggle marketplace visible (ocultar mientras se investiga algo)
 *   - Extender trial X días (regalo, error de cliente, etc.)
 *
 * Auth: bearer INTERNAL_API_TOKEN.
 */

const UUID = /^[0-9a-f-]{36}$/;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = requireApiToken(req);
  if (authError) return authError;

  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: 'id_invalido' }, { status: 400 });
  }

  const [salon] = await db
    .select()
    .from(salones)
    .where(eq(salones.id, id))
    .limit(1);

  if (!salon) {
    return NextResponse.json({ error: 'salon_no_existe' }, { status: 404 });
  }

  // Ventana de 30 días para stats recientes.
  const hace30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    usuarios,
    serviciosCount,
    clientesCount,
    citas30dRow,
    mensajes30dRow,
    resenasCount,
    productosActivosCount,
    ventas30dRow,
  ] = await Promise.all([
    db
      .select({
        authUserId: usuariosSalon.authUserId,
        rol: usuariosSalon.rol,
        createdAt: usuariosSalon.createdAt,
      })
      .from(usuariosSalon)
      .where(eq(usuariosSalon.salonId, id))
      .limit(20),
    db
      .select({ value: count() })
      .from(servicios)
      .where(eq(servicios.salonId, id)),
    db
      .select({ value: count() })
      .from(clientes)
      .where(eq(clientes.salonId, id)),
    db
      .select({
        total: count(),
        facturado: sum(citas.precioEur),
      })
      .from(citas)
      .where(and(eq(citas.salonId, id), gte(citas.inicio, hace30d))),
    db
      .select({ value: count() })
      .from(mensajes)
      .where(
        and(eq(mensajes.salonId, id), gte(mensajes.createdAt, hace30d)),
      ),
    db.select({ value: count() }).from(resenas).where(eq(resenas.salonId, id)),
    db
      .select({ value: count() })
      .from(productosSalon)
      .where(and(eq(productosSalon.salonId, id), eq(productosSalon.activo, true))),
    db
      .select({
        total: count(),
        facturado: sum(ventasB2c.totalEur),
        comisionSalon: sum(ventasB2c.comisionSalonEur),
      })
      .from(ventasB2c)
      .where(
        and(eq(ventasB2c.salonId, id), gte(ventasB2c.createdAt, hace30d)),
      ),
  ]);

  return NextResponse.json({
    salon,
    usuarios,
    stats: {
      servicios: Number(serviciosCount[0]?.value ?? 0),
      clientes: Number(clientesCount[0]?.value ?? 0),
      productosActivos: Number(productosActivosCount[0]?.value ?? 0),
      resenas: Number(resenasCount[0]?.value ?? 0),
      ultimos30Dias: {
        citas: Number(citas30dRow[0]?.total ?? 0),
        facturadoCitasEur: Number(citas30dRow[0]?.facturado ?? 0),
        mensajes: Number(mensajes30dRow[0]?.value ?? 0),
        ventasB2c: Number(ventas30dRow[0]?.total ?? 0),
        facturadoVentasEur: Number(ventas30dRow[0]?.facturado ?? 0),
        comisionSalonEur: Number(ventas30dRow[0]?.comisionSalon ?? 0),
      },
    },
  });
}

const PatchBody = z
  .object({
    /** Cambiar plan manualmente (gracia, downgrade, etc.). Si pasas 'trial'
     * sin extenderTrialDias, debe acompañarse de trial_until explícito o
     * extender_trial_dias. */
    plan: z
      .enum(['trial', 'basico', 'solo', 'studio', 'pro', 'cancelado'])
      .optional(),
    /** Soft-delete: false = ocultar el salón (web pública 404, panel
     * bloqueado, no cobra). True = volver a activarlo. */
    activo: z.boolean().optional(),
    /** Visibilidad en marketplace. */
    marketplace_visible: z.boolean().optional(),
    /** Toggle de destacado en el marketplace. */
    marketplace_destacado: z.boolean().optional(),
    /** Extender el trial X días desde HOY (regalo/disculpa). */
    extender_trial_dias: z.number().int().min(1).max(365).optional(),
    /** Forzar trial_until a una fecha concreta (ISO date YYYY-MM-DD). */
    trial_until: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    /** Notas internas del super admin (concat al config_json.adminNotas). */
    admin_notas: z.string().max(2000).optional(),
  })
  .refine(
    (d) =>
      d.plan !== undefined ||
      d.activo !== undefined ||
      d.marketplace_visible !== undefined ||
      d.marketplace_destacado !== undefined ||
      d.extender_trial_dias !== undefined ||
      d.trial_until !== undefined ||
      d.admin_notas !== undefined,
    { message: 'al_menos_un_campo_requerido' },
  );

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = requireApiToken(req);
  if (authError) return authError;

  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: 'id_invalido' }, { status: 400 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'json_invalido' }, { status: 400 });
  }

  const parsed = PatchBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'body_invalido', detalles: parsed.error.issues },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const [actual] = await db
    .select({ configJson: salones.configJson })
    .from(salones)
    .where(eq(salones.id, id))
    .limit(1);
  if (!actual) {
    return NextResponse.json({ error: 'salon_no_existe' }, { status: 404 });
  }

  const updateValues: Record<string, unknown> = { updatedAt: new Date() };

  if (d.plan !== undefined) updateValues.plan = d.plan;
  if (d.activo !== undefined) updateValues.activo = d.activo;
  if (d.marketplace_visible !== undefined)
    updateValues.marketplaceVisible = d.marketplace_visible;
  if (d.marketplace_destacado !== undefined) {
    updateValues.marketplaceDestacado = d.marketplace_destacado;
    if (!d.marketplace_destacado) {
      updateValues.marketplaceDestacadoOrden = null;
    }
  }

  if (d.extender_trial_dias !== undefined) {
    const nuevoTrial = new Date(
      Date.now() + d.extender_trial_dias * 24 * 60 * 60 * 1000,
    );
    updateValues.trialUntil = nuevoTrial;
    // Si extendemos trial, dejamos plan en 'trial' salvo que el caller pida otro.
    if (d.plan === undefined) updateValues.plan = 'trial';
  } else if (d.trial_until !== undefined) {
    updateValues.trialUntil =
      d.trial_until === null ? null : new Date(`${d.trial_until}T23:59:59Z`);
  }

  if (d.admin_notas !== undefined) {
    const existingJson =
      (actual.configJson as Record<string, unknown> | null) ?? {};
    const previas = Array.isArray(existingJson.adminNotas)
      ? (existingJson.adminNotas as Array<{ at: string; nota: string }>)
      : [];
    updateValues.configJson = {
      ...existingJson,
      adminNotas: [
        ...previas.slice(-49), // mantén las últimas 50
        { at: new Date().toISOString(), nota: d.admin_notas },
      ],
    };
  }

  const [updated] = await db
    .update(salones)
    .set(updateValues)
    .where(eq(salones.id, id))
    .returning({
      id: salones.id,
      slug: salones.slug,
      nombre: salones.nombre,
      plan: salones.plan,
      activo: salones.activo,
      marketplaceVisible: salones.marketplaceVisible,
      marketplaceDestacado: salones.marketplaceDestacado,
      trialUntil: salones.trialUntil,
      updatedAt: salones.updatedAt,
    });

  if (!updated) {
    return NextResponse.json({ error: 'no_actualizado' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, salon: updated });
}

export const dynamic = 'force-dynamic';
