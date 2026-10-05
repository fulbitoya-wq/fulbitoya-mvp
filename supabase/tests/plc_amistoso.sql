-- Tests Fase 5: amistoso y jugadores sueltos.
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

create or replace function public.plc_am_user(p_email text, p_nombre text)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_id uuid;
begin
  select id into v_id from public.usuarios where email = p_email;
  if v_id is not null then return v_id; end if;
  v_id := gen_random_uuid();
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', p_email,
    crypt('test-pass', gen_salt('bf')), now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('nombre', p_nombre)
  );
  insert into public.usuarios (id, email, nombre, rol)
  values (v_id, p_email, p_nombre, 'jugador')
  on conflict (id) do update set nombre = excluded.nombre;
  return v_id;
end;
$$;

create or replace function public.plc_am_equipo(p_tag text)
returns table (capitan_id uuid, equipo_id uuid, convocados uuid[])
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cap uuid; v_eq uuid; v_ids uuid[] := '{}'; i int; v_uid uuid;
begin
  v_cap := public.plc_am_user('plc-am-cap-' || lower(p_tag) || '@test.local', 'Capitan AM ' || p_tag);
  v_ids := array_append(v_ids, v_cap);
  insert into public.jugador_perfiles (usuario_id, fecha_nacimiento)
  values (v_cap, date '1990-01-01')
  on conflict (usuario_id) do update set fecha_nacimiento = date '1990-01-01';
  insert into public.equipos (nombre, creado_por) values ('PLC AM ' || p_tag, v_cap) returning id into v_eq;
  insert into public.equipo_miembros (equipo_id, usuario_id, rol, estado, es_capitan)
  values (v_eq, v_cap, 'capitan', 'activo', true);
  for i in 1..4 loop
    v_uid := public.plc_am_user('plc-am-j' || i || '-' || lower(p_tag) || '@test.local', 'Jugador AM ' || p_tag || i);
    v_ids := array_append(v_ids, v_uid);
    insert into public.jugador_perfiles (usuario_id, fecha_nacimiento)
    values (v_uid, date '1992-06-01')
    on conflict (usuario_id) do update set fecha_nacimiento = date '1992-06-01';
    insert into public.equipo_miembros (equipo_id, usuario_id, rol, estado, es_capitan)
    values (v_eq, v_uid, 'jugador', 'activo', false);
  end loop;
  capitan_id := v_cap; equipo_id := v_eq; convocados := v_ids; return next;
end;
$$;

create or replace function public.plc_am_turno(p_campo uuid, p_en interval)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid; v_inicio timestamp;
begin
  v_inicio := public.ahora_argentina() + p_en;
  insert into public.disponibilidades (campo_id, fecha, hora_inicio, hora_fin, precio, estado)
  values (p_campo, v_inicio::date, v_inicio::time, (v_inicio + interval '1 hour')::time, 40000, 'disponible')
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.plc_run_amistoso_tests()
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_owner uuid; v_cap_a uuid; v_eq_a uuid; v_conv_a uuid[];
  v_cap_b uuid; v_eq_b uuid; v_conv_b uuid[];
  v_cancha uuid; v_campo uuid; v_disp uuid; v_d uuid; v_ia uuid; v_ib uuid; v_ij uuid;
  v_res jsonb; v_estado text; v_monto numeric; v_esc text; v_n int; v_uid uuid; v_extra uuid;
begin
  perform public.plc_test_set_user(null);
  v_owner := public.plc_am_user('plc-am-owner@test.local', 'Owner AM');
  select * into v_cap_a, v_eq_a, v_conv_a from public.plc_am_equipo('A');
  select * into v_cap_b, v_eq_b, v_conv_b from public.plc_am_equipo('B');

  insert into public.canchas (owner_id, nombre, direccion, barrio, lat, lng, activa, valor_hora, valor_reserva)
  values (v_owner, 'PLC AM PREDIO', 'Test', 'Test', -34.6, -58.4, true, 40000, 12000)
  returning id into v_cancha;
  insert into public.campos (cancha_id, nombre, tipo, superficie, valor_hora, valor_reserva)
  values (v_cancha, 'F5 AM', '5', 'cesped_sintetico', 40000, 12000)
  returning id into v_campo;

  v_esc := 'crear_72h';
  v_disp := public.plc_am_turno(v_campo, interval '72 hours');
  perform public.plc_test_set_user(v_cap_a);
  v_res := public.crear_amistoso(v_disp, v_eq_a, v_conv_a, 'penales');
  if coalesce(v_res->>'ok','') <> 'true' then raise exception '% crear %', v_esc, v_res; end if;
  if (v_res->>'monto_total')::numeric <> 41000 then raise exception '% monto A %', v_esc, v_res->>'monto_total'; end if;
  if (v_res->'condiciones'->>'sena_sin_rival')::numeric <> 8000 then raise exception '% sena %', v_esc, v_res->'condiciones'->>'sena_sin_rival'; end if;
  v_d := (v_res->>'desafio_id')::uuid;
  v_ia := (v_res->>'inscripcion_id')::uuid;
  perform public.plc_test_set_user(null);
  perform public.confirmar_pago_inscripcion(v_ia, 'am-a-1');

  perform public.plc_test_set_user(v_cap_b);
  v_res := public.inscribir_equipo(v_d, v_eq_b, v_conv_b);
  if (v_res->>'monto_total')::numeric <> 21000 then raise exception '% rival %', v_esc, v_res; end if;
  v_ib := (v_res->>'inscripcion_id')::uuid;
  perform public.plc_test_set_user(null);
  v_res := public.confirmar_pago_inscripcion(v_ib, 'am-b-1');
  if coalesce(v_res->>'completo','') <> 'true' then raise exception '% completo %', v_esc, v_res; end if;
  select monto into v_monto from public.movimientos where inscripcion_id = v_ia and tipo = 'reembolso_mitad';
  if v_monto is distinct from 20000 then raise exception '% mitad A %', v_esc, v_monto; end if;

  v_esc := 'sueltos';
  v_disp := public.plc_am_turno(v_campo, interval '72 hours');
  perform public.plc_test_set_user(v_cap_a);
  v_res := public.crear_amistoso(v_disp, v_eq_a, v_conv_a, 'penales');
  v_d := (v_res->>'desafio_id')::uuid;
  v_ia := (v_res->>'inscripcion_id')::uuid;
  perform public.plc_test_set_user(null);
  perform public.confirmar_pago_inscripcion(v_ia, 'am-a-2');

  perform public.plc_test_set_user(v_cap_b);
  v_res := public.inscribir_jugador_amistoso(v_d);
  if coalesce(v_res->>'ok','') <> 'true' then raise exception '% primer suelto %', v_esc, v_res; end if;
  if (v_res->>'monto_total')::numeric <> 4200 then raise exception '% monto suelto %', v_esc, v_res->>'monto_total'; end if;
  v_ij := (v_res->>'inscripcion_id')::uuid;
  perform public.plc_test_set_user(v_cap_b);
  v_res := public.inscribir_equipo(v_d, v_eq_b, v_conv_b);
  if v_res->>'error' is distinct from 'hay_sueltos' then raise exception '% mix %', v_esc, v_res; end if;
  perform public.plc_test_set_user(null);
  perform public.confirmar_pago_inscripcion(v_ij, 'am-j1');

  foreach v_uid in array v_conv_b[2:5] loop
    perform public.plc_test_set_user(v_uid);
    v_res := public.inscribir_jugador_amistoso(v_d);
    if coalesce(v_res->>'ok','') <> 'true' then raise exception '% suelto % %', v_esc, v_uid, v_res; end if;
    perform public.plc_test_set_user(null);
    perform public.confirmar_pago_inscripcion((v_res->>'inscripcion_id')::uuid, 'am-j-' || v_uid::text);
  end loop;

  select estado into v_estado from public.desafios where id = v_d;
  if v_estado is distinct from 'completo' then raise exception '% estado %', v_esc, v_estado; end if;
  select monto into v_monto from public.movimientos where inscripcion_id = v_ia and tipo = 'reembolso_mitad';
  if v_monto is distinct from 20000 then raise exception '% mitad sueltos %', v_esc, v_monto; end if;

  v_extra := public.plc_am_user('plc-am-extra@test.local', 'Extra');
  insert into public.jugador_perfiles (usuario_id, fecha_nacimiento)
  values (v_extra, date '1991-01-01')
  on conflict (usuario_id) do update set fecha_nacimiento = date '1991-01-01';
  perform public.plc_test_set_user(v_extra);
  v_res := public.inscribir_jugador_amistoso(v_d);
  if v_res->>'error' not in ('cupo_lleno', 'desafio_cerrado') then
    raise exception '% 6to %', v_esc, v_res;
  end if;

  v_esc := 'sin_rival_8000';
  v_disp := public.plc_am_turno(v_campo, interval '72 hours');
  perform public.plc_test_set_user(v_cap_a);
  v_res := public.crear_amistoso(v_disp, v_eq_a, v_conv_a, 'penales');
  v_d := (v_res->>'desafio_id')::uuid;
  v_ia := (v_res->>'inscripcion_id')::uuid;
  perform public.plc_test_set_user(null);
  perform public.confirmar_pago_inscripcion(v_ia, 'am-a-3');
  update public.desafios
  set cierre_inscripcion = now() - interval '3 minutes',
      aviso_cierre_at = now() - interval '2 minutes'
  where id = v_d;
  perform public.plc_tarea_periodica_partidos();
  select monto into v_monto from public.movimientos where inscripcion_id = v_ia and tipo = 'deuda_predio';
  if v_monto is distinct from 8000 then raise exception '% cargo %', v_esc, v_monto; end if;
  select monto into v_monto from public.movimientos where inscripcion_id = v_ia and tipo = 'reembolso_parcial';
  if v_monto is distinct from 33000 then raise exception '% resto %', v_esc, v_monto; end if;

  v_esc := 'tramos';
  v_disp := public.plc_am_turno(v_campo, interval '30 hours');
  perform public.plc_test_set_user(v_cap_a);
  v_res := public.crear_amistoso(v_disp, v_eq_a, v_conv_a, 'penales');
  if (v_res->'condiciones'->>'sena_sin_rival')::numeric <> 12000 then
    raise exception '% 30h %', v_esc, v_res->'condiciones'->>'sena_sin_rival';
  end if;
  v_disp := public.plc_am_turno(v_campo, interval '8 hours');
  v_res := public.crear_amistoso(v_disp, v_eq_a, v_conv_a, 'penales');
  if coalesce(v_res->>'ok','') <> 'true' then raise exception '% 8h crear %', v_esc, v_res; end if;
  if (v_res->'condiciones'->>'sena_sin_rival')::numeric <> 20000 then
    raise exception '% 8h %', v_esc, v_res->'condiciones'->>'sena_sin_rival';
  end if;

  if coalesce(public.config_bool('premios_habilitados'), true) then
    raise exception 'premios_habilitados deberia seguir en false';
  end if;
  perform public.plc_test_set_user(null);
  return jsonb_build_object('ok', true);
end;
$$;

select public.plc_run_amistoso_tests();
rollback;
