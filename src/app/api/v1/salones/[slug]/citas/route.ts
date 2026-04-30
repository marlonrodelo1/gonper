import { NextResponse } from 'next/server';
import { z } from 'zod';
import { and, eq, gte, lte, desc } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  salones,
  servicios,
  profesionales,
  clientes,
  citas,
} from '@/lib/db/schema';
import { requireApiToken } from '@/lib/api/auth';

// ============================================================
// POST /api/v1/salones/[slug]/citas — crea una cita
// ============================================================
const postSchema = z.object({
  servicio_id: z.string().uuid(),
  profesional_id: z.string().uuid(),
  inicio: z.string().datetime({ offset: true }),
  cliente: z.object({
    telegram_id: z.union([z.string(), z.number()]).optional(),
    nombre: z.string().min(1),
    telefono: z.string().optional(),
  }),
  notas: z.string().optional(),
  origen: z.enum(['telegram', 'whatsapp', 'web']),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const authError = requireApiToken(request);
  if (authError) return authError;

  try {
    const { slug } = await params;
    const body = await request.json().catch(() => null);
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Body inválido', detalles: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = parsed.data;

    // Salón
    const [salon] = await db
      .select({ id: salones.id, activo: salones.activo })
      .from(salones)
      .where(eq(salones.slug, slug))
      .limit(1);
    if (!salon || !salon.activo) {
      return NextResponse.json({ error: 'Salón no encontrado' }, { status: 404 });
    }

    // Servicio
    const [serv] = await db
      .select({
        id: servicios.id,
        duracionMin: servicios.duracionMin,
        precioEur: servicios.precioEur,
      })
      .from(servicios)
      .where(
        and(
          eq(servicios.id, data.servicio_id),
          eq(servicios.salonId, salon.id),
        ),
      )
      .limit(1);
    if (!serv) {
      return NextResponse.json(
        { error: 'Servicio no encontrado en este salón' },
        { status: 400 },
      );
    }

    // Profesional
    const [prof] = await db
      .select({ id: profesionales.id })
      .from(profesionales)
      .where(
        and(
          eq(profesionales.id, data.profesional_id),
          eq(profesionales.salonId, salon.id),
        ),
      )
      .limit(1);
    if (!prof) {
      return NextResponse.json(
        { error: 'Profesional no encontrado en este salón' },
        { status: 400 },
      );
    }

    // Cliente: telegram_id → buscar/crear; si no, telefono → buscar/crear.
    let clienteId: string | null = null;
    const tgRaw = data.cliente.telegram_id;
    const telegramIdBig =
      tgRaw === undefined || tgRaw === null
        ? null
        : (() => {
            try {
              return BigInt(tgRaw as string | number);
            } catch {
              return null;
            }
          })();

    if (telegramIdBig !== null) {
      const [c] = await db
        .select({ id: clientes.id, nombre: clientes.nombre })
        .from(clientes)
        .where(
          and(
            eq(clientes.salonId, salon.id),
            eq(clientes.telegramId, telegramIdBig),
          ),
        )
        .limit(1);
      if (c) {
        clienteId = c.id;
        if (c.nombre !== data.cliente.nombre) {
          await db
            .update(clientes)
            .set({ nombre: data.cliente.nombre, updatedAt: new Date() })
            .where(eq(clientes.id, c.id));
        }
      } else {
        const [nuevo] = await db
          .insert(clientes)
          .values({
            salonId: salon.id,
            nombre: data.cliente.nombre,
            telefono: data.cliente.telefono ?? null,
            telegramId: telegramIdBig,
          })
          .returning({ id: clientes.id });
        clienteId = nuevo.id;
      }
    } else if (data.cliente.telefono) {
      const [c] = await db
        .select({ id: clientes.id, nombre: clientes.nombre })
        .from(clientes)
        .where(
          and(
            eq(clientes.salonId, salon.id),
            eq(clientes.telefono, data.cliente.telefono),
          ),
        )
        .limit(1);
      if (c) {
        clienteId = c.id;
        if (c.nombre !== data.cliente.nombre) {
          await db
            .update(clientes)
            .set({ nombre: data.cliente.nombre, updatedAt: new Date() })
            .where(eq(clientes.id, c.id));
        }
      } else {
        const [nuevo] = await db
          .insert(clientes)
          .values({
            salonId: salon.id,
            nombre: data.cliente.nombre,
            telefono: data.cliente.telefono,
          })
          .returning({ id: clientes.id });
        clienteId = nuevo.id;
      }
    } else {
      return NextResponse.json(
        { error: 'Cliente requiere telegram_id o telefono' },
        { status: 400 },
      );
    }

    const inicio = new Date(data.inicio);
    if (Number.isNaN(inicio.getTime())) {
      return NextResponse.json(
        { error: 'inicio inválido' },
        { status: 400 },
      );
    }
    const fin = new Date(inicio.getTime() + serv.duracionMin * 60_000);

    let citaId: string;
    try {
      const [nueva] = await db
        .insert(citas)
        .values({
          salonId: salon.id,
          clienteId: clienteId!,
          profesionalId: prof.id,
          servicioId: serv.id,
          inicio,
          fin,
          precioEur: serv.precioEur,
          estado: 'pendiente',
          origen: data.origen,
          notas: data.notas ?? null,
        })
        .returning({ id: citas.id });
      citaId = nueva.id;
    } catch (e) {
      const code =
        e && typeof e === 'object' && 'code' in e
          ? (e as { code?: string }).code
          : undefined;
      const msg = e instanceof Error ? e.message : 'Error al crear la cita';
      if (
        code === '23505' ||
        msg.toLowerCase().includes('idx_citas_no_solape')
      ) {
        return NextResponse.json(
          {
            error: 'El profesional ya tiene otra cita activa en ese horario',
            code: 'SLOT_OCUPADO',
          },
          { status: 409 },
        );
      }
      throw e;
    }

    // Devolver la cita con joins
    const [creada] = await db
      .select({
        id: citas.id,
        salonId: citas.salonId,
        inicio: citas.inicio,
        fin: citas.fin,
        precioEur: citas.precioEur,
        estado: citas.estado,
        origen: citas.origen,
        notas: citas.notas,
        servicio: {
          id: servicios.id,
          nombre: servicios.nombre,
          duracionMin: servicios.duracionMin,
          precioEur: servicios.precioEur,
        },
        profesional: {
          id: profesionales.id,
          nombre: profesionales.nombre,
        },
        cliente: {
          id: clientes.id,
          nombre: clientes.nombre,
          telefono: clientes.telefono,
          telegramId: clientes.telegramId,
        },
      })
      .from(citas)
      .innerJoin(servicios, eq(servicios.id, citas.servicioId))
      .innerJoin(profesionales, eq(profesionales.id, citas.profesionalId))
      .innerJoin(clientes, eq(clientes.id, citas.clienteId))
      .where(and(eq(citas.id, citaId), eq(citas.salonId, salon.id)))
      .limit(1);

    return NextResponse.json(
      {
        cita: {
          ...creada,
          cliente: creada.cliente
            ? {
                ...creada.cliente,
                telegramId: creada.cliente.telegramId
                  ? creada.cliente.telegramId.toString()
                  : null,
              }
            : null,
        },
      },
      { status: 201 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ============================================================
// GET /api/v1/salones/[slug]/citas — citas de un cliente
// ============================================================
const estadoCitaValues = [
  'pendiente',
  'confirmada',
  'cancelada',
  'no_show',
  'completada',
] as const;

const getSchema = z
  .object({
    cliente_telegram_id: z.string().optional(),
    cliente_id: z.string().uuid().optional(),
    desde: z.string().datetime({ offset: true }).optional(),
    hasta: z.string().datetime({ offset: true }).optional(),
    estado: z.enum(estadoCitaValues).optional(),
  })
  .refine((v) => !!v.cliente_telegram_id || !!v.cliente_id, {
    message: 'cliente_telegram_id o cliente_id es requerido',
  });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const authError = requireApiToken(request);
  if (authError) return authError;

  try {
    const { slug } = await params;
    const url = new URL(request.url);
    const parsed = getSchema.safeParse({
      cliente_telegram_id:
        url.searchParams.get('cliente_telegram_id') ?? undefined,
      cliente_id: url.searchParams.get('cliente_id') ?? undefined,
      desde: url.searchParams.get('desde') ?? undefined,
      hasta: url.searchParams.get('hasta') ?? undefined,
      estado: url.searchParams.get('estado') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parámetros inválidos', detalles: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const q = parsed.data;

    const [salon] = await db
      .select({ id: salones.id, activo: salones.activo })
      .from(salones)
      .where(eq(salones.slug, slug))
      .limit(1);
    if (!salon || !salon.activo) {
      return NextResponse.json({ error: 'Salón no encontrado' }, { status: 404 });
    }

    // Resolver clienteId
    let clienteId: string | null = null;
    if (q.cliente_id) {
      const [c] = await db
        .select({ id: clientes.id })
        .from(clientes)
        .where(
          and(eq(clientes.id, q.cliente_id), eq(clientes.salonId, salon.id)),
        )
        .limit(1);
      clienteId = c?.id ?? null;
    } else if (q.cliente_telegram_id) {
      let tg: bigint;
      try {
        tg = BigInt(q.cliente_telegram_id);
      } catch {
        return NextResponse.json(
          { error: 'cliente_telegram_id inválido' },
          { status: 400 },
        );
      }
      const [c] = await db
        .select({ id: clientes.id })
        .from(clientes)
        .where(and(eq(clientes.salonId, salon.id), eq(clientes.telegramId, tg)))
        .limit(1);
      clienteId = c?.id ?? null;
    }

    if (!clienteId) {
      return NextResponse.json({ citas: [] });
    }

    const desde = q.desde ? new Date(q.desde) : new Date();
    const hasta = q.hasta
      ? new Date(q.hasta)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const conds = [
      eq(citas.salonId, salon.id),
      eq(citas.clienteId, clienteId),
      gte(citas.inicio, desde),
      lte(citas.inicio, hasta),
    ];
    if (q.estado) conds.push(eq(citas.estado, q.estado));

    const rows = await db
      .select({
        id: citas.id,
        inicio: citas.inicio,
        fin: citas.fin,
        estado: citas.estado,
        precioEur: citas.precioEur,
        origen: citas.origen,
        notas: citas.notas,
        servicio: {
          id: servicios.id,
          nombre: servicios.nombre,
          duracionMin: servicios.duracionMin,
        },
        profesional: {
          id: profesionales.id,
          nombre: profesionales.nombre,
        },
        cliente: {
          id: clientes.id,
          nombre: clientes.nombre,
          telegramId: clientes.telegramId,
          telefono: clientes.telefono,
        },
      })
      .from(citas)
      .innerJoin(servicios, eq(servicios.id, citas.servicioId))
      .innerJoin(profesionales, eq(profesionales.id, citas.profesionalId))
      .innerJoin(clientes, eq(clientes.id, citas.clienteId))
      .where(and(...conds))
      .orderBy(desc(citas.inicio));

    return NextResponse.json({
      citas: rows.map((r) => ({
        ...r,
        cliente: {
          ...r.cliente,
          telegramId: r.cliente.telegramId
            ? r.cliente.telegramId.toString()
            : null,
        },
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
