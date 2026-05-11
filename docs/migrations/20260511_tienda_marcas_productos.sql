-- ============================================================
-- Tienda online B2B/B2C — catálogo central de marcas y productos.
-- Aplicada como migración Supabase con name `tienda_marcas_productos`.
--
-- Modelo:
--   marcas → productos (catálogo central, gestionado desde super-admin)
--   salon + producto → stock_salon (lo que el salón ya tiene físicamente)
--   pedidos_b2b: salón pide stock a la marca (notificación, sin pago)
--   ventas_b2c: cliente final compra al salón con Stripe Connect
-- ============================================================

-- marcas
create table if not exists marcas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nombre text not null,
  descripcion text,
  logo_url text,
  web_url text,
  contacto_email text,
  contacto_telefono text,
  comision_porcentaje numeric(5,2) not null default 15.00,
  condiciones_b2b_minimo_eur numeric(10,2) not null default 0,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marcas_comision_check check (comision_porcentaje >= 0 and comision_porcentaje <= 100),
  constraint marcas_minimo_check check (condiciones_b2b_minimo_eur >= 0)
);

create index if not exists idx_marcas_slug on marcas (slug);
create index if not exists idx_marcas_activa on marcas (activa) where activa = true;

-- productos
create table if not exists productos (
  id uuid primary key default gen_random_uuid(),
  marca_id uuid not null references marcas(id) on delete cascade,
  slug text not null,
  sku text,
  nombre text not null,
  descripcion text,
  categoria text not null,
  tipo_negocio_target text[] not null default '{}',
  imagenes jsonb not null default '[]'::jsonb,
  precio_mayorista_eur numeric(10,2) not null,
  precio_publico_recomendado_eur numeric(10,2) not null,
  unidad_medida text not null default 'unidad',
  peso_g integer,
  stock_disponible_marca integer,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint productos_marca_slug_unique unique (marca_id, slug),
  constraint productos_categoria_check check (categoria in ('capilar','barba','unas','estetica','accesorio','otro')),
  constraint productos_precio_mayorista_check check (precio_mayorista_eur >= 0),
  constraint productos_precio_publico_check check (precio_publico_recomendado_eur >= 0)
);

create index if not exists idx_productos_marca on productos (marca_id);
create index if not exists idx_productos_categoria on productos (categoria) where activo = true;
create index if not exists idx_productos_activo on productos (activo) where activo = true;

-- stock_salon
create table if not exists stock_salon (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salones(id) on delete cascade,
  producto_id uuid not null references productos(id) on delete restrict,
  cantidad_disponible integer not null default 0,
  precio_publico_eur numeric(10,2),
  activo_en_tienda_publica boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_salon_unique unique (salon_id, producto_id),
  constraint stock_salon_cantidad_check check (cantidad_disponible >= 0),
  constraint stock_salon_precio_check check (precio_publico_eur is null or precio_publico_eur >= 0)
);

create index if not exists idx_stock_salon_disponible
  on stock_salon (salon_id)
  where activo_en_tienda_publica = true and cantidad_disponible > 0;
create index if not exists idx_stock_salon_producto on stock_salon (producto_id);

-- Secuencias para números humano-legibles
create sequence if not exists seq_pedidos_b2b start 1;
create sequence if not exists seq_ventas_b2c start 1;

create or replace function next_numero_pedido_b2b() returns text
language plpgsql as $$
declare n bigint;
begin
  n := nextval('seq_pedidos_b2b');
  return 'PED-' || to_char(now(), 'YYYY') || '-' || lpad(n::text, 4, '0');
end;
$$;

create or replace function next_numero_venta_b2c() returns text
language plpgsql as $$
declare n bigint;
begin
  n := nextval('seq_ventas_b2c');
  return 'VEN-' || to_char(now(), 'YYYY') || '-' || lpad(n::text, 4, '0');
end;
$$;

-- pedidos_b2b
create table if not exists pedidos_b2b (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salones(id) on delete cascade,
  marca_id uuid not null references marcas(id) on delete restrict,
  numero text not null unique,
  estado text not null default 'pendiente',
  total_eur numeric(10,2) not null default 0,
  notas_salon text,
  notas_marca text,
  aceptado_at timestamptz,
  enviado_at timestamptz,
  entregado_at timestamptz,
  cancelado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pedidos_b2b_estado_check check (estado in ('borrador','pendiente','aceptado','enviado','entregado','cancelado'))
);

create index if not exists idx_pedidos_b2b_salon on pedidos_b2b (salon_id, created_at desc);
create index if not exists idx_pedidos_b2b_marca on pedidos_b2b (marca_id, estado);

create or replace function set_pedido_b2b_numero() returns trigger
language plpgsql as $$
begin
  if new.numero is null or new.numero = '' then
    new.numero := next_numero_pedido_b2b();
  end if;
  return new;
end;
$$;
drop trigger if exists trg_pedido_b2b_numero on pedidos_b2b;
create trigger trg_pedido_b2b_numero
  before insert on pedidos_b2b
  for each row execute function set_pedido_b2b_numero();

-- pedidos_b2b_items
create table if not exists pedidos_b2b_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos_b2b(id) on delete cascade,
  producto_id uuid not null references productos(id) on delete restrict,
  nombre_snapshot text not null,
  sku_snapshot text,
  cantidad integer not null,
  precio_unit_mayorista_eur numeric(10,2) not null,
  subtotal_eur numeric(10,2) not null,
  constraint pedidos_b2b_items_cantidad_check check (cantidad > 0),
  constraint pedidos_b2b_items_subtotal_check check (subtotal_eur >= 0)
);

create index if not exists idx_pedidos_b2b_items_pedido on pedidos_b2b_items (pedido_id);

-- ventas_b2c
create table if not exists ventas_b2c (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references salones(id) on delete cascade,
  numero text not null unique,
  cliente_email text not null,
  cliente_nombre text,
  cliente_telefono text,
  total_eur numeric(10,2) not null,
  comision_gestori_eur numeric(10,2) not null default 0,
  stripe_payment_intent_id text unique,
  stripe_charge_id text,
  estado text not null default 'pendiente_pago',
  pagado_at timestamptz,
  lista_recogida_at timestamptz,
  recogida_at timestamptz,
  cancelada_at timestamptz,
  reembolsada_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ventas_b2c_estado_check check (estado in ('pendiente_pago','pagada','lista_recogida','recogida','cancelada','reembolsada')),
  constraint ventas_b2c_total_check check (total_eur >= 0),
  constraint ventas_b2c_comision_check check (comision_gestori_eur >= 0 and comision_gestori_eur <= total_eur)
);

create index if not exists idx_ventas_b2c_salon on ventas_b2c (salon_id, created_at desc);
create index if not exists idx_ventas_b2c_estado on ventas_b2c (estado);
create index if not exists idx_ventas_b2c_cliente_email on ventas_b2c (cliente_email);

create or replace function set_venta_b2c_numero() returns trigger
language plpgsql as $$
begin
  if new.numero is null or new.numero = '' then
    new.numero := next_numero_venta_b2c();
  end if;
  return new;
end;
$$;
drop trigger if exists trg_venta_b2c_numero on ventas_b2c;
create trigger trg_venta_b2c_numero
  before insert on ventas_b2c
  for each row execute function set_venta_b2c_numero();

-- ventas_b2c_items
create table if not exists ventas_b2c_items (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references ventas_b2c(id) on delete cascade,
  producto_id uuid not null references productos(id) on delete restrict,
  nombre_snapshot text not null,
  imagen_snapshot text,
  cantidad integer not null,
  precio_unit_eur numeric(10,2) not null,
  subtotal_eur numeric(10,2) not null,
  constraint ventas_b2c_items_cantidad_check check (cantidad > 0),
  constraint ventas_b2c_items_subtotal_check check (subtotal_eur >= 0)
);

create index if not exists idx_ventas_b2c_items_venta on ventas_b2c_items (venta_id);

-- RLS
alter table marcas enable row level security;
alter table productos enable row level security;
alter table stock_salon enable row level security;
alter table pedidos_b2b enable row level security;
alter table pedidos_b2b_items enable row level security;
alter table ventas_b2c enable row level security;
alter table ventas_b2c_items enable row level security;

create policy marcas_public_read on marcas for select using (activa = true);
create policy productos_public_read on productos for select using (activo = true);
create policy stock_salon_public_read on stock_salon for select using (activo_en_tienda_publica = true and cantidad_disponible > 0);
create policy backend_only on pedidos_b2b for all using (false);
create policy backend_only on pedidos_b2b_items for all using (false);
create policy backend_only on ventas_b2c for all using (false);
create policy backend_only on ventas_b2c_items for all using (false);

-- Triggers updated_at
create or replace function set_updated_at_simple() returns trigger
language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

drop trigger if exists trg_marcas_updated_at on marcas;
create trigger trg_marcas_updated_at before update on marcas
  for each row execute function set_updated_at_simple();

drop trigger if exists trg_productos_updated_at on productos;
create trigger trg_productos_updated_at before update on productos
  for each row execute function set_updated_at_simple();

drop trigger if exists trg_stock_salon_updated_at on stock_salon;
create trigger trg_stock_salon_updated_at before update on stock_salon
  for each row execute function set_updated_at_simple();

drop trigger if exists trg_pedidos_b2b_updated_at on pedidos_b2b;
create trigger trg_pedidos_b2b_updated_at before update on pedidos_b2b
  for each row execute function set_updated_at_simple();

drop trigger if exists trg_ventas_b2c_updated_at on ventas_b2c;
create trigger trg_ventas_b2c_updated_at before update on ventas_b2c
  for each row execute function set_updated_at_simple();
