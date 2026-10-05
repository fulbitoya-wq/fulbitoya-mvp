-- Fase 4 bloque 3: cancelación de partido confirmado, walkover y predio cancela.
-- Montos solo del snapshot (cargos_cancelacion). No toca webhooks MP de FulbitoYa.
-- Tests: supabase/tests/plc_cancelaciones.sql

alter table public.desafios
  add column if not exists cancelado_por_inscripcion_id uuid references public.desafio_inscripciones(id) on delete set null,
  add column if not exists cancelacion_tramo text,
  add column if not exists walkover_equipo_ausente_id uuid references public.equipos(id) on delete set null,
  add column if not exists aviso_walkover_at timestamptz,
  add column if not exists predio_cancelo_at timestamptz,
  add column if not exists reprogramado_desde_disponibilidad_id uuid references public.disponibilidades(id) on delete set null;

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
    'reserva_comun',
    'reprogramar'
  ));

alter table public.desafios drop constraint if exists desafios_cancelacion_tramo_chk;
alter table public.desafios
  add constraint desafios_cancelacion_tramo_chk
  check (cancelacion_tramo is null or cancelacion_tramo in (
    'mas_24h', '24_a_12h', '12_a_2h', 'menos_2h_o_ausente', 'predio'
  ));

-- reprogramar sigue ocupando el turno
drop index if exists public.idx_desafios_disponibilidad_activa;
create unique index idx_desafios_disponibilidad_activa
  on public.desafios (disponibilidad_id)
  where disponibilidad_id is not null
    and estado not in ('cancelado', 'liquidado', 'finalizado');

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
    'cancha_conservada',
    'partido_cancelado_cargo',
    'walkover_declarado',
    'aviso_walkover',
    'predio_cancelo_partido',
    'partido_reprogramado'
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
    'cancha_conservada',
    'partido_cancelado_cargo',
    'walkover_declarado',
    'aviso_walkover',
    'predio_cancelo_partido',
    'partido_reprogramado'
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
    'cancha_conservada',
    'partido_cancelado_cargo',
    'walkover_declarado',
    'aviso_walkover',
    'predio_cancelo_partido',
    'partido_reprogramado'
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

create or replace function public.plc_tramo_cancelacion(p_inicio timestamp, p_ahora timestamp)
returns text
language sql
immutable
as $$
  select case
    when p_ahora < p_inicio - interval '24 hours' then 'mas_24h'
    when p_ahora < p_inicio - interval '12 hours' then '24_a_12h'
    when p_ahora < p_inicio - interval '2 hours' then '12_a_2h'
    else 'menos_2h_o_ausente'
  end;
$$;

create or replace function public.plc_cargo_snapshot(p_cond jsonb, p_tramo text)
returns jsonb
language plpgsql
stable
as $$
declare
  v jsonb;
begin
  if p_cond is null then
    return '{}'::jsonb;
  end if;
  select value into v
  from jsonb_array_elements(coalesce(p_cond->'cargos_cancelacion', '[]'::jsonb)) as value
  where value->>'tramo' = p_tramo
  limit 1;
  return coalesce(v, '{}'::jsonb);
end;
$$;

create or replace function public.plc_notificar_capitanes_confirmados(
  p_desafio_id uuid,
  p_tipo text,
  p_titulo text,
  p_cuerpo text,
  p_datos jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in
    select capitan_id from public.desafio_inscripciones
    where desafio_id = p_desafio_id and estado = 'confirmada'
  loop
    perform public.emitir_notificacion(r.capitan_id, p_tipo, p_titulo, p_cuerpo, p_datos);
  end loop;
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
begin
  if v_cargo <= 0 then
    if not exists (
      select 1 from public.movimientos
      where inscripcion_id = p_inscripcion.id and tipo = 'reembolso_total'
    ) then
      perform public.registrar_movimiento(
        p_desafio_id, p_inscripcion.id, p_inscripcion.capitan_id, p_predio,
        'reembolso_total', v_pagado, p_detalle
      );
    end if;
    return jsonb_build_object('cargo', 0, 'reembolso', v_pagado, 'retiene_app', 0, 'para_predio', 0);
  end if;

  v_resto := greatest(v_pagado - v_cargo, 0);
  if v_app <= 0 then
    v_app := least(coalesce(p_inscripcion.monto_servicio, 0), v_cargo);
  end if;
  if v_predio <= 0 then
    v_predio := greatest(v_cargo - v_app, 0);
  end if;

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
      'tarifa_servicio_retenida', v_app, 'Tarifa de servicio del equipo que cancela'
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

  return jsonb_build_object('cargo', v_cargo, 'reembolso', v_resto, 'retiene_app', v_app, 'para_predio', v_predio);
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
  if p_inscripcion.id is null then
    return;
  end if;
  if exists (
    select 1 from public.movimientos
    where inscripcion_id = p_inscripcion.id
      and tipo in ('reembolso_total', 'reembolso_parcial', 'reembolso_cancha', 'reembolso_mitad')
  ) then
    return;
  end if;
  perform public.registrar_movimiento(
    p_desafio_id, p_inscripcion.id, p_inscripcion.capitan_id, p_predio,
    'reembolso_total', coalesce(p_inscripcion.monto_total, 0), p_detalle
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
  if v_d.modalidad is distinct from 'por_la_cancha' then
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
  if v_d.modalidad is distinct from 'por_la_cancha' then
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
  if v_d.modalidad is distinct from 'por_la_cancha' then
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
  if v_d.modalidad is distinct from 'por_la_cancha' then
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

create or replace function public.reprogramar_partido(p_desafio_id uuid, p_nueva_disponibilidad_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_d public.desafios%rowtype;
  v_old public.disponibilidades%rowtype;
  v_new public.disponibilidades%rowtype;
  v_inicio timestamp;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  if p_nueva_disponibilidad_id is null then
    return jsonb_build_object('ok', false, 'error', 'turno_no_existe');
  end if;

  select * into v_d from public.desafios where id = p_desafio_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'desafio_no_existe');
  end if;
  if not public.plc_es_dueno_cancha(v_d.cancha_id) then
    return jsonb_build_object('ok', false, 'error', 'no_dueno_predio');
  end if;
  if v_d.estado is distinct from 'reprogramar' then
    return jsonb_build_object('ok', false, 'error', 'reprogramar_no_pedido');
  end if;

  select * into v_old from public.disponibilidades where id = v_d.disponibilidad_id;
  select * into v_new from public.disponibilidades where id = p_nueva_disponibilidad_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'turno_no_existe');
  end if;
  if v_new.estado is distinct from 'disponible' then
    return jsonb_build_object('ok', false, 'error', 'turno_no_disponible');
  end if;
  if v_old.campo_id is distinct from v_new.campo_id then
    return jsonb_build_object('ok', false, 'error', 'turno_distinto_campo');
  end if;

  v_inicio := public.inicio_turno(v_new.fecha, v_new.hora_inicio);
  if v_inicio <= public.ahora_argentina() then
    return jsonb_build_object('ok', false, 'error', 'turno_pasado');
  end if;

  update public.disponibilidades
  set estado = 'reservado'
  where id = v_new.id and estado = 'disponible';
  if not found then
    return jsonb_build_object('ok', false, 'error', 'turno_no_disponible');
  end if;

  perform public.liberar_turno_partido(v_d.disponibilidad_id);

  update public.desafios
  set disponibilidad_id = v_new.id,
      fecha = v_new.fecha,
      hora_inicio = v_new.hora_inicio,
      duracion_min = greatest(1, round(extract(epoch from (v_new.hora_fin - v_new.hora_inicio)) / 60.0)::int),
      estado = 'completo',
      reprogramado_desde_disponibilidad_id = v_d.disponibilidad_id
  where id = v_d.id;

  perform public.plc_notificar_capitanes_confirmados(
    v_d.id,
    'partido_reprogramado',
    'Se reprogramó el partido',
    'El predio movió ' || v_d.titulo || ' a un nuevo turno. Los montos siguen igual.',
    jsonb_build_object('desafio_id', v_d.id, 'disponibilidad_id', v_new.id, 'destino', 'desafio')
  );

  return jsonb_build_object('ok', true, 'disponibilidad_id', v_new.id, 'fecha', v_new.fecha, 'hora_inicio', v_new.hora_inicio);
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
  if not public.es_capitan(v_i.equipo_id) then
    return jsonb_build_object('ok', false, 'error', 'no_capitan');
  end if;
  if v_i.estado not in ('pendiente_pago', 'confirmada') then
    return jsonb_build_object('ok', false, 'error', 'no_activa');
  end if;

  select * into v_d from public.desafios where id = v_i.desafio_id for update;

  if v_d.modalidad = 'por_la_cancha' then
    if v_d.estado = 'completo' and v_i.estado = 'confirmada' then
      return public.cancelar_partido_confirmado(v_d.id);
    end if;
    if v_d.estado = 'abierto' and v_i.estado = 'confirmada' then
      return jsonb_build_object('ok', false, 'error', 'usar_decidir_sin_rival');
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
    select d.id, d.titulo, d.aviso_cierre_at
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
    select d.id, d.titulo, d.fecha, d.hora_inicio, d.condiciones
    from public.desafios d
    where d.modalidad = 'por_la_cancha'
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
    'plazo_confirmacion', v_plazo,
    'aviso_walkover', v_aviso_wo
  );
end;
$$;

revoke all on function public.opciones_cancelacion_partido(uuid) from public;
revoke all on function public.cancelar_partido_confirmado(uuid) from public;
revoke all on function public.reportar_walkover(uuid) from public;
revoke all on function public.predio_cancela_partido(uuid) from public;
revoke all on function public.reprogramar_partido(uuid, uuid) from public;

grant execute on function public.opciones_cancelacion_partido(uuid) to authenticated;
grant execute on function public.cancelar_partido_confirmado(uuid) to authenticated;
grant execute on function public.reportar_walkover(uuid) to authenticated;
grant execute on function public.predio_cancela_partido(uuid) to authenticated;
grant execute on function public.reprogramar_partido(uuid, uuid) to authenticated;
grant execute on function public.cancelar_inscripcion(uuid) to authenticated;
grant execute on function public.plc_tarea_periodica_partidos() to service_role;
