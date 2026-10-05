-- Fase 6 (cierre): el reloj de simulación mueve calcular_condiciones aunque
-- crear_partido pase now(). No edita 064; CREATE OR REPLACE idempotente.

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
  v_txt text;
  v_momento timestamptz;
begin
  select valor_text into v_txt from public.config_plataforma where clave = 'reloj_simulacion';
  if v_txt is not null and btrim(v_txt) <> '' then
    v_momento := v_txt::timestamptz;
  else
    v_momento := p_momento;
  end if;

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
    v_momento
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

grant execute on function public.calcular_condiciones(uuid, text, timestamptz) to authenticated, anon;
grant execute on function public.opciones_sin_rival(uuid) to authenticated;
grant execute on function public.decidir_sin_rival(uuid, text, boolean) to authenticated;
