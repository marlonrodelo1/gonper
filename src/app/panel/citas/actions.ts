'use server';

import { and, eq, inArray, lt, gt } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { db } from '@/lib/db';
import { citas, clientes, profesionales, servicios } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';

function s(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  return trimmed.length === 0 ? null : trimmed;
}

async function requireSalon(): Promise<{ id: string; timezone: string }> {
  const salon = (await getCurrentSalon()) as
    | { id: string; timezone?: string | null }
    | null;
  if (!salon) throw new Error('Sin salón asociado');
  return { id: salon.id, timezone: salon.timezone ?? 'Europe/Madrid' };
}

/**
 * Convierte una fecha local (YYYY-MM-DD) + hora (HH:MM) en una zona horaria IANA
 * a un Date UTC correcto. No usamos librerías externas: aprovechamos el truco de
 * formatear con Intl en la zona objetivo y calcular el offset.
 */
function fechaLocalATimestamp(
  fechaIso: string,
  horaHHMM: string,
  timezone: string,
): Date {
  const baseUtc = new Date(`${fechaIso}T${horaHHMM}:00Z`);
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(baseUtc).reduce<Record<string, string>>(
    (acc, p) => {
      if (p.type !== 'literal') acc[p.type] = p.value;
      return acc;
    },
    {},
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour === '24' ? '00' : parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  const diff = asUtc - baseUtc.getTime();
  return new Date(baseUtc.getTime() - diff);
}

/**
 * Parsea el valor de un input <input type="datetime-local"> ("YYYY-MM-DDTHH:mm")
 * usando la zona horaria del salón. Asumimos que el dueño está mirando el panel
 * desde la misma zona horaria del salón (caso normal).
 */
function parseInicioInput(
  raw: string,
  timezone: string,
): Date | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?$/.exec(raw);
  if (!m) return null;
  return fechaLocalATimestamp(m[1], m[2], timezone);
}

export async function crearCita(formData: FormData) {
  const { id: salonId, timezone } = await requireSalon();

  const servicioId = s(formData, 'servicio_id');
  const profesionalId = s(formData, 'profesional_id');
  const clienteIdRaw = s(formData, 'cliente_id');
  const clienteNombre = s(formData, 'cliente_nombre');
  const clienteTelefono = s(formData, 'cliente_telefono');
  const inicioRaw = s(formData, 'inicio');
  const notas = s(formData, 'notas');
  const confirmadaFlag = s(formData, 'confirmada');

  const fail = (msg: string) => {
    redirect('/panel/citas/nueva?error=' + encodeURIComponent(msg));
  };

  if (!servicioId) fail('Selecciona un servicio');
  if (!profesionalId) fail('Selecciona un profesional');
  if (!inicioRaw) fail('Indica la fecha y hora de inicio');

  // Resolver cliente: prioridad al cliente_id existente; si no, crear al vuelo.
  let clienteId: string;
  if (clienteIdRaw) {
    const [c] = await db
      .select({ id: clientes.id })
      .from(clientes)
      .where(and(eq(clientes.id, clienteIdRaw), eq(clientes.salonId, salonId)))
      .limit(1);
    if (!c) fail('Cliente no encontrado en este salón');
    clienteId = c!.id;
  } else if (clienteNombre) {
    try {
      const [c] = await db
        .insert(clientes)
        .values({
          salonId,
          nombre: clienteNombre,
          telefono: clienteTelefono,
        })
        .returning({ id: clientes.id });
      clienteId = c.id;
    } catch (e) {
      const code =
        e && typeof e === 'object' && 'code' in e
          ? (e as { code?: string }).code
          : undefined;
      if (code === '23505') {
        fail('Ya existe un cliente con ese teléfono en este salón');
      }
      const msg = e instanceof Error ? e.message : 'Error creando cliente';
      fail('No se pudo crear el cliente: ' + msg);
      return;
    }
  } else {
    fail('Selecciona un cliente existente o indica nombre y teléfono');
    return;
  }

  // Validar servicio (ownership + duración + precio).
  const [serv] = await db
    .select({
      id: servicios.id,
      nombre: servicios.nombre,
      duracionMin: servicios.duracionMin,
      precioEur: servicios.precioEur,
    })
    .from(servicios)
    .where(and(eq(servicios.id, servicioId!), eq(servicios.salonId, salonId)))
    .limit(1);
  if (!serv) fail('Servicio no encontrado en este salón');

  // Validar profesional (ownership) y obtener nombre para el mensaje de error.
  const [prof] = await db
    .select({ id: profesionales.id, nombre: profesionales.nombre })
    .from(profesionales)
    .where(
      and(
        eq(profesionales.id, profesionalId!),
        eq(profesionales.salonId, salonId),
      ),
    )
    .limit(1);
  if (!prof) fail('Profesional no encontrado en este salón');

  const inicio = parseInicioInput(inicioRaw!, timezone);
  if (!inicio || Number.isNaN(inicio.getTime())) fail('Fecha y hora inválidas');
  const fin = new Date(inicio!.getTime() + serv!.duracionMin * 60_000);

  // Pre-check de solape (cita activa que se cruce con [inicio, fin)).
  const solape = await db
    .select({ id: citas.id })
    .from(citas)
    .where(
      and(
        eq(citas.profesionalId, profesionalId!),
        inArray(citas.estado, ['pendiente', 'confirmada']),
        lt(citas.inicio, fin),
        gt(citas.fin, inicio!),
      ),
    )
    .limit(1);

  if (solape.length > 0) {
    fail(
      `Ya hay otra cita confirmada/pendiente con ${prof!.nombre} a esa hora`,
    );
  }

  const ahora = new Date();
  const estadoInicial = confirmadaFlag === 'on' ? 'confirmada' : 'pendiente';

  try {
    await db.insert(citas).values({
      salonId,
      clienteId,
      profesionalId: profesionalId!,
      servicioId: servicioId!,
      inicio: inicio!,
      fin,
      precioEur: serv!.precioEur,
      estado: estadoInicial,
      origen: 'manual',
      notas,
      confirmadaAt: estadoInicial === 'confirmada' ? ahora : null,
    });
  } catch (e) {
    const code =
      e && typeof e === 'object' && 'code' in e
        ? (e as { code?: string }).code
        : undefined;
    const msg = e instanceof Error ? e.message : 'Error al crear la cita';
    if (code === '23505' || msg.toLowerCase().includes('idx_citas_no_solape')) {
      fail(
        `Ya hay otra cita confirmada/pendiente con ${prof!.nombre} a esa hora`,
      );
    }
    fail(msg);
  }

  revalidatePath('/panel/hoy');
  revalidatePath('/panel/agenda');
  redirect('/panel/hoy');
}

async function ownedCita(id: string, salonId: string) {
  const [c] = await db
    .select({ id: citas.id })
    .from(citas)
    .where(and(eq(citas.id, id), eq(citas.salonId, salonId)))
    .limit(1);
  return c ?? null;
}

export async function confirmarCita(id: string) {
  const { id: salonId } = await requireSalon();
  if (!(await ownedCita(id, salonId))) return;

  await db
    .update(citas)
    .set({
      estado: 'confirmada',
      confirmadaAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(citas.id, id), eq(citas.salonId, salonId)));

  revalidatePath('/panel/hoy');
  revalidatePath('/panel/agenda');
  revalidatePath(`/panel/citas/${id}`);
}

export async function completarCita(id: string) {
  const { id: salonId } = await requireSalon();
  if (!(await ownedCita(id, salonId))) return;

  await db
    .update(citas)
    .set({
      estado: 'completada',
      updatedAt: new Date(),
    })
    .where(and(eq(citas.id, id), eq(citas.salonId, salonId)));

  revalidatePath('/panel/hoy');
  revalidatePath('/panel/agenda');
  revalidatePath(`/panel/citas/${id}`);
}

export async function marcarNoShow(id: string) {
  const { id: salonId } = await requireSalon();
  if (!(await ownedCita(id, salonId))) return;

  await db
    .update(citas)
    .set({
      estado: 'no_show',
      updatedAt: new Date(),
    })
    .where(and(eq(citas.id, id), eq(citas.salonId, salonId)));

  revalidatePath('/panel/hoy');
  revalidatePath('/panel/agenda');
  revalidatePath(`/panel/citas/${id}`);
}

export async function cancelarCita(id: string, motivo?: string) {
  const { id: salonId } = await requireSalon();
  if (!(await ownedCita(id, salonId))) return;

  const motivoLimpio =
    motivo && motivo.trim().length > 0 ? motivo.trim() : null;

  await db
    .update(citas)
    .set({
      estado: 'cancelada',
      canceladaAt: new Date(),
      canceladaPor: 'dueno',
      motivoCancelacion: motivoLimpio,
      updatedAt: new Date(),
    })
    .where(and(eq(citas.id, id), eq(citas.salonId, salonId)));

  revalidatePath('/panel/hoy');
  revalidatePath('/panel/agenda');
  revalidatePath(`/panel/citas/${id}`);
}

// Wrappers para usar como `action` directo de un <form action={...}> con un input hidden 'id'.
export async function confirmarCitaForm(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (id) await confirmarCita(id);
}
export async function completarCitaForm(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (id) await completarCita(id);
}
export async function marcarNoShowForm(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (id) await marcarNoShow(id);
}
