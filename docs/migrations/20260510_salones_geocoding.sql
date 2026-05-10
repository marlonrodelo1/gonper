-- ============================================================
-- Geocoding de salones vía OpenStreetMap (Nominatim).
--
-- Cuando el dueño escribe su dirección con autocompletado en
-- /panel/config/web, guardamos coordenadas + dirección normalizada
-- + place_id de OSM para deduplicar y permitir filtros futuros
-- "cerca de mí" (haversine sobre lat/lng).
--
-- Aplicada como migración Supabase con name `salones_geocoding`.
-- ============================================================

alter table salones
  add column if not exists lat numeric(10, 7),
  add column if not exists lng numeric(10, 7),
  add column if not exists direccion_formateada text,
  add column if not exists osm_place_id text;

create index if not exists idx_salones_geocoded
  on salones (lat, lng)
  where lat is not null and lng is not null;
