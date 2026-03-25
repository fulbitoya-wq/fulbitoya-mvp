-- Repair: agrega columnas faltantes en public.campos
-- Ejecutá en Supabase SQL Editor

alter table public.campos
  add column if not exists luz boolean default false,
  add column if not exists camaras boolean default false,
  add column if not exists minutero boolean default false,
  add column if not exists marcador_gol boolean default false,
  add column if not exists observaciones text;

