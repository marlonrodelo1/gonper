import { NextResponse } from 'next/server';

import { listMarcasPublicas } from '@/lib/marcas/query';

/**
 * GET /api/public/marcas
 *
 * Lista pública de marcas activas. Consumido por la landing para
 * pintar el slider de marcas y opcionalmente por el agente Royce
 * cuando un visitante pregunta "qué marcas vendéis".
 */
export const revalidate = 300;

export async function GET() {
  try {
    const marcas = await listMarcasPublicas();
    return NextResponse.json({ marcas });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error interno';
    console.error('[api/public/marcas]', e);
    return NextResponse.json({ error: msg, marcas: [] }, { status: 500 });
  }
}
