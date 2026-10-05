-- Fase 5 bloque 3: desafíos amistosos y jugadores sueltos.
-- Montos del snapshot. No toca webhooks MP de FulbitoYa.
-- Tests: supabase/tests/plc_amistoso.sql

create or replace function public.plc_es_circuito(p_modalidad text)
returns boolean
language sql
immutable
as $$
  select coalesce(p_modalidad, '') in ('por_la_cancha', 'amistoso');
$$;

alter table public.desafios drop constraint if exists desafios_modalidad_chk;
alter table public.desafios
  add constraint desafios_modalidad_chk
  check (modalidad in ('premio', 'por_la_cancha', 'amistoso'));

alter table public.desafio_inscripciones
  alter column equipo_id drop not null,
  add column if not exists lado text,
  add column if not exists tipo_inscripcion text;

update public.desafio_inscripciones
set tipo_inscripcion = coalesce(tipo_inscripcion, 'equipo'),
    lado = coalesce(lado, 'a')
where tipo_inscripcion is null or lado is null;

with ranked as (
  select id,
    row_number() over (partition by desafio_id order by confirmada_at nulls last, created_at) as rn
  from public.desafio_inscripciones
)
update public.desafio_inscripciones i
set lado = case when r.rn = 1 then 'a' else 'rival' end
from ranked r
where i.id = r.id;

alter table public.desafio_inscripciones drop constraint if exists desafio_inscripciones_lado_chk;
alter table public.desafio_inscripciones
  add constraint desafio_inscripciones_lado_chk
  check (lado in ('a', 'rival'));

alter table public.desafio_inscripciones drop constraint if exists desafio_inscripciones_tipo_insc_chk;
alter table public.desafio_inscripciones
  add constraint desafio_inscripciones_tipo_insc_chk
  check (tipo_inscripcion in ('equipo', 'jugador'));

alter table public.desafio_inscripciones
  alter column lado set default 'a',
  alter column tipo_inscripcion set default 'equipo';

create unique index if not exists uq_desafio_rival_equipo_activo
  on public.desafio_inscripciones (desafio_id)
  where tipo_inscripcion = 'equipo'
    and lado = 'rival'
    and estado in ('pendiente_pago', 'confirmada');

create unique index if not exists uq_desafio_jugador_activo
  on public.desafio_inscripciones (desafio_id, capitan_id)
  where tipo_inscripcion = 'jugador'
    and estado in ('pendiente_pago', 'confirmada')
    and capitan_id is not null;

create or replace function public.plc_inscripcion_a(p_desafio_id uuid)
returns public.desafio_inscripciones
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_i public.desafio_inscripciones%rowtype;
begin
  select * into v_i
  from public.desafio_inscripciones
  where desafio_id = p_desafio_id
    and estado = 'confirmada'
    and coalesce(lado, 'a') = 'a'
  order by confirmada_at nulls last, created_at
  limit 1;
  return v_i;
end;
$$;

create or replace function public.plc_hay_rival(p_desafio_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.desafio_inscripciones
    where desafio_id = p_desafio_id
      and lado = 'rival'
      and estado in ('pendiente_pago', 'confirmada')
  );
$$;

create or replace function public.plc_solo_publicador(p_desafio_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.desafio_inscripciones
    where desafio_id = p_desafio_id and estado = 'confirmada' and coalesce(lado, 'a') = 'a'
  ) and not public.plc_hay_rival(p_desafio_id);
$$;

create or replace function public.plc_cupo_sueltos(p_cond jsonb)
returns int
language sql
immutable
as $$
  select greatest(coalesce(nullif(p_cond->>'jugadores_formato', '')::int, 5), 1);
$$;

create or replace function public.plc_sueltos_activos(p_desafio_id uuid)
returns int
language sql
stable
as $$
  select count(*)::int
  from public.desafio_inscripciones
  where desafio_id = p_desafio_id
    and tipo_inscripcion = 'jugador'
    and estado in ('pendiente_pago', 'confirmada');
$$;

create or replace function public.plc_sueltos_confirmados(p_desafio_id uuid)
returns int
language sql
stable
as $$
  select count(*)::int
  from public.desafio_inscripciones
  where desafio_id = p_desafio_id
    and tipo_inscripcion = 'jugador'
    and estado = 'confirmada';
$$;

create or replace function public.plc_rival_completo(p_desafio_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_d public.desafios%rowtype;
  v_n int;
begin
  select * into v_d from public.desafios where id = p_desafio_id;
  if not found then
    return false;
  end if;
  if exists (
    select 1 from public.desafio_inscripciones
    where desafio_id = p_desafio_id
      and tipo_inscripcion = 'equipo'
      and lado = 'rival'
      and estado = 'confirmada'
  ) then
    return true;
  end if;
  v_n := public.plc_cupo_sueltos(v_d.condiciones);
  return public.plc_sueltos_confirmados(p_desafio_id) >= v_n;
end;
$$;

create or replace function public.plc_init_columnas_sin_rival()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.plc_es_circuito(new.modalidad) or new.condiciones is null then
    return new;
  end if;
  new.periodo_gratis := coalesce((new.condiciones->>'periodo_gratis')::boolean, false);
  new.permitir_seguir_hasta_inicio := coalesce((new.condiciones->>'permitir_seguir_hasta_inicio')::boolean, false);
  if new.periodo_gratis then
    new.vence_decision_24h := public.plc_ts_ar(new.condiciones->>'periodo_gratis_hasta');
  else
    new.vence_decision_24h := null;
  end if;
  if new.busqueda_hasta is null then
    new.busqueda_hasta := 'cierre';
  end if;
  return new;
end;
$$;

create or replace function public.plc_reembolsar_restante(
  p_desafio_id uuid,
  p_inscripcion public.desafio_inscripciones,
  p_predio uuid,
  p_detalle text
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ya numeric;
  v_resto numeric;
begin
  if p_inscripcion.id is null then
    return 0;
  end if;
  select coalesce(sum(monto), 0) into v_ya
  from public.movimientos
  where inscripcion_id = p_inscripcion.id
    and tipo in ('reembolso_total', 'reembolso_parcial', 'reembolso_cancha', 'reembolso_mitad');
  v_resto := greatest(coalesce(p_inscripcion.monto_total, 0) - v_ya, 0);
  if v_resto <= 0 then
    return 0;
  end if;
  if v_ya <= 0 then
    perform public.registrar_movimiento(
      p_desafio_id, p_inscripcion.id, p_inscripcion.capitan_id, p_predio,
      'reembolso_total', v_resto, p_detalle
    );
  else
    perform public.registrar_movimiento(
      p_desafio_id, p_inscripcion.id, p_inscripcion.capitan_id, p_predio,
      'reembolso_parcial', v_resto, p_detalle
    );
  end if;
  return v_resto;
end;
$$;

create or replace function public.plc_reembolsar_total_si_falta(
  p_desafio_id uuid,
  p_inscripcion public.desafio_inscripciones,
  p_predio uuid,
  p_detalle text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.plc_reembolsar_restante(p_desafio_id, p_inscripcion, p_predio, p_detalle);
end;
$$;

create or replace function public.plc_aplicar_cargo_equipo(
  p_desafio_id uuid,
  p_inscripcion public.desafio_inscripciones,
  p_predio uuid,
  p_cargo jsonb,
  p_detalle text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pagado numeric := coalesce(p_inscripcion.monto_total, 0);
  v_cargo numeric := coalesce((p_cargo->>'cargo')::numeric, 0);
  v_app numeric := coalesce((p_cargo->>'retiene_app')::numeric, 0);
  v_predio numeric := coalesce((p_cargo->>'para_predio')::numeric, 0);
  v_resto numeric;
  v_efectivo numeric;
begin
  if v_cargo <= 0 then
    perform public.plc_reembolsar_restante(p_desafio_id, p_inscripcion, p_predio, p_detalle);
    return jsonb_build_object('cargo', 0, 'reembolso', v_pagado, 'retiene_app', 0, 'para_predio', 0);
  end if;

  v_efectivo := least(v_cargo, v_pagado);
  if v_app <= 0 then
    v_app := least(coalesce(p_inscripcion.monto_servicio, 0), v_efectivo);
  end if;
  v_app := least(v_app, v_efectivo);
  if v_predio <= 0 then
    v_predio := greatest(v_efectivo - v_app, 0);
  end if;
  v_predio := least(v_predio, greatest(v_efectivo - v_app, 0));
  v_resto := greatest(v_pagado - v_efectivo, 0);

  if v_resto > 0 and not exists (
    select 1 from public.movimientos
    where inscripcion_id = p_inscripcion.id and tipo = 'reembolso_parcial'
  ) then
    perform public.registrar_movimiento(
      p_desafio_id, p_inscripcion.id, p_inscripcion.capitan_id, p_predio,
      'reembolso_parcial', v_resto, p_detalle
    );
  end if;
  if v_app > 0 and not exists (
    select 1 from public.movimientos
    where inscripcion_id = p_inscripcion.id and tipo = 'tarifa_servicio_retenida'
  ) then
    perform public.registrar_movimiento(
      p_desafio_id, p_inscripcion.id, p_inscripcion.capitan_id, p_predio,
      'tarifa_servicio_retenida', v_app, 'Tarifa de servicio del que cancela'
    );
  end if;
  if v_predio > 0 and not exists (
    select 1 from public.movimientos
    where desafio_id = p_desafio_id and tipo = 'deuda_predio'
  ) then
    perform public.registrar_movimiento(
      p_desafio_id, p_inscripcion.id, p_inscripcion.capitan_id, p_predio,
      'deuda_predio', v_predio, 'Cargo de cancelación para el predio'
    );
  end if;

  return jsonb_build_object('cargo', v_efectivo, 'reembolso', v_resto, 'retiene_app', v_app, 'para_predio', v_predio);
end;
$$;

create or replace function public.plc_reembolsar_mitad_organizador(p_desafio_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_d public.desafios%rowtype;
  v_i public.desafio_inscripciones%rowtype;
  v_mitad numeric;
begin
  select * into v_d from public.desafios where id = p_desafio_id;
  if v_d.modalidad is distinct from 'amistoso' then
    return;
  end if;
  v_i := public.plc_inscripcion_a(p_desafio_id);
  if v_i.id is null then
    return;
  end if;
  v_mitad := public.plc_centena(coalesce(v_d.precio_cancha, 0) / 2.0);
  if v_mitad <= 0 then
    return;
  end if;
  if exists (
    select 1 from public.movimientos
    where inscripcion_id = v_i.id and tipo = 'reembolso_mitad'
  ) then
    return;
  end if;
  perform public.registrar_movimiento(
    v_d.id, v_i.id, v_i.capitan_id, v_d.cancha_id,
    'reembolso_mitad', v_mitad,
    'Se sumó el rival: te devolvemos la mitad de la cancha'
  );
end;
$$;

drop function if exists public.crear_partido(uuid, uuid, uuid[], text);

create or replace function public.crear_partido(
  p_disponibilidad_id uuid,
  p_equipo_id uuid,
  p_convocados uuid[],
  p_regla_empate text,
  p_modalidad text default 'por_la_cancha'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_disp public.disponibilidades%rowtype;
  v_campo public.campos%rowtype;
  v_cancha public.canchas%rowtype;
  v_tipo public.match_tipo;
  v_val jsonb;
  v_cond jsonb;
  v_conv uuid[];
  v_tarifa numeric;
  v_precio numeric;
  v_total numeric;
  v_desafio uuid;
  v_insc uuid;
  v_inicio timestamp;
  v_duracion int;
  v_eq_nombre text;
  v_titulo text;
  v_uid uuid;
  v_cierre timestamptz;
  v_mod text;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  if not public.es_capitan(p_equipo_id) then
    return jsonb_build_object('ok', false, 'error', 'no_capitan');
  end if;

  v_mod := case lower(btrim(coalesce(p_modalidad, 'por_la_cancha')))
    when 'amistoso' then 'amistoso'
    else 'por_la_cancha'
  end;

  if p_regla_empate not in ('penales', 'mitad_cada_uno') then
    return jsonb_build_object('ok', false, 'error', 'regla_empate_invalida');
  end if;

  v_cond := public.calcular_condiciones(p_disponibilidad_id, v_mod, now());
  if coalesce(v_cond->>'ok', 'false') <> 'true' then
    return v_cond;
  end if;
  if coalesce((v_cond->>'desafios_habilitados')::boolean, true) is not true then
    return jsonb_build_object('ok', false, 'error', 'desafios_no_habilitados');
  end if;
  if coalesce((v_cond->>'horario_habilitado')::boolean, true) is not true then
    return jsonb_build_object('ok', false, 'error', 'horario_no_habilitado');
  end if;
  if coalesce((v_cond->>'anticipacion_ok')::boolean, true) is not true then
    return jsonb_build_object(
      'ok', false, 'error', 'anticipacion_insuficiente',
      'minimo', (v_cond->>'anticipacion_minima_horas')::numeric
    );
  end if;

  v_precio := coalesce((v_cond->>'precio_cancha')::numeric, 0);
  if v_mod = 'amistoso' then
    v_tarifa := coalesce((v_cond->>'tarifa_servicio_amistoso_equipo')::numeric, 0);
  else
    v_tarifa := coalesce((v_cond->>'tarifa_servicio_equipo')::numeric, 0);
  end if;
  v_total := coalesce((v_cond->>'monto_equipo_a')::numeric, v_precio + v_tarifa);
  if v_tarifa <= 0 then
    return jsonb_build_object('ok', false, 'error', 'tarifa_no_configurada');
  end if;

  select * into v_disp from public.disponibilidades where id = p_disponibilidad_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'turno_no_existe');
  end if;
  if v_disp.estado is distinct from 'disponible' then
    return jsonb_build_object('ok', false, 'error', 'turno_no_disponible');
  end if;

  v_inicio := public.inicio_turno(v_disp.fecha, v_disp.hora_inicio);
  if v_inicio <= public.ahora_argentina() then
    return jsonb_build_object('ok', false, 'error', 'turno_pasado');
  end if;

  select * into v_campo from public.campos where id = v_disp.campo_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'campo_no_existe');
  end if;
  select * into v_cancha from public.canchas where id = v_campo.cancha_id;

  v_tipo := public.tipo_desde_campo(v_campo.tipo);
  v_val := public.validar_convocados_mayores(p_equipo_id, p_convocados, v_tipo::text);
  if coalesce(v_val->>'ok', 'false') <> 'true' then
    return v_val;
  end if;
  select array_agg(x::uuid) into v_conv
  from jsonb_array_elements_text(v_val->'convocados') as x;
  if v_user <> all (v_conv) then
    v_conv := array_append(v_conv, v_user);
  end if;

  v_duracion := greatest(1, round(extract(epoch from (v_disp.hora_fin - v_disp.hora_inicio)) / 60.0)::int);
  select nombre into v_eq_nombre from public.equipos where id = p_equipo_id;
  v_titulo := case when v_mod = 'amistoso' then 'Amistoso en ' else 'Partido en ' end
    || coalesce(v_cancha.nombre, 'la cancha');
  v_cierre := coalesce(
    (v_cond->>'cierre_sin_rival')::timestamptz,
    (v_inicio - interval '2 hours') at time zone 'America/Argentina/Buenos_Aires'
  );

  update public.disponibilidades
  set estado = 'reservado_pendiente'
  where id = v_disp.id and estado = 'disponible';
  if not found then
    return jsonb_build_object('ok', false, 'error', 'turno_no_disponible');
  end if;

  insert into public.desafios (
    owner_id, cancha_id, titulo, tipo, premio, direccion, barrio, place_id, lat, lng,
    fecha, hora_inicio, duracion_min, descripcion, estado,
    cierre_inscripcion, modalidad, disponibilidad_id, precio_cancha, tarifa_servicio, regla_empate,
    condiciones, condiciones_version, condiciones_congeladas_at, condiciones_aceptadas_por
  ) values (
    v_user, v_cancha.id, v_titulo, v_tipo, 0,
    coalesce(v_cancha.direccion, 'A confirmar'), v_cancha.barrio, v_cancha.place_id,
    coalesce(v_cancha.lat, 0), coalesce(v_cancha.lng, 0),
    v_disp.fecha, v_disp.hora_inicio, v_duracion, null, 'pendiente_pago',
    v_cierre, v_mod, v_disp.id, v_precio, v_tarifa, p_regla_empate,
    v_cond, coalesce((v_cond->>'version')::int, 1), now(), v_user
  )
  returning id into v_desafio;

  insert into public.desafio_inscripciones (
    desafio_id, equipo_id, capitan_id, estado, expira_at,
    monto_cancha, monto_servicio, monto_total,
    condiciones, condiciones_version, condiciones_aceptadas_at, condiciones_aceptadas_por,
    lado, tipo_inscripcion
  ) values (
    v_desafio, p_equipo_id, v_user, 'pendiente_pago', now() + interval '15 minutes',
    v_precio, v_tarifa, v_total,
    v_cond, coalesce((v_cond->>'version')::int, 1), now(), v_user,
    'a', 'equipo'
  )
  returning id into v_insc;

  insert into public.desafio_convocados (inscripcion_id, desafio_id, usuario_id)
  select v_insc, v_desafio, u from unnest(v_conv) as u;

  foreach v_uid in array v_conv loop
    if v_uid is distinct from v_user then
      perform public.emitir_notificacion(
        v_uid, 'convocado_partido', 'Te convocaron a un partido',
        'El capitán te convocó con ' || coalesce(v_eq_nombre, 'tu equipo') || ' a ' || v_titulo || '.',
        jsonb_build_object('desafio_id', v_desafio, 'equipo_id', p_equipo_id, 'destino', 'desafio')
      );
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'desafio_id', v_desafio,
    'inscripcion_id', v_insc,
    'modalidad', v_mod,
    'monto_cancha', v_precio,
    'monto_servicio', v_tarifa,
    'monto_total', v_total,
    'expira_at', (now() + interval '15 minutes'),
    'condiciones', v_cond
  );
end;
$$;

create or replace function public.crear_amistoso(
  p_disponibilidad_id uuid,
  p_equipo_id uuid,
  p_convocados uuid[],
  p_regla_empate text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.crear_partido(p_disponibilidad_id, p_equipo_id, p_convocados, p_regla_empate, 'amistoso');
end;
$$;

create or replace function public.inscribir_jugador_amistoso(p_desafio_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_d public.desafios%rowtype;
  v_fn date;
  v_insc uuid;
  v_prev public.desafio_inscripciones%rowtype;
  v_monto numeric;
  v_cancha numeric;
  v_serv numeric;
  v_n int;
  v_cierre timestamp;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;

  select * into v_d from public.desafios where id = p_desafio_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'desafio_no_existe');
  end if;
  if v_d.modalidad is distinct from 'amistoso' then
    return jsonb_build_object('ok', false, 'error', 'no_es_amistoso');
  end if;
  if v_d.estado is distinct from 'abierto' then
    return jsonb_build_object('ok', false, 'error', 'desafio_cerrado');
  end if;

  v_cierre := public.plc_limite_inscripcion(v_d);
  if public.ahora_argentina() >= v_cierre then
    return jsonb_build_object('ok', false, 'error', 'inscripcion_cerrada');
  end if;

  if exists (
    select 1 from public.desafio_inscripciones
    where desafio_id = v_d.id and tipo_inscripcion = 'equipo' and lado = 'rival'
      and estado in ('pendiente_pago', 'confirmada')
  ) then
    return jsonb_build_object('ok', false, 'error', 'hay_equipo_rival');
  end if;

  if exists (
    select 1 from public.desafio_convocados c
    join public.desafio_inscripciones i on i.id = c.inscripcion_id
    where c.desafio_id = v_d.id and c.usuario_id = v_user
      and i.estado in ('pendiente_pago', 'confirmada')
  ) then
    return jsonb_build_object('ok', false, 'error', 'ya_inscripto');
  end if;

  v_n := public.plc_cupo_sueltos(v_d.condiciones);
  if public.plc_sueltos_activos(v_d.id) >= v_n then
    return jsonb_build_object('ok', false, 'error', 'cupo_lleno');
  end if;

  if coalesce((v_d.condiciones->>'mayores_18')::boolean, true) then
    select fecha_nacimiento into v_fn from public.jugador_perfiles where usuario_id = v_user;
    if v_fn is null then
      return jsonb_build_object('ok', false, 'error', 'falta_nacimiento');
    end if;
    if v_fn > (current_date - interval '18 years')::date then
      return jsonb_build_object('ok', false, 'error', 'menor_18');
    end if;
  end if;

  v_monto := public.plc_monto_snap(v_d.condiciones, 'monto_rival_jugador', 0);
  v_serv := public.plc_monto_snap(v_d.condiciones, 'tarifa_servicio_jugador', 0);
  v_cancha := greatest(v_monto - v_serv, 0);
  if v_monto <= 0 then
    return jsonb_build_object('ok', false, 'error', 'tarifa_no_configurada');
  end if;

  select * into v_prev
  from public.desafio_inscripciones
  where desafio_id = v_d.id and tipo_inscripcion = 'jugador' and capitan_id = v_user
  for update;

  if found and v_prev.estado in ('pendiente_pago', 'confirmada') then
    return jsonb_build_object('ok', false, 'error', 'ya_inscripto');
  end if;

  if v_prev.id is not null then
    update public.desafio_inscripciones
    set estado = 'pendiente_pago',
        expira_at = now() + interval '15 minutes',
        cancelada_at = null,
        monto_cancha = v_cancha,
        monto_servicio = v_serv,
        monto_total = v_monto,
        lado = 'rival',
        updated_at = now()
    where id = v_prev.id
    returning id into v_insc;
    delete from public.desafio_convocados where inscripcion_id = v_insc;
  else
    insert into public.desafio_inscripciones (
      desafio_id, equipo_id, capitan_id, estado, expira_at,
      monto_cancha, monto_servicio, monto_total, lado, tipo_inscripcion
    ) values (
      v_d.id, null, v_user, 'pendiente_pago', now() + interval '15 minutes',
      v_cancha, v_serv, v_monto, 'rival', 'jugador'
    )
    returning id into v_insc;
  end if;

  insert into public.desafio_convocados (inscripcion_id, desafio_id, usuario_id)
  values (v_insc, v_d.id, v_user);

  perform public.emitir_notificacion(
    v_d.owner_id, 'inscripcion_desafio', 'Se sumó un jugador',
    'Alguien se anotó suelto a ' || v_d.titulo || '.',
    jsonb_build_object('desafio_id', v_d.id, 'inscripcion_id', v_insc, 'destino', 'desafio')
  );

  return jsonb_build_object(
    'ok', true,
    'inscripcion_id', v_insc,
    'estado', 'pendiente_pago',
    'monto_cancha', v_cancha,
    'monto_servicio', v_serv,
    'monto_total', v_monto,
    'cupo', v_n,
    'ocupados', public.plc_sueltos_activos(v_d.id),
    'expira_at', now() + interval '15 minutes'
  );
end;
$$;

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
  v_cierre timestamp;
  v_now timestamp;
  v_ocupados int;
  v_val jsonb;
  v_conv uuid[];
  v_uid uuid;
  v_estado text;
  v_insc uuid;
  v_prev public.desafio_inscripciones%rowtype;
  v_eq_nombre text;
  v_pago boolean;
  v_expira timestamptz;
  v_mc numeric;
  v_ms numeric;
  v_mt numeric;
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

  v_pago := public.plc_es_circuito(v_d.modalidad);
  v_now := public.ahora_argentina();
  v_cierre := public.plc_limite_inscripcion(v_d);
  if v_now >= v_cierre then
    return jsonb_build_object('ok', false, 'error', 'inscripcion_cerrada');
  end if;

  if v_d.modalidad = 'amistoso' and public.plc_sueltos_activos(v_d.id) > 0 then
    return jsonb_build_object('ok', false, 'error', 'hay_sueltos');
  end if;

  v_val := public.validar_convocados_mayores(p_equipo_id, p_convocados, v_d.tipo::text);
  if v_pago or v_d.premio > 0 then
    if coalesce(v_val->>'ok', 'false') <> 'true' then
      return v_val;
    end if;
  else
    if v_val->>'error' in ('convocados_requeridos', 'minimo_convocados', 'convocado_no_miembro') then
      return v_val;
    end if;
    if coalesce(v_val->>'ok', 'false') <> 'true' and v_val->>'error' not in ('falta_nacimiento', 'menor_18') then
      return v_val;
    end if;
    if v_val->>'error' in ('falta_nacimiento', 'menor_18') then
      select array_agg(distinct x) into v_conv
      from unnest(coalesce(p_convocados, '{}'::uuid[])) as x
      where x is not null;
    end if;
  end if;

  if v_conv is null then
    select array_agg(x::uuid) into v_conv
    from jsonb_array_elements_text(v_val->'convocados') as x;
  end if;
  if v_conv is not null and v_user <> all (v_conv) then
    v_conv := array_append(v_conv, v_user);
  end if;

  if exists (
    select 1 from public.desafio_convocados c
    join public.desafio_inscripciones i on i.id = c.inscripcion_id
    where c.desafio_id = p_desafio_id
      and c.usuario_id = any (v_conv)
      and i.estado in ('pendiente_pago', 'confirmada')
      and i.equipo_id is distinct from p_equipo_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'convocado_ocupado');
  end if;

  select * into v_prev
  from public.desafio_inscripciones
  where desafio_id = p_desafio_id and equipo_id = p_equipo_id
  for update;

  if found and v_prev.estado in ('pendiente_pago', 'confirmada') then
    return jsonb_build_object('ok', false, 'error', 'ya_inscripto');
  end if;

  select count(*) into v_ocupados
  from public.desafio_inscripciones
  where desafio_id = p_desafio_id
    and tipo_inscripcion = 'equipo'
    and estado in ('pendiente_pago', 'confirmada');

  if v_ocupados >= 2 then
    return jsonb_build_object('ok', false, 'error', 'cupo_lleno');
  end if;

  if v_pago then
    v_estado := 'pendiente_pago';
    v_expira := now() + interval '15 minutes';
    if v_d.modalidad = 'amistoso' then
      v_mt := public.plc_monto_snap(v_d.condiciones, 'monto_rival_equipo', 0);
      v_ms := public.plc_monto_snap(v_d.condiciones, 'tarifa_servicio_amistoso_equipo', 0);
      v_mc := greatest(v_mt - v_ms, 0);
    else
      v_mc := v_d.precio_cancha;
      v_ms := v_d.tarifa_servicio;
      v_mt := v_d.precio_cancha + v_d.tarifa_servicio;
    end if;
  else
    v_estado := 'confirmada';
    v_expira := null;
    v_mc := null; v_ms := null; v_mt := null;
  end if;

  if v_prev.id is not null then
    update public.desafio_inscripciones
    set capitan_id = v_user,
        estado = v_estado,
        confirmada_at = case when v_estado = 'confirmada' then now() else null end,
        cancelada_at = null,
        expira_at = v_expira,
        monto_cancha = case when v_pago then v_mc else monto_cancha end,
        monto_servicio = case when v_pago then v_ms else monto_servicio end,
        monto_total = case when v_pago then v_mt else monto_total end,
        lado = 'rival',
        tipo_inscripcion = 'equipo',
        updated_at = now()
    where id = v_prev.id
    returning id into v_insc;
    delete from public.desafio_convocados where inscripcion_id = v_insc;
  else
    insert into public.desafio_inscripciones (
      desafio_id, equipo_id, capitan_id, estado, confirmada_at, expira_at,
      monto_cancha, monto_servicio, monto_total, lado, tipo_inscripcion
    ) values (
      p_desafio_id, p_equipo_id, v_user, v_estado,
      case when v_estado = 'confirmada' then now() else null end,
      v_expira, v_mc, v_ms, v_mt, 'rival', 'equipo'
    )
    returning id into v_insc;
  end if;

  insert into public.desafio_convocados (inscripcion_id, desafio_id, usuario_id)
  select v_insc, p_desafio_id, u from unnest(v_conv) as u;

  select count(*) into v_ocupados
  from public.desafio_inscripciones
  where desafio_id = p_desafio_id and estado = 'confirmada' and tipo_inscripcion = 'equipo';

  if (not v_pago) and v_ocupados >= 2 then
    update public.desafios set estado = 'completo' where id = p_desafio_id and estado = 'abierto';
  end if;

  select e.nombre into v_eq_nombre from public.equipos e where e.id = p_equipo_id;
  foreach v_uid in array v_conv loop
    if v_uid is distinct from v_user then
      perform public.emitir_notificacion(
        v_uid, 'convocado_partido', 'Te convocaron a un partido',
        'El capitán te convocó con ' || coalesce(v_eq_nombre, 'tu equipo') || ' a ' || v_d.titulo || '.',
        jsonb_build_object('desafio_id', p_desafio_id, 'equipo_id', p_equipo_id, 'destino', 'desafio')
      );
    end if;
  end loop;

  if v_d.owner_id is distinct from v_user then
    perform public.emitir_notificacion(
      v_d.owner_id, 'inscripcion_desafio', 'Un equipo se inscribió',
      coalesce(v_eq_nombre, 'Un equipo') || ' se anotó a ' || v_d.titulo || '.',
      jsonb_build_object('desafio_id', p_desafio_id, 'equipo_id', p_equipo_id, 'destino', 'desafio')
    );
  end if;

  return jsonb_build_object(
    'ok', true, 'inscripcion_id', v_insc, 'estado', v_estado, 'expira_at', v_expira,
    'monto_cancha', v_mc, 'monto_servicio', v_ms, 'monto_total', v_mt
  );
end;
$$;

create or replace function public.confirmar_pago_inscripcion(
  p_inscripcion_id uuid,
  p_payment_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_i public.desafio_inscripciones%rowtype;
  v_d public.desafios%rowtype;
  v_pagadas int;
  v_owner uuid;
  v_tarde boolean := false;
  v_cierre timestamp;
  v_completo boolean := false;
begin
  select * into v_i from public.desafio_inscripciones where id = p_inscripcion_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_existe');
  end if;
  if v_i.estado = 'confirmada' then
    return jsonb_build_object('ok', true, 'idempotente', true, 'desafio_id', v_i.desafio_id);
  end if;

  select * into v_d from public.desafios where id = v_i.desafio_id for update;

  if exists (
    select 1 from public.movimientos
    where inscripcion_id = v_i.id and tipo in ('reembolso_total', 'reembolso_parcial')
  ) then
    return jsonb_build_object('ok', false, 'error', 'pago_fuera_de_tiempo', 'reembolso_total', true, 'idempotente', true);
  end if;

  v_cierre := public.plc_limite_inscripcion(v_d);
  select count(*) into v_pagadas
  from public.desafio_inscripciones
  where desafio_id = v_d.id and estado = 'confirmada' and tipo_inscripcion = 'equipo';

  v_tarde :=
    v_i.estado is distinct from 'pendiente_pago'
    or v_d.estado not in ('pendiente_pago', 'abierto')
    or (v_i.expira_at is not null and v_i.expira_at < now())
    or (v_i.tipo_inscripcion = 'equipo' and v_pagadas >= 2)
    or (v_d.estado = 'abierto' and public.ahora_argentina() >= v_cierre);

  if v_tarde then
    if v_i.estado = 'pendiente_pago' then
      update public.desafio_inscripciones set estado = 'expirada', updated_at = now() where id = v_i.id;
    end if;
    if v_d.estado = 'pendiente_pago' then
      update public.desafios set estado = 'cancelado' where id = v_d.id;
      perform public.liberar_turno_partido(v_d.disponibilidad_id);
    end if;
    perform public.registrar_movimiento(
      v_d.id, v_i.id, v_i.capitan_id, v_d.cancha_id,
      'reembolso_total', coalesce(v_i.monto_total, 0),
      'Pago fuera de tiempo o cupo no disponible'
    );
    return jsonb_build_object('ok', false, 'error', 'pago_fuera_de_tiempo', 'reembolso_total', true);
  end if;

  update public.desafio_inscripciones
  set estado = 'confirmada',
      confirmada_at = now(),
      mp_payment_id = coalesce(p_payment_id, mp_payment_id),
      updated_at = now()
  where id = v_i.id;

  perform public.emitir_notificacion(
    v_i.capitan_id, 'pago_confirmado', 'Pago confirmado',
    'El pago de ' || v_d.titulo || ' está confirmado.',
    jsonb_build_object('desafio_id', v_d.id, 'inscripcion_id', v_i.id, 'destino', 'desafio')
  );

  if v_d.estado = 'pendiente_pago' then
    update public.desafios set estado = 'abierto' where id = v_d.id;
    update public.disponibilidades
    set estado = 'reservado'
    where id = v_d.disponibilidad_id and estado = 'reservado_pendiente';
  end if;

  if v_d.modalidad = 'amistoso' then
    v_completo := public.plc_rival_completo(v_d.id);
  else
    select count(*) into v_pagadas
    from public.desafio_inscripciones
    where desafio_id = v_d.id and estado = 'confirmada' and tipo_inscripcion = 'equipo';
    v_completo := v_pagadas >= 2;
  end if;

  if v_completo then
    update public.desafios set estado = 'completo' where id = v_d.id and estado = 'abierto';
    if v_d.modalidad = 'amistoso' then
      perform public.plc_reembolsar_mitad_organizador(v_d.id);
    end if;
    v_owner := (public.plc_inscripcion_a(v_d.id)).capitan_id;
    if v_owner is not null and v_owner is distinct from v_i.capitan_id then
      perform public.emitir_notificacion(
        v_owner, 'rival_sumado', 'Se completó el partido',
        'Ya está el otro lado en ' || v_d.titulo || '.',
        jsonb_build_object('desafio_id', v_d.id, 'destino', 'desafio')
      );
    end if;
  end if;

  return jsonb_build_object('ok', true, 'desafio_id', v_d.id, 'completo', v_completo);
end;
$$;

create or replace function public.plc_equipos_confirmados(p_desafio_id uuid)
returns int
language sql
stable
as $$
  select case
    when public.plc_solo_publicador(p_desafio_id) then 1
    when public.plc_hay_rival(p_desafio_id) then 2
    else 0
  end;
$$;

create or replace function public.plc_liquidar_amistoso(p_desafio_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_d public.desafios%rowtype;
  r public.desafio_inscripciones%rowtype;
begin
  select * into v_d from public.desafios where id = p_desafio_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'desafio_no_existe');
  end if;
  if v_d.estado = 'liquidado' then
    return jsonb_build_object('ok', true, 'idempotente', true);
  end if;
  if v_d.modalidad is distinct from 'amistoso' then
    return jsonb_build_object('ok', false, 'error', 'no_es_amistoso');
  end if;
  if v_d.estado is distinct from 'completo' then
    return jsonb_build_object('ok', false, 'error', 'no_listo_para_liquidar');
  end if;

  perform public.plc_reembolsar_mitad_organizador(v_d.id);

  for r in
    select * from public.desafio_inscripciones
    where desafio_id = v_d.id and estado = 'confirmada'
  loop
    if coalesce(r.monto_servicio, 0) > 0 and not exists (
      select 1 from public.movimientos
      where inscripcion_id = r.id and tipo = 'tarifa_servicio_retenida'
    ) then
      perform public.registrar_movimiento(
        v_d.id, r.id, r.capitan_id, v_d.cancha_id,
        'tarifa_servicio_retenida', r.monto_servicio, 'Tarifa de servicio amistoso'
      );
    end if;
  end loop;

  if not exists (
    select 1 from public.movimientos where desafio_id = v_d.id and tipo = 'deuda_predio'
  ) then
    perform public.registrar_movimiento(
      v_d.id, null, null, v_d.cancha_id,
      'deuda_predio', coalesce(v_d.precio_cancha, 0), 'Cancha a pagar al predio'
    );
  end if;

  update public.desafios set estado = 'liquidado', liquidado_at = now() where id = v_d.id;
  return jsonb_build_object('ok', true, 'modalidad', 'amistoso');
end;
$$;

create or replace function public.liquidar_partido(p_desafio_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_d public.desafios%rowtype;
  v_a public.desafio_inscripciones%rowtype;
  v_b public.desafio_inscripciones%rowtype;
  v_n int;
  v_ganador uuid;
  v_regla text;
  v_empate boolean := false;
  r record;
begin
  select * into v_d from public.desafios where id = p_desafio_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'desafio_no_existe');
  end if;
  if v_d.estado = 'liquidado' then
    return jsonb_build_object('ok', true, 'idempotente', true);
  end if;
  if v_d.modalidad = 'amistoso' then
    return public.plc_liquidar_amistoso(p_desafio_id);
  end if;
  if v_d.modalidad is distinct from 'por_la_cancha' then
    return jsonb_build_object('ok', false, 'error', 'no_es_por_la_cancha');
  end if;
  if v_d.estado not in ('completo', 'en_disputa') then
    return jsonb_build_object('ok', false, 'error', 'no_listo_para_liquidar');
  end if;

  select * into v_a
  from public.desafio_inscripciones
  where desafio_id = p_desafio_id and estado = 'confirmada'
  order by confirmada_at nulls last, created_at
  limit 1;

  select * into v_b
  from public.desafio_inscripciones
  where desafio_id = p_desafio_id and estado = 'confirmada' and id is distinct from v_a.id
  order by confirmada_at nulls last, created_at
  limit 1;

  if v_a.id is null or v_b.id is null then
    return jsonb_build_object('ok', false, 'error', 'faltan_equipos');
  end if;

  select count(*) into v_n
  from public.resultado_confirmaciones
  where desafio_id = p_desafio_id;

  v_regla := v_d.regla_empate;

  if v_n >= 2 then
    if exists (
      select 1
      from public.resultado_confirmaciones a
      join public.resultado_confirmaciones b
        on a.desafio_id = b.desafio_id and a.capitan_id < b.capitan_id
      where a.desafio_id = p_desafio_id
        and a.ganador_equipo_id is distinct from b.ganador_equipo_id
    ) then
      update public.desafios set estado = 'en_disputa' where id = p_desafio_id and estado is distinct from 'en_disputa';
      return jsonb_build_object('ok', false, 'error', 'en_disputa');
    end if;
    select ganador_equipo_id into v_ganador
    from public.resultado_confirmaciones
    where desafio_id = p_desafio_id
    limit 1;
    v_empate := v_ganador is null;
  elsif v_n = 1 then
    select ganador_equipo_id into v_ganador
    from public.resultado_confirmaciones
    where desafio_id = p_desafio_id;
    v_empate := v_ganador is null;
  else
    return jsonb_build_object('ok', false, 'error', 'resultado_incompleto');
  end if;

  if v_empate and v_regla is distinct from 'mitad_cada_uno' then
    return jsonb_build_object('ok', false, 'error', 'empate_no_permitido');
  end if;
  if v_empate then
    v_ganador := null;
  end if;

  if exists (select 1 from public.movimientos where desafio_id = p_desafio_id) then
    update public.desafios set estado = 'liquidado', liquidado_at = coalesce(liquidado_at, now()) where id = p_desafio_id;
    return jsonb_build_object('ok', true, 'idempotente', true);
  end if;

  if v_ganador is null then
    perform public.registrar_movimiento(p_desafio_id, v_a.id, v_a.capitan_id, v_d.cancha_id, 'reembolso_mitad', v_d.precio_cancha / 2, 'Empate: mitad de la cancha');
    perform public.registrar_movimiento(p_desafio_id, v_b.id, v_b.capitan_id, v_d.cancha_id, 'reembolso_mitad', v_d.precio_cancha / 2, 'Empate: mitad de la cancha');
  elsif v_ganador = v_a.equipo_id then
    perform public.registrar_movimiento(p_desafio_id, v_a.id, v_a.capitan_id, v_d.cancha_id, 'reembolso_cancha', v_d.precio_cancha, 'Ganador: devolución del precio de cancha');
  elsif v_ganador = v_b.equipo_id then
    perform public.registrar_movimiento(p_desafio_id, v_b.id, v_b.capitan_id, v_d.cancha_id, 'reembolso_cancha', v_d.precio_cancha, 'Ganador: devolución del precio de cancha');
  else
    return jsonb_build_object('ok', false, 'error', 'ganador_invalido');
  end if;

  perform public.registrar_movimiento(p_desafio_id, v_a.id, null, v_d.cancha_id, 'tarifa_servicio_retenida', v_d.tarifa_servicio, 'Tarifa de servicio equipo A');
  perform public.registrar_movimiento(p_desafio_id, v_b.id, null, v_d.cancha_id, 'tarifa_servicio_retenida', v_d.tarifa_servicio, 'Tarifa de servicio equipo B');
  perform public.registrar_movimiento(p_desafio_id, null, null, v_d.cancha_id, 'deuda_predio', v_d.precio_cancha, 'Cancha a pagar al predio (manual)');

  update public.desafios
  set estado = 'liquidado', liquidado_at = now()
  where id = p_desafio_id;

  return jsonb_build_object('ok', true, 'ganador_equipo_id', v_ganador);
end;
$$;


create or replace function public.plc_tarea_periodica_partidos()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exp_a int := 0;
  v_exp_b int := 0;
  v_aviso_26 int := 0;
  v_default_24 int := 0;
  v_sin_rival int := 0;
  v_inicio int := 0;
  v_plazo int := 0;
  v_aviso_wo int := 0;
  r record;
  v_fin timestamp;
  v_ahora timestamp := public.ahora_argentina();
  v_inicio_d timestamp;
  v_cierre timestamp;
  v_tol int;
begin
  for r in
    select i.id as inscripcion_id, d.id as desafio_id, d.disponibilidad_id
    from public.desafio_inscripciones i
    join public.desafios d on d.id = i.desafio_id
    where public.plc_es_circuito(d.modalidad)
      and d.estado = 'pendiente_pago'
      and i.estado = 'pendiente_pago'
      and i.expira_at is not null
      and i.expira_at < now()
  loop
    update public.desafio_inscripciones set estado = 'expirada', updated_at = now() where id = r.inscripcion_id;
    update public.desafios set estado = 'cancelado' where id = r.desafio_id;
    perform public.liberar_turno_partido(r.disponibilidad_id);
    v_exp_a := v_exp_a + 1;
  end loop;

  for r in
    select i.id as inscripcion_id
    from public.desafio_inscripciones i
    join public.desafios d on d.id = i.desafio_id
    where public.plc_es_circuito(d.modalidad)
      and d.estado = 'abierto'
      and i.estado = 'pendiente_pago'
      and i.expira_at is not null
      and i.expira_at < now()
  loop
    update public.desafio_inscripciones set estado = 'expirada', updated_at = now() where id = r.inscripcion_id;
    v_exp_b := v_exp_b + 1;
  end loop;

  for r in
    select d.id, d.titulo, d.fecha, d.hora_inicio, d.vence_decision_24h
    from public.desafios d
    where public.plc_es_circuito(d.modalidad)
      and d.estado = 'abierto'
      and coalesce(d.periodo_gratis, false)
      and d.aviso_26h_at is null
      and d.vence_decision_24h is not null
      and public.plc_equipos_confirmados(d.id) = 1
  loop
    v_inicio_d := r.fecha::timestamp + r.hora_inicio;
    if v_ahora >= v_inicio_d - interval '26 hours'
       and v_ahora < timezone('America/Argentina/Buenos_Aires', r.vence_decision_24h) then
      update public.desafios set aviso_26h_at = now() where id = r.id;
      perform public.emitir_notificacion(
        (public.plc_inscripcion_a(r.id)).capitan_id,
        'aviso_26h_sin_rival',
        'En 2 horas tenés que decidir',
        'Nadie se sumó a ' || r.titulo || ' todavía. En 2 horas vas a tener que elegir si cancelás gratis o seguís buscando.',
        jsonb_build_object('desafio_id', r.id, 'destino', 'desafio')
      );
      v_aviso_26 := v_aviso_26 + 1;
    end if;
  end loop;

  for r in
    select d.id
    from public.desafios d
    where public.plc_es_circuito(d.modalidad)
      and d.estado = 'abierto'
      and coalesce(d.periodo_gratis, false)
      and d.decision_24h is null
      and d.vence_decision_24h is not null
      and v_ahora >= timezone('America/Argentina/Buenos_Aires', d.vence_decision_24h)
      and public.plc_equipos_confirmados(d.id) = 1
  loop
    perform public.plc_cancelar_gratis_sin_rival(r.id, 'auto');
    v_default_24 := v_default_24 + 1;
  end loop;

  for r in
    select d.id, d.titulo, d.aviso_cierre_at
    from public.desafios d
    where public.plc_es_circuito(d.modalidad)
      and d.estado = 'abierto'
      and coalesce(d.busqueda_hasta, 'cierre') = 'cierre'
      and public.plc_equipos_confirmados(d.id) = 1
  loop
    select public.plc_limite_inscripcion(d) into v_cierre
    from public.desafios d where d.id = r.id;
    if v_ahora < v_cierre then
      continue;
    end if;
    if r.aviso_cierre_at is null then
      update public.desafios set aviso_cierre_at = now() where id = r.id;
      perform public.emitir_notificacion(
        (public.plc_inscripcion_a(r.id)).capitan_id,
        'decision_cierre_sin_rival',
        'Se cerró la búsqueda',
        'Nadie se sumó a ' || r.titulo || '. Podés liberar el turno (se retiene el cargo) o conservarlo como reserva común.',
        jsonb_build_object('desafio_id', r.id, 'destino', 'desafio')
      );
    else
      perform public.plc_liberar_sin_rival(r.id, 'auto');
      v_sin_rival := v_sin_rival + 1;
    end if;
  end loop;

  for r in
    select d.id, d.fecha, d.hora_inicio
    from public.desafios d
    where public.plc_es_circuito(d.modalidad)
      and d.estado = 'abierto'
      and d.busqueda_hasta = 'inicio'
      and public.plc_equipos_confirmados(d.id) = 1
  loop
    v_inicio_d := r.fecha::timestamp + r.hora_inicio;
    if v_ahora >= v_inicio_d then
      perform public.plc_convertir_reserva_comun(r.id, 'inicio');
      v_inicio := v_inicio + 1;
    end if;
  end loop;

  for r in
    select d.id, d.titulo, d.fecha, d.hora_inicio, d.condiciones
    from public.desafios d
    where public.plc_es_circuito(d.modalidad)
      and d.estado = 'completo'
      and d.aviso_walkover_at is null
      and not exists (select 1 from public.resultado_confirmaciones c where c.desafio_id = d.id)
  loop
    v_inicio_d := r.fecha::timestamp + r.hora_inicio;
    v_tol := coalesce((r.condiciones->>'tolerancia_walkover_min')::int, 15);
    if v_ahora >= v_inicio_d + make_interval(mins => v_tol) then
      update public.desafios set aviso_walkover_at = now() where id = r.id;
      perform public.plc_notificar_capitanes_confirmados(
        r.id,
        'aviso_walkover',
        '¿El rival se presentó?',
        'Ya pasó la tolerancia de ' || v_tol || ' minutos en ' || r.titulo || '. Si el otro equipo no está, podés informarlo.',
        jsonb_build_object('desafio_id', r.id, 'destino', 'desafio')
      );
      v_aviso_wo := v_aviso_wo + 1;
    end if;
  end loop;

  for r in
    select d.id, d.fecha, d.hora_inicio, d.duracion_min
    from public.desafios d
    where public.plc_es_circuito(d.modalidad)
      and d.estado = 'completo'
      and (
        select count(*) from public.resultado_confirmaciones c where c.desafio_id = d.id
      ) = 1
  loop
    v_fin := r.fecha::timestamp + r.hora_inicio + make_interval(mins => coalesce(r.duracion_min, 90));
    if v_ahora >= v_fin + interval '2 hours' then
      perform public.liquidar_partido(r.id);
      v_plazo := v_plazo + 1;
    end if;
  end loop;

  for r in
    select d.id, d.fecha, d.hora_inicio, d.duracion_min
    from public.desafios d
    where d.modalidad = 'amistoso'
      and d.estado = 'completo'
  loop
    v_fin := r.fecha::timestamp + r.hora_inicio + make_interval(mins => coalesce(r.duracion_min, 90));
    if v_ahora >= v_fin then
      perform public.plc_liquidar_amistoso(r.id);
      v_plazo := v_plazo + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'expiradas_equipo_a', v_exp_a,
    'expiradas_equipo_b', v_exp_b,
    'aviso_26h', v_aviso_26,
    'default_24h', v_default_24,
    'sin_rival', v_sin_rival,
    'seguir_inicio_sin_rival', v_inicio,
    'plazo_confirmacion', v_plazo,
    'aviso_walkover', v_aviso_wo
  );
end;
$$;


create or replace function public.opciones_cancelacion_partido(p_desafio_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_d public.desafios%rowtype;
  v_inicio timestamp;
  v_tramo text;
  v_cargo jsonb;
  v_tol int;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  select * into v_d from public.desafios where id = p_desafio_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'desafio_no_existe');
  end if;
  if not public.plc_es_circuito(v_d.modalidad) then
    return jsonb_build_object('ok', false, 'error', 'no_es_por_la_cancha');
  end if;

  v_inicio := v_d.fecha::timestamp + v_d.hora_inicio;
  v_tramo := public.plc_tramo_cancelacion(v_inicio, public.ahora_argentina());
  v_cargo := public.plc_cargo_snapshot(v_d.condiciones, v_tramo);
  v_tol := coalesce((v_d.condiciones->>'tolerancia_walkover_min')::int, 15);

  return jsonb_build_object(
    'ok', true,
    'estado', v_d.estado,
    'tramo', v_tramo,
    'cargo', coalesce((v_cargo->>'cargo')::numeric, 0),
    'reembolso_quien_cancela', coalesce((v_cargo->>'reembolso_si_pago_a')::numeric, 0),
    'retiene_app', coalesce((v_cargo->>'retiene_app')::numeric, 0),
    'para_predio', coalesce((v_cargo->>'para_predio')::numeric, 0),
    'label', v_cargo->>'label',
    'tolerancia_walkover_min', v_tol,
    'predio_cancela', coalesce(v_d.condiciones->>'predio_cancela', 'devolver_todo'),
    'puede_cancelar', v_d.estado = 'completo',
    'puede_walkover', v_d.estado = 'completo'
      and public.ahora_argentina() >= v_inicio + make_interval(mins => v_tol)
  );
end;
$$;

create or replace function public.cancelar_partido_confirmado(p_desafio_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_d public.desafios%rowtype;
  v_mia public.desafio_inscripciones%rowtype;
  v_otra public.desafio_inscripciones%rowtype;
  v_inicio timestamp;
  v_tramo text;
  v_cargo jsonb;
  v_res jsonb;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;

  select * into v_d from public.desafios where id = p_desafio_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'desafio_no_existe');
  end if;
  if not public.plc_es_circuito(v_d.modalidad) then
    return jsonb_build_object('ok', false, 'error', 'no_es_por_la_cancha');
  end if;
  if v_d.estado in ('cancelado', 'liquidado') then
    return jsonb_build_object('ok', true, 'idempotente', true);
  end if;
  if v_d.estado is distinct from 'completo' then
    return jsonb_build_object('ok', false, 'error', 'no_completo');
  end if;

  select * into v_mia
  from public.desafio_inscripciones
  where desafio_id = v_d.id and estado = 'confirmada'
    and (capitan_id = v_user or public.es_capitan(equipo_id))
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_capitan');
  end if;

  select * into v_otra
  from public.desafio_inscripciones
  where desafio_id = v_d.id and estado = 'confirmada' and id is distinct from v_mia.id
  for update;

  v_inicio := v_d.fecha::timestamp + v_d.hora_inicio;
  v_tramo := public.plc_tramo_cancelacion(v_inicio, public.ahora_argentina());
  v_cargo := public.plc_cargo_snapshot(v_d.condiciones, v_tramo);
  v_res := public.plc_aplicar_cargo_equipo(v_d.id, v_mia, v_d.cancha_id, v_cargo, 'Cancelación ' || v_tramo);
  perform public.plc_reembolsar_total_si_falta(v_d.id, v_otra, v_d.cancha_id, 'El otro equipo canceló: te devolvemos todo');

  update public.desafios
  set estado = 'cancelado',
      cancelado_por_inscripcion_id = v_mia.id,
      cancelacion_tramo = v_tramo
  where id = v_d.id;

  perform public.liberar_turno_partido(v_d.disponibilidad_id);
  perform public.plc_notificar_capitanes_confirmados(
    v_d.id,
    'partido_cancelado_cargo',
    'Se canceló el partido',
    'Se canceló ' || v_d.titulo || '. ' || coalesce(v_cargo->>'label', ''),
    jsonb_build_object('desafio_id', v_d.id, 'tramo', v_tramo, 'destino', 'desafio')
  );

  return jsonb_build_object('ok', true, 'tramo', v_tramo) || coalesce(v_res, '{}'::jsonb);
end;
$$;

create or replace function public.reportar_walkover(p_desafio_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_d public.desafios%rowtype;
  v_mia public.desafio_inscripciones%rowtype;
  v_otra public.desafio_inscripciones%rowtype;
  v_inicio timestamp;
  v_tol int;
  v_cargo jsonb;
  v_res jsonb;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;

  select * into v_d from public.desafios where id = p_desafio_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'desafio_no_existe');
  end if;
  if not public.plc_es_circuito(v_d.modalidad) then
    return jsonb_build_object('ok', false, 'error', 'no_es_por_la_cancha');
  end if;
  if v_d.estado in ('cancelado', 'liquidado') then
    return jsonb_build_object('ok', true, 'idempotente', true);
  end if;
  if v_d.estado is distinct from 'completo' then
    return jsonb_build_object('ok', false, 'error', 'no_completo');
  end if;
  if exists (select 1 from public.resultado_confirmaciones where desafio_id = v_d.id) then
    return jsonb_build_object('ok', false, 'error', 'ya_cerrado');
  end if;

  select * into v_mia
  from public.desafio_inscripciones
  where desafio_id = v_d.id and estado = 'confirmada'
    and (capitan_id = v_user or public.es_capitan(equipo_id))
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_capitan');
  end if;

  select * into v_otra
  from public.desafio_inscripciones
  where desafio_id = v_d.id and estado = 'confirmada' and id is distinct from v_mia.id
  for update;
  if v_otra.id is null then
    return jsonb_build_object('ok', false, 'error', 'faltan_equipos');
  end if;
  if v_otra.tipo_inscripcion is distinct from 'equipo' then
    return jsonb_build_object('ok', false, 'error', 'walkover_solo_equipo');
  end if;

  v_inicio := v_d.fecha::timestamp + v_d.hora_inicio;
  v_tol := coalesce((v_d.condiciones->>'tolerancia_walkover_min')::int, 15);
  if public.ahora_argentina() < v_inicio then
    return jsonb_build_object('ok', false, 'error', 'partido_no_empezo');
  end if;
  if public.ahora_argentina() < v_inicio + make_interval(mins => v_tol) then
    return jsonb_build_object('ok', false, 'error', 'tolerancia_no_cumplida');
  end if;

  v_cargo := public.plc_cargo_snapshot(v_d.condiciones, 'menos_2h_o_ausente');
  v_res := public.plc_aplicar_cargo_equipo(v_d.id, v_otra, v_d.cancha_id, v_cargo, 'No se presentó');
  perform public.plc_reembolsar_total_si_falta(v_d.id, v_mia, v_d.cancha_id, 'El rival no se presentó: te devolvemos todo');

  update public.desafios
  set estado = 'liquidado',
      liquidado_at = now(),
      cancelacion_tramo = 'menos_2h_o_ausente',
      walkover_equipo_ausente_id = v_otra.equipo_id,
      cancelado_por_inscripcion_id = v_otra.id
  where id = v_d.id;

  perform public.liberar_turno_partido(v_d.disponibilidad_id);
  perform public.plc_notificar_capitanes_confirmados(
    v_d.id,
    'walkover_declarado',
    'El rival no se presentó',
    'En ' || v_d.titulo || ' se cobró la cancha completa al equipo que no se presentó.',
    jsonb_build_object('desafio_id', v_d.id, 'destino', 'desafio')
  );

  return jsonb_build_object('ok', true, 'tramo', 'menos_2h_o_ausente', 'ausente_equipo_id', v_otra.equipo_id) || coalesce(v_res, '{}'::jsonb);
end;
$$;

create or replace function public.predio_cancela_partido(p_desafio_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_d public.desafios%rowtype;
  v_modo text;
  r public.desafio_inscripciones%rowtype;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;

  select * into v_d from public.desafios where id = p_desafio_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'desafio_no_existe');
  end if;
  if not public.plc_es_circuito(v_d.modalidad) then
    return jsonb_build_object('ok', false, 'error', 'no_es_por_la_cancha');
  end if;
  if not public.plc_es_dueno_cancha(v_d.cancha_id) then
    return jsonb_build_object('ok', false, 'error', 'no_dueno_predio');
  end if;
  if v_d.estado in ('cancelado', 'liquidado') then
    return jsonb_build_object('ok', true, 'idempotente', true);
  end if;
  if v_d.estado not in ('pendiente_pago', 'abierto', 'completo', 'reprogramar') then
    return jsonb_build_object('ok', false, 'error', 'desafio_cerrado');
  end if;

  v_modo := coalesce(v_d.condiciones->>'predio_cancela', 'devolver_todo');

  if v_modo = 'reprogramar' and v_d.estado in ('abierto', 'completo') then
    update public.desafios
    set estado = 'reprogramar',
        predio_cancelo_at = now(),
        cancelacion_tramo = 'predio'
    where id = v_d.id;
    perform public.plc_notificar_capitanes_confirmados(
      v_d.id,
      'predio_cancelo_partido',
      'El predio tiene que reprogramar',
      'El predio canceló el turno de ' || v_d.titulo || '. Se reprograma: el dinero queda a cuenta.',
      jsonb_build_object('desafio_id', v_d.id, 'modo', v_modo, 'destino', 'desafio')
    );
    return jsonb_build_object('ok', true, 'accion', 'reprogramar');
  end if;

  for r in
    select * from public.desafio_inscripciones
    where desafio_id = v_d.id and estado = 'confirmada'
  loop
    perform public.plc_reembolsar_total_si_falta(v_d.id, r, v_d.cancha_id, 'El predio canceló: te devolvemos todo');
  end loop;

  update public.desafio_inscripciones
  set estado = 'expirada', updated_at = now()
  where desafio_id = v_d.id and estado = 'pendiente_pago';

  update public.desafios
  set estado = 'cancelado',
      predio_cancelo_at = now(),
      cancelacion_tramo = 'predio'
  where id = v_d.id;

  perform public.liberar_turno_partido(v_d.disponibilidad_id);
  perform public.plc_notificar_capitanes_confirmados(
    v_d.id,
    'predio_cancelo_partido',
    'El predio canceló el partido',
    'Se canceló ' || v_d.titulo || '. Te devolvemos todo.',
    jsonb_build_object('desafio_id', v_d.id, 'modo', 'devolver_todo', 'destino', 'desafio')
  );

  return jsonb_build_object('ok', true, 'accion', 'devolver_todo');
end;
$$;

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
  if coalesce(v_i.tipo_inscripcion, 'equipo') = 'jugador' then
    if v_i.capitan_id is distinct from v_user then
      return jsonb_build_object('ok', false, 'error', 'no_capitan');
    end if;
  elsif not public.es_capitan(v_i.equipo_id) then
    return jsonb_build_object('ok', false, 'error', 'no_capitan');
  end if;
  if v_i.estado not in ('pendiente_pago', 'confirmada') then
    return jsonb_build_object('ok', false, 'error', 'no_activa');
  end if;

  select * into v_d from public.desafios where id = v_i.desafio_id for update;

  if public.plc_es_circuito(v_d.modalidad) then
    if v_d.estado = 'completo' and v_i.estado = 'confirmada' then
      return public.cancelar_partido_confirmado(v_d.id);
    end if;
    if v_d.estado = 'abierto' and v_i.estado = 'confirmada' and coalesce(v_i.lado, 'a') = 'a' then
      return jsonb_build_object('ok', false, 'error', 'usar_decidir_sin_rival');
    end if;
    if v_d.estado = 'abierto' and coalesce(v_i.tipo_inscripcion, 'equipo') = 'jugador' and v_i.estado = 'confirmada' then
      perform public.plc_reembolsar_restante(v_d.id, v_i, v_d.cancha_id, 'Baja de jugador suelto');
      update public.desafio_inscripciones
      set estado = 'cancelada', cancelada_at = now(), updated_at = now()
      where id = v_i.id;
      return jsonb_build_object('ok', true, 'accion', 'baja_suelto');
    end if;
  end if;

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



grant execute on function public.crear_partido(uuid, uuid, uuid[], text, text) to authenticated;
grant execute on function public.crear_amistoso(uuid, uuid, uuid[], text) to authenticated;
grant execute on function public.inscribir_jugador_amistoso(uuid) to authenticated;
grant execute on function public.inscribir_equipo(uuid, uuid, uuid[]) to authenticated;
grant execute on function public.confirmar_pago_inscripcion(uuid, text) to service_role;
grant execute on function public.liquidar_partido(uuid) to service_role;
grant execute on function public.plc_liquidar_amistoso(uuid) to service_role;
grant execute on function public.plc_tarea_periodica_partidos() to service_role;
grant execute on function public.cancelar_partido_confirmado(uuid) to authenticated;
grant execute on function public.opciones_cancelacion_partido(uuid) to authenticated;
grant execute on function public.reportar_walkover(uuid) to authenticated;
grant execute on function public.predio_cancela_partido(uuid) to authenticated;
grant execute on function public.cancelar_inscripcion(uuid) to authenticated;

create or replace function public.opciones_sin_rival(p_desafio_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_d public.desafios%rowtype;
  v_i public.desafio_inscripciones%rowtype;
  v_now timestamp := public.ahora_argentina();
  v_inicio timestamp;
  v_cierre timestamp;
  v_sena numeric;
  v_pagado numeric;
  v_gratis boolean;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  select * into v_d from public.desafios where id = p_desafio_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'desafio_no_existe');
  end if;
  if not public.plc_es_circuito(v_d.modalidad) then
    return jsonb_build_object('ok', false, 'error', 'no_es_por_la_cancha');
  end if;

  v_i := public.plc_inscripcion_a(v_d.id);
  if v_i.id is null or v_i.capitan_id is distinct from v_user then
    return jsonb_build_object('ok', false, 'error', 'no_es_equipo_a');
  end if;

  v_inicio := public.plc_inicio_desafio(v_d);
  v_cierre := public.plc_limite_inscripcion(v_d);
  v_sena := public.plc_monto_snap(v_d.condiciones, 'sena_sin_rival', 0);
  v_pagado := coalesce(v_i.monto_total, 0);
  v_gratis := coalesce(v_d.periodo_gratis, false)
    and v_d.vence_decision_24h is not null
    and v_now < timezone('America/Argentina/Buenos_Aires', v_d.vence_decision_24h)
    and v_d.decision_24h is null;

  return jsonb_build_object(
    'ok', true,
    'estado', v_d.estado,
    'tramo', v_d.condiciones->>'tramo',
    'periodo_gratis', coalesce(v_d.periodo_gratis, false),
    'vence_decision_24h', v_d.vence_decision_24h,
    'cierre', v_d.cierre_inscripcion,
    'inicio', v_inicio,
    'busqueda_hasta', v_d.busqueda_hasta,
    'decision_24h', v_d.decision_24h,
    'sena_sin_rival', v_sena,
    'reembolso_si_libera', greatest(v_pagado - v_sena, 0),
    'precio_cancha', coalesce(v_d.precio_cancha, 0),
    'tarifa_servicio', coalesce(v_d.tarifa_servicio, 0),
    'monto_pagado', v_pagado,
    'permitir_seguir_hasta_inicio', coalesce(v_d.permitir_seguir_hasta_inicio, false),
    'texto_riesgo', 'Si nadie se suma, se cobra la cancha completa y el turno queda como reserva común.',
    'puede_cancelar_gratis', v_d.estado = 'abierto' and public.plc_equipos_confirmados(v_d.id) = 1 and v_gratis,
    'puede_seguir_cierre', v_d.estado = 'abierto' and public.plc_equipos_confirmados(v_d.id) = 1 and v_gratis,
    'puede_seguir_inicio', v_d.estado = 'abierto' and public.plc_equipos_confirmados(v_d.id) = 1 and v_gratis and coalesce(v_d.permitir_seguir_hasta_inicio, false),
    'puede_quedarme', v_d.estado = 'abierto' and public.plc_equipos_confirmados(v_d.id) = 1,
    'puede_liberar', v_d.estado = 'abierto' and public.plc_equipos_confirmados(v_d.id) = 1 and v_now >= v_cierre and coalesce(v_d.busqueda_hasta, 'cierre') = 'cierre',
    'puede_conservar', v_d.estado = 'abierto' and public.plc_equipos_confirmados(v_d.id) = 1 and v_now >= v_cierre
  );
end;
$$;

create or replace function public.decidir_sin_rival(
  p_desafio_id uuid,
  p_opcion text,
  p_acepta_riesgo boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_d public.desafios%rowtype;
  v_i public.desafio_inscripciones%rowtype;
  v_now timestamp := public.ahora_argentina();
  v_cierre timestamp;
  v_gratis boolean;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  if p_opcion not in ('cancelar_gratis', 'seguir_cierre', 'seguir_inicio', 'quedarme', 'liberar', 'conservar') then
    return jsonb_build_object('ok', false, 'error', 'decision_invalida');
  end if;

  select * into v_d from public.desafios where id = p_desafio_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'desafio_no_existe');
  end if;
  if not public.plc_es_circuito(v_d.modalidad) then
    return jsonb_build_object('ok', false, 'error', 'no_es_por_la_cancha');
  end if;
  if v_d.estado is distinct from 'abierto' then
    return jsonb_build_object('ok', false, 'error', 'desafio_cerrado');
  end if;
  if public.plc_equipos_confirmados(v_d.id) <> 1 then
    return jsonb_build_object('ok', false, 'error', 'hay_rival');
  end if;

  v_i := public.plc_inscripcion_a(v_d.id);
  if v_i.capitan_id is distinct from v_user then
    return jsonb_build_object('ok', false, 'error', 'no_es_equipo_a');
  end if;

  v_cierre := public.plc_limite_inscripcion(v_d);
  v_gratis := coalesce(v_d.periodo_gratis, false)
    and v_d.vence_decision_24h is not null
    and v_now < timezone('America/Argentina/Buenos_Aires', v_d.vence_decision_24h)
    and v_d.decision_24h is null;

  if p_opcion = 'cancelar_gratis' then
    if not v_gratis then
      return jsonb_build_object('ok', false, 'error', 'no_periodo_gratis');
    end if;
    return public.plc_cancelar_gratis_sin_rival(v_d.id, 'manual');
  end if;

  if p_opcion in ('seguir_cierre', 'seguir_inicio') then
    if not v_gratis then
      return jsonb_build_object('ok', false, 'error', 'no_periodo_gratis');
    end if;
    if p_opcion = 'seguir_inicio' then
      if not coalesce(v_d.permitir_seguir_hasta_inicio, false) then
        return jsonb_build_object('ok', false, 'error', 'no_permitido_seguir_inicio');
      end if;
      if coalesce(p_acepta_riesgo, false) is not true then
        return jsonb_build_object('ok', false, 'error', 'requiere_confirmar_riesgo');
      end if;
    end if;

    update public.desafios
    set decision_24h = p_opcion,
        busqueda_hasta = case when p_opcion = 'seguir_inicio' then 'inicio' else 'cierre' end,
        riesgo_inicio_aceptado_at = case when p_opcion = 'seguir_inicio' then now() else riesgo_inicio_aceptado_at end
    where id = v_d.id;

    return jsonb_build_object('ok', true, 'accion', p_opcion, 'busqueda_hasta', case when p_opcion = 'seguir_inicio' then 'inicio' else 'cierre' end);
  end if;

  if p_opcion in ('quedarme', 'conservar') then
    return public.plc_convertir_reserva_comun(v_d.id, p_opcion);
  end if;

  if p_opcion = 'liberar' then
    if v_now < v_cierre then
      return jsonb_build_object('ok', false, 'error', 'todavia_no_cierre');
    end if;
    if coalesce(v_d.busqueda_hasta, 'cierre') is distinct from 'cierre' then
      return jsonb_build_object('ok', false, 'error', 'decision_invalida');
    end if;
    return public.plc_liberar_sin_rival(v_d.id, 'manual');
  end if;

  return jsonb_build_object('ok', false, 'error', 'decision_invalida');
end;
$$;

-- ---------------------------------------------------------------------------
-- inscribir / confirmar_pago: si busca hasta el inicio, B puede sumarse hasta el saque
-- ---------------------------------------------------------------------------
