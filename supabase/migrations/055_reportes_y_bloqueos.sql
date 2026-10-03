-- Bloqueo y denuncia entre jugadores (App Store 1.2: UGC).

create table if not exists public.jugador_bloqueos (
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  bloqueado_id uuid not null references public.usuarios(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (usuario_id, bloqueado_id),
  constraint jugador_bloqueos_no_auto_chk check (usuario_id <> bloqueado_id)
);

create index if not exists idx_jugador_bloqueos_bloqueado
  on public.jugador_bloqueos (bloqueado_id);

alter table public.jugador_bloqueos enable row level security;

drop policy if exists "Leer propios bloqueos" on public.jugador_bloqueos;
create policy "Leer propios bloqueos"
  on public.jugador_bloqueos
  for select
  to authenticated
  using (auth.uid() = usuario_id);

drop policy if exists "Crear propios bloqueos" on public.jugador_bloqueos;
create policy "Crear propios bloqueos"
  on public.jugador_bloqueos
  for insert
  to authenticated
  with check (auth.uid() = usuario_id and usuario_id <> bloqueado_id);

drop policy if exists "Borrar propios bloqueos" on public.jugador_bloqueos;
create policy "Borrar propios bloqueos"
  on public.jugador_bloqueos
  for delete
  to authenticated
  using (auth.uid() = usuario_id);

grant select, insert, delete on table public.jugador_bloqueos to authenticated;

create table if not exists public.jugador_reportes (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.usuarios(id) on delete cascade,
  reported_id uuid not null references public.usuarios(id) on delete cascade,
  motivo text not null,
  detalle text,
  estado text not null default 'pendiente',
  created_at timestamptz not null default now(),
  constraint jugador_reportes_no_auto_chk check (reporter_id <> reported_id),
  constraint jugador_reportes_motivo_chk check (
    motivo in ('acoso', 'perfil_falso', 'contenido', 'spam', 'otro')
  ),
  constraint jugador_reportes_estado_chk check (
    estado in ('pendiente', 'revisado', 'descartado')
  )
);

create unique index if not exists jugador_reportes_pendiente_uidx
  on public.jugador_reportes (reporter_id, reported_id)
  where estado = 'pendiente';

create index if not exists idx_jugador_reportes_reported
  on public.jugador_reportes (reported_id, created_at desc);

alter table public.jugador_reportes enable row level security;

drop policy if exists "Crear propio reporte" on public.jugador_reportes;
create policy "Crear propio reporte"
  on public.jugador_reportes
  for insert
  to authenticated
  with check (auth.uid() = reporter_id and reporter_id <> reported_id);

drop policy if exists "Leer propios reportes" on public.jugador_reportes;
create policy "Leer propios reportes"
  on public.jugador_reportes
  for select
  to authenticated
  using (auth.uid() = reporter_id);

grant select, insert on table public.jugador_reportes to authenticated;

create or replace function public.hay_bloqueo_entre(a uuid, b uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.jugador_bloqueos
    where (usuario_id = a and bloqueado_id = b)
       or (usuario_id = b and bloqueado_id = a)
  );
$$;

create or replace function public.bloquear_usuario(p_usuario_id uuid)
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
  if p_usuario_id is null then
    return jsonb_build_object('ok', false, 'error', 'usuario_requerido');
  end if;
  if p_usuario_id = uid then
    return jsonb_build_object('ok', false, 'error', 'no_auto');
  end if;
  if not exists (select 1 from public.usuarios u where u.id = p_usuario_id) then
    return jsonb_build_object('ok', false, 'error', 'usuario_no_encontrado');
  end if;

  insert into public.jugador_bloqueos (usuario_id, bloqueado_id)
  values (uid, p_usuario_id)
  on conflict do nothing;

  delete from public.jugador_favoritos
  where (usuario_id = uid and jugador_id = p_usuario_id)
     or (usuario_id = p_usuario_id and jugador_id = uid);

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.desbloquear_usuario(p_usuario_id uuid)
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
  delete from public.jugador_bloqueos
  where usuario_id = uid and bloqueado_id = p_usuario_id;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.reportar_usuario(p_usuario_id uuid, p_motivo text, p_detalle text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_motivo text;
  v_detalle text;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  if p_usuario_id is null then
    return jsonb_build_object('ok', false, 'error', 'usuario_requerido');
  end if;
  if p_usuario_id = uid then
    return jsonb_build_object('ok', false, 'error', 'no_auto');
  end if;
  if not exists (select 1 from public.usuarios u where u.id = p_usuario_id) then
    return jsonb_build_object('ok', false, 'error', 'usuario_no_encontrado');
  end if;

  v_motivo := btrim(coalesce(p_motivo, ''));
  if v_motivo not in ('acoso', 'perfil_falso', 'contenido', 'spam', 'otro') then
    return jsonb_build_object('ok', false, 'error', 'motivo_invalido');
  end if;

  v_detalle := nullif(btrim(coalesce(p_detalle, '')), '');
  if v_detalle is not null and char_length(v_detalle) > 400 then
    v_detalle := left(v_detalle, 400);
  end if;

  insert into public.jugador_reportes (reporter_id, reported_id, motivo, detalle)
  values (uid, p_usuario_id, v_motivo, v_detalle);

  return jsonb_build_object('ok', true);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'ya_reportado');
end;
$$;

create or replace function public.listar_usuarios_bloqueados()
returns table (id uuid, nombre text, username text)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.nombre, u.username
  from public.jugador_bloqueos b
  join public.usuarios u on u.id = b.bloqueado_id
  where b.usuario_id = auth.uid()
  order by b.created_at desc;
$$;

revoke all on function public.hay_bloqueo_entre(uuid, uuid) from public;
revoke all on function public.bloquear_usuario(uuid) from public;
revoke all on function public.desbloquear_usuario(uuid) from public;
revoke all on function public.reportar_usuario(uuid, text, text) from public;
revoke all on function public.listar_usuarios_bloqueados() from public;
grant execute on function public.bloquear_usuario(uuid) to authenticated;
grant execute on function public.desbloquear_usuario(uuid) to authenticated;
grant execute on function public.reportar_usuario(uuid, text, text) to authenticated;
grant execute on function public.listar_usuarios_bloqueados() to authenticated;

drop view if exists public.jugador_busqueda_contratacion;
drop view if exists public.jugador_busqueda_publica;

create view public.jugador_busqueda_publica as
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
  and (auth.uid() is null or u.id <> auth.uid())
  and (
    auth.uid() is null
    or not exists (
      select 1
      from public.jugador_bloqueos b
      where (b.usuario_id = auth.uid() and b.bloqueado_id = u.id)
         or (b.usuario_id = u.id and b.bloqueado_id = auth.uid())
    )
  );

alter view public.jugador_busqueda_publica set (security_invoker = false);
grant select on public.jugador_busqueda_publica to anon, authenticated;

create view public.jugador_busqueda_contratacion as
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
  and (auth.uid() is null or u.id <> auth.uid())
  and (
    auth.uid() is null
    or not exists (
      select 1
      from public.jugador_bloqueos b
      where (b.usuario_id = auth.uid() and b.bloqueado_id = u.id)
         or (b.usuario_id = u.id and b.bloqueado_id = auth.uid())
    )
  );

alter view public.jugador_busqueda_contratacion set (security_invoker = false);
grant select on public.jugador_busqueda_contratacion to authenticated;

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
  v_nombre text;
  v_quien text;
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
  where u.id::text = btrim(p_identificador)
     or u.username = v_id
     or u.telefono = btrim(p_identificador)
  limit 1;

  if v_target is null then
    return jsonb_build_object('ok', false, 'error', 'usuario_no_encontrado');
  end if;
  if v_target = v_user then
    return jsonb_build_object('ok', false, 'error', 'no_auto_invitar');
  end if;

  if public.hay_bloqueo_entre(v_user, v_target) then
    return jsonb_build_object('ok', false, 'error', 'bloqueado');
  end if;

  if exists (
    select 1 from public.equipo_miembros
    where equipo_id = p_equipo_id and usuario_id = v_target and estado = 'activo'
  ) then
    return jsonb_build_object('ok', false, 'error', 'ya_es_miembro');
  end if;

  insert into public.equipo_solicitudes (equipo_id, usuario_id, invitado_por, tipo, estado)
  values (p_equipo_id, v_target, v_user, 'invitacion', 'pendiente');

  select e.nombre into v_nombre from public.equipos e where e.id = p_equipo_id;
  v_quien := coalesce(public.etiqueta_jugador(v_user), 'Alguien');

  perform public.emitir_notificacion(
    v_target,
    'invitacion_equipo',
    'Te invitaron a un equipo',
    v_quien || ' te invitó a ' || coalesce(v_nombre, 'un equipo') || '.',
    jsonb_build_object('equipo_id', p_equipo_id, 'destino', 'inbox')
  );

  return jsonb_build_object('ok', true, 'usuario_id', v_target);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'ya_pendiente');
end;
$$;
