-- Migración 2026-05-19 (segunda): separar el recordatorio email del recordatorio Telegram.
--
-- Hasta hoy `citas.recordatorio_enviado_at` marcaba "ya se envió un recordatorio"
-- sin distinguir canal. Pasamos a 2 columnas independientes con ventanas distintas:
--   - recordatorio_email_enviado_at    → email al cliente, 2h antes
--   - recordatorio_telegram_enviado_at → Telegram al dueño + botón WhatsApp, 1h antes
--
-- Estrategia:
--   1) Renombramos `recordatorio_enviado_at` → `recordatorio_telegram_enviado_at`
--      (preserva la data histórica: lo que estaba marcado era el Telegram al dueño)
--   2) Añadimos `recordatorio_email_enviado_at` (nullable, sin backfill — para
--      citas pasadas asumimos que no se envió email, no pasa nada)
--   3) Renombramos el índice parcial `idx_citas_recordatorio` para que su nombre
--      refleje el nuevo significado.

-- 1) Renombrar columna existente
alter table citas
  rename column recordatorio_enviado_at to recordatorio_telegram_enviado_at;

-- 2) Añadir columna nueva
alter table citas
  add column if not exists recordatorio_email_enviado_at timestamptz;

-- 3) Renombrar el índice parcial existente. El índice antes era
--    `idx_citas_pendiente_recordatorio` con
--    `where estado='pendiente' and recordatorio_enviado_at is null`.
--    PostgreSQL no auto-renombra el índice al renombrar la columna, pero la
--    condición sí se actualiza para apuntar a la nueva columna.
do $$
begin
  if exists (select 1 from pg_indexes where indexname = 'idx_citas_pendiente_recordatorio') then
    alter index idx_citas_pendiente_recordatorio rename to idx_citas_recordatorio_telegram;
  end if;
end$$;

-- 4) Índice parcial nuevo para el email (mismo patrón: solo filas elegibles para recordatorio)
create index if not exists idx_citas_recordatorio_email
  on citas (inicio)
  where estado = 'pendiente' and recordatorio_email_enviado_at is null;
