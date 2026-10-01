-- Inscripciones de equipos a desafíos (2 cupos). Lectura pública para la vitrina.

create table if not exists public.desafio_inscripciones (
  id uuid primary key default gen_random_uuid(),
  desafio_id uuid not null references public.desafios(id) on delete cascade,
  equipo_id uuid not null references public.equipos(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (desafio_id, equipo_id)
);

create index if not exists idx_desafio_inscripciones_desafio
  on public.desafio_inscripciones (desafio_id);

alter table public.desafio_inscripciones enable row level security;

drop policy if exists "Ver inscripciones publicas" on public.desafio_inscripciones;
create policy "Ver inscripciones publicas"
  on public.desafio_inscripciones
  for select
  using (true);
