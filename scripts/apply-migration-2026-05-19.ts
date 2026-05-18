/**
 * Aplica la migración 2026-05-19 (telegram_webhook_secret + ampliar
 * check de agente_sesiones.surface) sobre la DATABASE_URL configurada
 * en .env.local. Idempotente.
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/apply-migration-2026-05-19.ts
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';

const SQL_PATH = join(
  process.cwd(),
  'infra',
  'migrations',
  '2026-05-19__salones_telegram_webhook_secret.sql',
);

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Falta DATABASE_URL en el entorno');
    process.exit(1);
  }
  const sql = readFileSync(SQL_PATH, 'utf8');
  const client = postgres(url, { max: 1, prepare: false });

  console.log('Aplicando migración 2026-05-19 a gomper-prod…');
  try {
    await client.unsafe(sql);

    // Verificación: la columna existe y el constraint admite admin_telegram.
    const [{ exists_col }] = await client<{ exists_col: boolean }[]>`
      select exists(
        select 1 from information_schema.columns
        where table_schema='public'
          and table_name='salones'
          and column_name='telegram_webhook_secret'
      ) as exists_col
    `;
    const [{ check_def }] = await client<{ check_def: string }[]>`
      select pg_get_constraintdef(c.oid) as check_def
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      where t.relname = 'agente_sesiones'
        and c.conname = 'agente_sesiones_surface_check'
    `;

    console.log(`  salones.telegram_webhook_secret existe → ${exists_col}`);
    console.log(`  agente_sesiones_surface_check → ${check_def}`);

    if (!exists_col || !check_def.includes('admin_telegram')) {
      console.error('❌ Verificación falló');
      process.exit(1);
    }
    console.log('✅ Migración aplicada correctamente.');
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error('Error fatal:', err);
  process.exit(1);
});
