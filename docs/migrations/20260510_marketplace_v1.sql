-- ============================================================
-- Marketplace v1: campos públicos en `salones` + cache de rating.
--
-- Aplicada como migración Supabase con name `marketplace_v1`.
-- ============================================================

alter table salones
  add column if not exists marketplace_visible boolean not null default true,
  add column if not exists ciudad text,
  add column if not exists provincia text,
  add column if not exists descripcion_corta text;

create index if not exists idx_salones_marketplace
  on salones (activo, marketplace_visible)
  where activo = true and marketplace_visible = true and plan != 'cancelado';

create index if not exists idx_salones_ciudad on salones (ciudad)
  where ciudad is not null;

create index if not exists idx_salones_tipo_negocio_marketplace
  on salones (tipo_negocio)
  where activo = true and marketplace_visible = true;

-- Cache de rating agregado por salón. Refresco previsto vía cron n8n
-- cada 6h o trigger on insert/update de `resenas` (futuro).
create table if not exists salones_rating_cache (
  salon_id uuid primary key references salones(id) on delete cascade,
  rating_avg numeric(3,2),
  total_resenas integer not null default 0,
  actualizado_at timestamptz not null default now()
);

alter table salones_rating_cache enable row level security;
create policy backend_only on salones_rating_cache for all using (false);

-- Seed inicial del cache desde resenas existentes (idempotente).
insert into salones_rating_cache (salon_id, rating_avg, total_resenas, actualizado_at)
select s.id,
       round(coalesce(avg(r.rating)::numeric, 0)::numeric, 2),
       count(r.id),
       now()
from salones s
left join resenas r
  on r.salon_id = s.id and r.aprobada = true
group by s.id
on conflict (salon_id) do update
set rating_avg = excluded.rating_avg,
    total_resenas = excluded.total_resenas,
    actualizado_at = excluded.actualizado_at;
