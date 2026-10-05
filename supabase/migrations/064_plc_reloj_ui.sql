-- Fase 6: reloj de simulación y checkout de prueba (sin tocar MP de FulbitoYa).
-- Tests: supabase/tests/plc_reloj.sql

insert into public.config_plataforma (clave, valor_bool, valor_text)
values ('plc_checkout_prueba', true, null)
on conflict (clave) do update set valor_bool = excluded.valor_bool;

insert into public.config_plataforma (clave, valor_text)
values ('reloj_simulacion', null)
on conflict (clave) do nothing;

create or replace function public.ahora_argentina()
returns timestamp
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_txt text;
begin
  select valor_text into v_txt from public.config_plataforma where clave = 'reloj_simulacion';
  if v_txt is not null and btrim(v_txt) <> '' then
    return timezone('America/Argentina/Buenos_Aires', v_txt::timestamptz);
  end if;
  return timezone('America/Argentina/Buenos_Aires', now());
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

create or replace function public.condiciones_de_desafio(p_desafio_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_d public.desafios%rowtype;
begin
  select * into v_d from public.desafios where id = p_desafio_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'desafio_no_existe');
  end if;
  if v_d.condiciones is not null then
    return v_d.condiciones || jsonb_build_object('desde_snapshot', true);
  end if;
  if v_d.disponibilidad_id is null then
    return jsonb_build_object('ok', false, 'error', 'turno_no_existe');
  end if;
  return public.calcular_condiciones(
    v_d.disponibilidad_id,
    case when v_d.modalidad = 'por_la_cancha' then 'por_la_cancha' else 'amistoso' end,
    null
  );
end;
$$;

create or replace function public.get_reloj_plc()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_txt text;
begin
  select valor_text into v_txt from public.config_plataforma where clave = 'reloj_simulacion';
  return jsonb_build_object(
    'ok', true,
    'ahora', public.ahora_argentina(),
    'simulando', v_txt is not null and btrim(v_txt) <> '',
    'reloj_iso', v_txt,
    'checkout_prueba', public.config_bool('plc_checkout_prueba'),
    'soy_admin', public.es_admin_plataforma()
  );
end;
$$;

create or replace function public.set_reloj_simulacion(p_ahora timestamptz default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  if not public.es_admin_plataforma() then
    return jsonb_build_object('ok', false, 'error', 'no_admin');
  end if;

  insert into public.config_plataforma (clave, valor_text, updated_at)
  values (
    'reloj_simulacion',
    case when p_ahora is null then null else p_ahora::text end,
    now()
  )
  on conflict (clave) do update
  set valor_text = excluded.valor_text, updated_at = now();

  return public.get_reloj_plc();
end;
$$;

create or replace function public.correr_tarea_periodica_plc()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  if not public.es_admin_plataforma() then
    return jsonb_build_object('ok', false, 'error', 'no_admin');
  end if;
  return public.plc_tarea_periodica_partidos();
end;
$$;

create or replace function public.confirmar_pago_prueba(p_inscripcion_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_i public.desafio_inscripciones%rowtype;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  if not public.config_bool('plc_checkout_prueba') then
    return jsonb_build_object('ok', false, 'error', 'checkout_prueba_off');
  end if;

  select * into v_i from public.desafio_inscripciones where id = p_inscripcion_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_existe');
  end if;
  if v_i.capitan_id is distinct from v_user
     and (v_i.equipo_id is null or not public.es_capitan(v_i.equipo_id)) then
    return jsonb_build_object('ok', false, 'error', 'no_capitan');
  end if;

  return public.confirmar_pago_inscripcion(p_inscripcion_id, 'prueba-' || p_inscripcion_id::text);
end;
$$;

create or replace function public.listar_turnos_publicos()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_hoy date := public.ahora_argentina()::date;
begin
  return jsonb_build_object(
    'ok', true,
    'turnos', coalesce((
      select jsonb_agg(s.x order by s.x->>'fecha', s.x->>'hora_inicio')
      from (
        select jsonb_build_object(
          'id', d.id,
          'fecha', d.fecha,
          'hora_inicio', d.hora_inicio,
          'hora_fin', d.hora_fin,
          'precio', d.precio,
          'campo_id', c.id,
          'campo_nombre', c.nombre,
          'campo_tipo', c.tipo,
          'cancha_id', ca.id,
          'cancha_nombre', ca.nombre,
          'barrio', ca.barrio
        ) as x
        from public.disponibilidades d
        join public.campos c on c.id = d.campo_id
        join public.canchas ca on ca.id = c.cancha_id
        where d.estado = 'disponible'
          and d.fecha >= v_hoy
          and coalesce(ca.activa, true)
      ) s
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_reloj_plc() from public;
revoke all on function public.set_reloj_simulacion(timestamptz) from public;
revoke all on function public.correr_tarea_periodica_plc() from public;
revoke all on function public.confirmar_pago_prueba(uuid) from public;
revoke all on function public.listar_turnos_publicos() from public;

grant execute on function public.get_reloj_plc() to authenticated, anon;
grant execute on function public.set_reloj_simulacion(timestamptz) to authenticated;
grant execute on function public.correr_tarea_periodica_plc() to authenticated;
grant execute on function public.confirmar_pago_prueba(uuid) to authenticated;
grant execute on function public.listar_turnos_publicos() to authenticated, anon;
grant execute on function public.calcular_condiciones(uuid, text, timestamptz) to authenticated, anon;
grant execute on function public.condiciones_de_desafio(uuid) to authenticated;
grant execute on function public.monto_a_pagar_inscripcion(uuid) to authenticated;
grant execute on function public.opciones_sin_rival(uuid) to authenticated;
grant execute on function public.decidir_sin_rival(uuid, text, boolean) to authenticated;
