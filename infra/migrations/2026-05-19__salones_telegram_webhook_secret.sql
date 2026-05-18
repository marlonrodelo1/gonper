-- Migración 2026-05-19: soporte para webhooks Telegram directos a Next.js
-- (sustituye al orquestador n8n).
--
-- 1) Añade `salones.telegram_webhook_secret`: cada salón guarda el secret
--    que Telegram envía en el header `X-Telegram-Bot-Api-Secret-Token` de
--    cada update, para que el endpoint `/api/telegram/[bot_username]`
--    pueda autenticar la llamada. Lo genera el server al hacer setWebhook
--    desde /panel/config/bot (random 32 bytes hex).
--
-- 2) Amplía el CHECK constraint de `agente_sesiones.surface` para incluir
--    `admin_telegram` (Royce hablando con Marlon por Telegram). Antes solo
--    permitía landing, marketplace, admin_test.
--
-- Idempotente: ambas operaciones usan `if not exists` / drop+create.

-- 1) salones.telegram_webhook_secret
alter table salones
  add column if not exists telegram_webhook_secret text;

-- 2) Ampliar enum de surface en agente_sesiones
alter table agente_sesiones
  drop constraint if exists agente_sesiones_surface_check;
alter table agente_sesiones
  add constraint agente_sesiones_surface_check
  check (surface in ('landing','marketplace','admin_test','admin_telegram'));
