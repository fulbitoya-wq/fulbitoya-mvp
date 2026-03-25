-- Agrega georef_id para idempotencia del seed (evitar duplicados)
-- Ejecutá en Supabase SQL Editor después de 010

alter table public.provincias
  add column if not exists georef_id text;

alter table public.partidos
  add column if not exists georef_id text;

alter table public.localidades
  add column if not exists georef_id text;

create unique index if not exists uq_provincias_georef_id
  on public.provincias (georef_id)
  where georef_id is not null;

create unique index if not exists uq_partidos_georef_id
  on public.partidos (georef_id)
  where georef_id is not null;

create unique index if not exists uq_localidades_georef_id
  on public.localidades (georef_id)
  where georef_id is not null;

