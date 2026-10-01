-- Equipos unificados: username, plantel, solicitudes, enlaces y RPCs.
-- No borra equipo_invitaciones ni team_invitations (quedan sin uso).

-- ---------------------------------------------------------------------------
-- usuarios.username
-- ---------------------------------------------------------------------------
alter table public.usuarios
  add column if not exists username text;

alter table public.usuarios drop constraint if exists usuarios_username_format_chk;
alter table public.usuarios
  add constraint usuarios_username_format_chk
  check (
    username is null
    or username ~ '^[a-z0-9_]{3,20}$'
  );

create unique index if not exists uq_usuarios_username
  on public.usuarios (username)
  where username is not null;

-- ---------------------------------------------------------------------------
-- equipos: columnas nuevas + backfill
-- ---------------------------------------------------------------------------
alter table public.equipos
  add column if not exists escudo_url text,
  add column if not exists formato_habitual public.match_tipo,
  add column if not exists activo boolean not null default true;

update public.equipos
set escudo_url = coalesce(escudo_url, uniforme_imagen_url)
where escudo_url is null and uniforme_imagen_url is not null;

update public.equipos
set formato_habitual = case tipo_equipo
  when 5 then 'f5'::public.match_tipo
  when 7 then 'f7'::public.match_tipo
  when 9 then 'f9'::public.match_tipo
  when 11 then 'f11'::public.match_tipo
  else coalesce(formato_habitual, 'f5'::public.match_tipo)
end
where formato_habitual is null;

-- provincia_id / partido_id / localidad_id ya existen (010)

-- ---------------------------------------------------------------------------
-- equipo_miembros: rol + estado (se mantiene role/es_capitan en sync para la UI vieja)
-- ---------------------------------------------------------------------------
alter table public.equipo_miembros
  add column if not exists rol text,
  add column if not exists estado text;

update public.equipo_miembros
set
  rol = case
    when coalesce(role, '') = 'captain' or es_capitan then 'capitan'
    else 'jugador'
  end,
  estado = coalesce(estado, 'activo')
where rol is null or estado is null;

alter table public.equipo_miembros
  alter column rol set default 'jugador',
  alter column estado set default 'activo';

alter table public.equipo_miembros drop constraint if exists equipo_miembros_rol_chk;
alter table public.equipo_miembros
  add constraint equipo_miembros_rol_chk check (rol in ('capitan', 'jugador'));

alter table public.equipo_miembros drop constraint if exists equipo_miembros_estado_chk;
alter table public.equipo_miembros
  add constraint equipo_miembros_estado_chk check (estado in ('activo', 'salio'));

alter table public.equipo_miembros
  alter column rol set not null,
  alter column estado set not null;

create unique index if not exists uq_equipo_un_capitan_activo
  on public.equipo_miembros (equipo_id)
  where rol = 'capitan' and estado = 'activo';

create or replace function public.equipo_miembros_sync_capitan()
returns trigger
language plpgsql
as $$
begin
  if new.rol is not null then
    new.es_capitan := (new.rol = 'capitan');
    new.role := case when new.rol = 'capitan' then 'captain' else 'player' end;
  elsif new.role is not null then
    new.es_capitan := (new.role = 'captain');
    new.rol := case when new.role = 'captain' then 'capitan' else 'jugador' end;
  else
    new.es_capitan := coalesce(new.es_capitan, false);
    new.rol := case when new.es_capitan then 'capitan' else 'jugador' end;
    new.role := case when new.es_capitan then 'captain' else 'player' end;
  end if;
  new.estado := coalesce(new.estado, 'activo');
  return new;
end;
$$;

drop trigger if exists equipo_miembros_sync_capitan on public.equipo_miembros;
create trigger equipo_miembros_sync_capitan
  before insert or update on public.equipo_miembros
  for each row execute function public.equipo_miembros_sync_capitan();

-- ---------------------------------------------------------------------------
-- Helpers sin recursión RLS
-- ---------------------------------------------------------------------------
create or replace function public.es_miembro(p_equipo_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.equipo_miembros em
    where em.equipo_id = p_equipo_id
      and em.usuario_id = auth.uid()
      and em.estado = 'activo'
  );
$$;

create or replace function public.es_capitan(p_equipo_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.equipo_miembros em
    where em.equipo_id = p_equipo_id
      and em.usuario_id = auth.uid()
      and em.rol = 'capitan'
      and em.estado = 'activo'
  );
$$;

revoke all on function public.es_miembro(uuid) from public;
revoke all on function public.es_capitan(uuid) from public;
grant execute on function public.es_miembro(uuid) to authenticated;
grant execute on function public.es_capitan(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- equipo_solicitudes (reemplazo lógico de las dos tablas viejas)
-- ---------------------------------------------------------------------------
create table if not exists public.equipo_solicitudes (
  id uuid primary key default gen_random_uuid(),
  equipo_id uuid not null references public.equipos(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  invitado_por uuid references public.usuarios(id) on delete set null,
  tipo text not null check (tipo in ('solicitud', 'invitacion')),
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'aceptada', 'rechazada', 'cancelada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_equipo_solicitudes_equipo on public.equipo_solicitudes(equipo_id);
create index if not exists idx_equipo_solicitudes_usuario on public.equipo_solicitudes(usuario_id);

create unique index if not exists uq_equipo_solicitud_pendiente
  on public.equipo_solicitudes (equipo_id, usuario_id)
  where estado = 'pendiente';

-- Migrar equipo_invitaciones (solo filas con usuario conocido)
insert into public.equipo_solicitudes (
  equipo_id, usuario_id, invitado_por, tipo, estado, created_at, updated_at
)
select
  ei.equipo_id,
  ei.invitado_id,
  ei.invitado_por,
  'invitacion',
  case ei.estado
    when 'aceptada' then 'aceptada'
    when 'rechazada' then 'rechazada'
    else 'pendiente'
  end,
  ei.created_at,
  ei.updated_at
from public.equipo_invitaciones ei
where ei.invitado_id is not null
  and not exists (
    select 1 from public.equipo_solicitudes s
    where s.equipo_id = ei.equipo_id
      and s.usuario_id = ei.invitado_id
      and s.estado = 'pendiente'
      and ei.estado = 'pendiente'
  );

-- Migrar team_invitations
insert into public.equipo_solicitudes (
  equipo_id, usuario_id, invitado_por, tipo, estado, created_at, updated_at
)
select
  ti.equipo_id,
  ti.invited_user_id,
  ti.invited_by,
  'invitacion',
  case ti.status
    when 'accepted' then 'aceptada'
    when 'rejected' then 'rechazada'
    else 'pendiente'
  end,
  ti.created_at,
  ti.created_at
from public.team_invitations ti
where ti.invited_user_id is not null
  and not exists (
    select 1
    from public.equipo_solicitudes s
    where s.equipo_id = ti.equipo_id
      and s.usuario_id = ti.invited_user_id
      and s.estado = case ti.status
        when 'accepted' then 'aceptada'
        when 'rejected' then 'rechazada'
        else 'pendiente'
      end
  );

-- ---------------------------------------------------------------------------
-- equipo_enlaces
-- ---------------------------------------------------------------------------
create table if not exists public.equipo_enlaces (
  id uuid primary key default gen_random_uuid(),
  equipo_id uuid not null references public.equipos(id) on delete cascade,
  token text not null unique,
  activo boolean not null default true,
  creado_por uuid not null references public.usuarios(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_equipo_enlaces_equipo on public.equipo_enlaces(equipo_id);
create unique index if not exists uq_equipo_enlace_activo
  on public.equipo_enlaces (equipo_id)
  where activo = true;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------
create or replace function public.crear_equipo(
  p_nombre text,
  p_escudo_url text default null,
  p_formato public.match_tipo default 'f5',
  p_provincia_id uuid default null,
  p_partido_id uuid default null,
  p_localidad_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  if p_nombre is null or btrim(p_nombre) = '' then
    return jsonb_build_object('ok', false, 'error', 'nombre_requerido');
  end if;

  insert into public.equipos (
    nombre, escudo_url, formato_habitual, provincia_id, partido_id, localidad_id,
    creado_por, activo, uniforme_imagen_url
  )
  values (
    btrim(p_nombre), p_escudo_url, p_formato, p_provincia_id, p_partido_id, p_localidad_id,
    v_user, true, p_escudo_url
  )
  returning id into v_id;

  insert into public.equipo_miembros (equipo_id, usuario_id, rol, estado)
  values (v_id, v_user, 'capitan', 'activo');

  return jsonb_build_object('ok', true, 'equipo_id', v_id);
end;
$$;

create or replace function public.generar_enlace_equipo(p_equipo_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_token text;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  if not public.es_capitan(p_equipo_id) then
    return jsonb_build_object('ok', false, 'error', 'no_capitan');
  end if;

  update public.equipo_enlaces
  set activo = false
  where equipo_id = p_equipo_id and activo = true;

  v_token := encode(gen_random_bytes(18), 'hex');

  insert into public.equipo_enlaces (equipo_id, token, activo, creado_por)
  values (p_equipo_id, v_token, true, v_user);

  return jsonb_build_object('ok', true, 'token', v_token);
end;
$$;

create or replace function public.solicitar_ingreso_por_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_equipo uuid;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;

  select equipo_id into v_equipo
  from public.equipo_enlaces
  where token = p_token and activo = true;

  if v_equipo is null then
    return jsonb_build_object('ok', false, 'error', 'enlace_invalido');
  end if;

  if exists (
    select 1 from public.equipo_miembros
    where equipo_id = v_equipo and usuario_id = v_user and estado = 'activo'
  ) then
    return jsonb_build_object('ok', false, 'error', 'ya_es_miembro');
  end if;

  insert into public.equipo_solicitudes (equipo_id, usuario_id, tipo, estado)
  values (v_equipo, v_user, 'solicitud', 'pendiente');

  return jsonb_build_object('ok', true, 'equipo_id', v_equipo);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'ya_pendiente');
end;
$$;

create or replace function public.invitar_jugador(p_equipo_id uuid, p_identificador text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_target uuid;
  v_id text;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  if not public.es_capitan(p_equipo_id) then
    return jsonb_build_object('ok', false, 'error', 'no_capitan');
  end if;

  v_id := lower(btrim(p_identificador));
  if v_id = '' then
    return jsonb_build_object('ok', false, 'error', 'identificador_requerido');
  end if;

  select u.id into v_target
  from public.usuarios u
  where u.username = v_id or u.telefono = btrim(p_identificador)
  limit 1;

  if v_target is null then
    return jsonb_build_object('ok', false, 'error', 'usuario_no_encontrado');
  end if;
  if v_target = v_user then
    return jsonb_build_object('ok', false, 'error', 'no_auto_invitar');
  end if;

  if exists (
    select 1 from public.equipo_miembros
    where equipo_id = p_equipo_id and usuario_id = v_target and estado = 'activo'
  ) then
    return jsonb_build_object('ok', false, 'error', 'ya_es_miembro');
  end if;

  insert into public.equipo_solicitudes (equipo_id, usuario_id, invitado_por, tipo, estado)
  values (p_equipo_id, v_target, v_user, 'invitacion', 'pendiente');

  return jsonb_build_object('ok', true, 'usuario_id', v_target);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'ya_pendiente');
end;
$$;

create or replace function public.responder_solicitud(p_solicitud_id uuid, p_aceptar boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_row public.equipo_solicitudes%rowtype;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;

  select * into v_row from public.equipo_solicitudes where id = p_solicitud_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_existe');
  end if;
  if v_row.estado is distinct from 'pendiente' then
    return jsonb_build_object('ok', false, 'error', 'no_pendiente');
  end if;

  if v_row.tipo = 'solicitud' then
    if not public.es_capitan(v_row.equipo_id) then
      return jsonb_build_object('ok', false, 'error', 'no_capitan');
    end if;
  elsif v_row.tipo = 'invitacion' then
    if v_row.usuario_id is distinct from v_user then
      return jsonb_build_object('ok', false, 'error', 'no_destinatario');
    end if;
  end if;

  if not p_aceptar then
    update public.equipo_solicitudes
    set estado = 'rechazada', updated_at = now()
    where id = p_solicitud_id;
    return jsonb_build_object('ok', true, 'estado', 'rechazada');
  end if;

  update public.equipo_solicitudes
  set estado = 'aceptada', updated_at = now()
  where id = p_solicitud_id;

  if exists (
    select 1 from public.equipo_miembros
    where equipo_id = v_row.equipo_id and usuario_id = v_row.usuario_id
  ) then
    update public.equipo_miembros
    set estado = 'activo', rol = 'jugador'
    where equipo_id = v_row.equipo_id and usuario_id = v_row.usuario_id;
  else
    insert into public.equipo_miembros (equipo_id, usuario_id, rol, estado)
    values (v_row.equipo_id, v_row.usuario_id, 'jugador', 'activo');
  end if;

  return jsonb_build_object('ok', true, 'estado', 'aceptada');
end;
$$;

create or replace function public.salir_del_equipo(p_equipo_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  if public.es_capitan(p_equipo_id) then
    return jsonb_build_object('ok', false, 'error', 'capitan_debe_transferir');
  end if;
  if not public.es_miembro(p_equipo_id) then
    return jsonb_build_object('ok', false, 'error', 'no_miembro');
  end if;

  update public.equipo_miembros
  set estado = 'salio'
  where equipo_id = p_equipo_id and usuario_id = v_user and estado = 'activo';

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.transferir_capitania(p_equipo_id uuid, p_nuevo_capitan_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  if not public.es_capitan(p_equipo_id) then
    return jsonb_build_object('ok', false, 'error', 'no_capitan');
  end if;
  if p_nuevo_capitan_id = v_user then
    return jsonb_build_object('ok', false, 'error', 'mismo_usuario');
  end if;
  if not exists (
    select 1 from public.equipo_miembros
    where equipo_id = p_equipo_id and usuario_id = p_nuevo_capitan_id and estado = 'activo'
  ) then
    return jsonb_build_object('ok', false, 'error', 'destino_no_miembro');
  end if;

  update public.equipo_miembros
  set rol = 'jugador'
  where equipo_id = p_equipo_id and usuario_id = v_user;

  update public.equipo_miembros
  set rol = 'capitan'
  where equipo_id = p_equipo_id and usuario_id = p_nuevo_capitan_id;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.expulsar_jugador(p_equipo_id uuid, p_usuario_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  if not public.es_capitan(p_equipo_id) then
    return jsonb_build_object('ok', false, 'error', 'no_capitan');
  end if;
  if p_usuario_id = v_user then
    return jsonb_build_object('ok', false, 'error', 'no_auto_expulsar');
  end if;

  update public.equipo_miembros
  set estado = 'salio', rol = 'jugador'
  where equipo_id = p_equipo_id and usuario_id = p_usuario_id and estado = 'activo';

  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_miembro');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.crear_equipo(text, text, public.match_tipo, uuid, uuid, uuid) from public;
revoke all on function public.generar_enlace_equipo(uuid) from public;
revoke all on function public.solicitar_ingreso_por_token(text) from public;
revoke all on function public.invitar_jugador(uuid, text) from public;
revoke all on function public.responder_solicitud(uuid, boolean) from public;
revoke all on function public.salir_del_equipo(uuid) from public;
revoke all on function public.transferir_capitania(uuid, uuid) from public;
revoke all on function public.expulsar_jugador(uuid, uuid) from public;

grant execute on function public.crear_equipo(text, text, public.match_tipo, uuid, uuid, uuid) to authenticated;
grant execute on function public.generar_enlace_equipo(uuid) to authenticated;
grant execute on function public.solicitar_ingreso_por_token(text) to authenticated;
grant execute on function public.invitar_jugador(uuid, text) to authenticated;
grant execute on function public.responder_solicitud(uuid, boolean) to authenticated;
grant execute on function public.salir_del_equipo(uuid) to authenticated;
grant execute on function public.transferir_capitania(uuid, uuid) to authenticated;
grant execute on function public.expulsar_jugador(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.equipo_solicitudes enable row level security;
alter table public.equipo_enlaces enable row level security;

drop policy if exists "Ver equipos" on public.equipos;
create policy "Ver equipos activos autenticados"
  on public.equipos for select
  to authenticated
  using (activo = true or creado_por = auth.uid() or public.es_miembro(id));

drop policy if exists "Anyone can read team members" on public.equipo_miembros;
drop policy if exists "Ver miembros del equipo" on public.equipo_miembros;
drop policy if exists "Users can insert themselves as member" on public.equipo_miembros;
drop policy if exists "Agregar miembro solo capitán" on public.equipo_miembros;
drop policy if exists "Eliminar miembro (capitán o uno mismo)" on public.equipo_miembros;

create policy "Leer miembros equipos activos"
  on public.equipo_miembros for select
  to authenticated
  using (
    exists (
      select 1 from public.equipos e
      where e.id = equipo_miembros.equipo_id
        and (e.activo = true or public.es_miembro(e.id))
    )
  );

-- Sin INSERT/UPDATE/DELETE de cliente sobre miembros ni solicitudes ni enlaces

drop policy if exists "Leer solicitudes propias" on public.equipo_solicitudes;
create policy "Leer solicitudes involucrados"
  on public.equipo_solicitudes for select
  to authenticated
  using (
    usuario_id = auth.uid()
    or invitado_por = auth.uid()
    or public.es_capitan(equipo_id)
  );

drop policy if exists "Leer enlace si miembro" on public.equipo_enlaces;
create policy "Leer enlace si miembro"
  on public.equipo_enlaces for select
  to authenticated
  using (public.es_miembro(equipo_id));

-- equipos: el cliente no inserta (usa RPC). Capitán puede editar ficha.
drop policy if exists "Crear equipo" on public.equipos;
drop policy if exists "Editar equipo solo creador" on public.equipos;
create policy "Capitan edita equipo"
  on public.equipos for update
  to authenticated
  using (public.es_capitan(id))
  with check (public.es_capitan(id));
