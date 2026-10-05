-- Tests Fase 3: desafíos sin rival (bloque 3).
-- NO se aplica con db push. Transacción + rollback.

begin;

create or replace function public.plc_test_set_user(p_uid uuid)
returns void
language plpgsql
as $$
begin
  if p_uid is null then
    perform set_config('request.jwt.claim.sub', '', true);
    perform set_config('request.jwt.claims', '{}', true);
  else
    perform set_config('request.jwt.claim.sub', p_uid::text, true);
    perform set_config(
      'request.jwt.claims',
      jsonb_build_object('sub', p_uid::text, 'role', 'authenticated')::text,
      true
    );
  end if;
end;
$$;

create or replace function public.plc_sr_user(p_email text, p_nombre text)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_id uuid;
begin
  select id into v_id from public.usuarios where email = p_email;
  if v_id is not null then
    return v_id;
  end if;
  v_id := gen_random_uuid();
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_id,
    'authenticated',
    'authenticated',
    p_email,
    crypt('test-pass', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('nombre', p_nombre)
  );
  insert into public.usuarios (id, email, nombre, rol)
  values (v_id, p_email, p_nombre, 'jugador')
  on conflict (id) do update set nombre = excluded.nombre;
  return v_id;
end;
$$;

create or replace function public.plc_sr_equipo(p_tag text)
returns table (capitan_id uuid, equipo_id uuid, convocados uuid[])
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cap uuid;
  v_eq uuid;
  v_ids uuid[] := '{}';
  i int;
  v_uid uuid;
begin
  v_cap := public.plc_sr_user('plc-sr-cap-' || lower(p_tag) || '@test.local', 'Capitan SR ' || p_tag);
  v_ids := array_append(v_ids, v_cap);
  insert into public.jugador_perfiles (usuario_id, fecha_nacimiento)
  values (v_cap, date '1990-01-01')
  on conflict (usuario_id) do update set fecha_nacimiento = date '1990-01-01';

  insert into public.equipos (nombre, creado_por)
  values ('PLC SR ' || p_tag, v_cap)
  returning id into v_eq;

  insert into public.equipo_miembros (equipo_id, usuario_id, rol, estado, es_capitan)
  values (v_eq, v_cap, 'capitan', 'activo', true);

  for i in 1..4 loop
    v_uid := public.plc_sr_user(
      'plc-sr-j' || i || '-' || lower(p_tag) || '@test.local',
      'Jugador SR ' || p_tag || i
    );
    v_ids := array_append(v_ids, v_uid);
    insert into public.jugador_perfiles (usuario_id, fecha_nacimiento)
    values (v_uid, date '1992-06-01')
    on conflict (usuario_id) do update set fecha_nacimiento = date '1992-06-01';
    insert into public.equipo_miembros (equipo_id, usuario_id, rol, estado, es_capitan)
    values (v_eq, v_uid, 'jugador', 'activo', false);
  end loop;

  capitan_id := v_cap;
  equipo_id := v_eq;
  convocados := v_ids;
  return next;
end;
$$;

create or replace function public.plc_sr_turno(p_campo uuid, p_en interval)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_inicio timestamp;
begin
  v_inicio := public.ahora_argentina() + p_en;
  insert into public.disponibilidades (campo_id, fecha, hora_inicio, hora_fin, precio, estado)
  values (
    p_campo,
    v_inicio::date,
    v_inicio::time,
    (v_inicio + interval '1 hour')::time,
    40000,
    'disponible'
  )
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.plc_run_sin_rival_tests()
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_owner uuid;
  v_cap_a uuid;
  v_eq_a uuid;
  v_conv_a uuid[];
  v_cancha uuid;
  v_campo uuid;
  v_disp uuid;
  v_d uuid;
  v_ia uuid;
  v_res jsonb;
  v_estado text;
  v_slot text;
  v_monto numeric;
  v_esc text;
  v_n int;
  v_rid uuid;
begin
  perform public.plc_test_set_user(null);
  v_owner := public.plc_sr_user('plc-sr-owner@test.local', 'Owner SR');
  select * into v_cap_a, v_eq_a, v_conv_a from public.plc_sr_equipo('A');

  insert into public.canchas (owner_id, nombre, direccion, barrio, lat, lng, activa, valor_hora, valor_reserva)
  values (v_owner, 'PLC SR PREDIO', 'Test 1', 'Test', -34.6, -58.4, true, 40000, 12000)
  returning id into v_cancha;

  insert into public.campos (cancha_id, nombre, tipo, superficie, valor_hora, valor_reserva)
  values (v_cancha, 'F5 SR', '5', 'cesped_sintetico', 40000, 12000)
  returning id into v_campo;

  -- -----------------------------------------------------------------------
  -- Amistoso: tres tramos (sin crear_partido; eso es fase 5)
  -- -----------------------------------------------------------------------
  v_esc := 'amistoso_tramos';
  v_disp := public.plc_sr_turno(v_campo, interval '72 hours');
  v_res := public.calcular_condiciones(v_disp, 'amistoso', now());
  if (v_res->>'sena_sin_rival')::numeric <> 8000 then
    raise exception '% >48 %', v_esc, v_res->>'sena_sin_rival';
  end if;
  v_disp := public.plc_sr_turno(v_campo, interval '30 hours');
  v_res := public.calcular_condiciones(v_disp, 'amistoso', now());
  if (v_res->>'sena_sin_rival')::numeric <> 12000 then
    raise exception '% 30h %', v_esc, v_res->>'sena_sin_rival';
  end if;
  v_disp := public.plc_sr_turno(v_campo, interval '8 hours');
  v_res := public.calcular_condiciones(v_disp, 'amistoso', now());
  if (v_res->>'sena_sin_rival')::numeric <> 20000 then
    raise exception '% 8h %', v_esc, v_res->>'sena_sin_rival';
  end if;

  -- -----------------------------------------------------------------------
  -- >48h cancelar gratis
  -- -----------------------------------------------------------------------
  v_esc := 'cancelar_gratis';
  v_disp := public.plc_sr_turno(v_campo, interval '72 hours');
  perform public.plc_test_set_user(v_cap_a);
  v_res := public.crear_partido(v_disp, v_eq_a, v_conv_a, 'penales');
  if coalesce(v_res->>'ok', '') <> 'true' then
    raise exception '% crear: %', v_esc, v_res;
  end if;
  v_d := (v_res->>'desafio_id')::uuid;
  v_ia := (v_res->>'inscripcion_id')::uuid;
  perform public.plc_test_set_user(null);
  v_res := public.confirmar_pago_inscripcion(v_ia, 'sr-pay-gratis');
  if coalesce(v_res->>'ok', '') <> 'true' then
    raise exception '% pago: %', v_esc, v_res;
  end if;
  perform public.plc_test_set_user(v_cap_a);
  v_res := public.decidir_sin_rival(v_d, 'cancelar_gratis', false);
  if coalesce(v_res->>'ok', '') <> 'true' then
    raise exception '% decidir: %', v_esc, v_res;
  end if;
  select estado into v_estado from public.desafios where id = v_d;
  if v_estado is distinct from 'cancelado' then
    raise exception '% estado %', v_esc, v_estado;
  end if;
  select monto into v_monto from public.movimientos
  where inscripcion_id = v_ia and tipo = 'reembolso_total';
  if v_monto is distinct from 42000 then
    raise exception '% reembolso %', v_esc, v_monto;
  end if;
  select estado into v_slot from public.disponibilidades where id = v_disp;
  if v_slot is distinct from 'disponible' then
    raise exception '% slot %', v_esc, v_slot;
  end if;

  -- -----------------------------------------------------------------------
  -- >48h sin respuesta a las 24h
  -- -----------------------------------------------------------------------
  v_esc := 'default_24h';
  v_disp := public.plc_sr_turno(v_campo, interval '72 hours');
  perform public.plc_test_set_user(v_cap_a);
  v_res := public.crear_partido(v_disp, v_eq_a, v_conv_a, 'penales');
  v_d := (v_res->>'desafio_id')::uuid;
  v_ia := (v_res->>'inscripcion_id')::uuid;
  perform public.plc_test_set_user(null);
  perform public.confirmar_pago_inscripcion(v_ia, 'sr-pay-24');
  update public.desafios
  set vence_decision_24h = now() - interval '2 minutes'
  where id = v_d;
  v_res := public.plc_tarea_periodica_partidos();
  select estado into v_estado from public.desafios where id = v_d;
  if v_estado is distinct from 'cancelado' then
    raise exception '% estado % cron %', v_esc, v_estado, v_res;
  end if;
  select monto into v_monto from public.movimientos
  where inscripcion_id = v_ia and tipo = 'reembolso_total';
  if v_monto is distinct from 42000 then
    raise exception '% reembolso %', v_esc, v_monto;
  end if;

  -- -----------------------------------------------------------------------
  -- Seguir hasta el cierre y liberar: cargo $12.000
  -- -----------------------------------------------------------------------
  v_esc := 'seguir_liberar_12000';
  v_disp := public.plc_sr_turno(v_campo, interval '72 hours');
  perform public.plc_test_set_user(v_cap_a);
  v_res := public.crear_partido(v_disp, v_eq_a, v_conv_a, 'penales');
  v_d := (v_res->>'desafio_id')::uuid;
  v_ia := (v_res->>'inscripcion_id')::uuid;
  perform public.plc_test_set_user(null);
  perform public.confirmar_pago_inscripcion(v_ia, 'sr-pay-lib');
  perform public.plc_test_set_user(v_cap_a);
  v_res := public.decidir_sin_rival(v_d, 'seguir_cierre', false);
  if coalesce(v_res->>'ok', '') <> 'true' then
    raise exception '% seguir: %', v_esc, v_res;
  end if;
  update public.desafios
  set cierre_inscripcion = now() - interval '3 minutes',
      aviso_cierre_at = now() - interval '2 minutes'
  where id = v_d;
  perform public.plc_test_set_user(null);
  perform public.plc_tarea_periodica_partidos();
  select estado into v_estado from public.desafios where id = v_d;
  if v_estado is distinct from 'cancelado' then
    raise exception '% estado %', v_esc, v_estado;
  end if;
  select monto into v_monto from public.movimientos
  where inscripcion_id = v_ia and tipo = 'deuda_predio';
  if v_monto is distinct from 12000 then
    raise exception '% cargo %', v_esc, v_monto;
  end if;
  select monto into v_monto from public.movimientos
  where inscripcion_id = v_ia and tipo = 'reembolso_parcial';
  if v_monto is distinct from 30000 then
    raise exception '% resto %', v_esc, v_monto;
  end if;

  -- -----------------------------------------------------------------------
  -- Conservar cancha
  -- -----------------------------------------------------------------------
  v_esc := 'conservar';
  v_disp := public.plc_sr_turno(v_campo, interval '72 hours');
  perform public.plc_test_set_user(v_cap_a);
  v_res := public.crear_partido(v_disp, v_eq_a, v_conv_a, 'penales');
  v_d := (v_res->>'desafio_id')::uuid;
  v_ia := (v_res->>'inscripcion_id')::uuid;
  perform public.plc_test_set_user(null);
  perform public.confirmar_pago_inscripcion(v_ia, 'sr-pay-cons');
  perform public.plc_test_set_user(v_cap_a);
  v_res := public.decidir_sin_rival(v_d, 'quedarme', false);
  if coalesce(v_res->>'ok', '') <> 'true' then
    raise exception '%: %', v_esc, v_res;
  end if;
  select estado, convertido_reserva_id into v_estado, v_rid from public.desafios where id = v_d;
  if v_estado is distinct from 'reserva_comun' or v_rid is null then
    raise exception '% estado % reserva %', v_esc, v_estado, v_rid;
  end if;
  select monto into v_monto from public.movimientos
  where inscripcion_id = v_ia and tipo = 'deuda_predio';
  if v_monto is distinct from 40000 then
    raise exception '% deuda %', v_esc, v_monto;
  end if;
  select estado into v_slot from public.disponibilidades where id = v_disp;
  if v_slot is distinct from 'reservado' then
    raise exception '% slot %', v_esc, v_slot;
  end if;
  select count(*) into v_n from public.reservas where id = v_rid and estado_pago = 'pagado';
  if v_n <> 1 then
    raise exception '% reserva no creada', v_esc;
  end if;

  -- -----------------------------------------------------------------------
  -- Seguir hasta el inicio sin rival → cancha completa
  -- -----------------------------------------------------------------------
  v_esc := 'seguir_inicio';
  v_disp := public.plc_sr_turno(v_campo, interval '72 hours');
  perform public.plc_test_set_user(v_cap_a);
  v_res := public.crear_partido(v_disp, v_eq_a, v_conv_a, 'penales');
  v_d := (v_res->>'desafio_id')::uuid;
  v_ia := (v_res->>'inscripcion_id')::uuid;
  perform public.plc_test_set_user(null);
  perform public.confirmar_pago_inscripcion(v_ia, 'sr-pay-ini');
  perform public.plc_test_set_user(v_cap_a);
  v_res := public.decidir_sin_rival(v_d, 'seguir_inicio', true);
  if coalesce(v_res->>'ok', '') <> 'true' then
    raise exception '%: %', v_esc, v_res;
  end if;
  update public.desafios
  set fecha = (public.ahora_argentina() - interval '1 hour')::date,
      hora_inicio = (public.ahora_argentina() - interval '1 hour')::time
  where id = v_d;
  perform public.plc_test_set_user(null);
  perform public.plc_tarea_periodica_partidos();
  select estado into v_estado from public.desafios where id = v_d;
  if v_estado is distinct from 'reserva_comun' then
    raise exception '% estado %', v_esc, v_estado;
  end if;
  select monto into v_monto from public.movimientos
  where inscripcion_id = v_ia and tipo = 'deuda_predio';
  if v_monto is distinct from 40000 then
    raise exception '% deuda %', v_esc, v_monto;
  end if;

  -- -----------------------------------------------------------------------
  -- Publicado 30h: sin rival al cierre cobrás $20.000
  -- -----------------------------------------------------------------------
  v_esc := 'tramo_30h';
  v_disp := public.plc_sr_turno(v_campo, interval '30 hours');
  perform public.plc_test_set_user(v_cap_a);
  v_res := public.crear_partido(v_disp, v_eq_a, v_conv_a, 'penales');
  if coalesce(v_res->>'ok', '') <> 'true' then
    raise exception '% crear: %', v_esc, v_res;
  end if;
  if (v_res->'condiciones'->>'sena_sin_rival')::numeric <> 20000 then
    raise exception '% sena % tramo %', v_esc, v_res->'condiciones'->>'sena_sin_rival', v_res->'condiciones'->>'tramo';
  end if;
  v_d := (v_res->>'desafio_id')::uuid;
  v_ia := (v_res->>'inscripcion_id')::uuid;
  perform public.plc_test_set_user(null);
  perform public.confirmar_pago_inscripcion(v_ia, 'sr-pay-30');
  update public.desafios
  set cierre_inscripcion = now() - interval '3 minutes',
      aviso_cierre_at = now() - interval '2 minutes'
  where id = v_d;
  perform public.plc_tarea_periodica_partidos();
  select monto into v_monto from public.movimientos
  where inscripcion_id = v_ia and tipo = 'deuda_predio';
  if v_monto is distinct from 20000 then
    raise exception '% cargo %', v_esc, v_monto;
  end if;
  select monto into v_monto from public.movimientos
  where inscripcion_id = v_ia and tipo = 'reembolso_parcial';
  if v_monto is distinct from 22000 then
    raise exception '% resto %', v_esc, v_monto;
  end if;

  -- -----------------------------------------------------------------------
  -- Mismo día (~8h): cargo $30.000
  -- -----------------------------------------------------------------------
  v_esc := 'mismo_dia';
  v_disp := public.plc_sr_turno(v_campo, interval '8 hours');
  perform public.plc_test_set_user(v_cap_a);
  v_res := public.crear_partido(v_disp, v_eq_a, v_conv_a, 'penales');
  if coalesce(v_res->>'ok', '') <> 'true' then
    raise exception '% crear: %', v_esc, v_res;
  end if;
  if (v_res->'condiciones'->>'sena_sin_rival')::numeric <> 30000 then
    raise exception '% sena %', v_esc, v_res->'condiciones'->>'sena_sin_rival';
  end if;
  v_d := (v_res->>'desafio_id')::uuid;
  v_ia := (v_res->>'inscripcion_id')::uuid;
  perform public.plc_test_set_user(null);
  perform public.confirmar_pago_inscripcion(v_ia, 'sr-pay-8');
  update public.desafios
  set cierre_inscripcion = now() - interval '3 minutes',
      aviso_cierre_at = now() - interval '2 minutes'
  where id = v_d;
  perform public.plc_tarea_periodica_partidos();
  select monto into v_monto from public.movimientos
  where inscripcion_id = v_ia and tipo = 'deuda_predio';
  if v_monto is distinct from 30000 then
    raise exception '% cargo %', v_esc, v_monto;
  end if;
  select monto into v_monto from public.movimientos
  where inscripcion_id = v_ia and tipo = 'reembolso_parcial';
  if v_monto is distinct from 12000 then
    raise exception '% resto %', v_esc, v_monto;
  end if;

  if coalesce(public.config_bool('premios_habilitados'), true) then
    raise exception 'premios_habilitados deberia seguir en false';
  end if;

  perform public.plc_test_set_user(null);
  return jsonb_build_object('ok', true);
end;
$$;

select public.plc_run_sin_rival_tests();
rollback;
