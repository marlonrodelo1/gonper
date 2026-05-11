-- Destacados marketplace + Stripe Connect en salones.
-- Aplicada como migración Supabase con name `salones_destacados_y_connect`.

alter table salones
  add column if not exists marketplace_destacado boolean not null default false,
  add column if not exists marketplace_destacado_orden integer,
  add column if not exists stripe_connect_account_id text,
  add column if not exists stripe_connect_onboarded boolean not null default false;

create index if not exists idx_salones_marketplace_destacado
  on salones (marketplace_destacado_orden asc nulls last)
  where marketplace_destacado = true
    and activo = true
    and marketplace_visible = true
    and plan != 'cancelado';

create index if not exists idx_salones_stripe_connect
  on salones (stripe_connect_account_id)
  where stripe_connect_account_id is not null;
