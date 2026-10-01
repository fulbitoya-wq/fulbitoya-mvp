-- Match feature (MVP)
-- Nota: usamos nombre de tabla "match" por requerimiento del producto.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'match_tipo') then
    create type public.match_tipo as enum ('f5', 'f7', 'f9', 'f11');
  end if;

  if not exists (select 1 from pg_type where typname = 'match_estado') then
    create type public.match_estado as enum ('pending', 'completo', 'confirmado', 'cancelado');
  end if;

  if not exists (select 1 from pg_type where typname = 'match_visibilidad') then
    create type public.match_visibilidad as enum ('privado', 'publico');
  end if;

  if not exists (select 1 from pg_type where typname = 'match_player_estado') then
    create type public.match_player_estado as enum ('invitado', 'confirmado', 'rechazado');
  end if;

  if not exists (select 1 from pg_type where typname = 'match_player_origen') then
    create type public.match_player_origen as enum ('invitacion', 'solicitud');
  end if;
end$$;

create table if not exists public.match (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.usuarios(id) on delete cascade,
  tipo public.match_tipo not null,
  provincia_id uuid not null references public.provincias(id),
  partido_id uuid not null references public.partidos(id),
  localidad_id uuid not null references public.localidades(id),
  fecha date not null,
  hora_inicio time not null,
  duracion_min integer not null check (duracion_min > 0),
  estado public.match_estado not null default 'pending',
  visibilidad public.match_visibilidad not null default 'publico',
  created_at timestamptz not null default now()
);

create table if not exists public.match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.match(id) on delete cascade,
  user_id uuid references public.usuarios(id) on delete set null,
  invited_email text,
  origen public.match_player_origen not null default 'invitacion',
  estado public.match_player_estado not null default 'invitado',
  created_at timestamptz not null default now(),
  constraint match_players_user_or_email_chk check (user_id is not null or invited_email is not null)
);

create unique index if not exists idx_match_players_unique_user_per_match
  on public.match_players(match_id, user_id)
  where user_id is not null;

create unique index if not exists idx_match_players_unique_email_per_match
  on public.match_players(match_id, lower(invited_email))
  where invited_email is not null;

create index if not exists idx_match_organizer on public.match(organizer_id);
create index if not exists idx_match_fecha on public.match(fecha);
create index if not exists idx_match_players_match_id on public.match_players(match_id);
create index if not exists idx_match_players_user_id on public.match_players(user_id);

alter table public.match enable row level security;
alter table public.match_players enable row level security;

drop policy if exists "Match select visible to members" on public.match;
create policy "Match select visible to members"
  on public.match
  for select
  using (
    visibilidad = 'publico'
    or organizer_id = auth.uid()
    or exists (
      select 1
      from public.match_players mp
      where mp.match_id = match.id
        and mp.user_id = auth.uid()
    )
  );

drop policy if exists "Match insert organizer self" on public.match;
create policy "Match insert organizer self"
  on public.match
  for insert
  with check (organizer_id = auth.uid());

drop policy if exists "Match update organizer only" on public.match;
create policy "Match update organizer only"
  on public.match
  for update
  using (organizer_id = auth.uid())
  with check (organizer_id = auth.uid());

drop policy if exists "Match delete organizer only" on public.match;
create policy "Match delete organizer only"
  on public.match
  for delete
  using (organizer_id = auth.uid());

drop policy if exists "Match players select related users" on public.match_players;
create policy "Match players select authenticated"
  on public.match_players
  for select
  using (auth.uid() is not null);

drop policy if exists "Match players insert organizer or self" on public.match_players;
create policy "Match players insert authenticated"
  on public.match_players
  for insert
  with check (auth.uid() is not null);

drop policy if exists "Match players update organizer or self" on public.match_players;
create policy "Match players update authenticated"
  on public.match_players
  for update
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "Match players delete organizer or self" on public.match_players;
create policy "Match players delete authenticated"
  on public.match_players
  for delete
  using (auth.uid() is not null);
