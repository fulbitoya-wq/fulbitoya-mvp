-- Notificaciones in-app. El cliente no inserta filas: solo lee y marca leídas.
-- Preferencias: si no hay fila, el tipo se considera activo.

drop table if exists public.notificaciones cascade;
drop table if exists public.preferencias_notificacion cascade;

create table public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  tipo text not null,
  titulo text not null,
  cuerpo text not null,
  datos jsonb not null default '{}'::jsonb,
  leida_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notificaciones_tipo_chk check (tipo in (
    'invitacion_equipo',
    'solicitud_equipo',
    'respuesta_solicitud',
    'respuesta_invitacion',
    'capitan_transferido',
    'expulsado_equipo'
  ))
);

create index if not exists idx_notificaciones_usuario_created
  on public.notificaciones (usuario_id, created_at desc);

create index if not exists idx_notificaciones_usuario_unread
  on public.notificaciones (usuario_id)
  where leida_at is null;

create table public.preferencias_notificacion (
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  tipo text not null,
  activa boolean not null default true,
  primary key (usuario_id, tipo),
  constraint preferencias_notificacion_tipo_chk check (tipo in (
    'invitacion_equipo',
    'solicitud_equipo',
    'respuesta_solicitud',
    'respuesta_invitacion',
    'capitan_transferido',
    'expulsado_equipo'
  ))
);

alter table public.notificaciones enable row level security;
alter table public.preferencias_notificacion enable row level security;

drop policy if exists "Leer propias notificaciones" on public.notificaciones;
create policy "Leer propias notificaciones"
  on public.notificaciones for select to authenticated
  using (usuario_id = auth.uid());

drop policy if exists "Marcar propias notificaciones" on public.notificaciones;
create policy "Marcar propias notificaciones"
  on public.notificaciones for update to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

drop policy if exists "Leer propias preferencias notif" on public.preferencias_notificacion;
create policy "Leer propias preferencias notif"
  on public.preferencias_notificacion for select to authenticated
  using (usuario_id = auth.uid());

drop policy if exists "Upsert propias preferencias notif" on public.preferencias_notificacion;
create policy "Upsert propias preferencias notif"
  on public.preferencias_notificacion for insert to authenticated
  with check (usuario_id = auth.uid());

drop policy if exists "Update propias preferencias notif" on public.preferencias_notificacion;
create policy "Update propias preferencias notif"
  on public.preferencias_notificacion for update to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

grant select, update on table public.notificaciones to authenticated;
grant select, insert, update on table public.preferencias_notificacion to authenticated;

create or replace function public.etiqueta_jugador(p_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif('@' || u.username, '@'),
    nullif(btrim(u.nombre), ''),
    'Alguien'
  )
  from public.usuarios u
  where u.id = p_id;
$$;

create or replace function public.emitir_notificacion(
  p_usuario_id uuid,
  p_tipo text,
  p_titulo text,
  p_cuerpo text,
  p_datos jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_usuario_id is null then
    return;
  end if;
  if exists (
    select 1
    from public.preferencias_notificacion
    where usuario_id = p_usuario_id
      and tipo = p_tipo
      and activa = false
  ) then
    return;
  end if;

  insert into public.notificaciones (usuario_id, tipo, titulo, cuerpo, datos)
  values (
    p_usuario_id,
    p_tipo,
    p_titulo,
    p_cuerpo,
    coalesce(p_datos, '{}'::jsonb)
  );
end;
$$;

revoke insert, delete on table public.notificaciones from public, anon, authenticated;
revoke all on function public.emitir_notificacion(uuid, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.etiqueta_jugador(uuid) from public, anon, authenticated;

create or replace function public.marcar_todas_notificaciones_leidas()
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
  update public.notificaciones
  set leida_at = now()
  where usuario_id = uid and leida_at is null;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.set_preferencia_notificacion(p_tipo text, p_activa boolean)
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
  if p_tipo not in (
    'invitacion_equipo',
    'solicitud_equipo',
    'respuesta_solicitud',
    'respuesta_invitacion',
    'capitan_transferido',
    'expulsado_equipo'
  ) then
    return jsonb_build_object('ok', false, 'error', 'tipo_invalido');
  end if;

  insert into public.preferencias_notificacion (usuario_id, tipo, activa)
  values (uid, p_tipo, coalesce(p_activa, true))
  on conflict (usuario_id, tipo) do update
  set activa = excluded.activa;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.marcar_todas_notificaciones_leidas() from public;
revoke all on function public.set_preferencia_notificacion(text, boolean) from public;
grant execute on function public.marcar_todas_notificaciones_leidas() to authenticated;
grant execute on function public.set_preferencia_notificacion(text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- RPCs de equipos: emitir avisos
-- ---------------------------------------------------------------------------

create or replace function public.solicitar_ingreso_por_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_equipo uuid;
  v_nombre text;
  v_quien text;
  v_cap uuid;
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

  select e.nombre into v_nombre from public.equipos e where e.id = v_equipo;
  v_quien := coalesce(public.etiqueta_jugador(v_user), 'Alguien');

  for v_cap in
    select m.usuario_id
    from public.equipo_miembros m
    where m.equipo_id = v_equipo and m.rol = 'capitan' and m.estado = 'activo'
      and m.usuario_id is distinct from v_user
  loop
    perform public.emitir_notificacion(
      v_cap,
      'solicitud_equipo',
      'Pedido para entrar al equipo',
      v_quien || ' quiere sumarse a ' || coalesce(v_nombre, 'tu equipo') || '.',
      jsonb_build_object('equipo_id', v_equipo, 'destino', 'equipo')
    );
  end loop;

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

create or replace function public.responder_solicitud(p_solicitud_id uuid, p_aceptar boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_row public.equipo_solicitudes%rowtype;
  v_nombre text;
  v_quien text;
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

  select e.nombre into v_nombre from public.equipos e where e.id = v_row.equipo_id;
  v_quien := coalesce(public.etiqueta_jugador(v_user), 'Alguien');

  if not p_aceptar then
    update public.equipo_solicitudes
    set estado = 'rechazada', updated_at = now()
    where id = p_solicitud_id;

    if v_row.tipo = 'solicitud' then
      perform public.emitir_notificacion(
        v_row.usuario_id,
        'respuesta_solicitud',
        'No te aceptaron en el equipo',
        'No te sumaron a ' || coalesce(v_nombre, 'el equipo') || '.',
        jsonb_build_object('equipo_id', v_row.equipo_id, 'destino', 'equipos')
      );
    else
      perform public.emitir_notificacion(
        v_row.invitado_por,
        'respuesta_invitacion',
        'Rechazaron tu invitación',
        v_quien || ' no se sumó a ' || coalesce(v_nombre, 'el equipo') || '.',
        jsonb_build_object('equipo_id', v_row.equipo_id, 'destino', 'equipo')
      );
    end if;

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

  if v_row.tipo = 'solicitud' then
    perform public.emitir_notificacion(
      v_row.usuario_id,
      'respuesta_solicitud',
      'Te aceptaron en el equipo',
      'Ya formas parte de ' || coalesce(v_nombre, 'el equipo') || '.',
      jsonb_build_object('equipo_id', v_row.equipo_id, 'destino', 'equipo')
    );
  else
    perform public.emitir_notificacion(
      v_row.invitado_por,
      'respuesta_invitacion',
      'Aceptaron tu invitación',
      v_quien || ' se sumó a ' || coalesce(v_nombre, 'el equipo') || '.',
      jsonb_build_object('equipo_id', v_row.equipo_id, 'destino', 'equipo')
    );
  end if;

  return jsonb_build_object('ok', true, 'estado', 'aceptada');
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
  v_nombre text;
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

  select e.nombre into v_nombre from public.equipos e where e.id = p_equipo_id;

  perform public.emitir_notificacion(
    p_nuevo_capitan_id,
    'capitan_transferido',
    'Ahora sos capitán',
    'Te pasaron la capitanía de ' || coalesce(v_nombre, 'un equipo') || '.',
    jsonb_build_object('equipo_id', p_equipo_id, 'destino', 'equipo')
  );

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
  v_nombre text;
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

  select e.nombre into v_nombre from public.equipos e where e.id = p_equipo_id;

  perform public.emitir_notificacion(
    p_usuario_id,
    'expulsado_equipo',
    'Te sacaron de un equipo',
    'Ya no formas parte de ' || coalesce(v_nombre, 'el equipo') || '.',
    jsonb_build_object('equipo_id', p_equipo_id, 'destino', 'equipos')
  );

  return jsonb_build_object('ok', true);
end;
$$;
