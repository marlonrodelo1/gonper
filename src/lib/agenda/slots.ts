/**
 * Cálculo de slots libres para reserva.
 *
 * Toma horario semanal del salón, cierres y citas existentes, y devuelve
 * los huecos disponibles para un servicio + profesional + fecha dada.
 *
 * Notas:
 * - "Slot" = fecha+hora UTC de inicio. La granularidad es 5 minutos por defecto.
 * - Solo se devuelven slots cuya ventana [inicio, inicio+duracion] cabe entera
 *   dentro de un tramo del horario y no solapa con cita activa o cierre.
 * - Citas con estado en `pendiente`/`confirmada` bloquean el slot.
 */

import { db } from '@/lib/db';
import { citas, cierres, horarios } from '@/lib/db/schema';
import { and, eq, gte, lt, lte, gt, inArray } from 'drizzle-orm';

export interface CalcularSlotsOptions {
  salonId: string;
  fecha: Date; // cualquier instante del día deseado, en cualquier zona
  duracionMin: number;
  profesionalId: string; // requerido — los slots son por profesional
  timezone?: string; // 'Europe/Madrid' por defecto
  granularidadMin?: number; // default 5
}

/**
 * Devuelve un array de Date (instantes UTC) representando inicios de slot disponibles.
 */
export async function calcularSlots(opts: CalcularSlotsOptions): Promise<Date[]> {
  const granularidad = opts.granularidadMin ?? 5;
  const tz = opts.timezone ?? 'Europe/Madrid';

  // 1. Día calendario en zona horaria del salón → diaSemana 0-6 (0=domingo)
  // Usamos formatToParts para extraer Y/M/D en la TZ destino.
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(opts.fecha).map((p) => [p.type, p.value]),
  );
  const yyyy = parts.year as string;
  const mm = parts.month as string;
  const dd = parts.day as string;
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const diaSemana = weekdayMap[parts.weekday as string];

  // 2. Cargar tramos del horario para ese día
  const tramos = await db
    .select()
    .from(horarios)
    .where(and(eq(horarios.salonId, opts.salonId), eq(horarios.diaSemana, diaSemana)));

  if (tramos.length === 0) return [];

  // 3. Definir inicio y fin del día en UTC (medianoche local del salón)
  const inicioDiaUtc = zonaToUtc(`${yyyy}-${mm}-${dd}T00:00`, tz);
  const finDiaUtc = new Date(inicioDiaUtc.getTime() + 24 * 60 * 60 * 1000);

  // 4. Cargar cierres que intersectan el día
  const cierresDia = await db
    .select()
    .from(cierres)
    .where(
      and(
        eq(cierres.salonId, opts.salonId),
        lt(cierres.fechaInicio, finDiaUtc),
        gt(cierres.fechaFin, inicioDiaUtc),
      ),
    );

  // 5. Cargar citas activas del profesional para el día
  const citasDia = await db
    .select({
      inicio: citas.inicio,
      fin: citas.fin,
    })
    .from(citas)
    .where(
      and(
        eq(citas.salonId, opts.salonId),
        eq(citas.profesionalId, opts.profesionalId),
        gte(citas.inicio, inicioDiaUtc),
        lt(citas.inicio, finDiaUtc),
        inArray(citas.estado, ['pendiente', 'confirmada']),
      ),
    );

  // 6. Para cada tramo del horario, generar candidatos cada `granularidad` min
  const slots: Date[] = [];
  for (const tramo of tramos) {
    // tramo.inicio y tramo.fin son strings 'HH:MM:SS' (postgres time)
    const tramoInicioUtc = zonaToUtc(`${yyyy}-${mm}-${dd}T${(tramo.inicio as string).slice(0, 5)}`, tz);
    const tramoFinUtc = zonaToUtc(`${yyyy}-${mm}-${dd}T${(tramo.fin as string).slice(0, 5)}`, tz);

    for (
      let t = tramoInicioUtc.getTime();
      t + opts.duracionMin * 60_000 <= tramoFinUtc.getTime();
      t += granularidad * 60_000
    ) {
      const slotInicio = new Date(t);
      const slotFin = new Date(t + opts.duracionMin * 60_000);

      // Filtrar: descartar si solapa con cierre
      if (cierresDia.some((c) => slotInicio < c.fechaFin && slotFin > c.fechaInicio)) {
        continue;
      }

      // Filtrar: descartar si solapa con cita activa
      if (citasDia.some((c) => slotInicio < c.fin && slotFin > c.inicio)) {
        continue;
      }

      slots.push(slotInicio);
    }
  }

  return slots;
}

/**
 * Convierte una fecha local en formato 'YYYY-MM-DDTHH:MM' (en zona TZ) a UTC.
 * Usa el offset implícito de la zona en ese instante (DST-aware).
 */
function zonaToUtc(localStr: string, tz: string): Date {
  // 1. Construir un Date como si fuera UTC con esos componentes
  const tentative = new Date(localStr + ':00.000Z');

  // 2. Obtener qué hora local representa ese UTC en la zona objetivo
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
  const parts = Object.fromEntries(
    fmt.formatToParts(tentative).map((p) => [p.type, p.value]),
  );
  const localAsTz = new Date(
    `${parts.year}-${parts.month}-${parts.day}T${parts.hour === '24' ? '00' : parts.hour}:${parts.minute}:${parts.second}.000Z`,
  );

  // 3. La diferencia entre tentative (asumido UTC) y localAsTz (UTC representando hora local en TZ) es el offset
  const offset = tentative.getTime() - localAsTz.getTime();
  return new Date(tentative.getTime() + offset);
}
