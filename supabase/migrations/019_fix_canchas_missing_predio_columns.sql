-- Repair: agrega columnas faltantes en public.canchas
-- Ejecutá en Supabase SQL Editor cuando aplique

alter table public.canchas
  add column if not exists logo_url text,
  add column if not exists estacionamiento boolean default false,
  add column if not exists buffet boolean default false,
  add column if not exists vestuarios boolean default false;

