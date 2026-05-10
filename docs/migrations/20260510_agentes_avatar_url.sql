-- Avatar del agente (foto en lugar de inicial). Aplicada como migración
-- Supabase con name `agentes_avatar_url`.
alter table agentes add column if not exists avatar_url text;
