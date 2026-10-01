-- Perfil futbolero público (sin fecha de nacimiento ni datos de cuenta).

create table if not exists public.jugador_perfiles (
  usuario_id uuid primary key references public.usuarios(id) on delete cascade,
  apellido text,
  zona text,
  bio text,
  puesto_principal text,
  puesto_secundario text,
  pierna text,
  formatos text[] not null default '{}',
  disponibilidad text,
  updated_at timestamptz not null default now()
);

alter table public.jugador_perfiles enable row level security;

drop policy if exists "Leer perfil futbolero" on public.jugador_perfiles;
create policy "Leer perfil futbolero"
  on public.jugador_perfiles
  for select
  using (true);

drop policy if exists "Escribir propio perfil futbolero" on public.jugador_perfiles;
create policy "Escribir propio perfil futbolero"
  on public.jugador_perfiles
  for all
  to authenticated
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);
