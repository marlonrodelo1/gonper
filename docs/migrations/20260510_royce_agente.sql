-- ============================================================
-- Migración: Royce — agente Gestori en la landing.
--
-- Crea la base del sistema de agentes (en v1, una sola fila: Royce).
-- El sistema queda preparado para más agentes futuros sin migrar:
-- basta con insertar otra fila en `agentes`.
--
-- Tablas creadas:
--   1. agentes                       — config del agente (prompt editable)
--   2. agentes_versiones             — historial del prompt (rollback)
--   3. agente_sesiones               — sesiones de chat por session_id
--   4. agente_mensajes               — log de mensajes (escrito por n8n)
--   5. agente_tools_catalogo         — catálogo global de tools disponibles
--   6. agente_tools_asignaciones     — qué tools tiene activas cada agente
--
-- RLS: todas las tablas tienen RLS ON con policy `using (false)` —
-- solo accesibles vía service_role (Drizzle / endpoints internos).
-- El widget público pasa por `/api/public/chat/royce` que proxy-ea
-- a n8n; el panel super-admin pasa por server actions con
-- `requireSuperAdmin()`. Ningún flujo necesita acceso anon directo.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. agentes
-- ------------------------------------------------------------
create table if not exists agentes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nombre text not null,
  descripcion text,
  system_prompt text not null,
  modelo text not null default 'deepseek-chat',
  temperatura numeric(3,2) not null default 0.40,
  max_tokens integer not null default 600,
  bienvenida text,
  -- NULL = agente global de Gestori (Royce). UUID = agente futuro por tenant.
  salon_id uuid references salones(id) on delete cascade,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agentes_temperatura_check check (temperatura >= 0 and temperatura <= 2),
  constraint agentes_max_tokens_check check (max_tokens > 0 and max_tokens <= 4000)
);

create index if not exists idx_agentes_slug on agentes (slug);
create index if not exists idx_agentes_salon on agentes (salon_id) where salon_id is not null;
create index if not exists idx_agentes_activos on agentes (activo) where activo = true;

-- ------------------------------------------------------------
-- 2. agentes_versiones (audit / rollback del prompt)
-- ------------------------------------------------------------
create table if not exists agentes_versiones (
  id uuid primary key default gen_random_uuid(),
  agente_id uuid not null references agentes(id) on delete cascade,
  system_prompt text not null,
  modelo text not null,
  temperatura numeric(3,2) not null,
  max_tokens integer not null,
  bienvenida text,
  editado_por uuid,                                  -- auth.users.id, nullable (seed)
  comentario text,
  created_at timestamptz not null default now()
);

create index if not exists idx_agentes_versiones_agente
  on agentes_versiones (agente_id, created_at desc);

-- ------------------------------------------------------------
-- 3. agente_sesiones
-- ------------------------------------------------------------
create table if not exists agente_sesiones (
  id uuid primary key default gen_random_uuid(),
  agente_id uuid not null references agentes(id) on delete cascade,
  session_id text not null,                          -- uuid v4 generado en el cliente
  surface text not null default 'landing',           -- 'landing' | 'marketplace' | 'admin_test'
  visitor_email text,
  visitor_nombre text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (agente_id, session_id),
  constraint agente_sesiones_surface_check
    check (surface in ('landing','marketplace','admin_test'))
);

create index if not exists idx_agente_sesiones_agente_created
  on agente_sesiones (agente_id, created_at desc);
create index if not exists idx_agente_sesiones_session on agente_sesiones (session_id);

-- ------------------------------------------------------------
-- 4. agente_mensajes
-- ------------------------------------------------------------
create table if not exists agente_mensajes (
  id uuid primary key default gen_random_uuid(),
  sesion_id uuid not null references agente_sesiones(id) on delete cascade,
  direccion text not null,                           -- 'in' | 'out'
  contenido text not null,
  metadata jsonb,                                    -- tool_calls, ui events, etc.
  llm_modelo text,
  llm_tokens_in integer,
  llm_tokens_out integer,
  llm_coste_eur numeric(10,6),
  created_at timestamptz not null default now(),
  constraint agente_mensajes_direccion_check check (direccion in ('in','out'))
);

create index if not exists idx_agente_mensajes_sesion_created
  on agente_mensajes (sesion_id, created_at);

-- ------------------------------------------------------------
-- 5. agente_tools_catalogo (catálogo GLOBAL de tools disponibles)
-- ------------------------------------------------------------
create table if not exists agente_tools_catalogo (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  categoria text not null,                           -- 'lead' | 'crm' | 'email' | 'mensajeria' | 'automatizacion'
  descripcion text not null,
  schema_json jsonb not null,                        -- JSON Schema para args
  requiere_credenciales boolean not null default false,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  constraint agente_tools_catalogo_categoria_check
    check (categoria in ('lead','crm','email','mensajeria','automatizacion'))
);

create index if not exists idx_agente_tools_catalogo_activo
  on agente_tools_catalogo (activo) where activo = true;

-- ------------------------------------------------------------
-- 6. agente_tools_asignaciones (qué tools tiene cada agente)
-- ------------------------------------------------------------
create table if not exists agente_tools_asignaciones (
  id uuid primary key default gen_random_uuid(),
  agente_id uuid not null references agentes(id) on delete cascade,
  tool_nombre text not null references agente_tools_catalogo(nombre) on update cascade on delete restrict,
  activo boolean not null default true,
  config_json jsonb not null default '{}'::jsonb,    -- config no-secreta por tool
  created_at timestamptz not null default now(),
  unique (agente_id, tool_nombre)
);

create index if not exists idx_agente_tools_asignaciones_agente
  on agente_tools_asignaciones (agente_id) where activo = true;

-- ------------------------------------------------------------
-- RLS: solo backend (service_role bypass). anon/authenticated bloqueados.
-- ------------------------------------------------------------
alter table agentes enable row level security;
alter table agentes_versiones enable row level security;
alter table agente_sesiones enable row level security;
alter table agente_mensajes enable row level security;
alter table agente_tools_catalogo enable row level security;
alter table agente_tools_asignaciones enable row level security;

create policy backend_only on agentes for all using (false);
create policy backend_only on agentes_versiones for all using (false);
create policy backend_only on agente_sesiones for all using (false);
create policy backend_only on agente_mensajes for all using (false);
create policy backend_only on agente_tools_catalogo for all using (false);
create policy backend_only on agente_tools_asignaciones for all using (false);

-- ------------------------------------------------------------
-- Trigger updated_at en agentes
-- ------------------------------------------------------------
create or replace function set_updated_at_agentes()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_agentes_updated_at on agentes;
create trigger trg_agentes_updated_at
  before update on agentes
  for each row execute function set_updated_at_agentes();

-- ============================================================
-- SEED — Royce + tool capturar_lead
-- ============================================================

insert into agente_tools_catalogo (nombre, categoria, descripcion, schema_json, requiere_credenciales, activo)
values (
  'capturar_lead',
  'lead',
  'Guarda los datos de contacto del visitante en la tabla leads para hacer seguimiento.',
  '{
    "type": "object",
    "properties": {
      "email":         { "type": "string", "format": "email", "description": "Email del visitante (obligatorio)" },
      "nombre":        { "type": "string", "description": "Nombre del visitante" },
      "tipo_negocio":  { "type": "string", "enum": ["barberia","peluqueria","estetica","manicura","otro"], "description": "Tipo de negocio que tiene" },
      "dolor":         { "type": "string", "description": "Dolor o motivación principal expresada por el visitante" }
    },
    "required": ["email"],
    "additionalProperties": false
  }'::jsonb,
  false,
  true
)
on conflict (nombre) do nothing;

insert into agentes (slug, nombre, descripcion, system_prompt, modelo, temperatura, max_tokens, bienvenida, salon_id, activo)
values (
  'royce',
  'Royce',
  'Agente de la landing de Gestori. Explica el producto y guía al registro del trial.',
  $PROMPT$Eres Royce, el agente de Gestori (gestori.es). Habla SIEMPRE en español, tono cercano y directo, frases cortas.

## Qué es Gestori
Una plataforma para dueños de peluquerías, barberías, centros de estética y manicura. Cada cliente recibe SU PROPIO asistente conversacional (Juanita) que vive en Telegram y le gestiona el negocio: agenda citas, contesta a clientes, manda recordatorios y le da los números del día.

## Tu única misión en v1
Guiar a la persona que escribe a registrarse en la prueba gratis de 30 días en /signup.

## Cómo conversar
1. Saluda corto y pregunta qué tipo de negocio tiene.
2. Identifica su dolor: pierde llamadas fuera de horario, le cuesta llevar la agenda, no sabe cuánto factura, etc.
3. Conecta el dolor con Gestori en 1-2 frases concretas (no genéricas).
4. Cuando esté caliente, ofrece "te dejo el link para empezar gratis 30 días, sin tarjeta para entrar" y manda al CTA /signup.
5. Si pide info de pago: 30€/mes después del trial, sin permanencia.
6. Si te da su email para que le contemos más, llama a la tool capturar_lead.

## Reglas duras
- NO inventes funciones que Gestori no tiene (no hay app móvil propia, no hay WhatsApp en v1, no hay llamadas de voz).
- NO prometas integraciones específicas con sistemas legacy.
- Si te preguntan por algo fuera de este nicho (restaurantes, taller, clínica), di que de momento Gestori es solo para belleza y peluquería.
- NUNCA mandes a otra URL que no sea /signup o /marketplace.$PROMPT$,
  'deepseek-chat',
  0.40,
  600,
  '¡Hola! Soy Royce, el agente de Gestori. Cuéntame, ¿qué tipo de negocio llevas?',
  null,
  true
)
on conflict (slug) do nothing;

-- Asignar capturar_lead a Royce
insert into agente_tools_asignaciones (agente_id, tool_nombre, activo, config_json)
select a.id, 'capturar_lead', true, '{}'::jsonb
from agentes a
where a.slug = 'royce'
on conflict (agente_id, tool_nombre) do nothing;

-- Versión inicial en historial (snapshot del seed)
insert into agentes_versiones (agente_id, system_prompt, modelo, temperatura, max_tokens, bienvenida, editado_por, comentario)
select a.id, a.system_prompt, a.modelo, a.temperatura, a.max_tokens, a.bienvenida, null, 'Versión inicial (seed)'
from agentes a
where a.slug = 'royce';

commit;
