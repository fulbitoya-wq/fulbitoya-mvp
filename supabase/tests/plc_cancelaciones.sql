-- Tests Fase 4: cancelación confirmada, walkover y predio.
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

create or replace function public.plc_c4_user(p_email text, p_nombre text)
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
    v_id, 'authenticated', 'authenticated', p_email,
    crypt('test-pass', gen_salt('bf')), now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('nombre', p_nombre)
  );
  insert into public.usuarios (id, email, nombre, rol)
  values (v_id, p_email, p_nombre, 'jugador')
  on conflict (id) do update set nombre = excluded.nombre;
  return v_id;
end;
$$;

create or replace function public.plc_c4_equipo(p_tag text)
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
  v_cap := public.plc_c4_user('plc-c4-cap-' || lower(p_tag) || '@test.local', 'Capitan C4 ' || p_tag);
  v_ids := array_append(v_ids, v_cap);
  insert into public.jugador_perfiles (usuario_id, fecha_nacimiento)
  values (v_cap, date '1990-01-01')
  on conflict (usuario_id) do update set fecha_nacimiento = date '1990-01-01';
  insert into public.equipos (nombre, creado_por)
  values ('PLC C4 ' || p_tag, v_cap)
  returning id into v_eq;
  insert into public.equipo_miembros (equipo_id, usuario_id, rol, estado, es_capitan)
  values (v_eq, v_cap, 'capitan', 'activo', true);
  for i in 1..4 loop
    v_uid := public.plc_c4_user(
      'plc-c4-j' || i || '-' || lower(p_tag) || '@test.local',
      'Jugador C4 ' || p_tag || i
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

create or replace function public.plc_c4_turno(p_campo uuid, p_en interval)
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
    p_campo, v_inicio::date, v_inicio::time, (v_inicio + interval '1 hour')::time, 40000, 'disponible'
  )
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.plc_run_cancelaciones_tests()
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_owner uuid;
  v_cap_a uuid; v_eq_a uuid; v_conv_a uuid[];
  v_cap_b uuid; v_eq_b uuid; v_conv_b uuid[];
  v_cancha uuid; v_campo uuid;
  v_disp uuid; v_disp2 uuid;
  v_d uuid; v_ia uuid; v_ib uuid;
  v_res jsonb;
  v_estado text;
  v_monto numeric;
  v_esc text;
  v_t timestamp;
  v_n int;
begin
  perform public.plc_test_set_user(null);
  v_owner := public.plc_c4_user('plc-c4-owner@test.local', 'Owner C4');
  select * into v_cap_a, v_eq_a, v_conv_a from public.plc_c4_equipo('A');
  select * into v_cap_b, v_eq_b, v_conv_b from public.plc_c4_equipo('B');

  insert into public.canchas (owner_id, nombre, direccion, barrio, lat, lng, activa, valor_hora, valor_reserva)
  values (v_owner, 'PLC C4 PREDIO', 'Test', 'Test', -34.6, -58.4, true, 40000, 12000)
  returning id into v_cancha;
  insert into public.campos (cancha_id, nombre, tipo, superficie, valor_hora, valor_reserva)
  values (v_cancha, 'F5 C4', '5', 'cesped_sintetico', 40000, 12000)
  returning id into v_campo;

  -- Amistoso: cargos del motor
  v_esc := 'amistoso_cargos';
  v_disp := public.plc_c4_turno(v_campo, interval '72 hours');
  v_res := public.calcular_condiciones(v_disp, 'amistoso', now());
  if (select (value->>'cargo')::numeric from jsonb_array_elements(v_res->'cargos_cancelacion') value where value->>'tramo' = '24_a_12h') is distinct from 12000 then
    raise exception '% cargo 24-12 %', v_esc, v_res->'cargos_cancelacion';
  end if;
  if (select (value->>'cargo')::numeric from jsonb_array_elements(v_res->'cargos_cancelacion') value where value->>'tramo' = '12_a_2h') is distinct from 20000 then
    raise exception '% cargo 12-2 %', v_esc, v_res->'cargos_cancelacion';
  end if;

  -- helper local vía bloques repetidos
  v_esc := 'mas_24h';
  v_disp := public.plc_c4_turno(v_campo, interval '72 hours');
  perform public.plc_test_set_user(v_cap_a);
  v_res := public.crear_partido(v_disp, v_eq_a, v_conv_a, 'penales');
  v_d := (v_res->>'desafio_id')::uuid;
  v_ia := (v_res->>'inscripcion_id')::uuid;
  perform public.plc_test_set_user(null);
  perform public.confirmar_pago_inscripcion(v_ia, 'c4-a-24');
  perform public.plc_test_set_user(v_cap_b);
  v_res := public.inscribir_equipo(v_d, v_eq_b, v_conv_b);
  v_ib := (v_res->>'inscripcion_id')::uuid;
  perform public.plc_test_set_user(null);
  perform public.confirmar_pago_inscripcion(v_ib, 'c4-b-24');
  perform public.plc_test_set_user(v_cap_a);
  v_res := public.cancelar_partido_confirmado(v_d);
  if coalesce(v_res->>'ok','') <> 'true' or v_res->>'tramo' <> 'mas_24h' then
    raise exception '% %', v_esc, v_res;
  end if;
  select count(*) into v_n from public.movimientos where desafio_id = v_d and tipo = 'reembolso_total' and monto = 42000;
  if v_n <> 2 then
    raise exception '% reembolsos %', v_esc, v_n;
  end if;
  select count(*) into v_n from public.movimientos where desafio_id = v_d and tipo = 'deuda_predio';
  if v_n <> 0 then
    raise exception '% no deberia haber deuda', v_esc;
  end if;

  v_esc := '24_a_12h';
  v_disp := public.plc_c4_turno(v_campo, interval '72 hours');
  perform public.plc_test_set_user(v_cap_a);
  v_res := public.crear_partido(v_disp, v_eq_a, v_conv_a, 'penales');
  v_d := (v_res->>'desafio_id')::uuid;
  v_ia := (v_res->>'inscripcion_id')::uuid;
  perform public.plc_test_set_user(null);
  perform public.confirmar_pago_inscripcion(v_ia, 'c4-a-18');
  perform public.plc_test_set_user(v_cap_b);
  v_ib := (public.inscribir_equipo(v_d, v_eq_b, v_conv_b)->>'inscripcion_id')::uuid;
  perform public.plc_test_set_user(null);
  perform public.confirmar_pago_inscripcion(v_ib, 'c4-b-18');
  v_t := public.ahora_argentina() + interval '18 hours';
  update public.desafios set fecha = v_t::date, hora_inicio = v_t::time where id = v_d;
  perform public.plc_test_set_user(v_cap_a);
  v_res := public.cancelar_partido_confirmado(v_d);
  if v_res->>'tramo' is distinct from '24_a_12h' then
    raise exception '% tramo %', v_esc, v_res;
  end if;
  select monto into v_monto from public.movimientos where inscripcion_id = v_ia and tipo = 'reembolso_parcial';
  if v_monto is distinct from 30000 then
    raise exception '% resto A %', v_esc, v_monto;
  end if;
  select monto into v_monto from public.movimientos where inscripcion_id = v_ia and tipo = 'tarifa_servicio_retenida';
  if v_monto is distinct from 2000 then
    raise exception '% app %', v_esc, v_monto;
  end if;
  select monto into v_monto from public.movimientos where desafio_id = v_d and tipo = 'deuda_predio';
  if v_monto is distinct from 10000 then
    raise exception '% predio %', v_esc, v_monto;
  end if;
  select monto into v_monto from public.movimientos where inscripcion_id = v_ib and tipo = 'reembolso_total';
  if v_monto is distinct from 42000 then
    raise exception '% B %', v_esc, v_monto;
  end if;

  v_esc := '12_a_2h';
  v_disp := public.plc_c4_turno(v_campo, interval '72 hours');
  perform public.plc_test_set_user(v_cap_a);
  v_res := public.crear_partido(v_disp, v_eq_a, v_conv_a, 'penales');
  v_d := (v_res->>'desafio_id')::uuid;
  v_ia := (v_res->>'inscripcion_id')::uuid;
  perform public.plc_test_set_user(null);
  perform public.confirmar_pago_inscripcion(v_ia, 'c4-a-6');
  perform public.plc_test_set_user(v_cap_b);
  v_ib := (public.inscribir_equipo(v_d, v_eq_b, v_conv_b)->>'inscripcion_id')::uuid;
  perform public.plc_test_set_user(null);
  perform public.confirmar_pago_inscripcion(v_ib, 'c4-b-6');
  v_t := public.ahora_argentina() + interval '6 hours';
  update public.desafios set fecha = v_t::date, hora_inicio = v_t::time where id = v_d;
  perform public.plc_test_set_user(v_cap_a);
  v_res := public.cancelar_partido_confirmado(v_d);
  if v_res->>'tramo' is distinct from '12_a_2h' then
    raise exception '% tramo %', v_esc, v_res;
  end if;
  select monto into v_monto from public.movimientos where inscripcion_id = v_ia and tipo = 'reembolso_parcial';
  if v_monto is distinct from 22000 then
    raise exception '% resto %', v_esc, v_monto;
  end if;
  select monto into v_monto from public.movimientos where desafio_id = v_d and tipo = 'deuda_predio';
  if v_monto is distinct from 18000 then
    raise exception '% predio %', v_esc, v_monto;
  end if;

  v_esc := 'menos_2h';
  v_disp := public.plc_c4_turno(v_campo, interval '72 hours');
  perform public.plc_test_set_user(v_cap_a);
  v_res := public.crear_partido(v_disp, v_eq_a, v_conv_a, 'penales');
  v_d := (v_res->>'desafio_id')::uuid;
  v_ia := (v_res->>'inscripcion_id')::uuid;
  perform public.plc_test_set_user(null);
  perform public.confirmar_pago_inscripcion(v_ia, 'c4-a-1');
  perform public.plc_test_set_user(v_cap_b);
  v_ib := (public.inscribir_equipo(v_d, v_eq_b, v_conv_b)->>'inscripcion_id')::uuid;
  perform public.plc_test_set_user(null);
  perform public.confirmar_pago_inscripcion(v_ib, 'c4-b-1');
  v_t := public.ahora_argentina() + interval '1 hour';
  update public.desafios set fecha = v_t::date, hora_inicio = v_t::time where id = v_d;
  perform public.plc_test_set_user(v_cap_a);
  v_res := public.cancelar_partido_confirmado(v_d);
  if v_res->>'tramo' is distinct from 'menos_2h_o_ausente' then
    raise exception '% tramo %', v_esc, v_res;
  end if;
  select monto into v_monto from public.movimientos where inscripcion_id = v_ia and tipo = 'reembolso_parcial';
  if v_monto is distinct from 2000 then
    raise exception '% resto %', v_esc, v_monto;
  end if;
  select monto into v_monto from public.movimientos where desafio_id = v_d and tipo = 'deuda_predio';
  if v_monto is distinct from 38000 then
    raise exception '% predio %', v_esc, v_monto;
  end if;

  v_esc := 'walkover';
  v_disp := public.plc_c4_turno(v_campo, interval '72 hours');
  perform public.plc_test_set_user(v_cap_a);
  v_res := public.crear_partido(v_disp, v_eq_a, v_conv_a, 'penales');
  v_d := (v_res->>'desafio_id')::uuid;
  v_ia := (v_res->>'inscripcion_id')::uuid;
  perform public.plc_test_set_user(null);
  perform public.confirmar_pago_inscripcion(v_ia, 'c4-a-wo');
  perform public.plc_test_set_user(v_cap_b);
  v_ib := (public.inscribir_equipo(v_d, v_eq_b, v_conv_b)->>'inscripcion_id')::uuid;
  perform public.plc_test_set_user(null);
  perform public.confirmar_pago_inscripcion(v_ib, 'c4-b-wo');
  v_t := public.ahora_argentina() - interval '20 minutes';
  update public.desafios set fecha = v_t::date, hora_inicio = v_t::time where id = v_d;
  perform public.plc_test_set_user(v_cap_a);
  v_res := public.reportar_walkover(v_d);
  if coalesce(v_res->>'ok','') <> 'true' then
    raise exception '% %', v_esc, v_res;
  end if;
  select estado into v_estado from public.desafios where id = v_d;
  if v_estado is distinct from 'liquidado' then
    raise exception '% estado %', v_esc, v_estado;
  end if;
  select monto into v_monto from public.movimientos where inscripcion_id = v_ib and tipo = 'reembolso_parcial';
  if v_monto is distinct from 2000 then
    raise exception '% cargo B resto %', v_esc, v_monto;
  end if;
  select monto into v_monto from public.movimientos where inscripcion_id = v_ia and tipo = 'reembolso_total';
  if v_monto is distinct from 42000 then
    raise exception '% A %', v_esc, v_monto;
  end if;

  v_esc := 'predio_devolver';
  v_disp := public.plc_c4_turno(v_campo, interval '72 hours');
  perform public.plc_test_set_user(v_cap_a);
  v_res := public.crear_partido(v_disp, v_eq_a, v_conv_a, 'penales');
  v_d := (v_res->>'desafio_id')::uuid;
  v_ia := (v_res->>'inscripcion_id')::uuid;
  perform public.plc_test_set_user(null);
  perform public.confirmar_pago_inscripcion(v_ia, 'c4-a-pd');
  perform public.plc_test_set_user(v_cap_b);
  v_ib := (public.inscribir_equipo(v_d, v_eq_b, v_conv_b)->>'inscripcion_id')::uuid;
  perform public.plc_test_set_user(null);
  perform public.confirmar_pago_inscripcion(v_ib, 'c4-b-pd');
  perform public.plc_test_set_user(v_owner);
  v_res := public.predio_cancela_partido(v_d);
  if v_res->>'accion' is distinct from 'devolver_todo' then
    raise exception '% %', v_esc, v_res;
  end if;
  select count(*) into v_n from public.movimientos where desafio_id = v_d and tipo = 'reembolso_total' and monto = 42000;
  if v_n <> 2 then
    raise exception '% reembolsos %', v_esc, v_n;
  end if;

  v_esc := 'predio_reprogramar';
  v_disp := public.plc_c4_turno(v_campo, interval '72 hours');
  perform public.plc_test_set_user(v_cap_a);
  v_res := public.crear_partido(v_disp, v_eq_a, v_conv_a, 'penales');
  v_d := (v_res->>'desafio_id')::uuid;
  v_ia := (v_res->>'inscripcion_id')::uuid;
  perform public.plc_test_set_user(null);
  perform public.confirmar_pago_inscripcion(v_ia, 'c4-a-rp');
  perform public.plc_test_set_user(v_cap_b);
  v_ib := (public.inscribir_equipo(v_d, v_eq_b, v_conv_b)->>'inscripcion_id')::uuid;
  perform public.plc_test_set_user(null);
  perform public.confirmar_pago_inscripcion(v_ib, 'c4-b-rp');
  update public.desafios
  set condiciones = condiciones || '{"predio_cancela":"reprogramar"}'::jsonb
  where id = v_d;
  perform public.plc_test_set_user(v_owner);
  v_res := public.predio_cancela_partido(v_d);
  if v_res->>'accion' is distinct from 'reprogramar' then
    raise exception '% %', v_esc, v_res;
  end if;
  select count(*) into v_n from public.movimientos where desafio_id = v_d;
  if v_n <> 0 then
    raise exception '% no deberia mover plata todavía', v_esc;
  end if;
  v_disp2 := public.plc_c4_turno(v_campo, interval '80 hours');
  v_res := public.reprogramar_partido(v_d, v_disp2);
  if coalesce(v_res->>'ok','') <> 'true' then
    raise exception '% reprogramar %', v_esc, v_res;
  end if;
  select estado into v_estado from public.desafios where id = v_d;
  if v_estado is distinct from 'completo' then
    raise exception '% estado %', v_esc, v_estado;
  end if;
  select estado into v_estado from public.disponibilidades where id = v_disp2;
  if v_estado is distinct from 'reservado' then
    raise exception '% nuevo slot %', v_esc, v_estado;
  end if;
  select estado into v_estado from public.disponibilidades where id = v_disp;
  if v_estado is distinct from 'disponible' then
    raise exception '% viejo slot %', v_esc, v_estado;
  end if;

  if coalesce(public.config_bool('premios_habilitados'), true) then
    raise exception 'premios_habilitados deberia seguir en false';
  end if;

  perform public.plc_test_set_user(null);
  return jsonb_build_object('ok', true);
end;
$$;

select public.plc_run_cancelaciones_tests();
rollback;
