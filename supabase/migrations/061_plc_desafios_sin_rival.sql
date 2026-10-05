-- Fase 3 bloque 3: desafíos sin rival (aviso 26h, default 24h, cierre, conservar).
-- Montos solo del snapshot. No toca webhooks ni checkout MP de FulbitoYa.
-- Tests: supabase/tests/plc_desafios_sin_rival.sql

-- ---------------------------------------------------------------------------
-- Columnas
-- ---------------------------------------------------------------------------
alter table public.desafios
  add column if not exists busqueda_hasta text,
  add column if not exists decision_24h text,
  add column if not exists decision_cierre text,
  add column if not exists periodo_gratis boolean,
  add column if not exists permitir_seguir_hasta_inicio boolean,
  add column if not exists vence_decision_24h timestamptz,
  add column if not exists aviso_26h_at timestamptz,
  add column if not exists aviso_cierre_at timestamptz,
  add column if not exists riesgo_inicio_aceptado_at timestamptz,
  add column if not exists convertido_reserva_id uuid references public.reservas(id) on delete set null;

update public.desafios
set busqueda_hasta = coalesce(busqueda_hasta, 'cierre')
where modalidad = 'por_la_cancha' and busqueda_hasta is null;

alter table public.desafios drop constraint if exists desafios_busqueda_hasta_chk;
alter table public.desafios
  add constraint desafios_busqueda_hasta_chk
  check (busqueda_hasta is null or busqueda_hasta in ('cierre', 'inicio'));

alter table public.desafios drop constraint if exists desafios_decision_24h_chk;
alter table public.desafios
  add constraint desafios_decision_24h_chk
  check (decision_24h is null or decision_24h in (
    'cancelar_gratis', 'seguir_cierre', 'seguir_inicio', 'quedarme', 'sin_respuesta'
  ));

alter table public.desafios drop constraint if exists desafios_decision_cierre_chk;
alter table public.desafios
  add constraint desafios_decision_cierre_chk
  check (decision_cierre is null or decision_cierre in ('liberar', 'conservar', 'sin_respuesta'));

alter table public.desafios drop constraint if exists desafios_estado_chk;
alter table public.desafios
  add constraint desafios_estado_chk
  check (estado in (
    'pendiente_pago',
    'abierto',
    'completo',
    'cancelado',
    'finalizado',
    'en_disputa',
    'liquidado',
    'reserva_comun'
  ));

alter table public.movimientos drop constraint if exists movimientos_tipo_chk;
alter table public.movimientos
  add constraint movimientos_tipo_chk check (tipo in (
    'reembolso_cancha',
    'reembolso_mitad',
    'reembolso_total',
    'reembolso_parcial',
    'tarifa_servicio_retenida',
    'deuda_predio'
  ));

drop index if exists public.uq_movimientos_reembolso_inscripcion;
create unique index uq_movimientos_reembolso_inscripcion
  on public.movimientos (inscripcion_id, tipo)
  where inscripcion_id is not null
    and tipo in ('reembolso_total', 'reembolso_cancha', 'reembolso_mitad', 'reembolso_parcial');

-- ---------------------------------------------------------------------------
-- Notificaciones
-- ---------------------------------------------------------------------------
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
    'inscripcion_cancelada',
    'pago_confirmado',
    'rival_sumado',
    'partido_sin_rival_cancelado',
    'rival_confirmo_resultado',
    'resultado_en_disputa',
    'reembolso_procesado',
    'aviso_26h_sin_rival',
    'decision_24h_sin_rival',
    'decision_cierre_sin_rival',
    'turno_liberado_cargo',
    'cancha_conservada'
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
    'inscripcion_cancelada',
    'pago_confirmado',
    'rival_sumado',
    'partido_sin_rival_cancelado',
    'rival_confirmo_resultado',
    'resultado_en_disputa',
    'reembolso_procesado',
    'aviso_26h_sin_rival',
    'decision_24h_sin_rival',
    'decision_cierre_sin_rival',
    'turno_liberado_cargo',
    'cancha_conservada'
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
    'inscripcion_cancelada',
    'pago_confirmado',
    'rival_sumado',
    'partido_sin_rival_cancelado',
    'rival_confirmo_resultado',
    'resultado_en_disputa',
    'reembolso_procesado',
    'aviso_26h_sin_rival',
    'decision_24h_sin_rival',
    'decision_cierre_sin_rival',
    'turno_liberado_cargo',
    'cancha_conservada'
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

-- ---------------------------------------------------------------------------
-- Snapshot → columnas de búsqueda
-- ---------------------------------------------------------------------------
create or replace function public.plc_ts_ar(p_texto text)
returns timestamptz
language plpgsql
immutable
as $$
begin
  if p_texto is null or btrim(p_texto) = '' then
    return null;
  end if;
  -- El motor guarda timestamps naive de America/Argentina/Buenos_Aires.
  return timezone('America/Argentina/Buenos_Aires', replace(p_texto, 'T', ' ')::timestamp);
exception when others then
  return timezone('America/Argentina/Buenos_Aires', left(replace(p_texto, 'T', ' '), 19)::timestamp);
end;
$$;

create or replace function public.plc_init_columnas_sin_rival()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.modalidad is distinct from 'por_la_cancha' or new.condiciones is null then
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

drop trigger if exists trg_plc_init_columnas_sin_rival on public.desafios;
create trigger trg_plc_init_columnas_sin_rival
  before insert or update of condiciones, modalidad on public.desafios
  for each row execute function public.plc_init_columnas_sin_rival();

create or replace function public.plc_limite_inscripcion(p_d public.desafios)
returns timestamp
language sql
stable
as $$
  select case
    when coalesce(p_d.busqueda_hasta, 'cierre') = 'inicio'
      then p_d.fecha::timestamp + p_d.hora_inicio
    when p_d.cierre_inscripcion is not null
      then timezone('America/Argentina/Buenos_Aires', p_d.cierre_inscripcion)
    else p_d.fecha::timestamp + p_d.hora_inicio - interval '2 hours'
  end;
$$;

create or replace function public.plc_inicio_desafio(p_d public.desafios)
returns timestamp
language sql
immutable
as $$
  select p_d.fecha::timestamp + p_d.hora_inicio;
$$;

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
  where desafio_id = p_desafio_id and estado = 'confirmada'
  order by confirmada_at nulls last, created_at
  limit 1;
  return v_i;
end;
$$;

create or replace function public.plc_equipos_confirmados(p_desafio_id uuid)
returns int
language sql
stable
as $$
  select count(*)::int
  from public.desafio_inscripciones
  where desafio_id = p_desafio_id and estado = 'confirmada';
$$;

create or replace function public.plc_monto_snap(p_cond jsonb, p_clave text, p_fallback numeric)
returns numeric
language sql
immutable
as $$
  select coalesce(nullif(p_cond->>p_clave, '')::numeric, p_fallback, 0);
$$;

-- ---------------------------------------------------------------------------
-- Liberar (matriz) / convertir a reserva común (cancha completa)
-- ---------------------------------------------------------------------------
create or replace function public.plc_liberar_sin_rival(p_desafio_id uuid, p_origen text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_d public.desafios%rowtype;
  v_i public.desafio_inscripciones%rowtype;
  v_sena numeric;
  v_pagado numeric;
  v_resto numeric;
begin
  select * into v_d from public.desafios where id = p_desafio_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'desafio_no_existe');
  end if;
  if v_d.estado = 'cancelado' then
    return jsonb_build_object('ok', true, 'idempotente', true);
  end if;
  if v_d.estado is distinct from 'abierto' then
    return jsonb_build_object('ok', false, 'error', 'desafio_cerrado');
  end if;
  if public.plc_equipos_confirmados(v_d.id) <> 1 then
    return jsonb_build_object('ok', false, 'error', 'hay_rival');
  end if;

  v_i := public.plc_inscripcion_a(v_d.id);
  v_sena := public.plc_monto_snap(v_d.condiciones, 'sena_sin_rival', 0);
  v_pagado := coalesce(v_i.monto_total, 0);
  if v_sena <= 0 or v_sena > v_pagado then
    return jsonb_build_object('ok', false, 'error', 'sena_invalida');
  end if;
  v_resto := v_pagado - v_sena;

  update public.desafios
  set estado = 'cancelado',
      decision_cierre = coalesce(decision_cierre, case when p_origen = 'auto' then 'sin_respuesta' else 'liberar' end)
  where id = v_d.id;

  update public.desafio_inscripciones
  set estado = 'expirada', updated_at = now()
  where desafio_id = v_d.id and estado = 'pendiente_pago';

  perform public.liberar_turno_partido(v_d.disponibilidad_id);

  if not exists (
    select 1 from public.movimientos
    where inscripcion_id = v_i.id and tipo = 'deuda_predio'
  ) then
    perform public.registrar_movimiento(
      v_d.id, v_i.id, v_i.capitan_id, v_d.cancha_id,
      'deuda_predio', v_sena,
      'Cargo sin rival (matriz). El predio cobra este monto.'
    );
  end if;

  if v_resto > 0 and not exists (
    select 1 from public.movimientos
    where inscripcion_id = v_i.id and tipo = 'reembolso_parcial'
  ) then
    perform public.registrar_movimiento(
      v_d.id, v_i.id, v_i.capitan_id, v_d.cancha_id,
      'reembolso_parcial', v_resto,
      'Resto después del cargo sin rival'
    );
  end if;

  perform public.emitir_notificacion(
    v_i.capitan_id,
    'turno_liberado_cargo',
    'Se liberó el turno',
    'No se sumó un rival a ' || v_d.titulo || '. Se retiene el cargo de la matriz y te devolvemos el resto.',
    jsonb_build_object(
      'desafio_id', v_d.id,
      'cargo', v_sena,
      'reembolso', v_resto,
      'destino', 'desafio'
    )
  );

  return jsonb_build_object(
    'ok', true,
    'accion', 'liberar',
    'cargo', v_sena,
    'reembolso', v_resto
  );
end;
$$;

create or replace function public.plc_convertir_reserva_comun(p_desafio_id uuid, p_origen text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_d public.desafios%rowtype;
  v_i public.desafio_inscripciones%rowtype;
  v_precio numeric;
  v_tarifa numeric;
  v_reserva uuid;
begin
  select * into v_d from public.desafios where id = p_desafio_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'desafio_no_existe');
  end if;
  if v_d.estado = 'reserva_comun' then
    return jsonb_build_object('ok', true, 'idempotente', true, 'reserva_id', v_d.convertido_reserva_id);
  end if;
  if v_d.estado is distinct from 'abierto' then
    return jsonb_build_object('ok', false, 'error', 'desafio_cerrado');
  end if;
  if public.plc_equipos_confirmados(v_d.id) <> 1 then
    return jsonb_build_object('ok', false, 'error', 'hay_rival');
  end if;

  v_i := public.plc_inscripcion_a(v_d.id);
  v_precio := coalesce(v_d.precio_cancha, public.plc_monto_snap(v_d.condiciones, 'precio_cancha', 0));
  v_tarifa := coalesce(v_d.tarifa_servicio, public.plc_monto_snap(v_d.condiciones, 'tarifa_servicio_equipo', 0));

  insert into public.reservas (
    disponibilidad_id, organizador_id, monto_total, estado_pago
  ) values (
    v_d.disponibilidad_id, v_i.capitan_id, v_precio, 'pagado'
  )
  returning id into v_reserva;

  update public.disponibilidades
  set estado = 'reservado'
  where id = v_d.disponibilidad_id;

  update public.desafios
  set estado = 'reserva_comun',
      convertido_reserva_id = v_reserva,
      decision_24h = coalesce(decision_24h, 'quedarme'),
      decision_cierre = case when p_origen = 'inicio' then coalesce(decision_cierre, 'conservar') else coalesce(decision_cierre, 'conservar') end
  where id = v_d.id;

  update public.desafio_inscripciones
  set estado = 'expirada', updated_at = now()
  where desafio_id = v_d.id and estado = 'pendiente_pago';

  if not exists (
    select 1 from public.movimientos
    where inscripcion_id = v_i.id and tipo = 'deuda_predio'
  ) then
    perform public.registrar_movimiento(
      v_d.id, v_i.id, v_i.capitan_id, v_d.cancha_id,
      'deuda_predio', v_precio,
      'Cancha completa: el turno queda como reserva común'
    );
  end if;

  if v_tarifa > 0 and not exists (
    select 1 from public.movimientos
    where inscripcion_id = v_i.id and tipo = 'tarifa_servicio_retenida'
  ) then
    perform public.registrar_movimiento(
      v_d.id, v_i.id, v_i.capitan_id, v_d.cancha_id,
      'tarifa_servicio_retenida', v_tarifa,
      'Tarifa de servicio retenida'
    );
  end if;

  perform public.emitir_notificacion(
    v_i.capitan_id,
    'cancha_conservada',
    'Te quedaste con la cancha',
    'El turno de ' || v_d.titulo || ' quedó como reserva común. Se cobra la cancha completa.',
    jsonb_build_object('desafio_id', v_d.id, 'reserva_id', v_reserva, 'destino', 'desafio')
  );

  return jsonb_build_object(
    'ok', true,
    'accion', 'conservar',
    'reserva_id', v_reserva,
    'precio_cancha', v_precio
  );
end;
$$;

create or replace function public.plc_cancelar_gratis_sin_rival(p_desafio_id uuid, p_origen text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_d public.desafios%rowtype;
  v_i public.desafio_inscripciones%rowtype;
begin
  select * into v_d from public.desafios where id = p_desafio_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'desafio_no_existe');
  end if;
  if v_d.estado = 'cancelado' then
    return jsonb_build_object('ok', true, 'idempotente', true);
  end if;
  if v_d.estado is distinct from 'abierto' then
    return jsonb_build_object('ok', false, 'error', 'desafio_cerrado');
  end if;
  if public.plc_equipos_confirmados(v_d.id) <> 1 then
    return jsonb_build_object('ok', false, 'error', 'hay_rival');
  end if;

  v_i := public.plc_inscripcion_a(v_d.id);

  update public.desafios
  set estado = 'cancelado',
      decision_24h = coalesce(decision_24h, case when p_origen = 'auto' then 'sin_respuesta' else 'cancelar_gratis' end)
  where id = v_d.id;

  update public.desafio_inscripciones
  set estado = 'expirada', updated_at = now()
  where desafio_id = v_d.id and estado = 'pendiente_pago';

  perform public.liberar_turno_partido(v_d.disponibilidad_id);

  if not exists (
    select 1 from public.movimientos
    where inscripcion_id = v_i.id and tipo = 'reembolso_total'
  ) then
    perform public.registrar_movimiento(
      v_d.id, v_i.id, v_i.capitan_id, v_d.cancha_id,
      'reembolso_total', coalesce(v_i.monto_total, 0),
      'Cancelación gratis sin rival (antes de las 24 hs)'
    );
  end if;

  perform public.emitir_notificacion(
    v_i.capitan_id,
    'partido_sin_rival_cancelado',
    'Se canceló el partido',
    'Cancelamos ' || v_d.titulo || ' sin cargo. Te devolvemos todo.',
    jsonb_build_object('desafio_id', v_d.id, 'destino', 'desafio')
  );

  return jsonb_build_object('ok', true, 'accion', 'cancelar_gratis', 'reembolso', coalesce(v_i.monto_total, 0));
end;
$$;

-- ---------------------------------------------------------------------------
-- RPCs de capitán A
-- ---------------------------------------------------------------------------
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
  if v_d.modalidad is distinct from 'por_la_cancha' then
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
  if v_d.modalidad is distinct from 'por_la_cancha' then
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
  v_val jsonb;
  v_conv uuid[];
  v_uid uuid;
  v_estado text;
  v_insc uuid;
  v_prev public.desafio_inscripciones%rowtype;
  v_eq_nombre text;
  v_por_cancha boolean;
  v_expira timestamptz;
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

  v_por_cancha := v_d.modalidad = 'por_la_cancha';
  v_now := public.ahora_argentina();
  v_inicio := public.plc_inicio_desafio(v_d);
  v_cierre := public.plc_limite_inscripcion(v_d);
  if v_now >= v_cierre then
    return jsonb_build_object('ok', false, 'error', 'inscripcion_cerrada');
  end if;

  v_val := public.validar_convocados_mayores(
    p_equipo_id,
    p_convocados,
    v_d.tipo::text
  );
  if v_por_cancha or v_d.premio > 0 then
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

  if v_por_cancha then
    v_estado := 'pendiente_pago';
    v_expira := now() + interval '15 minutes';
  else
    v_estado := 'confirmada';
    v_expira := null;
  end if;

  if v_prev.id is not null then
    update public.desafio_inscripciones
    set capitan_id = v_user,
        estado = v_estado,
        confirmada_at = case when v_estado = 'confirmada' then now() else null end,
        cancelada_at = null,
        expira_at = v_expira,
        monto_cancha = case when v_por_cancha then v_d.precio_cancha else monto_cancha end,
        monto_servicio = case when v_por_cancha then v_d.tarifa_servicio else monto_servicio end,
        monto_total = case when v_por_cancha then v_d.precio_cancha + v_d.tarifa_servicio else monto_total end,
        updated_at = now()
    where id = v_prev.id
    returning id into v_insc;
    delete from public.desafio_convocados where inscripcion_id = v_insc;
  else
    insert into public.desafio_inscripciones (
      desafio_id, equipo_id, capitan_id, estado, confirmada_at, expira_at,
      monto_cancha, monto_servicio, monto_total
    ) values (
      p_desafio_id, p_equipo_id, v_user, v_estado,
      case when v_estado = 'confirmada' then now() else null end,
      v_expira,
      case when v_por_cancha then v_d.precio_cancha else null end,
      case when v_por_cancha then v_d.tarifa_servicio else null end,
      case when v_por_cancha then v_d.precio_cancha + v_d.tarifa_servicio else null end
    )
    returning id into v_insc;
  end if;

  insert into public.desafio_convocados (inscripcion_id, desafio_id, usuario_id)
  select v_insc, p_desafio_id, u
  from unnest(v_conv) as u;

  select count(*) into v_ocupados
  from public.desafio_inscripciones
  where desafio_id = p_desafio_id and estado = 'confirmada';

  if (not v_por_cancha) and v_ocupados >= 2 then
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
      'Se inscribió un equipo',
      coalesce(v_eq_nombre, 'Un equipo') || ' se sumó a ' || v_d.titulo || '.',
      jsonb_build_object('desafio_id', p_desafio_id, 'equipo_id', p_equipo_id, 'destino', 'desafio')
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'inscripcion_id', v_insc,
    'estado', v_estado,
    'expira_at', v_expira,
    'monto_cancha', case when v_por_cancha then v_d.precio_cancha else null end,
    'monto_servicio', case when v_por_cancha then v_d.tarifa_servicio else null end,
    'monto_total', case when v_por_cancha then v_d.precio_cancha + v_d.tarifa_servicio else null end
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
    return jsonb_build_object(
      'ok', false, 'error', 'pago_fuera_de_tiempo', 'reembolso_total', true, 'idempotente', true
    );
  end if;

  v_cierre := public.plc_limite_inscripcion(v_d);

  select count(*) into v_pagadas
  from public.desafio_inscripciones
  where desafio_id = v_d.id and estado = 'confirmada';

  v_tarde :=
    v_i.estado is distinct from 'pendiente_pago'
    or v_d.estado not in ('pendiente_pago', 'abierto')
    or (v_i.expira_at is not null and v_i.expira_at < now())
    or v_pagadas >= 2
    or (v_d.estado = 'abierto' and public.ahora_argentina() >= v_cierre);

  if v_tarde then
    if v_i.estado = 'pendiente_pago' then
      update public.desafio_inscripciones
      set estado = 'expirada', updated_at = now()
      where id = v_i.id;
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
    v_i.capitan_id,
    'pago_confirmado',
    'Pago confirmado',
    'El pago de ' || v_d.titulo || ' está confirmado.',
    jsonb_build_object('desafio_id', v_d.id, 'inscripcion_id', v_i.id, 'destino', 'desafio')
  );

  if v_d.estado = 'pendiente_pago' then
    update public.desafios set estado = 'abierto' where id = v_d.id;
    update public.disponibilidades
    set estado = 'reservado'
    where id = v_d.disponibilidad_id and estado = 'reservado_pendiente';
  end if;

  select count(*) into v_pagadas
  from public.desafio_inscripciones
  where desafio_id = v_d.id and estado = 'confirmada';

  if v_pagadas >= 2 then
    update public.desafios set estado = 'completo' where id = v_d.id and estado = 'abierto';
    select capitan_id into v_owner
    from public.desafio_inscripciones
    where desafio_id = v_d.id and estado = 'confirmada' and id is distinct from v_i.id
    limit 1;
    if v_owner is not null then
      perform public.emitir_notificacion(
        v_owner,
        'rival_sumado',
        'Se sumó un rival',
        'Ya hay dos equipos en ' || v_d.titulo || '. El partido está confirmado.',
        jsonb_build_object('desafio_id', v_d.id, 'destino', 'desafio')
      );
    end if;
  end if;

  return jsonb_build_object('ok', true, 'desafio_id', v_d.id, 'pagadas', v_pagadas);
end;
$$;

-- ---------------------------------------------------------------------------
-- Tarea periódica
-- ---------------------------------------------------------------------------
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
  r record;
  v_fin timestamp;
  v_ahora timestamp := public.ahora_argentina();
  v_inicio_d timestamp;
  v_cierre timestamp;
begin
  for r in
    select i.id as inscripcion_id, d.id as desafio_id, d.disponibilidad_id, i.capitan_id, i.monto_total, d.titulo, d.cancha_id
    from public.desafio_inscripciones i
    join public.desafios d on d.id = i.desafio_id
    where d.modalidad = 'por_la_cancha'
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
    where d.modalidad = 'por_la_cancha'
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
    where d.modalidad = 'por_la_cancha'
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
    where d.modalidad = 'por_la_cancha'
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
    select d.id, d.titulo, d.aviso_cierre_at, d.fecha, d.hora_inicio, d.cierre_inscripcion, d.busqueda_hasta
    from public.desafios d
    where d.modalidad = 'por_la_cancha'
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
    where d.modalidad = 'por_la_cancha'
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
    select d.id, d.fecha, d.hora_inicio, d.duracion_min
    from public.desafios d
    where d.modalidad = 'por_la_cancha'
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

  return jsonb_build_object(
    'ok', true,
    'expiradas_equipo_a', v_exp_a,
    'expiradas_equipo_b', v_exp_b,
    'aviso_26h', v_aviso_26,
    'default_24h', v_default_24,
    'sin_rival', v_sin_rival,
    'seguir_inicio_sin_rival', v_inicio,
    'plazo_confirmacion', v_plazo
  );
end;
$$;

revoke all on function public.opciones_sin_rival(uuid) from public;
revoke all on function public.decidir_sin_rival(uuid, text, boolean) from public;
revoke all on function public.plc_liberar_sin_rival(uuid, text) from public;
revoke all on function public.plc_convertir_reserva_comun(uuid, text) from public;
revoke all on function public.plc_cancelar_gratis_sin_rival(uuid, text) from public;

grant execute on function public.opciones_sin_rival(uuid) to authenticated;
grant execute on function public.decidir_sin_rival(uuid, text, boolean) to authenticated;
grant execute on function public.inscribir_equipo(uuid, uuid, uuid[]) to authenticated;
grant execute on function public.plc_tarea_periodica_partidos() to service_role;
grant execute on function public.confirmar_pago_inscripcion(uuid, text) to service_role;
