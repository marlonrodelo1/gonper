import { NextResponse } from 'next/server';

import { requireApiToken } from '@/lib/api/auth';
import {
  cancelarCita,
  getCitasHoy,
  getCitasProximas,
  getIngresos,
  getNoShows,
  getTopClientes,
  marcarCita,
  moverCita,
} from '@/lib/admin/tools';

/**
 * POST /api/v1/admin/tool
 *
 * Único endpoint dispatcher que ejecuta una tool admin sobre el salón
 * indicado. Pensado para que los workflows n8n (Bot Telegram modo dueño,
 * Juanita Pro panel) lo invoquen con tool/function calling.
 *
 * Body:
 *   { salon_id, tool, args? }
 *
 * Auth: bearer INTERNAL_API_TOKEN.
 *
 * Tools disponibles:
 *   citas_hoy            args: {}
 *   citas_proximas       args: { dias?: number }
 *   top_clientes         args: { limite?: number }
 *   no_shows             args: { dias?: number }
 *   ingresos             args: { periodo?: 'hoy'|'semana'|'mes' }
 *   cancelar_cita        args: { cita_id, motivo? }
 *   mover_cita           args: { cita_id, nuevo_inicio_iso }
 *   marcar_cita          args: { cita_id, estado: 'no_show'|'completada'|'confirmada' }
 */
export async function POST(req: Request) {
  const authError = requireApiToken(req);
  if (authError) return authError;

  let body: { salon_id?: unknown; tool?: unknown; args?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const salonId = typeof body.salon_id === 'string' ? body.salon_id.trim() : '';
  const tool = typeof body.tool === 'string' ? body.tool.trim() : '';
  const args = (body.args && typeof body.args === 'object'
    ? (body.args as Record<string, unknown>)
    : {}) as Record<string, unknown>;

  if (!salonId) {
    return NextResponse.json({ error: 'salon_id requerido' }, { status: 400 });
  }
  if (!tool) {
    return NextResponse.json({ error: 'tool requerido' }, { status: 400 });
  }

  try {
    let result: unknown;
    switch (tool) {
      case 'citas_hoy':
        result = await getCitasHoy(salonId);
        break;
      case 'citas_proximas': {
        const dias = typeof args.dias === 'number' ? args.dias : 7;
        result = await getCitasProximas(salonId, dias);
        break;
      }
      case 'top_clientes': {
        const limite = typeof args.limite === 'number' ? args.limite : 5;
        result = await getTopClientes(salonId, limite);
        break;
      }
      case 'no_shows': {
        const dias = typeof args.dias === 'number' ? args.dias : 30;
        result = await getNoShows(salonId, dias);
        break;
      }
      case 'ingresos': {
        const periodo =
          args.periodo === 'semana' || args.periodo === 'mes' ? args.periodo : 'hoy';
        result = await getIngresos(salonId, periodo as 'hoy' | 'semana' | 'mes');
        break;
      }
      case 'cancelar_cita': {
        const citaId = typeof args.cita_id === 'string' ? args.cita_id : '';
        const motivo = typeof args.motivo === 'string' ? args.motivo : undefined;
        if (!citaId) {
          return NextResponse.json({ error: 'cita_id requerido' }, { status: 400 });
        }
        result = await cancelarCita(salonId, citaId, motivo);
        break;
      }
      case 'mover_cita': {
        const citaId = typeof args.cita_id === 'string' ? args.cita_id : '';
        const nuevoInicio =
          typeof args.nuevo_inicio_iso === 'string' ? args.nuevo_inicio_iso : '';
        if (!citaId || !nuevoInicio) {
          return NextResponse.json(
            { error: 'cita_id y nuevo_inicio_iso requeridos' },
            { status: 400 },
          );
        }
        result = await moverCita(salonId, citaId, nuevoInicio);
        break;
      }
      case 'marcar_cita': {
        const citaId = typeof args.cita_id === 'string' ? args.cita_id : '';
        const estado = args.estado;
        if (!citaId) {
          return NextResponse.json({ error: 'cita_id requerido' }, { status: 400 });
        }
        if (estado !== 'no_show' && estado !== 'completada' && estado !== 'confirmada') {
          return NextResponse.json(
            { error: "estado debe ser 'no_show', 'completada' o 'confirmada'" },
            { status: 400 },
          );
        }
        result = await marcarCita(salonId, citaId, estado);
        break;
      }
      default:
        return NextResponse.json({ error: `Tool '${tool}' no existe` }, { status: 400 });
    }

    return NextResponse.json({ ok: true, tool, result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno';
    console.error(`[admin/tool:${tool}]`, e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
