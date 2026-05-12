-- ============================================================
-- Migración: categorías propias por marca + flag tipo_distribucion
-- en productos.
--
-- Contexto:
--   1. Hoy las "categorías" de producto son un enum hardcoded en
--      productos.categoria con 6 valores fijos
--      ('capilar','barba','unas','estetica','accesorio','otro').
--      Quedan como están — mantenemos esa columna para no romper
--      filtros existentes en /panel/catalogo y tienda pública.
--   2. Cada marca quiere poder definir sus propias categorías
--      (p. ej. Wella: 'Champús', 'Tratamientos', 'Styling'). Se añade
--      tabla `categorias_marca` con FK a marcas, y `productos` recibe
--      una columna opcional `categoria_marca_id` que apunta a una
--      categoría de la propia marca del producto.
--   3. Preparación modelo Wella (dropshipping): flag
--      `productos.tipo_distribucion` con default 'stock' que
--      conserva el flujo actual. Cuando se implemente Wella se
--      crearán productos con 'dropshipping' y se decidirá entonces
--      qué cambia (stock_salon, checkout B2C, webhook Stripe).
--
-- Servicio_role y el rol `postgres` (Drizzle vía DATABASE_URL)
-- bypassean RLS por defecto.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Tabla categorias_marca — categorías propias de cada marca
-- ------------------------------------------------------------
create table if not exists public.categorias_marca (
  id uuid primary key default gen_random_uuid(),
  marca_id uuid not null references public.marcas(id) on delete cascade,
  slug text not null,
  nombre text not null,
  orden integer not null default 0,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (marca_id, slug)
);

create index if not exists idx_categorias_marca_marca
  on public.categorias_marca (marca_id, orden);

alter table public.categorias_marca enable row level security;

create policy "categorias_marca_service_role_only"
  on public.categorias_marca
  for all
  using (false)
  with check (false);

-- ------------------------------------------------------------
-- 2. productos.categoria_marca_id (nullable, FK opcional)
-- ------------------------------------------------------------
alter table public.productos
  add column if not exists categoria_marca_id uuid
  references public.categorias_marca(id) on delete set null;

create index if not exists idx_productos_categoria_marca
  on public.productos (categoria_marca_id);

-- ------------------------------------------------------------
-- 3. productos.tipo_distribucion (default 'stock', preparación Wella)
-- ------------------------------------------------------------
alter table public.productos
  add column if not exists tipo_distribucion text not null default 'stock';

-- Check constraint condicional (idempotente)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'productos_tipo_distribucion_check'
  ) then
    alter table public.productos
      add constraint productos_tipo_distribucion_check
      check (tipo_distribucion in ('stock', 'dropshipping'));
  end if;
end$$;

create index if not exists idx_productos_tipo_distribucion
  on public.productos (tipo_distribucion);

commit;

-- ============================================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================================
-- 1. Tabla categorias_marca creada y con RLS:
--   select tablename, rowsecurity from pg_tables
--    where schemaname='public' and tablename='categorias_marca';
--
-- 2. Columnas nuevas en productos:
--   select column_name, data_type, column_default, is_nullable
--   from information_schema.columns
--   where table_schema='public' and table_name='productos'
--     and column_name in ('categoria_marca_id','tipo_distribucion');
--
-- 3. Todos los productos existentes quedan como 'stock':
--   select tipo_distribucion, count(*) from public.productos
--   group by tipo_distribucion;
