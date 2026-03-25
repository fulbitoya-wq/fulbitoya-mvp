-- Proveyendo sistema de ubicación (provincias/partidos/localidades)
-- Ejecutá en Supabase SQL Editor después de 009

-- 1) Tablas de ubicación
create table if not exists public.provincias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null
);

create index if not exists idx_provincias_nombre on public.provincias(nombre);

create table if not exists public.partidos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  provincia_id uuid not null references public.provincias(id) on delete cascade
);

create index if not exists idx_partidos_provincia on public.partidos(provincia_id);
create index if not exists idx_partidos_nombre on public.partidos(nombre);

create table if not exists public.localidades (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  partido_id uuid not null references public.partidos(id) on delete cascade,
  codigo_postal text,
  lat real,
  lng real
);

create index if not exists idx_localidades_partido on public.localidades(partido_id);
create index if not exists idx_localidades_nombre on public.localidades(nombre);

-- 2) RLS: permitir lectura pública (lookup)
alter table public.provincias enable row level security;
alter table public.partidos enable row level security;
alter table public.localidades enable row level security;

drop policy if exists "Read provincias" on public.provincias;
drop policy if exists "Read partidos" on public.partidos;
drop policy if exists "Read localidades" on public.localidades;

create policy "Read provincias"
  on public.provincias for select
  using (true);

create policy "Read partidos"
  on public.partidos for select
  using (true);

create policy "Read localidades"
  on public.localidades for select
  using (true);

-- 3) Campos en equipos (sin romper compatibilidad)
alter table public.equipos
  add column if not exists provincia_id uuid references public.provincias(id),
  add column if not exists partido_id uuid references public.partidos(id),
  add column if not exists localidad_id uuid references public.localidades(id);

create index if not exists idx_equipos_provincia on public.equipos(provincia_id);
create index if not exists idx_equipos_partido on public.equipos(partido_id);
create index if not exists idx_equipos_localidad on public.equipos(localidad_id);

