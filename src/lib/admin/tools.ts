/**
 * Herramientas admin que Juanita Pro / Bot Telegram (modo dueño) pueden
 * llamar para responder preguntas o ejecutar acciones sobre el negocio del
 * salón. Cada función es una "tool" en el sentido de tool/function calling
 * de los LLMs.
 *
 * Todas reciben { salonId } para garantizar aislamiento multi-tenant.
 */

import { and, asc, desc, eq, gte, ilike, inArray, lt, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  citas,
  clientes,
  profesionales,
  servicios,
  salones,
} from '@/lib/db/schema';

// ============================================================
// Helpers
// ============================================================

function startOfTodayUtc(tz: string): Date {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const today = fmt.format(new Date());
  return zonaToUtc(`${today}T00:00`, tz);
}

function endOfTodayUtc(tz: string): Date {
  return new Date(startOfTodayUtc(tz).getTime() + 24 * 60 * 60 * 1000);
}

function startOfWeekUtc(tz: string): Date {
  const today = startOfTodayUtc(tz);
  const dow = new Date(today.toLocaleString('en-US', { timeZone: tz })).getDay();
  // Lunes como inicio de semana (Madrid)
  const diff = dow === 0 ? 6 : dow - 1;
  return new Date(today.getTime() - diff * 24 * 60 * 60 * 1000);
}

function startOfMonthUtc(tz: string): Date {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
  });
  const ym = fmt.format(new Date()); // YYYY-MM
  return zonaToUtc(`${ym}-01T00:00`, tz);
}

function zonaToUtc(localStr: string, tz: string): Date {
  const tentative = new Date(localStr + ':00.000Z');
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(tentative).map((p) => [p.type, p.value]));
  const localAsTz = new Date(
    `${parts.year}-${parts.month}-${parts.day}T${parts.hour === '24' ? '00' : parts.hour}:${parts.minute}:${parts.second}.000Z`,
  );
  const offset = tentative.getTime() - localAsTz.getTime();
  return new Date(tentative.getTime() + offset);
}

function fmtHora(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
  }).format(d);
}

function fmtFecha(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    timeZone: tz,
  }).format(d);
}

async function getTz(salonId: string): Promise<string> {
  const [s] = await db
    .select({ tz: salones.timezone })
    .from(salones)
    .where(eq(salones.id, salonId))
    .limit(1);
  return s?.tz ?? 'Europe/Madrid';
}

// ============================================================
// L1 · LECTURA
// ============================================================

export async function getCitasHoy(salonId: string) {
  const tz = await getTz(salonId);
  const desde = startOfTodayUtc(tz);
  const hasta = endOfTodayUtc(tz);

  const rows = await db
    .select({
      id: citas.id,
      inicio: citas.inicio,
      fin: citas.fin,
      estado: citas.estado,
      precio: citas.precioEur,
      origen: citas.origen,
      cliente: clientes.nombre,
      clienteTel: clientes.telefono,
      servicio: servicios.nombre,
      profesional: profesionales.nombre,
    })
    .from(citas)
    .innerJoin(clientes, eq(clientes.id, citas.clienteId))
    .innerJoin(servicios, eq(servicios.id, citas.servicioId))
    .innerJoin(profesionales, eq(profesionales.id, citas.profesionalId))
    .where(
      and(
        eq(citas.salonId, salonId),
        gte(citas.inicio, desde),
        lt(citas.inicio, hasta),
        inArray(citas.estado, ['pendiente', 'confirmada', 'completada']),
      ),
    )
    .orderBy(asc(citas.inicio));

  return {
    fecha: new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz }).format(new Date()),
    total: rows.length,
    citas: rows.map((r) => ({
      id: r.id,
      hora: fmtHora(r.inicio, tz),
      cliente: r.cliente,
      telefono: r.clienteTel,
      servicio: r.servicio,
      profesional: r.profesional,
      precio: Number(r.precio),
      estado: r.estado,
      origen: r.origen,
    })),
  };
}

export async function getCitasProximas(salonId: string, dias = 7) {
  const tz = await getTz(salonId);
  const desde = new Date();
  const hasta = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      id: citas.id,
      inicio: citas.inicio,
      estado: citas.estado,
      cliente: clientes.nombre,
      servicio: servicios.nombre,
      profesional: profesionales.nombre,
      precio: citas.precioEur,
    })
    .from(citas)
    .innerJoin(clientes, eq(clientes.id, citas.clienteId))
    .innerJoin(servicios, eq(servicios.id, citas.servicioId))
    .innerJoin(profesionales, eq(profesionales.id, citas.profesionalId))
    .where(
      and(
        eq(citas.salonId, salonId),
        gte(citas.inicio, desde),
        lt(citas.inicio, hasta),
        inArray(citas.estado, ['pendiente', 'confirmada']),
      ),
    )
    .orderBy(asc(citas.inicio))
    .limit(20);

  return {
    rango: `${dias} días`,
    total: rows.length,
    citas: rows.map((r) => ({
      id: r.id,
      cuando: `${fmtFecha(r.inicio, tz)} ${fmtHora(r.inicio, tz)}`,
      cliente: r.cliente,
      servicio: r.servicio,
      profesional: r.profesional,
      precio: Number(r.precio),
      estado: r.estado,
    })),
  };
}

export async function getTopClientes(salonId: string, limite = 5) {
  const rows = await db
    .select({
      clienteId: clientes.id,
      nombre: clientes.nombre,
      telefono: clientes.telefono,
      totalCitas: sql<number>`count(${citas.id})::int`,
      gastado: sql<string>`coalesce(sum(${citas.precioEur})::numeric, 0)`,
    })
    .from(citas)
    .innerJoin(clientes, eq(clientes.id, citas.clienteId))
    .where(
      and(
        eq(citas.salonId, salonId),
        inArray(citas.estado, ['confirmada', 'completada']),
      ),
    )
    .groupBy(clientes.id, clientes.nombre, clientes.telefono)
    .orderBy(desc(sql`count(${citas.id})`))
    .limit(limite);

  return {
    total: rows.length,
    clientes: rows.map((r) => ({
      nombre: r.nombre,
      telefono: r.telefono,
      total_citas: r.totalCitas,
      gastado_eur: Number(r.gastado),
    })),
  };
}

export async function getNoShows(salonId: string, dias = 30) {
  const tz = await getTz(salonId);
  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      id: citas.id,
      inicio: citas.inicio,
      cliente: clientes.nombre,
      telefono: clientes.telefono,
      servicio: servicios.nombre,
      precio: citas.precioEur,
    })
    .from(citas)
    .innerJoin(clientes, eq(clientes.id, citas.clienteId))
    .innerJoin(servicios, eq(servicios.id, citas.servicioId))
    .where(
      and(
        eq(citas.salonId, salonId),
        eq(citas.estado, 'no_show'),
        gte(citas.inicio, desde),
      ),
    )
    .orderBy(desc(citas.inicio))
    .limit(50);

  return {
    rango_dias: dias,
    total: rows.length,
    perdido_eur: rows.reduce((s, r) => s + Number(r.precio), 0),
    no_shows: rows.map((r) => ({
      id: r.id,
      cuando: `${fmtFecha(r.inicio, tz)} ${fmtHora(r.inicio, tz)}`,
      cliente: r.cliente,
      telefono: r.telefono,
      servicio: r.servicio,
      precio_eur: Number(r.precio),
    })),
  };
}

export async function getIngresos(
  salonId: string,
  periodo: 'hoy' | 'semana' | 'mes' = 'hoy',
) {
  const tz = await getTz(salonId);
  let desde: Date;
  let hasta: Date = new Date();
  if (periodo === 'hoy') {
    desde = startOfTodayUtc(tz);
    hasta = endOfTodayUtc(tz);
  } else if (periodo === 'semana') {
    desde = startOfWeekUtc(tz);
  } else {
    desde = startOfMonthUtc(tz);
  }

  const [row] = await db
    .select({
      total: sql<string>`coalesce(sum(${citas.precioEur})::numeric, 0)`,
      count: sql<number>`count(${citas.id})::int`,
    })
    .from(citas)
    .where(
      and(
        eq(citas.salonId, salonId),
        gte(citas.inicio, desde),
        lt(citas.inicio, hasta),
        inArray(citas.estado, ['confirmada', 'completada']),
      ),
    );

  return {
    periodo,
    citas_facturadas: row?.count ?? 0,
    total_eur: Number(row?.total ?? 0),
  };
}

// ============================================================
// L2 · ACCIONES
// ============================================================

export async function cancelarCita(
  salonId: string,
  citaId: string,
  motivo?: string,
) {
  const updated = await db
    .update(citas)
    .set({
      estado: 'cancelada',
      canceladaAt: new Date(),
      canceladaPor: 'dueno',
      motivoCancelacion: motivo ?? null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(citas.id, citaId),
        eq(citas.salonId, salonId),
        inArray(citas.estado, ['pendiente', 'confirmada']),
      ),
    )
    .returning({ id: citas.id });

  if (updated.length === 0) {
    return {
      ok: false,
      error: 'No se pudo cancelar (no existe, no es tuya, o ya estaba cancelada)',
    };
  }
  return { ok: true, cita_id: citaId };
}

export async function moverCita(
  salonId: string,
  citaId: string,
  nuevoInicioIso: string,
) {
  const nuevoInicio = new Date(nuevoInicioIso);
  if (isNaN(nuevoInicio.getTime())) {
    return { ok: false, error: 'Fecha inválida' };
  }

  // Calcular duración actual
  const [actual] = await db
    .select({ inicio: citas.inicio, fin: citas.fin })
    .from(citas)
    .where(and(eq(citas.id, citaId), eq(citas.salonId, salonId)))
    .limit(1);
  if (!actual) return { ok: false, error: 'Cita no encontrada' };

  const duracion = actual.fin.getTime() - actual.inicio.getTime();
  const nuevoFin = new Date(nuevoInicio.getTime() + duracion);

  try {
    const updated = await db
      .update(citas)
      .set({
        inicio: nuevoInicio,
        fin: nuevoFin,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(citas.id, citaId),
          eq(citas.salonId, salonId),
          inArray(citas.estado, ['pendiente', 'confirmada']),
        ),
      )
      .returning({ id: citas.id });

    if (updated.length === 0) {
      return { ok: false, error: 'No se pudo mover (estado no permite cambio)' };
    }
    return {
      ok: true,
      cita_id: citaId,
      nuevo_inicio: nuevoInicio.toISOString(),
    };
  } catch (e) {
    const code =
      e && typeof e === 'object' && 'code' in e
        ? String((e as { code?: unknown }).code)
        : '';
    if (code === '23505') {
      return { ok: false, error: 'Ya hay otra cita en ese horario para ese profesional' };
    }
    return { ok: false, error: 'Error al mover la cita' };
  }
}

export async function marcarCita(
  salonId: string,
  citaId: string,
  estado: 'no_show' | 'completada' | 'confirmada',
) {
  const updated = await db
    .update(citas)
    .set({ estado, updatedAt: new Date() })
    .where(and(eq(citas.id, citaId), eq(citas.salonId, salonId)))
    .returning({ id: citas.id });

  if (updated.length === 0) {
    return { ok: false, error: 'Cita no encontrada' };
  }
  return { ok: true, cita_id: citaId, nuevo_estado: estado };
}

// ============================================================
// L2 · CREAR CITA (desde el bot del dueño)
// ============================================================

export interface CrearCitaArgs {
  cliente_nombre: string;
  cliente_telefono?: string;
  cliente_email?: string;
  servicio_nombre: string;
  inicio_iso: string;
  profesional_nombre?: string;
}

export interface CrearCitaResult {
  ok: boolean;
  error?: string;
  mensaje?: string;
  cita_id?: string;
  cliente_id?: string;
  email_enviado?: boolean;
}

/**
 * Crea una cita rápida desde el bot del dueño ("agenda a María mañana 16h
 * corte"). Resuelve cliente por nombre+telefono (crea si no existe),
 * resuelve servicio y profesional por nombre (case-insensitive). Si solo
 * hay un profesional activo y no se especifica, se asigna automático.
 *
 * Devuelve un mensaje natural listo para el bot.
 */
export async function crearCita(
  salonId: string,
  args: CrearCitaArgs,
): Promise<CrearCitaResult> {
  const tz = await getTz(salonId);

  // 1) Validar y parsear fecha
  const inicio = new Date(args.inicio_iso);
  if (isNaN(inicio.getTime())) {
    return { ok: false, error: 'Fecha inválida (inicio_iso debe ser ISO 8601)' };
  }
  if (inicio.getTime() < Date.now() - 60_000) {
    return { ok: false, error: 'No puedo crear citas en el pasado' };
  }

  // 2) Resolver servicio por nombre (LIKE case-insensitive)
  const servicioLike = `%${args.servicio_nombre.trim()}%`;
  const serviciosCoincidentes = await db
    .select()
    .from(servicios)
    .where(
      and(
        eq(servicios.salonId, salonId),
        eq(servicios.activo, true),
        ilike(servicios.nombre, servicioLike),
      ),
    )
    .orderBy(asc(servicios.orden), asc(servicios.nombre))
    .limit(5);

  if (serviciosCoincidentes.length === 0) {
    return {
      ok: false,
      error: `No encontré ningún servicio que coincida con "${args.servicio_nombre}". Revisa el nombre o créalo en el panel.`,
    };
  }
  if (serviciosCoincidentes.length > 1) {
    const nombres = serviciosCoincidentes.map((s) => `"${s.nombre}"`).join(', ');
    return {
      ok: false,
      error: `Hay varios servicios que coinciden con "${args.servicio_nombre}": ${nombres}. Sé más específico.`,
    };
  }
  const servicio = serviciosCoincidentes[0];

  // 3) Resolver profesional
  let profesional: typeof profesionales.$inferSelect | null = null;
  if (args.profesional_nombre && args.profesional_nombre.trim() !== '') {
    const like = `%${args.profesional_nombre.trim()}%`;
    const candidatos = await db
      .select()
      .from(profesionales)
      .where(
        and(
          eq(profesionales.salonId, salonId),
          eq(profesionales.activo, true),
          ilike(profesionales.nombre, like),
        ),
      )
      .orderBy(asc(profesionales.orden), asc(profesionales.nombre))
      .limit(5);
    if (candidatos.length === 0) {
      return {
        ok: false,
        error: `No encontré ningún profesional llamado "${args.profesional_nombre}".`,
      };
    }
    if (candidatos.length > 1) {
      const nombres = candidatos.map((p) => `"${p.nombre}"`).join(', ');
      return {
        ok: false,
        error: `Hay varios profesionales con ese nombre: ${nombres}. Especifica cuál.`,
      };
    }
    profesional = candidatos[0];
  } else {
    // Auto-asignar si solo hay 1 profesional activo
    const todos = await db
      .select()
      .from(profesionales)
      .where(
        and(eq(profesionales.salonId, salonId), eq(profesionales.activo, true)),
      )
      .orderBy(asc(profesionales.orden), asc(profesionales.nombre))
      .limit(2);
    if (todos.length === 0) {
      return { ok: false, error: 'No hay profesionales activos en el salón.' };
    }
    if (todos.length > 1) {
      const nombres = todos.map((p) => `"${p.nombre}"`).join(', ');
      return {
        ok: false,
        error: `Hay varios profesionales activos (${nombres}). Indícame con cuál.`,
      };
    }
    profesional = todos[0];
  }

  // 4) Resolver / crear cliente
  const nombreLimpio = args.cliente_nombre.trim();
  if (!nombreLimpio) {
    return { ok: false, error: 'Falta el nombre del cliente' };
  }
  const telefono = args.cliente_telefono?.trim() || null;
  const email = args.cliente_email?.trim() || null;

  let clienteId: string;
  let clienteEmail: string | null = email;
  let clienteNombre = nombreLimpio;

  // Buscar primero por teléfono (más fiable). Si no hay teléfono, por nombre exacto.
  if (telefono) {
    const [existente] = await db
      .select()
      .from(clientes)
      .where(and(eq(clientes.salonId, salonId), eq(clientes.telefono, telefono)))
      .limit(1);
    if (existente) {
      clienteId = existente.id;
      clienteEmail = existente.email ?? email;
      clienteNombre = existente.nombre;
      // refresca nombre si vino distinto
      if (existente.nombre !== nombreLimpio || (email && !existente.email)) {
        await db
          .update(clientes)
          .set({
            nombre: nombreLimpio,
            ...(email && !existente.email ? { email } : {}),
            updatedAt: new Date(),
          })
          .where(eq(clientes.id, clienteId));
        clienteNombre = nombreLimpio;
        if (email && !existente.email) clienteEmail = email;
      }
    } else {
      const [nuevo] = await db
        .insert(clientes)
        .values({
          salonId,
          nombre: nombreLimpio,
          telefono,
          email,
        })
        .returning({ id: clientes.id });
      clienteId = nuevo.id;
    }
  } else {
    const [existente] = await db
      .select()
      .from(clientes)
      .where(
        and(
          eq(clientes.salonId, salonId),
          ilike(clientes.nombre, nombreLimpio),
        ),
      )
      .limit(1);
    if (existente) {
      clienteId = existente.id;
      clienteEmail = existente.email ?? email;
      clienteNombre = existente.nombre;
    } else {
      const [nuevo] = await db
        .insert(clientes)
        .values({
          salonId,
          nombre: nombreLimpio,
          email,
        })
        .returning({ id: clientes.id });
      clienteId = nuevo.id;
    }
  }

  const fin = new Date(inicio.getTime() + servicio.duracionMin * 60_000);

  // 5) Insertar cita (uniqueIndex idx_citas_no_solape protege solapes)
  let citaId: string;
  try {
    const [creada] = await db
      .insert(citas)
      .values({
        salonId,
        clienteId,
        profesionalId: profesional.id,
        servicioId: servicio.id,
        inicio,
        fin,
        precioEur: servicio.precioEur,
        estado: 'pendiente',
        origen: 'dueno',
      })
      .returning({ id: citas.id });
    citaId = creada.id;
  } catch (err: unknown) {
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code?: unknown }).code)
        : '';
    if (code === '23505') {
      return {
        ok: false,
        error: `${profesional.nombre} ya tiene otra cita a esa hora.`,
      };
    }
    throw err;
  }

  // 6) Email confirmación al cliente (best-effort)
  let emailEnviado = false;
  if (clienteEmail) {
    try {
      const [salon] = await db
        .select()
        .from(salones)
        .where(eq(salones.id, salonId))
        .limit(1);
      if (salon) {
        const { enviarConfirmacionReserva } = await import('@/lib/email/resend');
        const result = await enviarConfirmacionReserva({
          to: clienteEmail,
          citaId,
          clienteNombre,
          salonNombre: salon.nombre,
          salonSlug: salon.slug,
          salonDireccion: salon.direccion ?? null,
          salonTelefono: salon.telefono ?? null,
          inicioIso: inicio.toISOString(),
          servicioNombre: servicio.nombre,
          duracionMin: servicio.duracionMin,
          profesionalNombre: profesional.nombre,
          precioEur: servicio.precioEur,
          timezone: tz,
        });
        emailEnviado = result.ok;
      }
    } catch (err) {
      console.warn('[crearCita] email confirmación falló', err);
    }
  }

  // 7) Mensaje natural para el bot
  const fechaFmt = fmtFecha(inicio, tz);
  const horaFmt = fmtHora(inicio, tz);
  const precio = Number(servicio.precioEur);
  const precioTxt = precio > 0 ? ` · ${precio.toFixed(2)}€` : '';
  const mensaje = `✅ Cita creada para ${clienteNombre} el ${fechaFmt} a las ${horaFmt} · ${servicio.nombre}${precioTxt} · con ${profesional.nombre}${emailEnviado ? ' (email enviado)' : ''}.`;

  return {
    ok: true,
    cita_id: citaId,
    cliente_id: clienteId,
    email_enviado: emailEnviado,
    mensaje,
  };
}
