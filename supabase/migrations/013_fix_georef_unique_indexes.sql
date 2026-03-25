-- Corrige índices únicos para que el upsert funcione con supabase-js
-- Ejecutá en Supabase SQL Editor después de 012

drop index if exists public.uq_provincias_georef_id;
drop index if exists public.uq_partidos_georef_id;
drop index if exists public.uq_localidades_georef_id;

-- Un índice único normal permite múltiples NULLs (Postgres).
create unique index if not exists uq_provincias_georef_id
  on public.provincias (georef_id);

create unique index if not exists uq_partidos_georef_id
  on public.partidos (georef_id);

create unique index if not exists uq_localidades_georef_id
  on public.localidades (georef_id);

