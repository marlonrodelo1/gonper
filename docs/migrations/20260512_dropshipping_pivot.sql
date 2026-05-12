-- ============================================================
-- Migración: pivote al modelo dropshipping puro.
--
-- Cambio de modelo de negocio (sesión 2026-05-12):
--   - Rogotech (Marlon) es vendedor legal al cliente final.
--   - La marca envía directo al cliente (Wella estilo).
--   - El salón solo activa/desactiva productos en su tienda con un
--     switch. NO toca precio, NO pide stock, NO gestiona logística.
--   - El cliente compra en /s/[slug]/tienda, paga al Stripe de Marlon.
--   - Stripe reparte automáticamente al Connect del salón el % de
--     comisión configurado en la marca (transfer_data del PaymentIntent).
--   - Marlon le paga a la marca por su lado (semanal/mensual).
--
-- Lo que pasa con el modelo anterior:
--   - `pedidos_b2b`, `pedidos_b2b_items`, `stock_salon` quedan
--     DEPRECATED — no se borran para no perder histórico, pero ya
--     no se escriben ni se leen desde el código nuevo.
--   - `productos.precio_mayorista_eur` ya no se usa (queda en BD).
--   - `marcas.comision_porcentaje` ya no se usa (queda en BD).
--   - `ventas_b2c.comision_gestori_eur` cambia semántica: ahora es la
--     parte que se queda Gestori, no la que se le restaba al salón.
--     Se añaden columnas más claras.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. marcas: comisión que se queda el salón cuando vende un producto
--    de esa marca en su tienda pública.
-- ------------------------------------------------------------
alter table public.marcas
  add column if not exists comision_salon_porcentaje numeric(5,2)
  not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'marcas_comision_salon_porcentaje_check'
  ) then
    alter table public.marcas
      add constraint marcas_comision_salon_porcentaje_check
      check (comision_salon_porcentaje >= 0 and comision_salon_porcentaje <= 100);
  end if;
end$$;

-- ------------------------------------------------------------
-- 2. productos_salon: qué productos tiene cada salón activos en su
--    tienda pública. Reemplaza el uso operativo de `stock_salon`.
-- ------------------------------------------------------------
create table if not exists public.productos_salon (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salones(id) on delete cascade,
  producto_id uuid not null references public.productos(id) on delete cascade,
  activo boolean not null default true,
  activado_at timestamptz not null default now(),
  desactivado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (salon_id, producto_id)
);

create index if not exists idx_productos_salon_salon_activo
  on public.productos_salon (salon_id)
  where activo = true;
create index if not exists idx_productos_salon_producto
  on public.productos_salon (producto_id);

alter table public.productos_salon enable row level security;

drop policy if exists "productos_salon_tenant_isolation" on public.productos_salon;
create policy "productos_salon_tenant_isolation"
  on public.productos_salon
  for all
  using (auth_user_owns_salon(salon_id));

-- ------------------------------------------------------------
-- 3. ventas_b2c: dos columnas nuevas para reflejar el reparto real.
-- ------------------------------------------------------------
-- `comision_salon_eur`: lo que recibe el salón vía Stripe transfer.
-- `coste_marca_eur`: lo que Marlon tiene que pagarle a la marca.
-- Diferencia con `comision_gestori_eur` (vieja): ya no se usa para
-- restar al salón. Se queda con sentido legacy = 0 hasta refactor.
alter table public.ventas_b2c
  add column if not exists comision_salon_eur numeric(10,2)
  not null default 0;
alter table public.ventas_b2c
  add column if not exists coste_marca_eur numeric(10,2)
  not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ventas_b2c_comision_salon_check'
  ) then
    alter table public.ventas_b2c
      add constraint ventas_b2c_comision_salon_check
      check (comision_salon_eur >= 0 and comision_salon_eur <= total_eur);
  end if;
end$$;

-- ------------------------------------------------------------
-- 4. ventas_b2c.estado: añadir 'pendiente_tramitar_marca' y
--    'tramitada_marca' para que admin controle el flujo con Wella.
--    El check actual no acepta valores nuevos, lo recreamos.
-- ------------------------------------------------------------
alter table public.ventas_b2c
  drop constraint if exists ventas_b2c_estado_check;

alter table public.ventas_b2c
  add constraint ventas_b2c_estado_check
  check (estado in (
    'pendiente_pago',
    'pendiente_pago_efectivo',
    'pagada',
    'pendiente_tramitar_marca',
    'tramitada_marca',
    'lista_recogida',
    'recogida',
    'cancelada',
    'reembolsada'
  ));

commit;

-- ============================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================================
-- 1. Columnas nuevas:
--   select column_name from information_schema.columns
--   where table_name='marcas' and column_name='comision_salon_porcentaje';
--   → 1 fila
--
--   select column_name from information_schema.columns
--   where table_name='ventas_b2c'
--     and column_name in ('comision_salon_eur','coste_marca_eur');
--   → 2 filas
--
-- 2. Tabla productos_salon existe y con RLS:
--   select tablename, rowsecurity from pg_tables
--   where tablename='productos_salon';
--   → rowsecurity=true
--
-- 3. Check de estado venta actualizado:
--   select pg_get_constraintdef(oid)
--   from pg_constraint
--   where conname='ventas_b2c_estado_check';
