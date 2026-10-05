-- Tests Fase 1 del circuito por la cancha.
-- NO se aplica con `supabase db push`.
-- El archivo abre transacción y hace rollback: no deja usuarios ni partidos.
-- No pegar en producción sin ese rollback.

begin;

create or replace function public.plc_run_fase1_tests()
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_owner uuid;
  v_admin uuid;
  v_cap_a uuid;
  v_cap_b uuid;
  v_eq_a uuid;
  v_eq_b uuid;
  v_cancha uuid;
  v_campo uuid;
  v_disp uuid;
  v_conv_a uuid[];
  v_conv_b uuid[];
  v_d uuid;
  v_ia uuid;
  v_ib uuid;
  v_res jsonb;
  v_estado text;
  v_slot text;
  v_n int;
  v_monto numeric;
  v_ok boolean;
  v_esc text;
begin
  perform public.plc_test_set_user(null);

  -- --- helpers locales vía tablas temporales ---
  v_owner := public.plc_test_user('plc-test-owner@test.local', 'Owner Test');
  v_admin := public.plc_test_user('plc-test-admin@test.local', 'Admin Test');
  insert into public.plataforma_admins (usuario_id) values (v_admin) on conflict do nothing;

  v_esc := 'seed';
  select * into v_cap_a, v_eq_a, v_conv_a from public.plc_test_equipo('A');
  select * into v_cap_b, v_eq_b, v_conv_b from public.plc_test_equipo('B');

  insert into public.canchas (owner_id, nombre, direccion, barrio, lat, lng, activa)
  values (v_owner, 'PLC TEST PREDIO', 'Calle Falsa 123', 'Test', -34.6, -58.4, true)
  returning id into v_cancha;

  insert into public.campos (cancha_id, nombre, tipo, superficie)
  values (v_cancha, 'Cancha 1', '5', 'cesped_sintetico')
  returning id into v_campo;

  -- =====================================================================
  -- 1. Los dos capitanes coinciden: reembolso de cancha al ganador
  -- =====================================================================
  v_esc := 'coinciden';
  v_disp := public.plc_test_turno(v_campo, 11);
  perform public.plc_test_set_user(v_cap_a);
  v_res := public.crear_partido(v_disp, v_eq_a, v_conv_a, 'penales');
  if coalesce(v_res->>'ok', '') <> 'true' then
    raise exception '% crear_partido: %', v_esc, v_res;
  end if;
  v_d := (v_res->>'desafio_id')::uuid;
  v_ia := (v_res->>'inscripcion_id')::uuid;
  if (v_res->>'monto_total')::numeric <> 42000 then
    raise exception '% monto_total esperado 42000, fue %', v_esc, v_res->>'monto_total';
  end if;

  perform public.plc_test_set_user(null);
  v_res := public.confirmar_pago_inscripcion(v_ia, 'pay-a-1');
  if coalesce(v_res->>'ok', '') <> 'true' then
    raise exception '% pago A: %', v_esc, v_res;
  end if;
  v_res := public.confirmar_pago_inscripcion(v_ia, 'pay-a-1-dup');
  if coalesce(v_res->>'idempotente', '') <> 'true' then
    raise exception '% webhook duplicado A: %', v_esc, v_res;
  end if;

  select estado into v_estado from public.desafios where id = v_d;
  if v_estado is distinct from 'abierto' then
    raise exception '% desafio deberia estar abierto, esta %', v_esc, v_estado;
  end if;
  select estado into v_slot from public.disponibilidades where id = v_disp;
  if v_slot is distinct from 'reservado' then
    raise exception '% turno deberia estar reservado, esta %', v_esc, v_slot;
  end if;

  perform public.plc_test_set_user(v_cap_b);
  v_res := public.inscribir_equipo(v_d, v_eq_b, v_conv_b);
  if coalesce(v_res->>'ok', '') <> 'true' then
    raise exception '% inscribir B: %', v_esc, v_res;
  end if;
  v_ib := (v_res->>'inscripcion_id')::uuid;

  perform public.plc_test_set_user(null);
  v_res := public.confirmar_pago_inscripcion(v_ib, 'pay-b-1');
  if coalesce(v_res->>'ok', '') <> 'true' then
    raise exception '% pago B: %', v_esc, v_res;
  end if;
  select estado into v_estado from public.desafios where id = v_d;
  if v_estado is distinct from 'completo' then
    raise exception '% deberia estar completo, esta %', v_esc, v_estado;
  end if;

  update public.desafios
  set fecha = (public.ahora_argentina() - interval '1 day')::date,
      hora_inicio = '12:00',
      duracion_min = 60
  where id = v_d;

  perform public.plc_test_set_user(v_cap_a);
  v_res := public.confirmar_resultado(v_d, v_eq_a);
  if coalesce(v_res->>'pendiente_otro', '') <> 'true' then
    raise exception '% primera confirmacion: %', v_esc, v_res;
  end if;
  perform public.plc_test_set_user(v_cap_b);
  v_res := public.confirmar_resultado(v_d, v_eq_a);
  if coalesce(v_res->>'ok', '') <> 'true' then
    raise exception '% segunda confirmacion: %', v_esc, v_res;
  end if;
  select estado into v_estado from public.desafios where id = v_d;
  if v_estado is distinct from 'liquidado' then
    raise exception '% deberia estar liquidado, esta %', v_esc, v_estado;
  end if;
  select monto into v_monto from public.movimientos
  where desafio_id = v_d and tipo = 'reembolso_cancha';
  if v_monto is distinct from 40000 then
    raise exception '% reembolso cancha %', v_esc, v_monto;
  end if;
  select count(*) into v_n from public.movimientos
  where desafio_id = v_d and tipo = 'tarifa_servicio_retenida' and monto = 2000;
  if v_n <> 2 then
    raise exception '% tarifas retenidas %', v_esc, v_n;
  end if;
  select monto into v_monto from public.movimientos
  where desafio_id = v_d and tipo = 'deuda_predio';
  if v_monto is distinct from 40000 then
    raise exception '% deuda predio %', v_esc, v_monto;
  end if;

  v_res := public.liquidar_partido(v_d);
  if coalesce(v_res->>'idempotente', '') <> 'true' then
    raise exception '% liquidar idempotente: %', v_esc, v_res;
  end if;

  -- =====================================================================
  -- 2. No coinciden → en_disputa → admin resuelve
  -- =====================================================================
  v_esc := 'disputa';
  v_disp := public.plc_test_turno(v_campo, 12);
  perform public.plc_test_set_user(v_cap_a);
  v_res := public.crear_partido(v_disp, v_eq_a, v_conv_a, 'penales');
  v_d := (v_res->>'desafio_id')::uuid;
  v_ia := (v_res->>'inscripcion_id')::uuid;
  perform public.plc_test_set_user(null);
  perform public.confirmar_pago_inscripcion(v_ia, 'pay-a-2');
  perform public.plc_test_set_user(v_cap_b);
  v_res := public.inscribir_equipo(v_d, v_eq_b, v_conv_b);
  v_ib := (v_res->>'inscripcion_id')::uuid;
  perform public.plc_test_set_user(null);
  perform public.confirmar_pago_inscripcion(v_ib, 'pay-b-2');
  update public.desafios
  set fecha = (public.ahora_argentina() - interval '1 day')::date, hora_inicio = '12:00'
  where id = v_d;
  perform public.plc_test_set_user(v_cap_a);
  perform public.confirmar_resultado(v_d, v_eq_a);
  perform public.plc_test_set_user(v_cap_b);
  v_res := public.confirmar_resultado(v_d, v_eq_b);
  if coalesce(v_res->>'estado', '') <> 'en_disputa' then
    raise exception '% esperado en_disputa: %', v_esc, v_res;
  end if;
  perform public.plc_test_set_user(v_admin);
  v_res := public.resolver_disputa(v_d, v_eq_b);
  if coalesce(v_res->>'ok', '') <> 'true' then
    raise exception '% resolver: %', v_esc, v_res;
  end if;
  select estado into v_estado from public.desafios where id = v_d;
  if v_estado is distinct from 'liquidado' then
    raise exception '% post disputa %', v_esc, v_estado;
  end if;
  select inscripcion_id into v_ia from public.movimientos
  where desafio_id = v_d and tipo = 'reembolso_cancha';
  if v_ia is distinct from v_ib then
    raise exception '% reembolso deberia ser del equipo B', v_esc;
  end if;

  -- =====================================================================
  -- 3. Empate mitad_cada_uno
  -- =====================================================================
  v_esc := 'empate_mitad';
  v_disp := public.plc_test_turno(v_campo, 13);
  perform public.plc_test_set_user(v_cap_a);
  v_res := public.crear_partido(v_disp, v_eq_a, v_conv_a, 'mitad_cada_uno');
  v_d := (v_res->>'desafio_id')::uuid;
  v_ia := (v_res->>'inscripcion_id')::uuid;
  perform public.plc_test_set_user(null);
  perform public.confirmar_pago_inscripcion(v_ia, 'pay-a-3');
  perform public.plc_test_set_user(v_cap_b);
  v_res := public.inscribir_equipo(v_d, v_eq_b, v_conv_b);
  v_ib := (v_res->>'inscripcion_id')::uuid;
  perform public.plc_test_set_user(null);
  perform public.confirmar_pago_inscripcion(v_ib, 'pay-b-3');
  update public.desafios
  set fecha = (public.ahora_argentina() - interval '1 day')::date, hora_inicio = '12:00'
  where id = v_d;
  perform public.plc_test_set_user(v_cap_a);
  perform public.confirmar_resultado(v_d, null);
  perform public.plc_test_set_user(v_cap_b);
  v_res := public.confirmar_resultado(v_d, null);
  if coalesce(v_res->>'ok', '') <> 'true' then
    raise exception '% %', v_esc, v_res;
  end if;
  select count(*) into v_n from public.movimientos
  where desafio_id = v_d and tipo = 'reembolso_mitad' and monto = 20000;
  if v_n <> 2 then
    raise exception '% mitades %', v_esc, v_n;
  end if;

  -- =====================================================================
  -- 4. Empate con regla penales no se puede confirmar como empate
  -- =====================================================================
  v_esc := 'empate_penales';
  v_disp := public.plc_test_turno(v_campo, 14);
  perform public.plc_test_set_user(v_cap_a);
  v_res := public.crear_partido(v_disp, v_eq_a, v_conv_a, 'penales');
  v_d := (v_res->>'desafio_id')::uuid;
  v_ia := (v_res->>'inscripcion_id')::uuid;
  perform public.plc_test_set_user(null);
  perform public.confirmar_pago_inscripcion(v_ia, 'pay-a-4');
  perform public.plc_test_set_user(v_cap_b);
  v_res := public.inscribir_equipo(v_d, v_eq_b, v_conv_b);
  v_ib := (v_res->>'inscripcion_id')::uuid;
  perform public.plc_test_set_user(null);
  perform public.confirmar_pago_inscripcion(v_ib, 'pay-b-4');
  update public.desafios
  set fecha = (public.ahora_argentina() - interval '1 day')::date, hora_inicio = '12:00'
  where id = v_d;
  perform public.plc_test_set_user(v_cap_a);
  v_res := public.confirmar_resultado(v_d, null);
  if coalesce(v_res->>'error', '') <> 'empate_no_permitido' then
    raise exception '% esperado empate_no_permitido: %', v_esc, v_res;
  end if;
  -- Los dos confirman el mismo ganador por penales
  perform public.confirmar_resultado(v_d, v_eq_b);
  perform public.plc_test_set_user(v_cap_b);
  perform public.confirmar_resultado(v_d, v_eq_b);
  select estado into v_estado from public.desafios where id = v_d;
  if v_estado is distinct from 'liquidado' then
    raise exception '% penales liquidado %', v_esc, v_estado;
  end if;

  -- =====================================================================
  -- 5. Un solo capitán confirma y vence el plazo de 2 horas
  -- =====================================================================
  v_esc := 'plazo_un_capitan';
  v_disp := public.plc_test_turno(v_campo, 15);
  perform public.plc_test_set_user(v_cap_a);
  v_res := public.crear_partido(v_disp, v_eq_a, v_conv_a, 'penales');
  v_d := (v_res->>'desafio_id')::uuid;
  v_ia := (v_res->>'inscripcion_id')::uuid;
  perform public.plc_test_set_user(null);
  perform public.confirmar_pago_inscripcion(v_ia, 'pay-a-5');
  perform public.plc_test_set_user(v_cap_b);
  v_res := public.inscribir_equipo(v_d, v_eq_b, v_conv_b);
  v_ib := (v_res->>'inscripcion_id')::uuid;
  perform public.plc_test_set_user(null);
  perform public.confirmar_pago_inscripcion(v_ib, 'pay-b-5');
  update public.desafios
  set fecha = (public.ahora_argentina() - interval '1 day')::date,
      hora_inicio = '10:00',
      duracion_min = 60
  where id = v_d;
  perform public.plc_test_set_user(v_cap_a);
  perform public.confirmar_resultado(v_d, v_eq_a);
  perform public.plc_test_set_user(null);
  v_res := public.plc_tarea_periodica_partidos();
  select estado into v_estado from public.desafios where id = v_d;
  if v_estado is distinct from 'liquidado' then
    raise exception '% plazo % tarea %', v_esc, v_estado, v_res;
  end if;
  select count(*) into v_n from public.movimientos
  where desafio_id = v_d and tipo = 'reembolso_cancha' and inscripcion_id = v_ia;
  if v_n <> 1 then
    raise exception '% reembolso del que confirmo %', v_esc, v_n;
  end if;

  -- =====================================================================
  -- 6. Partido sin rival al cierre: reembolso total al A
  -- =====================================================================
  v_esc := 'sin_rival';
  v_disp := public.plc_test_turno(v_campo, 16);
  perform public.plc_test_set_user(v_cap_a);
  v_res := public.crear_partido(v_disp, v_eq_a, v_conv_a, 'penales');
  v_d := (v_res->>'desafio_id')::uuid;
  v_ia := (v_res->>'inscripcion_id')::uuid;
  perform public.plc_test_set_user(null);
  perform public.confirmar_pago_inscripcion(v_ia, 'pay-a-6');
  update public.desafios
  set cierre_inscripcion = now() - interval '1 minute'
  where id = v_d;
  v_res := public.plc_tarea_periodica_partidos();
  select estado into v_estado from public.desafios where id = v_d;
  if v_estado is distinct from 'cancelado' then
    raise exception '% cancelado % %', v_esc, v_estado, v_res;
  end if;
  select monto into v_monto from public.movimientos
  where desafio_id = v_d and tipo = 'reembolso_total';
  if v_monto is distinct from 42000 then
    raise exception '% reembolso total %', v_esc, v_monto;
  end if;
  select estado into v_slot from public.disponibilidades where id = v_disp;
  if v_slot is distinct from 'disponible' then
    raise exception '% turno liberado %', v_esc, v_slot;
  end if;

  -- =====================================================================
  -- 7. Pago despues de 15 minutos + webhook duplicado
  -- =====================================================================
  v_esc := 'pago_tarde';
  v_disp := public.plc_test_turno(v_campo, 17);
  perform public.plc_test_set_user(v_cap_a);
  v_res := public.crear_partido(v_disp, v_eq_a, v_conv_a, 'penales');
  v_d := (v_res->>'desafio_id')::uuid;
  v_ia := (v_res->>'inscripcion_id')::uuid;
  update public.desafio_inscripciones
  set expira_at = now() - interval '1 minute'
  where id = v_ia;
  perform public.plc_test_set_user(null);
  v_res := public.confirmar_pago_inscripcion(v_ia, 'pay-late');
  if coalesce(v_res->>'error', '') <> 'pago_fuera_de_tiempo' then
    raise exception '% esperado fuera de tiempo: %', v_esc, v_res;
  end if;
  v_res := public.confirmar_pago_inscripcion(v_ia, 'pay-late-dup');
  if coalesce(v_res->>'idempotente', '') <> 'true' then
    raise exception '% segundo webhook: %', v_esc, v_res;
  end if;
  select count(*) into v_n from public.movimientos
  where inscripcion_id = v_ia and tipo = 'reembolso_total';
  if v_n <> 1 then
    raise exception '% un solo reembolso total, hay %', v_esc, v_n;
  end if;
  select estado into v_estado from public.desafios where id = v_d;
  if v_estado is distinct from 'cancelado' then
    raise exception '% cancelado por vencimiento %', v_esc, v_estado;
  end if;

  if coalesce(public.config_bool('premios_habilitados'), true) then
    raise exception 'premios_habilitados deberia seguir en false';
  end if;

  perform public.plc_test_set_user(null);
  return jsonb_build_object('ok', true, 'escenarios', 7);
end;
$$;

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

create or replace function public.plc_test_user(p_email text, p_nombre text)
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

create or replace function public.plc_test_equipo(p_tag text)
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
  v_cap := public.plc_test_user('plc-test-cap-' || lower(p_tag) || '@test.local', 'Capitan ' || p_tag);
  v_ids := array_append(v_ids, v_cap);
  insert into public.jugador_perfiles (usuario_id, fecha_nacimiento)
  values (v_cap, date '1990-01-01')
  on conflict (usuario_id) do update set fecha_nacimiento = date '1990-01-01';

  insert into public.equipos (nombre, creado_por)
  values ('PLC Test ' || p_tag, v_cap)
  returning id into v_eq;

  insert into public.equipo_miembros (equipo_id, usuario_id, rol, estado, es_capitan)
  values (v_eq, v_cap, 'capitan', 'activo', true);

  for i in 1..4 loop
    v_uid := public.plc_test_user(
      'plc-test-j' || i || '-' || lower(p_tag) || '@test.local',
      'Jugador ' || p_tag || i
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

create or replace function public.plc_test_turno(p_campo uuid, p_hora int)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.disponibilidades (campo_id, fecha, hora_inicio, hora_fin, precio, estado)
  values (
    p_campo,
    (public.ahora_argentina()::date + 14),
    make_time(p_hora, 0, 0),
    make_time(p_hora + 1, 0, 0),
    40000,
    'disponible'
  )
  returning id into v_id;
  return v_id;
end;
$$;

select public.plc_run_fase1_tests();
rollback;
