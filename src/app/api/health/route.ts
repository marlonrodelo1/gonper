import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';

import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/health
 *
 * Health check público para Dokploy / monitoring externo.
 * - 200 OK con `{ ok: true, db: 'up' }` si la app y la BD responden.
 * - 503 con `{ ok: false }` si la BD no responde en 3 s.
 *
 * No expone información sensible: sólo el estado.
 */
export async function GET() {
  const start = Date.now();
  try {
    const result = (await Promise.race([
      db.execute(sql`select 1 as ok`),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('db timeout')), 3000),
      ),
    ])) as unknown;

    void result;

    return NextResponse.json({
      ok: true,
      db: 'up',
      latencyMs: Date.now() - start,
      ts: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    return NextResponse.json(
      {
        ok: false,
        db: 'down',
        error: msg,
        ts: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
