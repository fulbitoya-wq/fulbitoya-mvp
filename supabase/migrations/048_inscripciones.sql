-- Inscripción de equipos a desafíos (sin cobro). Estados listos para pendiente_pago.
-- No toca webhook ni reservas de Mercado Pago.

alter table public.desafios
  add column if not exists cierre_inscripcion timestamptz,
  add column if not exists plazo_cancelacion timestamptz;

alter table public.desafio_inscripciones
  add column if not exists capitan_id uuid references public.usuarios(id) on delete set null,
  add column if not exists estado text,
  add column if not exists confirmada_at timestamptz,
  add column if not exists cancelada_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

update public.desafio_inscripciones
set estado = coalesce(estado, 'confirmada'),
    confirmada_at = coalesce(confirmada_at, created_at)
where estado is null;

alter table public.desafio_inscripciones
  drop constraint if exists desafio_inscripciones_estado_chk;

alter table public.desafio_inscripciones
  add constraint desafio_inscripciones_estado_chk
  check (estado in ('pendiente_pago', 'confirmada', 'cancelada', 'expirada'));

alter table public.desafio_inscripciones
  alter column estado set default 'confirmada';

alter table public.desafio_inscripciones
  alter column estado set not null;

update public.desafio_inscripciones i
set capitan_id = m.usuario_id
from public.equipo_miembros m
where i.capitan_id is null
  and m.equipo_id = i.equipo_id
  and m.rol = 'capitan'
  and m.estado = 'activo';

-- Datos de prueba que estaban en la descripción.
insert into public.desafio_inscripciones (desafio_id, equipo_id, capitan_id, estado, confirmada_at)
select
  d.id,
  (regexp_match(d.descripcion, 'equipo:([0-9a-f-]{36})'))[1]::uuid,
  m.usuario_id,
  'confirmada',
  now()
from public.desafios d
join public.equipo_miembros m
  on m.equipo_id = (regexp_match(d.descripcion, 'equipo:([0-9a-f-]{36})'))[1]::uuid
 and m.rol = 'capitan'
 and m.estado = 'activo'
where d.descripcion ~* 'equipo:[0-9a-f-]{36}'
on conflict (desafio_id, equipo_id) do nothing;

drop table if exists public.desafio_convocados cascade;
create table public.desafio_convocados (
  id uuid primary key default gen_random_uuid(),
  inscripcion_id uuid not null references public.desafio_inscripciones(id) on delete cascade,
  desafio_id uuid not null references public.desafios(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  presente boolean,
  created_at timestamptz not null default now(),
  unique (inscripcion_id, usuario_id),
  unique (desafio_id, usuario_id)
);

create index if not exists idx_desafio_convocados_desafio
  on public.desafio_convocados (desafio_id);

alter table public.desafio_convocados enable row level security;

drop policy if exists "Leer convocados involucrados" on public.desafio_convocados;
create policy "Leer convocados involucrados"
  on public.desafio_convocados for select to authenticated
  using (
    usuario_id = auth.uid()
    or exists (
      select 1
      from public.desafio_inscripciones i
      where i.id = desafio_convocados.inscripcion_id
        and (
          public.es_miembro(i.equipo_id)
          or exists (
            select 1 from public.desafios d
            where d.id = i.desafio_id and d.owner_id = auth.uid()
          )
        )
    )
  );

grant select on table public.desafio_convocados to authenticated;
revoke insert, update, delete on table public.desafio_convocados from public, anon, authenticated;
revoke insert, update, delete on table public.desafio_inscripciones from public, anon, authenticated;
grant select on table public.desafio_inscripciones to authenticated, anon;

drop policy if exists "Desafios publicos abiertos" on public.desafios;
create policy "Desafios publicos abiertos"
  on public.desafios
  for select
  using (
    estado in ('abierto', 'completo')
    or owner_id = auth.uid()
  );

-- Tipos de aviso nuevos (fase 3 + inscripción)
alter table public.notificaciones drop constraint if exists notificaciones_tipo_chk;
alter table public.notificaciones
  add constraint notificaciones_tipo_chk check (tipo in (
    'invitacion_equipo',
    'solicitud_equipo',
    'respuesta_solicitud',
    'respuesta_invitacion',
    'capitan_transferido',
    'expulsado_equipo',
    'convocado_partido',
    'baja_convocatoria',
    'inscripcion_desafio',
    'inscripcion_cancelada'
  ));

alter table public.preferencias_notificacion drop constraint if exists preferencias_notificacion_tipo_chk;
alter table public.preferencias_notificacion
  add constraint preferencias_notificacion_tipo_chk check (tipo in (
    'invitacion_equipo',
    'solicitud_equipo',
    'respuesta_solicitud',
    'respuesta_invitacion',
    'capitan_transferido',
    'expulsado_equipo',
    'convocado_partido',
    'baja_convocatoria',
    'inscripcion_desafio',
    'inscripcion_cancelada'
  ));

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
    'expulsado_equipo',
    'convocado_partido',
    'baja_convocatoria',
    'inscripcion_desafio',
    'inscripcion_cancelada'
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

create or replace function public.minimo_convocados(p_tipo text)
returns integer
language sql
immutable
as $$
  select case lower(coalesce(p_tipo, 'f5'))
    when 'f11' then 11
    when 'f9' then 9
    when 'f7' then 7
    else 5
  end;
$$;

create or replace function public.ahora_argentina()
returns timestamp
language sql
stable
as $$
  select timezone('America/Argentina/Buenos_Aires', now());
$$;

-- ---------------------------------------------------------------------------
-- inscribir_equipo
-- ---------------------------------------------------------------------------
create or replace function public.inscribir_equipo(
  p_desafio_id uuid,
  p_equipo_id uuid,
  p_convocados uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_d public.desafios%rowtype;
  v_inicio timestamp;
  v_cierre timestamp;
  v_now timestamp;
  v_ocupados int;
  v_min int;
  v_conv uuid[];
  v_uid uuid;
  v_faltan text := '';
  v_menores text := '';
  v_label text;
  v_hoy date;
  v_fn date;
  v_estado text;
  v_insc uuid;
  v_prev public.desafio_inscripciones%rowtype;
  v_eq_nombre text;
  v_pagos boolean := false; -- featureFlags.pagos_habilitados
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  if not public.es_capitan(p_equipo_id) then
    return jsonb_build_object('ok', false, 'error', 'no_capitan');
  end if;

  select * into v_d from public.desafios where id = p_desafio_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'desafio_no_existe');
  end if;
  if v_d.estado not in ('abierto', 'completo') then
    return jsonb_build_object('ok', false, 'error', 'desafio_cerrado');
  end if;

  v_now := public.ahora_argentina();
  v_inicio := v_d.fecha::timestamp + v_d.hora_inicio;
  v_cierre := case
    when v_d.cierre_inscripcion is not null then timezone('America/Argentina/Buenos_Aires', v_d.cierre_inscripcion)
    else v_inicio - interval '2 hours'
  end;
  if v_now >= v_cierre then
    return jsonb_build_object('ok', false, 'error', 'inscripcion_cerrada');
  end if;

  select array_agg(distinct x) into v_conv
  from unnest(coalesce(p_convocados, '{}'::uuid[])) as x
  where x is not null;

  if v_conv is null or cardinality(v_conv) = 0 then
    return jsonb_build_object('ok', false, 'error', 'convocados_requeridos');
  end if;

  v_min := public.minimo_convocados(v_d.tipo::text);
  if cardinality(v_conv) < v_min then
    return jsonb_build_object(
      'ok', false,
      'error', 'minimo_convocados',
      'minimo', v_min
    );
  end if;

  foreach v_uid in array v_conv loop
    if not exists (
      select 1 from public.equipo_miembros
      where equipo_id = p_equipo_id and usuario_id = v_uid and estado = 'activo'
    ) then
      return jsonb_build_object('ok', false, 'error', 'convocado_no_miembro');
    end if;
  end loop;

  if exists (
    select 1
    from public.desafio_convocados c
    join public.desafio_inscripciones i on i.id = c.inscripcion_id
    where c.desafio_id = p_desafio_id
      and c.usuario_id = any (v_conv)
      and i.estado in ('pendiente_pago', 'confirmada')
      and i.equipo_id is distinct from p_equipo_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'convocado_ocupado');
  end if;

  if v_d.premio > 0 then
    v_hoy := v_now::date;
    foreach v_uid in array v_conv loop
      select jp.fecha_nacimiento into v_fn
      from public.jugador_perfiles jp
      where jp.usuario_id = v_uid;
      v_label := coalesce(public.etiqueta_jugador(v_uid), 'Alguien');
      if v_fn is null then
        v_faltan := v_faltan || case when v_faltan = '' then '' else ', ' end || v_label;
      elsif v_fn > (v_hoy - interval '18 years')::date then
        v_menores := v_menores || case when v_menores = '' then '' else ', ' end || v_label;
      end if;
    end loop;
    if v_faltan <> '' then
      return jsonb_build_object('ok', false, 'error', 'falta_nacimiento', 'quienes', v_faltan);
    end if;
    if v_menores <> '' then
      return jsonb_build_object('ok', false, 'error', 'menor_18', 'quienes', v_menores);
    end if;
  end if;

  select * into v_prev
  from public.desafio_inscripciones
  where desafio_id = p_desafio_id and equipo_id = p_equipo_id
  for update;

  if found and v_prev.estado in ('pendiente_pago', 'confirmada') then
    return jsonb_build_object('ok', false, 'error', 'ya_inscripto');
  end if;

  v_insc := v_prev.id;

  select count(*) into v_ocupados
  from public.desafio_inscripciones
  where desafio_id = p_desafio_id
    and estado in ('pendiente_pago', 'confirmada');

  if v_ocupados >= 2 then
    return jsonb_build_object('ok', false, 'error', 'cupo_lleno');
  end if;

  v_estado := case when v_pagos then 'pendiente_pago' else 'confirmada' end;

  if v_prev.id is not null then
    update public.desafio_inscripciones
    set capitan_id = v_user,
        estado = v_estado,
        confirmada_at = case when v_estado = 'confirmada' then now() else null end,
        cancelada_at = null,
        updated_at = now()
    where id = v_prev.id
    returning id into v_insc;
    delete from public.desafio_convocados where inscripcion_id = v_insc;
  else
    insert into public.desafio_inscripciones (
      desafio_id, equipo_id, capitan_id, estado, confirmada_at
    ) values (
      p_desafio_id, p_equipo_id, v_user, v_estado,
      case when v_estado = 'confirmada' then now() else null end
    )
    returning id into v_insc;
  end if;

  insert into public.desafio_convocados (inscripcion_id, desafio_id, usuario_id)
  select v_insc, p_desafio_id, u
  from unnest(v_conv) as u;

  select count(*) into v_ocupados
  from public.desafio_inscripciones
  where desafio_id = p_desafio_id and estado = 'confirmada';

  if v_ocupados >= 2 then
    update public.desafios set estado = 'completo' where id = p_desafio_id and estado = 'abierto';
  end if;

  select e.nombre into v_eq_nombre from public.equipos e where e.id = p_equipo_id;

  foreach v_uid in array v_conv loop
    if v_uid is distinct from v_user then
      perform public.emitir_notificacion(
        v_uid,
        'convocado_partido',
        'Te convocaron a un partido',
        'El capitán te convocó con ' || coalesce(v_eq_nombre, 'tu equipo') || ' a ' || v_d.titulo || '.',
        jsonb_build_object('desafio_id', p_desafio_id, 'equipo_id', p_equipo_id, 'destino', 'desafio')
      );
    end if;
  end loop;

  if v_d.owner_id is distinct from v_user then
    perform public.emitir_notificacion(
      v_d.owner_id,
      'inscripcion_desafio',
      'Un equipo se inscribió',
      coalesce(v_eq_nombre, 'Un equipo') || ' se anotó a ' || v_d.titulo || '.',
      jsonb_build_object('desafio_id', p_desafio_id, 'equipo_id', p_equipo_id, 'destino', 'desafio')
    );
  end if;

  return jsonb_build_object('ok', true, 'inscripcion_id', v_insc, 'estado', v_estado);
end;
$$;

-- ---------------------------------------------------------------------------
-- cancelar_inscripcion
-- ---------------------------------------------------------------------------
create or replace function public.cancelar_inscripcion(p_inscripcion_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_i public.desafio_inscripciones%rowtype;
  v_d public.desafios%rowtype;
  v_inicio timestamp;
  v_plazo timestamp;
  v_now timestamp;
  v_eq_nombre text;
  v_uid uuid;
  v_confirmadas int;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;

  select * into v_i from public.desafio_inscripciones where id = p_inscripcion_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_existe');
  end if;
  if not public.es_capitan(v_i.equipo_id) then
    return jsonb_build_object('ok', false, 'error', 'no_capitan');
  end if;
  if v_i.estado not in ('pendiente_pago', 'confirmada') then
    return jsonb_build_object('ok', false, 'error', 'no_activa');
  end if;

  select * into v_d from public.desafios where id = v_i.desafio_id for update;
  v_now := public.ahora_argentina();
  v_inicio := v_d.fecha::timestamp + v_d.hora_inicio;
  v_plazo := case
    when v_d.plazo_cancelacion is not null then timezone('America/Argentina/Buenos_Aires', v_d.plazo_cancelacion)
    else v_inicio - interval '24 hours'
  end;
  if v_now >= v_plazo then
    return jsonb_build_object('ok', false, 'error', 'fuera_de_plazo');
  end if;

  select e.nombre into v_eq_nombre from public.equipos e where e.id = v_i.equipo_id;

  for v_uid in
    select c.usuario_id from public.desafio_convocados c where c.inscripcion_id = v_i.id
  loop
    if v_uid is distinct from v_user then
      perform public.emitir_notificacion(
        v_uid,
        'inscripcion_cancelada',
        'Se canceló la inscripción',
        coalesce(v_eq_nombre, 'Tu equipo') || ' ya no juega ' || v_d.titulo || '.',
        jsonb_build_object('desafio_id', v_d.id, 'destino', 'desafio')
      );
    end if;
  end loop;

  if v_d.owner_id is distinct from v_user then
    perform public.emitir_notificacion(
      v_d.owner_id,
      'inscripcion_cancelada',
      'Se bajó un equipo',
      coalesce(v_eq_nombre, 'Un equipo') || ' canceló la inscripción a ' || v_d.titulo || '.',
      jsonb_build_object('desafio_id', v_d.id, 'destino', 'desafio')
    );
  end if;

  delete from public.desafio_convocados where inscripcion_id = v_i.id;

  update public.desafio_inscripciones
  set estado = 'cancelada',
      cancelada_at = now(),
      updated_at = now()
  where id = v_i.id;

  select count(*) into v_confirmadas
  from public.desafio_inscripciones
  where desafio_id = v_d.id and estado = 'confirmada';

  if v_d.estado = 'completo' and v_confirmadas < 2 then
    update public.desafios set estado = 'abierto' where id = v_d.id and estado = 'completo';
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- editar_convocados
-- ---------------------------------------------------------------------------
create or replace function public.editar_convocados(p_inscripcion_id uuid, p_convocados uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_i public.desafio_inscripciones%rowtype;
  v_d public.desafios%rowtype;
  v_inicio timestamp;
  v_cierre timestamp;
  v_now timestamp;
  v_min int;
  v_conv uuid[];
  v_uid uuid;
  v_faltan text := '';
  v_menores text := '';
  v_label text;
  v_hoy date;
  v_fn date;
  v_eq_nombre text;
  v_antes uuid[];
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;

  select * into v_i from public.desafio_inscripciones where id = p_inscripcion_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_existe');
  end if;
  if not public.es_capitan(v_i.equipo_id) then
    return jsonb_build_object('ok', false, 'error', 'no_capitan');
  end if;
  if v_i.estado not in ('pendiente_pago', 'confirmada') then
    return jsonb_build_object('ok', false, 'error', 'no_activa');
  end if;

  select * into v_d from public.desafios where id = v_i.desafio_id for update;
  v_now := public.ahora_argentina();
  v_inicio := v_d.fecha::timestamp + v_d.hora_inicio;
  v_cierre := case
    when v_d.cierre_inscripcion is not null then timezone('America/Argentina/Buenos_Aires', v_d.cierre_inscripcion)
    else v_inicio - interval '2 hours'
  end;
  if v_now >= v_cierre then
    return jsonb_build_object('ok', false, 'error', 'inscripcion_cerrada');
  end if;

  select array_agg(distinct x) into v_conv
  from unnest(coalesce(p_convocados, '{}'::uuid[])) as x
  where x is not null;

  if v_conv is null or cardinality(v_conv) = 0 then
    return jsonb_build_object('ok', false, 'error', 'convocados_requeridos');
  end if;

  v_min := public.minimo_convocados(v_d.tipo::text);
  if cardinality(v_conv) < v_min then
    return jsonb_build_object('ok', false, 'error', 'minimo_convocados', 'minimo', v_min);
  end if;

  foreach v_uid in array v_conv loop
    if not exists (
      select 1 from public.equipo_miembros
      where equipo_id = v_i.equipo_id and usuario_id = v_uid and estado = 'activo'
    ) then
      return jsonb_build_object('ok', false, 'error', 'convocado_no_miembro');
    end if;
  end loop;

  if exists (
    select 1
    from public.desafio_convocados c
    join public.desafio_inscripciones i on i.id = c.inscripcion_id
    where c.desafio_id = v_i.desafio_id
      and c.usuario_id = any (v_conv)
      and i.estado in ('pendiente_pago', 'confirmada')
      and i.id is distinct from v_i.id
  ) then
    return jsonb_build_object('ok', false, 'error', 'convocado_ocupado');
  end if;

  if v_d.premio > 0 then
    v_hoy := v_now::date;
    foreach v_uid in array v_conv loop
      select jp.fecha_nacimiento into v_fn
      from public.jugador_perfiles jp
      where jp.usuario_id = v_uid;
      v_label := coalesce(public.etiqueta_jugador(v_uid), 'Alguien');
      if v_fn is null then
        v_faltan := v_faltan || case when v_faltan = '' then '' else ', ' end || v_label;
      elsif v_fn > (v_hoy - interval '18 years')::date then
        v_menores := v_menores || case when v_menores = '' then '' else ', ' end || v_label;
      end if;
    end loop;
    if v_faltan <> '' then
      return jsonb_build_object('ok', false, 'error', 'falta_nacimiento', 'quienes', v_faltan);
    end if;
    if v_menores <> '' then
      return jsonb_build_object('ok', false, 'error', 'menor_18', 'quienes', v_menores);
    end if;
  end if;

  select array_agg(c.usuario_id) into v_antes
  from public.desafio_convocados c
  where c.inscripcion_id = v_i.id;

  delete from public.desafio_convocados where inscripcion_id = v_i.id;
  insert into public.desafio_convocados (inscripcion_id, desafio_id, usuario_id)
  select v_i.id, v_i.desafio_id, u from unnest(v_conv) as u;

  select e.nombre into v_eq_nombre from public.equipos e where e.id = v_i.equipo_id;

  foreach v_uid in array v_conv loop
    if v_uid is distinct from v_user
       and (v_antes is null or not v_uid = any (v_antes)) then
      perform public.emitir_notificacion(
        v_uid,
        'convocado_partido',
        'Te convocaron a un partido',
        'El capitán te convocó con ' || coalesce(v_eq_nombre, 'tu equipo') || ' a ' || v_d.titulo || '.',
        jsonb_build_object('desafio_id', v_d.id, 'equipo_id', v_i.equipo_id, 'destino', 'desafio')
      );
    end if;
  end loop;

  if v_antes is not null then
    foreach v_uid in array v_antes loop
      if v_uid is distinct from v_user and not v_uid = any (v_conv) then
        perform public.emitir_notificacion(
          v_uid,
          'baja_convocatoria',
          'Ya no estás convocado',
          'El capitán te sacó de la convocatoria de ' || v_d.titulo || '.',
          jsonb_build_object('desafio_id', v_d.id, 'destino', 'desafio')
        );
      end if;
    end loop;
  end if;

  update public.desafio_inscripciones set updated_at = now() where id = v_i.id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.inscribir_equipo(uuid, uuid, uuid[]) from public;
revoke all on function public.cancelar_inscripcion(uuid) from public;
revoke all on function public.editar_convocados(uuid, uuid[]) from public;
grant execute on function public.inscribir_equipo(uuid, uuid, uuid[]) to authenticated;
grant execute on function public.cancelar_inscripcion(uuid) to authenticated;
grant execute on function public.editar_convocados(uuid, uuid[]) to authenticated;

update public.desafios d
set estado = 'completo'
where d.estado = 'abierto'
  and (
    select count(*) from public.desafio_inscripciones i
    where i.desafio_id = d.id and i.estado = 'confirmada'
  ) >= 2;
