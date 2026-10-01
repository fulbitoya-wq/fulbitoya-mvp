-- Desafíos (partidos por plata) + coords Google en matches

do $$
begin
  if not exists (select 1 from pg_type where typname = 'desafio_estado') then
    create type public.desafio_estado as enum ('abierto', 'completo', 'cancelado', 'finalizado');
  end if;
end$$;

create table if not exists public.desafios (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.usuarios(id) on delete cascade,
  cancha_id uuid references public.canchas(id) on delete set null,
  titulo text not null,
  tipo public.match_tipo not null default 'f5',
  premio numeric not null check (premio >= 0),
  direccion text not null,
  barrio text,
  place_id text,
  lat double precision not null,
  lng double precision not null,
  fecha date not null,
  hora_inicio time not null,
  duracion_min integer not null default 90 check (duracion_min > 0),
  descripcion text,
  estado public.desafio_estado not null default 'abierto',
  created_at timestamptz not null default now()
);

create index if not exists idx_desafios_owner on public.desafios(owner_id);
create index if not exists idx_desafios_estado_fecha on public.desafios(estado, fecha);
create index if not exists idx_desafios_geo on public.desafios(lat, lng);

alter table public.desafios enable row level security;

drop policy if exists "Desafios publicos abiertos" on public.desafios;
create policy "Desafios publicos abiertos"
  on public.desafios
  for select
  using (estado = 'abierto' or owner_id = auth.uid());

drop policy if exists "Owners insertan desafios" on public.desafios;
create policy "Owners insertan desafios"
  on public.desafios
  for insert
  with check (auth.uid() = owner_id);

drop policy if exists "Owners actualizan desafios" on public.desafios;
create policy "Owners actualizan desafios"
  on public.desafios
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Owners borran desafios" on public.desafios;
create policy "Owners borran desafios"
  on public.desafios
  for delete
  using (auth.uid() = owner_id);

alter table public.match
  add column if not exists direccion text,
  add column if not exists place_id text,
  add column if not exists lat double precision,
  add column if not exists lng double precision;

alter table public.canchas
  add column if not exists place_id text;
