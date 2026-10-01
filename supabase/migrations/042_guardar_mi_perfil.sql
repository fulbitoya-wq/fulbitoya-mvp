-- Perfil editable desde la app: tabla + RPC (auth.uid() solamente).

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
  fecha_nacimiento date,
  updated_at timestamptz not null default now()
);

alter table public.jugador_perfiles
  add column if not exists fecha_nacimiento date;

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

grant select, insert, update on table public.jugador_perfiles to authenticated;
grant select on table public.jugador_perfiles to anon;

create or replace function public.guardar_mi_perfil(
  p_nombre text,
  p_telefono text,
  p_avatar_url text,
  p_username text,
  p_apellido text,
  p_zona text,
  p_bio text,
  p_puesto_principal text,
  p_puesto_secundario text,
  p_pierna text,
  p_formatos text[],
  p_disponibilidad text,
  p_fecha_nacimiento date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_username text;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  v_username := nullif(lower(btrim(coalesce(p_username, ''))), '');

  update public.usuarios
  set
    nombre = nullif(btrim(coalesce(p_nombre, '')), ''),
    telefono = nullif(btrim(coalesce(p_telefono, '')), ''),
    avatar_url = p_avatar_url,
    username = coalesce(v_username, username)
  where id = uid;

  if not found then
    raise exception 'usuario_no_encontrado';
  end if;

  insert into public.jugador_perfiles (
    usuario_id,
    apellido,
    zona,
    bio,
    puesto_principal,
    puesto_secundario,
    pierna,
    formatos,
    disponibilidad,
    fecha_nacimiento,
    updated_at
  )
  values (
    uid,
    nullif(btrim(coalesce(p_apellido, '')), ''),
    nullif(btrim(coalesce(p_zona, '')), ''),
    nullif(left(btrim(coalesce(p_bio, '')), 160), ''),
    nullif(btrim(coalesce(p_puesto_principal, '')), ''),
    nullif(btrim(coalesce(p_puesto_secundario, '')), ''),
    nullif(btrim(coalesce(p_pierna, '')), ''),
    coalesce(p_formatos, '{}'),
    nullif(btrim(coalesce(p_disponibilidad, '')), ''),
    p_fecha_nacimiento,
    now()
  )
  on conflict (usuario_id) do update set
    apellido = excluded.apellido,
    zona = excluded.zona,
    bio = excluded.bio,
    puesto_principal = excluded.puesto_principal,
    puesto_secundario = excluded.puesto_secundario,
    pierna = excluded.pierna,
    formatos = excluded.formatos,
    disponibilidad = excluded.disponibilidad,
    fecha_nacimiento = excluded.fecha_nacimiento,
    updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.guardar_mi_perfil(
  text, text, text, text, text, text, text, text, text, text, text[], text, date
) from public;
grant execute on function public.guardar_mi_perfil(
  text, text, text, text, text, text, text, text, text, text, text[], text, date
) to authenticated;
