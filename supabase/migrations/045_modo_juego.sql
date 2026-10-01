-- Modo de juego (sin cobrar / cobro por partido) + solicitud de eliminación de cuenta.
-- No expone tarifa en jugador_busqueda_publica.

alter table public.jugador_perfiles
  add column if not exists modo_juego text not null default 'sin_cobrar';

alter table public.jugador_perfiles
  add column if not exists tarifa_partido integer;

alter table public.jugador_perfiles drop constraint if exists jugador_perfiles_modo_juego_chk;
alter table public.jugador_perfiles
  add constraint jugador_perfiles_modo_juego_chk
  check (modo_juego in ('sin_cobrar', 'cobro_por_partido'));

alter table public.jugador_perfiles drop constraint if exists jugador_perfiles_tarifa_chk;
alter table public.jugador_perfiles
  add constraint jugador_perfiles_tarifa_chk
  check (
    (modo_juego = 'sin_cobrar' and tarifa_partido is null)
    or (
      modo_juego = 'cobro_por_partido'
      and tarifa_partido is not null
      and tarifa_partido >= 1000
      and tarifa_partido <= 500000
    )
  );

-- Vista pública: igual que 044, sin tarifa ni modo de cobro.
create or replace view public.jugador_busqueda_publica as
select
  u.id,
  u.nombre,
  u.username,
  u.avatar_url,
  jp.zona,
  jp.puesto_principal,
  jp.puesto_secundario,
  jp.pierna,
  jp.formatos
from public.usuarios u
join public.jugador_perfiles jp on jp.usuario_id = u.id
where jp.busca_equipo = true
  and u.username is not null;

alter view public.jugador_busqueda_publica set (security_invoker = false);
grant select on public.jugador_busqueda_publica to anon, authenticated;

-- Lista para cuando featureFlags.contratacion_habilitada = true. La app aún no la consulta.
create or replace view public.jugador_busqueda_contratacion as
select
  u.id,
  u.nombre,
  u.username,
  u.avatar_url,
  jp.zona,
  jp.puesto_principal,
  jp.puesto_secundario,
  jp.pierna,
  jp.formatos,
  jp.modo_juego,
  jp.tarifa_partido
from public.usuarios u
join public.jugador_perfiles jp on jp.usuario_id = u.id
where jp.busca_equipo = true
  and u.username is not null;

alter view public.jugador_busqueda_contratacion set (security_invoker = false);
grant select on public.jugador_busqueda_contratacion to authenticated;

drop function if exists public.guardar_mi_perfil(
  text, text, text, text, text, text, text, text, text, text, text[], text, date
);

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
  p_fecha_nacimiento date,
  p_busca_equipo boolean default false,
  p_modo_juego text default 'sin_cobrar',
  p_tarifa_partido integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_username text;
  v_modo text;
  v_tarifa integer;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  v_modo := case
    when p_modo_juego in ('sin_cobrar', 'cobro_por_partido') then p_modo_juego
    else 'sin_cobrar'
  end;
  v_tarifa := case
    when v_modo = 'cobro_por_partido' then p_tarifa_partido
    else null
  end;

  if v_modo = 'cobro_por_partido' and (v_tarifa is null or v_tarifa < 1000 or v_tarifa > 500000) then
    return jsonb_build_object('ok', false, 'error', 'tarifa_invalida');
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
    busca_equipo,
    modo_juego,
    tarifa_partido,
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
    coalesce(p_busca_equipo, false),
    v_modo,
    v_tarifa,
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
    busca_equipo = excluded.busca_equipo,
    modo_juego = excluded.modo_juego,
    tarifa_partido = excluded.tarifa_partido,
    updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.guardar_mi_perfil(
  text, text, text, text, text, text, text, text, text, text, text[], text, date, boolean, text, integer
) from public;
grant execute on function public.guardar_mi_perfil(
  text, text, text, text, text, text, text, text, text, text, text[], text, date, boolean, text, integer
) to authenticated;

create or replace function public.set_modo_juego(p_modo text, p_tarifa integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_modo text;
  v_tarifa integer;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;

  v_modo := case
    when p_modo in ('sin_cobrar', 'cobro_por_partido') then p_modo
    else 'sin_cobrar'
  end;
  v_tarifa := case when v_modo = 'cobro_por_partido' then p_tarifa else null end;

  if v_modo = 'cobro_por_partido' and (v_tarifa is null or v_tarifa < 1000 or v_tarifa > 500000) then
    return jsonb_build_object('ok', false, 'error', 'tarifa_invalida');
  end if;

  insert into public.jugador_perfiles (usuario_id, modo_juego, tarifa_partido, updated_at)
  values (uid, v_modo, v_tarifa, now())
  on conflict (usuario_id) do update set
    modo_juego = excluded.modo_juego,
    tarifa_partido = excluded.tarifa_partido,
    updated_at = now();

  return jsonb_build_object('ok', true, 'modo_juego', v_modo, 'tarifa_partido', v_tarifa);
end;
$$;

revoke all on function public.set_modo_juego(text, integer) from public;
grant execute on function public.set_modo_juego(text, integer) to authenticated;

drop table if exists public.cuenta_eliminacion_solicitudes cascade;

create table public.cuenta_eliminacion_solicitudes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'procesada', 'cancelada')),
  created_at timestamptz not null default now()
);

create unique index if not exists uq_cuenta_eliminacion_pendiente
  on public.cuenta_eliminacion_solicitudes (usuario_id)
  where estado = 'pendiente';

alter table public.cuenta_eliminacion_solicitudes enable row level security;

drop policy if exists "Leer propia solicitud de baja" on public.cuenta_eliminacion_solicitudes;
create policy "Leer propia solicitud de baja"
  on public.cuenta_eliminacion_solicitudes
  for select
  to authenticated
  using (auth.uid() = usuario_id);

grant select on table public.cuenta_eliminacion_solicitudes to authenticated;

create or replace function public.solicitar_eliminacion_cuenta()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;

  if exists (
    select 1 from public.cuenta_eliminacion_solicitudes
    where usuario_id = uid and estado = 'pendiente'
  ) then
    return jsonb_build_object('ok', true, 'ya_pendiente', true, 'plazo_dias', 30);
  end if;

  insert into public.cuenta_eliminacion_solicitudes (usuario_id, estado)
  values (uid, 'pendiente');

  return jsonb_build_object('ok', true, 'ya_pendiente', false, 'plazo_dias', 30);
exception
  when unique_violation then
    return jsonb_build_object('ok', true, 'ya_pendiente', true, 'plazo_dias', 30);
end;
$$;

revoke all on function public.solicitar_eliminacion_cuenta() from public;
grant execute on function public.solicitar_eliminacion_cuenta() to authenticated;
