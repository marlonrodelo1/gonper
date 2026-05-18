-- ============================================================
-- Migración: pivote a modelo Farmasi (afiliado MLM).
--
-- Cambio de modelo de negocio (sesión 2026-05-18):
--   - Se elimina TODO el sistema B2B2C de productos con marcas
--     propias (Wella, dropshipping, tienda nativa). El usuario
--     decidió pivotar a un modelo más simple: cada salón es BI
--     Beauty Influencer de Farmasi bajo el sponsor de Marlon
--     (farmasi.es/marlonjoserodelo).
--   - El botón "Visitar tienda" del banner del salón ahora abre
--     farmasi.es/[username_del_salón] en nueva pestaña.
--   - Cero gestión de pedidos / stock / Stripe Connect en Gonper.
--     Las comisiones las cobra cada salón directamente de Farmasi
--     en su cuenta BI, y Marlon cobra residual MLM sobre toda la
--     red.
--
-- Riesgos aceptados explícitamente por el usuario:
--   1. Pérdida del único modelo donde Gonper cobraba margen propio.
--   2. Dependencia 100% de Farmasi (si cancelan cuenta BI, todos
--      los links se quedan sin tracking de comisión).
--   3. Destrucción del trabajo reciente (commit a0c5cb1 paginación
--      ventas-b2c + sesión 2026-05-17 gestión salones).
--
-- ⚠️ DESTRUCTIVO: ELIMINA 9 TABLAS Y SUS DATOS.
--    Ejecutar SOLO después de:
--    (a) backup completo de Supabase
--    (b) confirmar que NO hay salones reales vendiendo Wella
--    (c) confirmar que NO hay ventas_b2c con estado != cancelado
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Eliminar tablas B2B2C en orden (respetando FKs)
-- ------------------------------------------------------------

drop table if exists public.ventas_b2c_items cascade;
drop table if exists public.ventas_b2c cascade;
drop table if exists public.pedidos_b2b_items cascade;
drop table if exists public.pedidos_b2b cascade;
drop table if exists public.stock_salon cascade;
drop table if exists public.productos_salon cascade;
drop table if exists public.productos cascade;
drop table if exists public.categorias_marca cascade;
drop table if exists public.marcas cascade;

-- ------------------------------------------------------------
-- 2. Eliminar columnas de salones relacionadas con tienda B2C
-- ------------------------------------------------------------

alter table public.salones
  drop column if exists stripe_connect_account_id,
  drop column if exists stripe_connect_onboarded,
  drop column if exists tienda_acepta_pago_online,
  drop column if exists tienda_acepta_efectivo,
  drop column if exists tienda_coste_envio_eur,
  drop column if exists tienda_zona_envio;

-- ------------------------------------------------------------
-- 3. Añadir columnas Farmasi a salones
--    - farmasi_username: alias del salón en farmasi.es (ej. "juanjose")
--      → el botón "Visitar tienda" abre https://www.farmasi.es/[username]
--    - farmasi_activado_at: timestamp de cuándo lo activó el dueño
--      (para auditoría y posible analítica)
-- ------------------------------------------------------------

alter table public.salones
  add column if not exists farmasi_username text,
  add column if not exists farmasi_activado_at timestamp with time zone;

-- Validación básica del username (alfanumérico + guiones, 3-50 chars).
-- No restringe a null porque el campo es opcional (el salón puede no
-- haber activado Farmasi).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'salones_farmasi_username_check'
  ) then
    alter table public.salones
      add constraint salones_farmasi_username_check
      check (
        farmasi_username is null
        or farmasi_username ~ '^[a-zA-Z0-9_-]{3,50}$'
      );
  end if;
end$$;

-- Índice parcial para listar rápido los salones con Farmasi activo.
create index if not exists idx_salones_farmasi_activo
  on public.salones (farmasi_activado_at desc)
  where farmasi_username is not null;

commit;
