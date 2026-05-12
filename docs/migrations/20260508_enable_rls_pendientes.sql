-- ============================================================
-- Migración: habilitar RLS en las 6 tablas reportadas por el
-- Supabase Advisor como `rls_disabled_in_public`.
--
-- Patrón seguido (igual que el resto del schema):
--   - Tablas tenant-aware  → policy `tenant_isolation` con
--     `auth_user_owns_salon(salon_id)`.
--   - Tablas solo backend  → RLS ON + policy `using (false)`. El
--     service_role (admin client + DATABASE_URL/postgres role)
--     bypassea RLS, así que la app server-side sigue funcionando.
--
-- service_role y el rol `postgres` (Drizzle vía DATABASE_URL) hacen
-- BYPASS RLS por defecto. Solo afecta a `anon` y `authenticated`,
-- que son los roles expuestos vía PostgREST con la anon key.
--
-- IMPORTANTE: ejecutar en una sola transacción para evitar ventana
-- en la que la tabla quede sin policies y el cliente SSR rompa.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. usuarios_salon — vínculo usuario↔salón (tenant-aware con twist)
-- ------------------------------------------------------------
-- El SSR client (auth de un user normal) necesita leer SUS propias
-- filas porque `getCurrentSalon()` hace:
--   supabase.from('usuarios_salon').select('rol, salones(*)').eq('auth_user_id', user.id)
-- Para esa query el role es `authenticated` y RLS aplica.
--
-- Estrategia: policy SELECT que filtra por auth.uid() = auth_user_id.
-- Para ALL operations (insert/update/delete) → bloqueamos al user
-- normal; solo service_role (signup, admin) puede mutar.

alter table public.usuarios_salon enable row level security;

create policy "usuarios_salon_self_select"
  on public.usuarios_salon
  for select
  using (auth_user_id = auth.uid());

-- Mutaciones bloqueadas para anon/authenticated. service_role bypassea.
create policy "usuarios_salon_no_mutaciones"
  on public.usuarios_salon
  for all
  using (false)
  with check (false);

-- ------------------------------------------------------------
-- 2. leads — captura formulario landing + n8n
-- ------------------------------------------------------------
-- No hay código en src/ que lea/escriba esta tabla con anon key.
-- Las inserciones las hace n8n con service_role, y el dashboard
-- de admin las leerá vía Drizzle (DATABASE_URL → postgres role).
-- Bloqueamos todo desde anon/authenticated.

alter table public.leads enable row level security;

create policy "leads_service_role_only"
  on public.leads
  for all
  using (false)
  with check (false);

-- ------------------------------------------------------------
-- 3. rate_limits — contadores diarios
-- ------------------------------------------------------------
-- Solo se accede vía src/lib/api/rate-limit.ts (Drizzle/postgres,
-- bypass RLS). Bloqueamos cualquier acceso vía anon key.

alter table public.rate_limits enable row level security;

create policy "rate_limits_service_role_only"
  on public.rate_limits
  for all
  using (false)
  with check (false);

-- ------------------------------------------------------------
-- 4. stripe_events_processed — idempotencia webhook Stripe
-- ------------------------------------------------------------
-- Solo escribe el handler /api/stripe/webhook con Drizzle.
-- Sin uso desde anon/authenticated.

alter table public.stripe_events_processed enable row level security;

create policy "stripe_events_service_role_only"
  on public.stripe_events_processed
  for all
  using (false)
  with check (false);

-- ------------------------------------------------------------
-- 5. comparativas_antes_despues — galería pública (tenant-aware)
-- ------------------------------------------------------------
-- Se lee y escribe siempre vía Drizzle (server-side). Aun así, por
-- consistencia con galeria_imagenes/promociones/resenas/etc. usamos
-- el patrón estándar `tenant_isolation`.
--
-- Si en el futuro alguien consulta esta tabla desde el cliente con
-- anon key (web pública /s/[slug]), habrá que añadir una segunda
-- policy de SELECT pública. Hoy NO se hace, así que basta esta.

alter table public.comparativas_antes_despues enable row level security;

create policy "tenant_isolation"
  on public.comparativas_antes_despues
  for all
  using (auth_user_owns_salon(salon_id));

-- ------------------------------------------------------------
-- 6. admin_users — super admins de la plataforma
-- ------------------------------------------------------------
-- Tabla muy sensible: enumerar super admins. Se consulta solo desde
-- src/lib/auth/super-admin.ts vía Drizzle. Bloqueamos anon/authenticated.

alter table public.admin_users enable row level security;

create policy "admin_users_service_role_only"
  on public.admin_users
  for all
  using (false)
  with check (false);

commit;

-- ============================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================================
-- Ejecutar después del commit y comprobar que devuelve 6 filas
-- todas con rls_enabled = true:
--
--   select tablename, rowsecurity as rls_enabled
--   from pg_tables
--   where schemaname = 'public'
--     and tablename in (
--       'usuarios_salon','leads','rate_limits',
--       'stripe_events_processed','comparativas_antes_despues','admin_users'
--     );
--
-- Y que el advisor ya no reporte rls_disabled_in_public:
--   (re-ejecutar `mcp__supabase__get_advisors` tipo security)
