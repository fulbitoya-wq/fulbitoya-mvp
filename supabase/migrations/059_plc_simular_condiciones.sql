-- Simulador y motor reutilizable sin turno real.
-- No toca Mercado Pago de FulbitoYa.

create or replace function public.calcular_condiciones_desde_politica(
  p_pol jsonb,
  p_formato text,
  p_precio numeric,
  p_fecha date,
  p_hora time,
  p_tipo_desafio text,
  p_momento timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tipo text;
  v_fmt text;
  v_n int;
  v_momento timestamp;
  v_inicio timestamp;
  v_horas numeric;
  v_tramo text;
  v_tramo_label text;
  v_precio numeric;
  v_sena_base numeric;
  v_tarifa numeric;
  v_tarifa_amistoso numeric;
  v_tarifa_jugador numeric;
  v_monto_a numeric;
  v_monto_rival numeric;
  v_monto_jugador numeric;
  v_sena_sin_rival numeric;
  v_ant_min numeric;
  v_cierre_h numeric;
  v_cierre_min numeric;
  v_punto_24 timestamp;
  v_cierre timestamp;
  v_gratis boolean;
  v_factor_12 numeric;
  v_cargo_24_12 numeric;
  v_cargo_12_2 numeric;
  v_version int;
  v_cancela text;
  v_mensaje text;
  v_val jsonb;
begin
  v_tipo := case lower(btrim(coalesce(p_tipo_desafio, 'por_la_cancha')))
    when 'amistoso' then 'amistoso'
    else 'por_la_cancha'
  end;

  v_precio := public.plc_centena(coalesce(p_precio, 0));
  if v_precio <= 0 then
    return jsonb_build_object('ok', false, 'error', 'precio_cancha_invalido');
  end if;

  v_sena_base := public.plc_centena(coalesce((p_pol->>'sena_base')::numeric, 0));
  v_val := public.plc_validar_politica(p_pol, v_precio, v_sena_base);

  v_fmt := public.plc_formato_clave(p_formato);
  v_n := public.plc_jugadores_formato(v_fmt);
  v_tarifa := public.plc_tarifa_servicio_equipo(v_fmt);
  if v_tarifa <= 0 then
    return jsonb_build_object('ok', false, 'error', 'tarifa_no_configurada');
  end if;
  v_tarifa_amistoso := public.plc_centena(v_tarifa / 2.0);
  v_tarifa_jugador := public.plc_centena(v_tarifa_amistoso / v_n);

  v_momento := timezone('America/Argentina/Buenos_Aires', coalesce(p_momento, now()));
  v_inicio := public.inicio_turno(p_fecha, p_hora);
  v_horas := extract(epoch from (v_inicio - v_momento)) / 3600.0;

  if v_horas > 48 then
    v_tramo := 'mas_48';
    v_tramo_label := 'más de 48 h';
  elsif v_horas >= 24 then
    v_tramo := 'entre_48_24';
    v_tramo_label := 'entre 48 y 24 h';
  else
    v_tramo := 'menos_24';
    v_tramo_label := 'menos de 24 h';
  end if;

  if v_tipo = 'amistoso' then
    v_sena_sin_rival := case v_tramo
      when 'mas_48' then (p_pol->>'sena_amistoso_mas_48')::numeric
      when 'entre_48_24' then (p_pol->>'sena_amistoso_48_24')::numeric
      else (p_pol->>'sena_amistoso_menos_24')::numeric
    end;
    v_monto_a := v_precio + v_tarifa_amistoso;
    v_monto_rival := public.plc_centena(v_precio / 2.0) + v_tarifa_amistoso;
    v_monto_jugador := public.plc_centena(v_precio / 2.0 / v_n) + v_tarifa_jugador;
  else
    v_sena_sin_rival := case v_tramo
      when 'mas_48' then (p_pol->>'sena_cancha_mas_48')::numeric
      when 'entre_48_24' then (p_pol->>'sena_cancha_48_24')::numeric
      else (p_pol->>'sena_cancha_menos_24')::numeric
    end;
    v_monto_a := v_precio + v_tarifa;
    v_monto_rival := v_monto_a;
    v_monto_jugador := null;
  end if;
  v_sena_sin_rival := public.plc_centena(coalesce(v_sena_sin_rival, 0));

  v_ant_min := case v_fmt
    when 'f11' then (p_pol->>'anticipacion_min_f11_horas')::numeric
    when 'f9' then (p_pol->>'anticipacion_min_f9_horas')::numeric
    when 'f7' then (p_pol->>'anticipacion_min_f7_horas')::numeric
    else (p_pol->>'anticipacion_min_f5_horas')::numeric
  end;

  v_cierre_min := coalesce(public.config_num('cierre_sin_rival_minimo_horas'), 3);
  if v_horas >= 24 then
    v_cierre_h := greatest(v_cierre_min, coalesce((p_pol->>'cierre_sin_rival_mas_24h_horas')::numeric, 12));
  else
    v_cierre_h := greatest(v_cierre_min, coalesce((p_pol->>'cierre_sin_rival_menos_24h_horas')::numeric, 3));
  end if;
  v_cierre := v_inicio - make_interval(
    hours => trunc(v_cierre_h)::int,
    mins => round((v_cierre_h - trunc(v_cierre_h)) * 60)::int
  );
  v_punto_24 := v_inicio - interval '24 hours';
  v_gratis := v_horas > 48;

  v_factor_12 := coalesce(public.config_num('factor_cancel_12_2'), 1.67);
  v_cargo_24_12 := public.plc_centena(v_sena_base);
  v_cargo_12_2 := public.plc_centena(v_sena_base * v_factor_12);

  v_version := coalesce(public.config_num('condiciones_version'), 1)::int;
  v_cancela := coalesce(p_pol->>'predio_cancela', 'devolver_todo');

  if v_tipo = 'por_la_cancha' then
    v_mensaje := 'Publicando con ' || v_tramo_label || ' arriesgás solo $'
      || trim(to_char(v_sena_sin_rival, 'FM999G999G999')) || '.';
  else
    v_mensaje := 'Amistoso publicado con ' || v_tramo_label || ': si no hay rival, se retiene $'
      || trim(to_char(v_sena_sin_rival, 'FM999G999G999')) || '.';
  end if;

  return jsonb_build_object(
    'ok', true,
    'version', v_version,
    'calculado_at', now(),
    'tipo_desafio', v_tipo,
    'formato', v_fmt,
    'jugadores_formato', v_n,
    'precio_cancha', v_precio,
    'sena_base', v_sena_base,
    'tarifa_servicio_equipo', v_tarifa,
    'tarifa_servicio_amistoso_equipo', v_tarifa_amistoso,
    'tarifa_servicio_jugador', v_tarifa_jugador,
    'monto_equipo_a', v_monto_a,
    'monto_rival_equipo', v_monto_rival,
    'monto_rival_jugador', v_monto_jugador,
    'tramo', v_tramo,
    'tramo_label', v_tramo_label,
    'anticipacion_horas', round(v_horas, 2),
    'sena_sin_rival', v_sena_sin_rival,
    'periodo_gratis', v_gratis,
    'periodo_gratis_hasta', case when v_gratis then v_punto_24 else null end,
    'punto_decision_24h', case when v_horas >= 24 then v_punto_24 else null end,
    'cierre_sin_rival', v_cierre,
    'cierre_sin_rival_horas_antes', v_cierre_h,
    'permitir_seguir_hasta_inicio', coalesce((p_pol->>'permitir_seguir_hasta_inicio')::boolean, true),
    'tolerancia_walkover_min', coalesce((p_pol->>'tolerancia_walkover_min')::int, 15),
    'predio_cancela', v_cancela,
    'predio_cancela_label', case v_cancela
      when 'reprogramar' then 'Si el predio cancela, se reprograma el partido.'
      else 'Si el predio cancela, te devolvemos todo.'
    end,
    'desafios_habilitados', coalesce((p_pol->>'desafios_habilitados')::boolean, true),
    'horario_habilitado', public.plc_horario_habilitado(p_pol->'horarios', p_fecha, p_hora),
    'anticipacion_minima_horas', v_ant_min,
    'anticipacion_ok', v_horas >= v_ant_min,
    'mensaje_tramo', v_mensaje,
    'sena_maxima_ok', (v_val->>'ok') = 'true' or v_sena_base <= 0,
    'validacion', v_val,
    'mensaje_predio',
      'Si alguien publica un desafío ' || case when v_tipo = 'amistoso' then 'amistoso' else 'por la cancha' end
      || ' ' || round(v_horas)::text || ' horas antes y no consigue rival, cobrás $'
      || trim(to_char(v_sena_sin_rival, 'FM999G999G999')) || '.',
    'mensaje_equipo',
      'El equipo arriesga $' || trim(to_char(v_sena_sin_rival, 'FM999G999G999'))
      || ' si no aparece rival.',
    'politica_reserva_comun', jsonb_build_object(
      'sena_nunca_se_devuelve', coalesce((p_pol->>'reserva_sena_nunca_devuelve')::boolean, false),
      'devolucion_total_si_mas_de_horas', coalesce((p_pol->>'reserva_devolucion_total_horas')::numeric, 24),
      'cobro_total_si_menos_de_horas', coalesce((p_pol->>'reserva_cobro_total_horas')::numeric, 2)
    ),
    'matriz_sena_sin_rival', jsonb_build_object(
      'amistoso', jsonb_build_object(
        'mas_48', public.plc_centena((p_pol->>'sena_amistoso_mas_48')::numeric),
        'entre_48_24', public.plc_centena((p_pol->>'sena_amistoso_48_24')::numeric),
        'menos_24', public.plc_centena((p_pol->>'sena_amistoso_menos_24')::numeric)
      ),
      'por_la_cancha', jsonb_build_object(
        'mas_48', public.plc_centena((p_pol->>'sena_cancha_mas_48')::numeric),
        'entre_48_24', public.plc_centena((p_pol->>'sena_cancha_48_24')::numeric),
        'menos_24', public.plc_centena((p_pol->>'sena_cancha_menos_24')::numeric)
      )
    ),
    'cargos_cancelacion', jsonb_build_array(
      jsonb_build_object(
        'tramo', 'mas_24h',
        'cargo', 0,
        'label', 'Con más de 24 h: cancelás sin cargo.'
      ),
      jsonb_build_object(
        'tramo', '24_a_12h',
        'cargo', v_cargo_24_12,
        'label', 'Entre 24 y 12 h: se retiene la seña base.'
      ),
      jsonb_build_object(
        'tramo', '12_a_2h',
        'cargo', v_cargo_12_2,
        'label', 'Entre 12 y 2 h: se retiene la seña base × 1,67.'
      ),
      jsonb_build_object(
        'tramo', 'menos_2h_o_ausente',
        'cargo', v_precio,
        'label', 'Con menos de 2 h o si no te presentás: se cobra la cancha completa.'
      )
    )
  );
end;
$$;

create or replace function public.calcular_condiciones(
  p_disponibilidad_id uuid,
  p_tipo_desafio text,
  p_momento timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_disp public.disponibilidades%rowtype;
  v_campo public.campos%rowtype;
  v_pol jsonb;
  v_out jsonb;
begin
  select * into v_disp from public.disponibilidades where id = p_disponibilidad_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'turno_no_existe');
  end if;
  select * into v_campo from public.campos where id = v_disp.campo_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'campo_no_existe');
  end if;
  v_pol := public.plc_politica_efectiva(v_campo.id);
  if coalesce(v_pol->>'ok', 'false') <> 'true' then
    return v_pol;
  end if;
  v_out := public.calcular_condiciones_desde_politica(
    v_pol,
    v_campo.tipo,
    coalesce(v_disp.precio, v_campo.valor_hora, 0),
    v_disp.fecha,
    v_disp.hora_inicio,
    p_tipo_desafio,
    p_momento
  );
  if coalesce(v_out->>'ok', 'false') = 'true' then
    v_out := v_out || jsonb_build_object(
      'disponibilidad_id', p_disponibilidad_id,
      'cancha_id', v_campo.cancha_id,
      'campo_id', v_campo.id,
      'inicio', public.inicio_turno(v_disp.fecha, v_disp.hora_inicio)
    );
  end if;
  return v_out;
end;
$$;

create or replace function public.simular_condiciones_predio(
  p_cancha_id uuid,
  p_campo_id uuid,
  p_tipo_desafio text,
  p_anticipacion_horas numeric,
  p_datos jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campo public.campos%rowtype;
  v_cancha public.canchas%rowtype;
  v_pol jsonb;
  v_def jsonb;
  v_precio numeric;
  v_sena numeric;
  v_fmt text := 'f5';
  v_inicio timestamp;
  v_horas numeric;
begin
  if p_cancha_id is null then
    return jsonb_build_object('ok', false, 'error', 'campo_no_existe');
  end if;
  select * into v_cancha from public.canchas where id = p_cancha_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'campo_no_existe');
  end if;

  if p_campo_id is not null then
    select * into v_campo from public.campos where id = p_campo_id and cancha_id = p_cancha_id;
    if not found then
      return jsonb_build_object('ok', false, 'error', 'campo_no_existe');
    end if;
    v_pol := public.plc_politica_efectiva(v_campo.id);
    v_fmt := v_campo.tipo;
    v_precio := coalesce(v_campo.valor_hora, 0);
    v_sena := coalesce(v_campo.valor_reserva, 0);
  else
    perform public.plc_asegurar_politica_predio(p_cancha_id);
    select to_jsonb(p) into v_pol from public.politica_predio p where p.cancha_id = p_cancha_id;
    v_pol := coalesce(v_pol, '{}'::jsonb) || jsonb_build_object('ok', true, 'cancha_id', p_cancha_id);
    v_precio := coalesce(v_cancha.valor_hora, 0);
    v_sena := coalesce(v_cancha.valor_reserva, 0);
    v_pol := v_pol || jsonb_build_object('sena_base', v_sena);
  end if;

  if coalesce(v_pol->>'ok', 'true') = 'false' then
    return v_pol;
  end if;

  v_pol := v_pol || coalesce(p_datos, '{}'::jsonb);
  if p_datos ? 'valor_hora' then
    v_precio := coalesce((p_datos->>'valor_hora')::numeric, v_precio);
  end if;
  if p_datos ? 'valor_reserva' then
    v_sena := coalesce((p_datos->>'valor_reserva')::numeric, v_sena);
  end if;
  v_pol := v_pol || jsonb_build_object('sena_base', v_sena);

  v_def := public.plc_matriz_sena_default(v_sena);
  if (v_pol->>'sena_amistoso_mas_48') is null then
    v_pol := v_pol || jsonb_build_object('sena_amistoso_mas_48', (v_def->>'amistoso_mas_48')::numeric);
  end if;
  if (v_pol->>'sena_amistoso_48_24') is null then
    v_pol := v_pol || jsonb_build_object('sena_amistoso_48_24', (v_def->>'amistoso_48_24')::numeric);
  end if;
  if (v_pol->>'sena_amistoso_menos_24') is null then
    v_pol := v_pol || jsonb_build_object('sena_amistoso_menos_24', (v_def->>'amistoso_menos_24')::numeric);
  end if;
  if (v_pol->>'sena_cancha_mas_48') is null then
    v_pol := v_pol || jsonb_build_object('sena_cancha_mas_48', (v_def->>'cancha_mas_48')::numeric);
  end if;
  if (v_pol->>'sena_cancha_48_24') is null then
    v_pol := v_pol || jsonb_build_object('sena_cancha_48_24', (v_def->>'cancha_48_24')::numeric);
  end if;
  if (v_pol->>'sena_cancha_menos_24') is null then
    v_pol := v_pol || jsonb_build_object('sena_cancha_menos_24', (v_def->>'cancha_menos_24')::numeric);
  end if;

  if p_datos ? 'formato' then
    v_fmt := p_datos->>'formato';
  end if;

  v_horas := greatest(coalesce(p_anticipacion_horas, 24), 0.25);
  v_inicio := public.ahora_argentina() + make_interval(
    hours => trunc(v_horas)::int,
    mins => round((v_horas - trunc(v_horas)) * 60)::int
  );

  return public.calcular_condiciones_desde_politica(
    v_pol,
    v_fmt,
    v_precio,
    v_inicio::date,
    v_inicio::time,
    p_tipo_desafio,
    now()
  );
end;
$$;

revoke all on function public.calcular_condiciones_desde_politica(jsonb, text, numeric, date, time, text, timestamptz) from public;
revoke all on function public.simular_condiciones_predio(uuid, uuid, text, numeric, jsonb) from public;
grant execute on function public.calcular_condiciones(uuid, text, timestamptz) to authenticated, anon;
grant execute on function public.simular_condiciones_predio(uuid, uuid, text, numeric, jsonb) to authenticated;
grant execute on function public.plc_matriz_sena_default(numeric) to authenticated;
