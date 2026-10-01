-- Reparación idempotente de lo que el checklist marcó FALTA (032+).
-- No borra filas. No toca reservas ni Mercado Pago.
-- Seguro de correr más de una vez.
--
-- Cubre: columnas origen/avatar, check porlacancha, handle_new_user (036),
-- política 035, tabla 039 (vacía; la app sigue usando cupos por descripcion).
-- No toca email_para_login (se elimina en 043 / Fase B).
-- No crea "Auth ve perfiles para equipos": el remoto ya tiene
-- "Ver usuarios de mis equipos" (más estrecha). No la pises.

-- 033 columnas
alter table public.usuarios
  add column if not exists origen_registro text,
  add column if not exists avatar_url text;

-- 036 constraint + backfill jugatela → porlacancha (solo ese valor)
alter table public.usuarios drop constraint if exists usuarios_origen_registro_chk;

update public.usuarios
set origen_registro = 'porlacancha'
where origen_registro = 'jugatela';

alter table public.usuarios
  add constraint usuarios_origen_registro_chk
  check (origen_registro is null or origen_registro in ('fulbitoya', 'porlacancha'));

-- 036 handle_new_user (reemplazo de función; el trigger ya existe)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text;
  v_avatar text;
  v_origen text;
begin
  v_nombre := coalesce(
    nullif(btrim(new.raw_user_meta_data->>'nombre'), ''),
    nullif(btrim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data->>'name'), '')
  );
  v_avatar := coalesce(
    nullif(btrim(new.raw_user_meta_data->>'avatar_url'), ''),
    nullif(btrim(new.raw_user_meta_data->>'picture'), '')
  );
  v_origen := new.raw_user_meta_data->>'origen_registro';
  if v_origen = 'jugatela' then
    v_origen := 'porlacancha';
  end if;
  if v_origen is null or v_origen not in ('fulbitoya', 'porlacancha') then
    v_origen := null;
  end if;

  insert into public.usuarios (
    id,
    email,
    nombre,
    telefono,
    rol,
    origen_registro,
    avatar_url
  )
  values (
    new.id,
    new.email,
    v_nombre,
    new.raw_user_meta_data->>'telefono',
    'jugador',
    v_origen,
    v_avatar
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- 039 (tabla nueva vacía; no migra cupos desde descripcion)
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
