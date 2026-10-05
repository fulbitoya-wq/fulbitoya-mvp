-- Tests Fase 1 del motor de condiciones (bloque 3).
-- NO se aplica con db push. Transacción + rollback.

begin;

create or replace function public.plc_run_condiciones_tests()
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_owner uuid;
  v_cancha uuid;
  v_campo uuid;
  v_disp uuid;
  v_inicio timestamptz;
  v_res jsonb;
  v_pol jsonb;
  v_snap jsonb;
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data
  ) values (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'plc-cond-owner@test.local',
    crypt('test-pass', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"nombre":"Owner Cond"}'::jsonb
  )
  returning id into v_owner;
  insert into public.usuarios (id, email, nombre, rol)
  values (v_owner, 'plc-cond-owner@test.local', 'Owner Cond', 'jugador')
  on conflict (id) do nothing;

  insert into public.canchas (owner_id, nombre, direccion, barrio, lat, lng, activa, valor_hora, valor_reserva)
  values (v_owner, 'PLC COND PREDIO', 'Test 1', 'Test', -34.6, -58.4, true, 40000, 12000)
  returning id into v_cancha;

  insert into public.campos (cancha_id, nombre, tipo, superficie, valor_hora, valor_reserva)
  values (v_cancha, 'F5 Test', '5', 'cesped_sintetico', 40000, 12000)
  returning id into v_campo;

  v_inicio := timezone('America/Argentina/Buenos_Aires', now()) + interval '72 hours';
  insert into public.disponibilidades (campo_id, fecha, hora_inicio, hora_fin, precio, estado)
  values (
    v_campo,
    v_inicio::date,
    v_inicio::time,
    (v_inicio + interval '1 hour')::time,
    40000,
    'disponible'
  )
  returning id into v_disp;

  -- Matriz por la cancha (referencia)
  v_res := public.calcular_condiciones(v_disp, 'por_la_cancha', now());
  if coalesce(v_res->>'ok','') <> 'true' then
    raise exception 'calcular por_la_cancha: %', v_res;
  end if;
  if (v_res->>'precio_cancha')::numeric <> 40000 then
    raise exception 'precio %', v_res->>'precio_cancha';
  end if;
  if (v_res->>'sena_base')::numeric <> 12000 then
    raise exception 'sena_base %', v_res->>'sena_base';
  end if;
  if (v_res->>'tramo') <> 'mas_48' then
    raise exception 'tramo esperado mas_48, fue % (horas %)', v_res->>'tramo', v_res->>'anticipacion_horas';
  end if;
  if (v_res->>'sena_sin_rival')::numeric <> 12000 then
    raise exception 'sena cancha >48h %', v_res->>'sena_sin_rival';
  end if;
  if (v_res->>'monto_equipo_a')::numeric <> 42000 then
    raise exception 'monto A %', v_res->>'monto_equipo_a';
  end if;
  if (v_res->>'tarifa_servicio_equipo')::numeric <> 2000 then
    raise exception 'tarifa f5 %', v_res->>'tarifa_servicio_equipo';
  end if;
  if (v_res->'matriz_sena_sin_rival'->'por_la_cancha'->>'entre_48_24')::numeric <> 20000 then
    raise exception 'matriz cancha 48-24 %', v_res->'matriz_sena_sin_rival';
  end if;
  if (v_res->'matriz_sena_sin_rival'->'por_la_cancha'->>'menos_24')::numeric <> 30000 then
    raise exception 'matriz cancha <24 %', v_res->'matriz_sena_sin_rival';
  end if;
  if (v_res->'matriz_sena_sin_rival'->'amistoso'->>'mas_48')::numeric <> 8000 then
    raise exception 'matriz amistoso >48 %', v_res->'matriz_sena_sin_rival';
  end if;
  if (v_res->'matriz_sena_sin_rival'->'amistoso'->>'entre_48_24')::numeric <> 12000 then
    raise exception 'matriz amistoso 48-24 %', v_res->'matriz_sena_sin_rival';
  end if;
  if (v_res->'matriz_sena_sin_rival'->'amistoso'->>'menos_24')::numeric <> 20000 then
    raise exception 'matriz amistoso <24 %', v_res->'matriz_sena_sin_rival';
  end if;
  if coalesce((v_res->>'periodo_gratis')::boolean, false) is not true then
    raise exception 'deberia haber periodo gratis';
  end if;

  -- Amistoso >48 h
  v_res := public.calcular_condiciones(v_disp, 'amistoso', now());
  if (v_res->>'sena_sin_rival')::numeric <> 8000 then
    raise exception 'amistoso >48 %', v_res->>'sena_sin_rival';
  end if;
  if (v_res->>'tarifa_servicio_amistoso_equipo')::numeric <> 1000 then
    raise exception 'tarifa amistoso %', v_res->>'tarifa_servicio_amistoso_equipo';
  end if;
  if (v_res->>'monto_equipo_a')::numeric <> 41000 then
    raise exception 'amistoso A paga %', v_res->>'monto_equipo_a';
  end if;
  if (v_res->>'monto_rival_equipo')::numeric <> 21000 then
    raise exception 'amistoso rival equipo %', v_res->>'monto_rival_equipo';
  end if;
  if (v_res->>'monto_rival_jugador')::numeric <> 4200 then
    raise exception 'amistoso jugador %', v_res->>'monto_rival_jugador';
  end if;

  -- Tramo 48-24: por la cancha 20000 / amistoso 12000
  v_res := public.calcular_condiciones(v_disp, 'por_la_cancha', v_inicio - interval '30 hours');
  if (v_res->>'tramo') <> 'entre_48_24' then
    raise exception 'tramo 30h %', v_res->>'tramo';
  end if;
  if (v_res->>'sena_sin_rival')::numeric <> 20000 then
    raise exception 'cancha 30h %', v_res->>'sena_sin_rival';
  end if;
  if coalesce((v_res->>'periodo_gratis')::boolean, true) then
    raise exception 'no deberia haber gratis en 30h';
  end if;
  v_res := public.calcular_condiciones(v_disp, 'amistoso', v_inicio - interval '30 hours');
  if (v_res->>'sena_sin_rival')::numeric <> 12000 then
    raise exception 'amistoso 30h %', v_res->>'sena_sin_rival';
  end if;

  -- Mismo día: 30000 / 20000
  v_res := public.calcular_condiciones(v_disp, 'por_la_cancha', v_inicio - interval '10 hours');
  if (v_res->>'tramo') <> 'menos_24' then
    raise exception 'tramo 10h %', v_res->>'tramo';
  end if;
  if (v_res->>'sena_sin_rival')::numeric <> 30000 then
    raise exception 'cancha 10h %', v_res->>'sena_sin_rival';
  end if;
  v_res := public.calcular_condiciones(v_disp, 'amistoso', v_inicio - interval '10 hours');
  if (v_res->>'sena_sin_rival')::numeric <> 20000 then
    raise exception 'amistoso 10h %', v_res->>'sena_sin_rival';
  end if;

  -- Tarifas por formato
  if public.plc_tarifa_servicio_equipo('f5') <> 2000
     or public.plc_tarifa_servicio_equipo('f7') <> 2800
     or public.plc_tarifa_servicio_equipo('f9') <> 3600
     or public.plc_tarifa_servicio_equipo('f11') <> 4400 then
    raise exception 'tarifas formato % % % %',
      public.plc_tarifa_servicio_equipo('f5'),
      public.plc_tarifa_servicio_equipo('f7'),
      public.plc_tarifa_servicio_equipo('f9'),
      public.plc_tarifa_servicio_equipo('f11');
  end if;

  -- Límites de plataforma al guardar
  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', v_owner::text, 'role', 'authenticated')::text, true);

  v_pol := public.guardar_politica_predio(v_cancha, v_campo, jsonb_build_object('valor_reserva', 25000));
  if coalesce(v_pol->>'error','') <> 'sena_supera_maximo' then
    raise exception 'seña 25000 deberia rechazarse: %', v_pol;
  end if;
  v_pol := public.guardar_politica_predio(v_cancha, null, jsonb_build_object('cierre_sin_rival_mas_24h_horas', 2));
  if coalesce(v_pol->>'error','') <> 'cierre_sin_rival_bajo' then
    raise exception 'cierre 2h deberia rechazarse: %', v_pol;
  end if;
  v_pol := public.guardar_politica_predio(v_cancha, null, jsonb_build_object('anticipacion_min_f5_horas', 1));
  if coalesce(v_pol->>'error','') <> 'anticipacion_minima_baja' then
    raise exception 'anticipacion 1h deberia rechazarse: %', v_pol;
  end if;

  -- Snapshot: cambiar política no cambia el objeto ya calculado/congelado
  v_snap := public.calcular_condiciones(v_disp, 'por_la_cancha', now());
  v_pol := public.guardar_politica_predio(
    v_cancha,
    v_campo,
    jsonb_build_object('sena_cancha_mas_48', 18000)
  );
  if coalesce(v_pol->>'ok','') <> 'true' then
    raise exception 'guardar 18000: %', v_pol;
  end if;
  v_res := public.calcular_condiciones(v_disp, 'por_la_cancha', now());
  if (v_res->>'sena_sin_rival')::numeric <> 18000 then
    raise exception 'live deberia ser 18000, fue %', v_res->>'sena_sin_rival';
  end if;
  if (v_snap->>'sena_sin_rival')::numeric <> 12000 then
    raise exception 'snapshot deberia seguir en 12000, fue %', v_snap->>'sena_sin_rival';
  end if;

  if coalesce(public.config_bool('premios_habilitados'), true) then
    raise exception 'premios_habilitados deberia ser false';
  end if;

  perform set_config('request.jwt.claim.sub', '', true);
  return jsonb_build_object('ok', true);
end;
$$;

select public.plc_run_condiciones_tests();
rollback;
