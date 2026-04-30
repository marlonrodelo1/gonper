-- ============================================
-- GOMPER — Schema completo de PostgreSQL
-- Pensado para Supabase / PostgreSQL 15+
-- ============================================

-- EXTENSIONES
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================
-- TABLA: salones (tenants)
-- ============================================
create table salones (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  nombre          text not null,
  tipo_negocio    text not null check (tipo_negocio in
                    ('barberia','peluqueria','estetica','manicura','otro')),
  direccion       text,
  telefono        text,
  email           text,
  timezone        text not null default 'Europe/Madrid',

  -- Configuración del agente
  agente_nombre   text not null default 'Juanita',
  agente_genero   text not null default 'femenino'
                    check (agente_genero in ('femenino','masculino','neutro')),
  agente_tono     text not null default 'cercano'
                    check (agente_tono in ('profesional','cercano','desenfadado')),
  agente_bienvenida text,

  -- Conexiones externas
  telegram_bot_token       text,
  telegram_bot_username    text,
  telegram_bot_dueno_token text,
  telegram_chat_id_dueno   text,
  whatsapp_phone_id        text,

  -- Plan
  plan            text not null default 'trial'
                    check (plan in ('trial','solo','studio','pro','cancelado')),
  trial_until     timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,

  -- Metadata
  config_json     jsonb not null default '{}'::jsonb,
  activo          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_salones_slug on salones(slug);
create index idx_salones_activo on salones(activo) where activo = true;

-- ============================================
-- TABLA: usuarios_salon
-- ============================================
create table usuarios_salon (
  id              uuid primary key default gen_random_uuid(),
  salon_id        uuid not null references salones(id) on delete cascade,
  auth_user_id    uuid not null,
  rol             text not null default 'dueno'
                    check (rol in ('dueno','admin','empleado')),
  created_at      timestamptz not null default now(),
  unique(salon_id, auth_user_id)
);

create index idx_usuarios_salon_auth on usuarios_salon(auth_user_id);

-- ============================================
-- TABLA: profesionales
-- ============================================
create table profesionales (
  id              uuid primary key default gen_random_uuid(),
  salon_id        uuid not null references salones(id) on delete cascade,
  nombre          text not null,
  color_hex       text default '#3b82f6',
  foto_url        text,
  activo          boolean not null default true,
  orden           int not null default 0,
  created_at      timestamptz not null default now()
);

create index idx_profesionales_salon on profesionales(salon_id);

-- ============================================
-- TABLA: servicios
-- ============================================
create table servicios (
  id              uuid primary key default gen_random_uuid(),
  salon_id        uuid not null references salones(id) on delete cascade,
  nombre          text not null,
  descripcion     text,
  duracion_min    int not null check (duracion_min > 0 and duracion_min <= 480),
  precio_eur      numeric(10,2) not null check (precio_eur >= 0),
  activo          boolean not null default true,
  orden           int not null default 0,
  created_at      timestamptz not null default now()
);

create index idx_servicios_salon on servicios(salon_id) where activo = true;

-- ============================================
-- TABLA: horarios
-- ============================================
create table horarios (
  id              uuid primary key default gen_random_uuid(),
  salon_id        uuid not null references salones(id) on delete cascade,
  dia_semana      int not null check (dia_semana between 0 and 6),
  inicio          time not null,
  fin             time not null,
  check (fin > inicio)
);

create index idx_horarios_salon on horarios(salon_id);

-- ============================================
-- TABLA: cierres
-- ============================================
create table cierres (
  id              uuid primary key default gen_random_uuid(),
  salon_id        uuid not null references salones(id) on delete cascade,
  fecha_inicio    timestamptz not null,
  fecha_fin       timestamptz not null,
  motivo          text,
  check (fecha_fin > fecha_inicio)
);

create index idx_cierres_salon on cierres(salon_id);

-- ============================================
-- TABLA: clientes
-- ============================================
create table clientes (
  id              uuid primary key default gen_random_uuid(),
  salon_id        uuid not null references salones(id) on delete cascade,
  nombre          text not null,
  telefono        text,
  email           text,
  telegram_id     bigint,
  telegram_username text,
  whatsapp_phone  text,

  total_citas     int not null default 0,
  total_no_shows  int not null default 0,
  total_facturado numeric(10,2) not null default 0,
  ultima_visita   timestamptz,

  requiere_deposito boolean not null default false,
  notas_privadas  text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique(salon_id, telegram_id),
  unique(salon_id, telefono)
);

create index idx_clientes_salon on clientes(salon_id);
create index idx_clientes_telegram on clientes(telegram_id);

-- ============================================
-- TABLA: citas
-- ============================================
create table citas (
  id              uuid primary key default gen_random_uuid(),
  salon_id        uuid not null references salones(id) on delete cascade,
  cliente_id      uuid not null references clientes(id) on delete restrict,
  profesional_id  uuid not null references profesionales(id) on delete restrict,
  servicio_id     uuid not null references servicios(id) on delete restrict,

  inicio          timestamptz not null,
  fin             timestamptz not null,
  precio_eur      numeric(10,2) not null,

  estado          text not null default 'pendiente'
                    check (estado in ('pendiente','confirmada','cancelada',
                                      'no_show','completada')),
  origen          text not null default 'telegram'
                    check (origen in ('telegram','whatsapp','web','manual','dueno')),

  recordatorio_enviado_at  timestamptz,
  confirmada_at            timestamptz,
  cancelada_at             timestamptz,
  cancelada_por            text check (cancelada_por in ('cliente','dueno','sistema')),
  motivo_cancelacion       text,

  deposito_requerido    boolean not null default false,
  deposito_pagado_at    timestamptz,
  deposito_stripe_id    text,

  notas           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  check (fin > inicio)
);

create index idx_citas_salon_inicio on citas(salon_id, inicio);
create index idx_citas_cliente on citas(cliente_id);
create index idx_citas_profesional_inicio on citas(profesional_id, inicio);
create index idx_citas_estado on citas(salon_id, estado);
create index idx_citas_pendiente_recordatorio
  on citas(inicio)
  where estado = 'pendiente' and recordatorio_enviado_at is null;

create unique index idx_citas_no_solape
  on citas(profesional_id, inicio)
  where estado in ('pendiente','confirmada');

-- ============================================
-- TABLA: lista_espera
-- ============================================
create table lista_espera (
  id              uuid primary key default gen_random_uuid(),
  salon_id        uuid not null references salones(id) on delete cascade,
  cliente_id      uuid not null references clientes(id) on delete cascade,
  servicio_id     uuid not null references servicios(id) on delete restrict,
  profesional_id  uuid references profesionales(id) on delete cascade,
  preferencias_json jsonb not null default '{}'::jsonb,
  activa          boolean not null default true,
  created_at      timestamptz not null default now(),
  expira_at       timestamptz
);

create index idx_lista_espera_salon
  on lista_espera(salon_id) where activa = true;

-- ============================================
-- TABLA: mensajes
-- ============================================
create table mensajes (
  id              uuid primary key default gen_random_uuid(),
  salon_id        uuid not null references salones(id) on delete cascade,
  cliente_id      uuid references clientes(id) on delete set null,
  cita_id         uuid references citas(id) on delete set null,

  canal           text not null check (canal in ('telegram','whatsapp','sms','web')),
  direccion       text not null check (direccion in ('in','out')),
  contenido       text not null,
  payload_raw     jsonb,

  llm_modelo      text,
  llm_tokens_in   int,
  llm_tokens_out  int,
  llm_coste_eur   numeric(10,6),

  created_at      timestamptz not null default now()
);

create index idx_mensajes_salon_created on mensajes(salon_id, created_at desc);
create index idx_mensajes_cliente on mensajes(cliente_id, created_at desc);

-- ============================================
-- TABLA: leads (capturas desde landing)
-- ============================================
create table leads (
  id              uuid primary key default gen_random_uuid(),
  email           text not null,
  nombre          text,
  tipo_negocio    text,
  dolor_principal text,
  origen          text default 'landing_chat',
  ip              inet,
  user_agent      text,
  convertido      boolean not null default false,
  convertido_salon_id uuid references salones(id),
  conversacion_json jsonb,
  created_at      timestamptz not null default now()
);

create index idx_leads_email on leads(email);
create index idx_leads_no_convertidos on leads(created_at desc)
  where convertido = false;

-- ============================================
-- TABLA: rate_limits
-- ============================================
create table rate_limits (
  id              uuid primary key default gen_random_uuid(),
  scope_type      text not null check (scope_type in ('cliente','dueno','ip','salon')),
  scope_key       text not null,
  fecha           date not null default current_date,
  llamadas_ia     int not null default 0,
  mensajes_total  int not null default 0,
  unique(scope_type, scope_key, fecha)
);

create index idx_rate_limits_lookup on rate_limits(scope_type, scope_key, fecha);

-- ============================================
-- TRIGGERS DE AUDITORÍA
-- ============================================
create or replace function trigger_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at_salones
  before update on salones
  for each row execute function trigger_set_updated_at();

create trigger set_updated_at_clientes
  before update on clientes
  for each row execute function trigger_set_updated_at();

create trigger set_updated_at_citas
  before update on citas
  for each row execute function trigger_set_updated_at();

-- ============================================
-- TRIGGER: actualizar métricas del cliente
-- ============================================
create or replace function trigger_actualizar_cliente_stats()
returns trigger as $$
begin
  if new.estado = 'completada' and (old.estado is null or old.estado != 'completada') then
    update clientes
    set total_citas = total_citas + 1,
        total_facturado = total_facturado + new.precio_eur,
        ultima_visita = new.inicio
    where id = new.cliente_id;

  elsif new.estado = 'no_show' and (old.estado is null or old.estado != 'no_show') then
    update clientes
    set total_no_shows = total_no_shows + 1
    where id = new.cliente_id;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger actualizar_cliente_stats
  after update on citas
  for each row execute function trigger_actualizar_cliente_stats();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table salones enable row level security;
alter table profesionales enable row level security;
alter table servicios enable row level security;
alter table horarios enable row level security;
alter table cierres enable row level security;
alter table clientes enable row level security;
alter table citas enable row level security;
alter table lista_espera enable row level security;
alter table mensajes enable row level security;

create or replace function auth_user_owns_salon(salon_uuid uuid)
returns boolean as $$
  select exists (
    select 1 from usuarios_salon
    where salon_id = salon_uuid
    and auth_user_id = auth.uid()
  );
$$ language sql stable;

create policy "salon_owner_all" on salones
  for all using (auth_user_owns_salon(id));

create policy "tenant_isolation" on profesionales
  for all using (auth_user_owns_salon(salon_id));

create policy "tenant_isolation" on servicios
  for all using (auth_user_owns_salon(salon_id));

create policy "tenant_isolation" on horarios
  for all using (auth_user_owns_salon(salon_id));

create policy "tenant_isolation" on cierres
  for all using (auth_user_owns_salon(salon_id));

create policy "tenant_isolation" on clientes
  for all using (auth_user_owns_salon(salon_id));

create policy "tenant_isolation" on citas
  for all using (auth_user_owns_salon(salon_id));

create policy "tenant_isolation" on lista_espera
  for all using (auth_user_owns_salon(salon_id));

create policy "tenant_isolation" on mensajes
  for all using (auth_user_owns_salon(salon_id));

-- ============================================
-- DATOS SEED (Revolution Barbershop)
-- ============================================
insert into salones (slug, nombre, tipo_negocio, direccion, timezone,
                     agente_nombre, agente_tono, plan)
values ('revolution-bcn', 'Revolution Barbershop', 'barberia',
        'Calle Ejemplo 123, Madrid', 'Europe/Madrid',
        'Juanita', 'cercano', 'trial');

insert into servicios (salon_id, nombre, duracion_min, precio_eur, orden)
select id, 'Corte de pelo', 30, 15.00, 1 from salones where slug = 'revolution-bcn'
union all
select id, 'Arreglo de barba', 20, 10.00, 2 from salones where slug = 'revolution-bcn'
union all
select id, 'Corte + Barba', 45, 22.00, 3 from salones where slug = 'revolution-bcn'
union all
select id, 'Afeitado clásico', 30, 18.00, 4 from salones where slug = 'revolution-bcn';

insert into horarios (salon_id, dia_semana, inicio, fin)
select id, 2, '10:00', '14:00' from salones where slug = 'revolution-bcn'
union all
select id, 2, '16:30', '20:00' from salones where slug = 'revolution-bcn'
union all
select id, 3, '10:00', '14:00' from salones where slug = 'revolution-bcn'
union all
select id, 3, '16:30', '20:00' from salones where slug = 'revolution-bcn'
union all
select id, 4, '10:00', '14:00' from salones where slug = 'revolution-bcn'
union all
select id, 4, '16:30', '20:00' from salones where slug = 'revolution-bcn'
union all
select id, 5, '10:00', '14:00' from salones where slug = 'revolution-bcn'
union all
select id, 5, '16:30', '20:30' from salones where slug = 'revolution-bcn'
union all
select id, 6, '09:30', '14:30' from salones where slug = 'revolution-bcn';
