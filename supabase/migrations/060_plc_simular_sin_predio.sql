-- Permite simular la política antes de crear el predio (sin cancha_id).

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
  v_pol jsonb := '{}'::jsonb;
  v_def jsonb;
  v_precio numeric := 0;
  v_sena numeric := 0;
  v_fmt text := 'f5';
  v_inicio timestamp;
  v_horas numeric;
begin
  if p_cancha_id is not null then
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
  else
    v_pol := jsonb_build_object('ok', true);
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
