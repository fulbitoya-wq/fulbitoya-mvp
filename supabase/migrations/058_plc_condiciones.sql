-- Bloque 3 / Fase 1: condiciones configurables y motor calcular_condiciones.
-- No toca webhooks ni reservas de Mercado Pago de FulbitoYa.
-- premios_habilitados queda en false.
-- Tests: supabase/tests/plc_condiciones.sql (no corren en db push).

-- ---------------------------------------------------------------------------
-- Config de plataforma
-- ---------------------------------------------------------------------------
insert into public.config_plataforma (clave, valor_num, valor_bool) values
  ('tarifa_servicio_equipo_f5', 2000, null),
  ('tarifa_servicio_equipo_f7', 2800, null),
  ('tarifa_servicio_equipo_f9', 3600, null),
  ('tarifa_servicio_equipo_f11', 4400, null),
  ('tarifa_servicio_equipo', 2000, null),
  ('sena_maxima_pct_cancha', 50, null),
  ('cierre_sin_rival_minimo_horas', 3, null),
  ('anticipacion_minima_desafio_horas', 3, null),
  ('factor_amistoso_mas_48', 0.67, null),
  ('factor_amistoso_48_24', 1, null),
  ('factor_amistoso_menos_24', 1.67, null),
  ('factor_cancha_mas_48', 1, null),
  ('factor_cancha_48_24', 1.67, null),
  ('factor_cancha_menos_24', 2.5, null),
  ('factor_cancel_12_2', 1.67, null),
  ('condiciones_version', 1, null),
  ('mayores_18_amistoso', null, true)
on conflict (clave) do nothing;

insert into public.config_plataforma (clave, valor_num, valor_bool)
values ('premios_habilitados', null, false)
on conflict (clave) do update set valor_bool = false;

update public.config_plataforma
set valor_num = 2000
where clave = 'tarifa_servicio_equipo' and (valor_num is null or valor_num <= 0);

-- ---------------------------------------------------------------------------
-- Precio / seña a nivel predio (defaults para campos nuevos)
-- ---------------------------------------------------------------------------
alter table public.canchas
  add column if not exists valor_hora numeric(12,2) not null default 0,
  add column if not exists valor_reserva numeric(12,2) not null default 0;

-- ---------------------------------------------------------------------------
-- Snapshot congelado
-- ---------------------------------------------------------------------------
alter table public.desafios
  add column if not exists condiciones jsonb,
  add column if not exists condiciones_version int,
  add column if not exists condiciones_congeladas_at timestamptz,
  add column if not exists condiciones_aceptadas_por uuid references public.usuarios(id) on delete set null;

alter table public.desafio_inscripciones
  add column if not exists condiciones jsonb,
  add column if not exists condiciones_version int,
  add column if not exists condiciones_aceptadas_at timestamptz,
  add column if not exists condiciones_aceptadas_por uuid references public.usuarios(id) on delete set null;

-- ---------------------------------------------------------------------------
-- Políticas
-- ---------------------------------------------------------------------------
create table if not exists public.politica_predio (
  cancha_id uuid primary key references public.canchas(id) on delete cascade,
  reserva_sena_nunca_devuelve boolean not null default false,
  reserva_devolucion_total_horas numeric not null default 24,
  reserva_cobro_total_horas numeric not null default 2,
  desafios_habilitados boolean not null default true,
  horarios jsonb not null default '{
    "lun":[{"desde":"00:00","hasta":"23:59"}],
    "mar":[{"desde":"00:00","hasta":"23:59"}],
    "mie":[{"desde":"00:00","hasta":"23:59"}],
    "jue":[{"desde":"00:00","hasta":"23:59"}],
    "vie":[{"desde":"00:00","hasta":"23:59"}],
    "sab":[{"desde":"00:00","hasta":"23:59"}],
    "dom":[{"desde":"00:00","hasta":"23:59"}]
  }'::jsonb,
  anticipacion_min_f5_horas numeric not null default 3,
  anticipacion_min_f7_horas numeric not null default 3,
  anticipacion_min_f9_horas numeric not null default 24,
  anticipacion_min_f11_horas numeric not null default 24,
  cierre_sin_rival_mas_24h_horas numeric not null default 12,
  cierre_sin_rival_menos_24h_horas numeric not null default 3,
  permitir_seguir_hasta_inicio boolean not null default true,
  tolerancia_walkover_min integer not null default 15,
  predio_cancela text not null default 'devolver_todo',
  sena_amistoso_mas_48 numeric,
  sena_amistoso_48_24 numeric,
  sena_amistoso_menos_24 numeric,
  sena_cancha_mas_48 numeric,
  sena_cancha_48_24 numeric,
  sena_cancha_menos_24 numeric,
  updated_at timestamptz not null default now(),
  constraint politica_predio_cancela_chk check (predio_cancela in ('reprogramar', 'devolver_todo'))
);

create table if not exists public.politica_campo (
  campo_id uuid primary key references public.campos(id) on delete cascade,
  cancha_id uuid not null references public.canchas(id) on delete cascade,
  reserva_sena_nunca_devuelve boolean,
  reserva_devolucion_total_horas numeric,
  reserva_cobro_total_horas numeric,
  desafios_habilitados boolean,
  horarios jsonb,
  anticipacion_min_f5_horas numeric,
  anticipacion_min_f7_horas numeric,
  anticipacion_min_f9_horas numeric,
  anticipacion_min_f11_horas numeric,
  cierre_sin_rival_mas_24h_horas numeric,
  cierre_sin_rival_menos_24h_horas numeric,
  permitir_seguir_hasta_inicio boolean,
  tolerancia_walkover_min integer,
  predio_cancela text,
  sena_amistoso_mas_48 numeric,
  sena_amistoso_48_24 numeric,
  sena_amistoso_menos_24 numeric,
  sena_cancha_mas_48 numeric,
  sena_cancha_48_24 numeric,
  sena_cancha_menos_24 numeric,
  updated_at timestamptz not null default now(),
  constraint politica_campo_cancela_chk check (
    predio_cancela is null or predio_cancela in ('reprogramar', 'devolver_todo')
  )
);

alter table public.politica_predio enable row level security;
alter table public.politica_campo enable row level security;

drop policy if exists "Leer politica predio" on public.politica_predio;
create policy "Leer politica predio"
  on public.politica_predio for select
  to authenticated, anon
  using (true);

drop policy if exists "Leer politica campo" on public.politica_campo;
create policy "Leer politica campo"
  on public.politica_campo for select
  to authenticated, anon
  using (true);

revoke insert, update, delete on table public.politica_predio from public, anon, authenticated;
revoke insert, update, delete on table public.politica_campo from public, anon, authenticated;
grant select on table public.politica_predio to authenticated, anon;
grant select on table public.politica_campo to authenticated, anon;

insert into public.politica_predio (cancha_id)
select id from public.canchas
on conflict (cancha_id) do nothing;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.plc_centena(p_monto numeric)
returns numeric
language sql
immutable
as $$
  select case
    when p_monto is null then null
    else round(p_monto / 100.0) * 100
  end;
$$;

create or replace function public.plc_formato_clave(p_tipo text)
returns text
language sql
immutable
as $$
  select case lower(btrim(coalesce(p_tipo, 'f5')))
    when '11' then 'f11'
    when 'f11' then 'f11'
    when '9' then 'f9'
    when 'f9' then 'f9'
    when '7' then 'f7'
    when 'f7' then 'f7'
    else 'f5'
  end;
$$;

create or replace function public.plc_jugadores_formato(p_tipo text)
returns integer
language sql
immutable
as $$
  select case public.plc_formato_clave(p_tipo)
    when 'f11' then 11
    when 'f9' then 9
    when 'f7' then 7
    else 5
  end;
$$;

create or replace function public.plc_tarifa_servicio_equipo(p_tipo text)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_fmt text := public.plc_formato_clave(p_tipo);
  v numeric;
begin
  v := public.config_num('tarifa_servicio_equipo_' || v_fmt);
  if v is null or v <= 0 then
    v := public.config_num('tarifa_servicio_equipo');
  end if;
  return public.plc_centena(coalesce(v, 0));
end;
$$;

create or replace function public.plc_dia_clave(p_fecha date)
returns text
language sql
immutable
as $$
  select case extract(isodow from p_fecha)::int
    when 1 then 'lun'
    when 2 then 'mar'
    when 3 then 'mie'
    when 4 then 'jue'
    when 5 then 'vie'
    when 6 then 'sab'
    else 'dom'
  end;
$$;

create or replace function public.plc_horario_habilitado(p_horarios jsonb, p_fecha date, p_hora time)
returns boolean
language plpgsql
immutable
as $$
declare
  v_dia text;
  v_franja jsonb;
  v_desde time;
  v_hasta time;
begin
  if p_horarios is null or p_horarios = '{}'::jsonb then
    return true;
  end if;
  v_dia := public.plc_dia_clave(p_fecha);
  if not (p_horarios ? v_dia) then
    return false;
  end if;
  if jsonb_typeof(p_horarios->v_dia) is distinct from 'array' then
    return false;
  end if;
  if jsonb_array_length(p_horarios->v_dia) = 0 then
    return false;
  end if;
  for v_franja in select value from jsonb_array_elements(p_horarios->v_dia)
  loop
    begin
      v_desde := (v_franja->>'desde')::time;
      v_hasta := (v_franja->>'hasta')::time;
    exception
      when others then
        continue;
    end;
    if p_hora >= v_desde and p_hora <= v_hasta then
      return true;
    end if;
  end loop;
  return false;
end;
$$;

create or replace function public.plc_es_dueno_cancha(p_cancha_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.canchas
    where id = p_cancha_id and owner_id = auth.uid()
  ) or public.es_admin_plataforma();
$$;

create or replace function public.plc_matriz_sena_default(p_sena_base numeric)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'amistoso_mas_48', public.plc_centena(p_sena_base * coalesce(public.config_num('factor_amistoso_mas_48'), 0.67)),
    'amistoso_48_24', public.plc_centena(p_sena_base * coalesce(public.config_num('factor_amistoso_48_24'), 1)),
    'amistoso_menos_24', public.plc_centena(p_sena_base * coalesce(public.config_num('factor_amistoso_menos_24'), 1.67)),
    'cancha_mas_48', public.plc_centena(p_sena_base * coalesce(public.config_num('factor_cancha_mas_48'), 1)),
    'cancha_48_24', public.plc_centena(p_sena_base * coalesce(public.config_num('factor_cancha_48_24'), 1.67)),
    'cancha_menos_24', public.plc_centena(p_sena_base * coalesce(public.config_num('factor_cancha_menos_24'), 2.5))
  );
$$;

create or replace function public.plc_asegurar_politica_predio(p_cancha_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.politica_predio (cancha_id)
  values (p_cancha_id)
  on conflict (cancha_id) do nothing;
end;
$$;

create or replace function public.plc_politica_efectiva(p_campo_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campo public.campos%rowtype;
  v_p public.politica_predio%rowtype;
  v_c public.politica_campo%rowtype;
  v_def jsonb;
  v_sena numeric;
begin
  select * into v_campo from public.campos where id = p_campo_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'campo_no_existe');
  end if;

  perform public.plc_asegurar_politica_predio(v_campo.cancha_id);
  select * into v_p from public.politica_predio where cancha_id = v_campo.cancha_id;
  select * into v_c from public.politica_campo where campo_id = p_campo_id;

  v_sena := coalesce(v_campo.valor_reserva, 0);
  v_def := public.plc_matriz_sena_default(v_sena);

  return jsonb_build_object(
    'ok', true,
    'cancha_id', v_campo.cancha_id,
    'campo_id', v_campo.id,
    'sena_base', v_sena,
    'reserva_sena_nunca_devuelve', coalesce(v_c.reserva_sena_nunca_devuelve, v_p.reserva_sena_nunca_devuelve, false),
    'reserva_devolucion_total_horas', coalesce(v_c.reserva_devolucion_total_horas, v_p.reserva_devolucion_total_horas, 24),
    'reserva_cobro_total_horas', coalesce(v_c.reserva_cobro_total_horas, v_p.reserva_cobro_total_horas, 2),
    'desafios_habilitados', coalesce(v_c.desafios_habilitados, v_p.desafios_habilitados, true),
    'horarios', coalesce(v_c.horarios, v_p.horarios),
    'anticipacion_min_f5_horas', coalesce(v_c.anticipacion_min_f5_horas, v_p.anticipacion_min_f5_horas, 3),
    'anticipacion_min_f7_horas', coalesce(v_c.anticipacion_min_f7_horas, v_p.anticipacion_min_f7_horas, 3),
    'anticipacion_min_f9_horas', coalesce(v_c.anticipacion_min_f9_horas, v_p.anticipacion_min_f9_horas, 24),
    'anticipacion_min_f11_horas', coalesce(v_c.anticipacion_min_f11_horas, v_p.anticipacion_min_f11_horas, 24),
    'cierre_sin_rival_mas_24h_horas', coalesce(v_c.cierre_sin_rival_mas_24h_horas, v_p.cierre_sin_rival_mas_24h_horas, 12),
    'cierre_sin_rival_menos_24h_horas', coalesce(v_c.cierre_sin_rival_menos_24h_horas, v_p.cierre_sin_rival_menos_24h_horas, 3),
    'permitir_seguir_hasta_inicio', coalesce(v_c.permitir_seguir_hasta_inicio, v_p.permitir_seguir_hasta_inicio, true),
    'tolerancia_walkover_min', coalesce(v_c.tolerancia_walkover_min, v_p.tolerancia_walkover_min, 15),
    'predio_cancela', coalesce(v_c.predio_cancela, v_p.predio_cancela, 'devolver_todo'),
    'sena_amistoso_mas_48', coalesce(v_c.sena_amistoso_mas_48, v_p.sena_amistoso_mas_48, (v_def->>'amistoso_mas_48')::numeric),
    'sena_amistoso_48_24', coalesce(v_c.sena_amistoso_48_24, v_p.sena_amistoso_48_24, (v_def->>'amistoso_48_24')::numeric),
    'sena_amistoso_menos_24', coalesce(v_c.sena_amistoso_menos_24, v_p.sena_amistoso_menos_24, (v_def->>'amistoso_menos_24')::numeric),
    'sena_cancha_mas_48', coalesce(v_c.sena_cancha_mas_48, v_p.sena_cancha_mas_48, (v_def->>'cancha_mas_48')::numeric),
    'sena_cancha_48_24', coalesce(v_c.sena_cancha_48_24, v_p.sena_cancha_48_24, (v_def->>'cancha_48_24')::numeric),
    'sena_cancha_menos_24', coalesce(v_c.sena_cancha_menos_24, v_p.sena_cancha_menos_24, (v_def->>'cancha_menos_24')::numeric)
  );
end;
$$;

create or replace function public.plc_validar_politica(p_pol jsonb, p_precio numeric, p_sena_base numeric)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_pct numeric := coalesce(public.config_num('sena_maxima_pct_cancha'), 50);
  v_cierre_min numeric := coalesce(public.config_num('cierre_sin_rival_minimo_horas'), 3);
  v_ant_min numeric := coalesce(public.config_num('anticipacion_minima_desafio_horas'), 3);
  v_max_sena numeric;
begin
  if p_precio is not null and p_precio > 0 and p_sena_base is not null and p_sena_base > 0 then
    v_max_sena := public.plc_centena(p_precio * v_pct / 100.0);
    if p_sena_base > v_max_sena + 0.009 then
      return jsonb_build_object('ok', false, 'error', 'sena_supera_maximo', 'maximo', v_max_sena);
    end if;
  end if;

  if coalesce((p_pol->>'cierre_sin_rival_mas_24h_horas')::numeric, 12) < v_cierre_min then
    return jsonb_build_object('ok', false, 'error', 'cierre_sin_rival_bajo', 'minimo', v_cierre_min);
  end if;
  if coalesce((p_pol->>'cierre_sin_rival_menos_24h_horas')::numeric, 3) < v_cierre_min then
    return jsonb_build_object('ok', false, 'error', 'cierre_sin_rival_bajo', 'minimo', v_cierre_min);
  end if;

  if coalesce((p_pol->>'anticipacion_min_f5_horas')::numeric, 3) < v_ant_min
     or coalesce((p_pol->>'anticipacion_min_f7_horas')::numeric, 3) < v_ant_min
     or coalesce((p_pol->>'anticipacion_min_f9_horas')::numeric, 24) < v_ant_min
     or coalesce((p_pol->>'anticipacion_min_f11_horas')::numeric, 24) < v_ant_min then
    return jsonb_build_object('ok', false, 'error', 'anticipacion_minima_baja', 'minimo', v_ant_min);
  end if;

  if coalesce((p_pol->>'reserva_cobro_total_horas')::numeric, 2) < 0 then
    return jsonb_build_object('ok', false, 'error', 'politica_invalida');
  end if;
  if coalesce((p_pol->>'predio_cancela'), 'devolver_todo') not in ('reprogramar', 'devolver_todo') then
    return jsonb_build_object('ok', false, 'error', 'politica_invalida');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Motor
-- ---------------------------------------------------------------------------
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
  v_val jsonb;
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
begin
  v_tipo := case lower(btrim(coalesce(p_tipo_desafio, 'por_la_cancha')))
    when 'amistoso' then 'amistoso'
    else 'por_la_cancha'
  end;

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

  v_precio := public.plc_centena(coalesce(v_disp.precio, v_campo.valor_hora, 0));
  if v_precio <= 0 then
    return jsonb_build_object('ok', false, 'error', 'precio_cancha_invalido');
  end if;
  v_sena_base := public.plc_centena(coalesce((v_pol->>'sena_base')::numeric, v_campo.valor_reserva, 0));

  v_val := public.plc_validar_politica(v_pol, v_precio, v_sena_base);
  -- la seña por encima del tope no impide calcular: se informa. El tope se exige al guardar.

  v_fmt := public.plc_formato_clave(v_campo.tipo);
  v_n := public.plc_jugadores_formato(v_fmt);
  v_tarifa := public.plc_tarifa_servicio_equipo(v_fmt);
  if v_tarifa <= 0 then
    return jsonb_build_object('ok', false, 'error', 'tarifa_no_configurada');
  end if;
  v_tarifa_amistoso := public.plc_centena(v_tarifa / 2.0);
  v_tarifa_jugador := public.plc_centena(v_tarifa_amistoso / v_n);

  v_momento := timezone('America/Argentina/Buenos_Aires', coalesce(p_momento, now()));
  v_inicio := public.inicio_turno(v_disp.fecha, v_disp.hora_inicio);
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
      when 'mas_48' then (v_pol->>'sena_amistoso_mas_48')::numeric
      when 'entre_48_24' then (v_pol->>'sena_amistoso_48_24')::numeric
      else (v_pol->>'sena_amistoso_menos_24')::numeric
    end;
    v_monto_a := v_precio + v_tarifa_amistoso;
    v_monto_rival := public.plc_centena(v_precio / 2.0) + v_tarifa_amistoso;
    v_monto_jugador := public.plc_centena(v_precio / 2.0 / v_n) + v_tarifa_jugador;
  else
    v_sena_sin_rival := case v_tramo
      when 'mas_48' then (v_pol->>'sena_cancha_mas_48')::numeric
      when 'entre_48_24' then (v_pol->>'sena_cancha_48_24')::numeric
      else (v_pol->>'sena_cancha_menos_24')::numeric
    end;
    v_monto_a := v_precio + v_tarifa;
    v_monto_rival := v_monto_a;
    v_monto_jugador := null;
  end if;
  v_sena_sin_rival := public.plc_centena(coalesce(v_sena_sin_rival, 0));

  v_ant_min := case v_fmt
    when 'f11' then (v_pol->>'anticipacion_min_f11_horas')::numeric
    when 'f9' then (v_pol->>'anticipacion_min_f9_horas')::numeric
    when 'f7' then (v_pol->>'anticipacion_min_f7_horas')::numeric
    else (v_pol->>'anticipacion_min_f5_horas')::numeric
  end;

  v_cierre_min := coalesce(public.config_num('cierre_sin_rival_minimo_horas'), 3);
  if v_horas >= 24 then
    v_cierre_h := greatest(v_cierre_min, coalesce((v_pol->>'cierre_sin_rival_mas_24h_horas')::numeric, 12));
  else
    v_cierre_h := greatest(v_cierre_min, coalesce((v_pol->>'cierre_sin_rival_menos_24h_horas')::numeric, 3));
  end if;
  v_cierre := v_inicio - make_interval(hours => v_cierre_h::int, mins => round((v_cierre_h - trunc(v_cierre_h)) * 60)::int);
  v_punto_24 := v_inicio - interval '24 hours';
  v_gratis := v_horas > 48;

  v_factor_12 := coalesce(public.config_num('factor_cancel_12_2'), 1.67);
  v_cargo_24_12 := public.plc_centena(v_sena_base);
  v_cargo_12_2 := public.plc_centena(v_sena_base * v_factor_12);

  v_version := coalesce(public.config_num('condiciones_version'), 1)::int;
  v_cancela := coalesce(v_pol->>'predio_cancela', 'devolver_todo');

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
    'disponibilidad_id', p_disponibilidad_id,
    'cancha_id', v_campo.cancha_id,
    'campo_id', v_campo.id,
    'inicio', v_inicio,
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
    'permitir_seguir_hasta_inicio', coalesce((v_pol->>'permitir_seguir_hasta_inicio')::boolean, true),
    'tolerancia_walkover_min', coalesce((v_pol->>'tolerancia_walkover_min')::int, 15),
    'predio_cancela', v_cancela,
    'predio_cancela_label', case v_cancela
      when 'reprogramar' then 'Si el predio cancela, se reprograma el partido.'
      else 'Si el predio cancela, te devolvemos todo.'
    end,
    'desafios_habilitados', coalesce((v_pol->>'desafios_habilitados')::boolean, true),
    'horario_habilitado', public.plc_horario_habilitado(v_pol->'horarios', v_disp.fecha, v_disp.hora_inicio),
    'anticipacion_minima_horas', v_ant_min,
    'anticipacion_ok', v_horas >= v_ant_min,
    'mayores_18', case
      when v_tipo = 'amistoso' then coalesce(public.config_bool('mayores_18_amistoso'), true)
      else true
    end,
    'mensaje_tramo', v_mensaje,
    'sena_maxima_ok', (v_val->>'ok') = 'true' or v_sena_base <= 0,
    'politica_reserva_comun', jsonb_build_object(
      'sena_nunca_se_devuelve', coalesce((v_pol->>'reserva_sena_nunca_devuelve')::boolean, false),
      'devolucion_total_si_mas_de_horas', coalesce((v_pol->>'reserva_devolucion_total_horas')::numeric, 24),
      'cobro_total_si_menos_de_horas', coalesce((v_pol->>'reserva_cobro_total_horas')::numeric, 2)
    ),
    'matriz_sena_sin_rival', jsonb_build_object(
      'amistoso', jsonb_build_object(
        'mas_48', public.plc_centena((v_pol->>'sena_amistoso_mas_48')::numeric),
        'entre_48_24', public.plc_centena((v_pol->>'sena_amistoso_48_24')::numeric),
        'menos_24', public.plc_centena((v_pol->>'sena_amistoso_menos_24')::numeric)
      ),
      'por_la_cancha', jsonb_build_object(
        'mas_48', public.plc_centena((v_pol->>'sena_cancha_mas_48')::numeric),
        'entre_48_24', public.plc_centena((v_pol->>'sena_cancha_48_24')::numeric),
        'menos_24', public.plc_centena((v_pol->>'sena_cancha_menos_24')::numeric)
      )
    ),
    'cargos_cancelacion', jsonb_build_array(
      jsonb_build_object(
        'tramo', 'mas_24h',
        'hasta', v_inicio - interval '24 hours',
        'cargo', 0,
        'reembolso_si_pago_a', v_monto_a,
        'retiene_app', 0,
        'para_predio', 0,
        'label', 'Con más de 24 h: cancelás sin cargo.'
      ),
      jsonb_build_object(
        'tramo', '24_a_12h',
        'desde', v_inicio - interval '24 hours',
        'hasta', v_inicio - interval '12 hours',
        'cargo', v_cargo_24_12,
        'reembolso_si_pago_a', greatest(v_monto_a - v_cargo_24_12, 0),
        'retiene_app', least(case when v_tipo = 'amistoso' then v_tarifa_amistoso else v_tarifa end, v_cargo_24_12),
        'para_predio', v_cargo_24_12 - least(case when v_tipo = 'amistoso' then v_tarifa_amistoso else v_tarifa end, v_cargo_24_12),
        'label', 'Entre 24 y 12 h: se retiene la seña base.'
      ),
      jsonb_build_object(
        'tramo', '12_a_2h',
        'desde', v_inicio - interval '12 hours',
        'hasta', v_inicio - interval '2 hours',
        'cargo', v_cargo_12_2,
        'reembolso_si_pago_a', greatest(v_monto_a - v_cargo_12_2, 0),
        'retiene_app', least(case when v_tipo = 'amistoso' then v_tarifa_amistoso else v_tarifa end, v_cargo_12_2),
        'para_predio', v_cargo_12_2 - least(case when v_tipo = 'amistoso' then v_tarifa_amistoso else v_tarifa end, v_cargo_12_2),
        'label', 'Entre 12 y 2 h: se retiene la seña base × 1,67.'
      ),
      jsonb_build_object(
        'tramo', 'menos_2h_o_ausente',
        'desde', v_inicio - interval '2 hours',
        'hasta', v_inicio,
        'cargo', v_precio,
        'reembolso_si_pago_a', greatest(v_monto_a - v_precio, 0),
        'retiene_app', least(case when v_tipo = 'amistoso' then v_tarifa_amistoso else v_tarifa end, v_precio),
        'para_predio', v_precio - least(case when v_tipo = 'amistoso' then v_tarifa_amistoso else v_tarifa end, v_precio),
        'label', 'Con menos de 2 h o si no te presentás: se cobra la cancha completa.'
      )
    )
  );
end;
$$;

create or replace function public.condiciones_de_desafio(p_desafio_id uuid)
returns jsonb
language plpgsql
stable
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
    now()
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Guardar config / política
-- ---------------------------------------------------------------------------
create or replace function public.guardar_config_plataforma(
  p_clave text,
  p_valor_num numeric default null,
  p_valor_bool boolean default null,
  p_valor_text text default null
)
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
  if p_clave is null or btrim(p_clave) = '' then
    return jsonb_build_object('ok', false, 'error', 'politica_invalida');
  end if;
  if p_clave = 'premios_habilitados' and coalesce(p_valor_bool, false) then
    return jsonb_build_object('ok', false, 'error', 'premios_deshabilitados');
  end if;

  insert into public.config_plataforma (clave, valor_num, valor_bool, valor_text, updated_at)
  values (p_clave, p_valor_num, p_valor_bool, p_valor_text, now())
  on conflict (clave) do update
  set valor_num = excluded.valor_num,
      valor_bool = excluded.valor_bool,
      valor_text = excluded.valor_text,
      updated_at = now();

  if p_clave = 'tarifa_servicio_equipo_f5' and p_valor_num is not null then
    update public.config_plataforma
    set valor_num = p_valor_num, updated_at = now()
    where clave = 'tarifa_servicio_equipo';
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.guardar_politica_predio(
  p_cancha_id uuid,
  p_campo_id uuid,
  p_datos jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sena numeric;
  v_precio numeric;
  v_val jsonb;
  v_pol jsonb;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  if not public.plc_es_dueno_cancha(p_cancha_id) then
    return jsonb_build_object('ok', false, 'error', 'no_dueno_predio');
  end if;
  if not exists (select 1 from public.canchas where id = p_cancha_id) then
    return jsonb_build_object('ok', false, 'error', 'campo_no_existe');
  end if;

  perform public.plc_asegurar_politica_predio(p_cancha_id);

  if p_campo_id is not null then
    if not exists (select 1 from public.campos where id = p_campo_id and cancha_id = p_cancha_id) then
      return jsonb_build_object('ok', false, 'error', 'campo_no_existe');
    end if;
    select coalesce(valor_reserva, 0), coalesce(valor_hora, 0)
    into v_sena, v_precio
    from public.campos where id = p_campo_id;
  else
    select coalesce(avg(valor_reserva), 0), coalesce(avg(valor_hora), 0)
    into v_sena, v_precio
    from public.campos where cancha_id = p_cancha_id;
    if v_sena = 0 then
      select coalesce(valor_reserva, 0), coalesce(valor_hora, 0)
      into v_sena, v_precio
      from public.canchas where id = p_cancha_id;
    end if;
  end if;

  v_pol := coalesce(p_datos, '{}'::jsonb);
  if p_datos ? 'valor_reserva' then
    v_sena := coalesce((p_datos->>'valor_reserva')::numeric, v_sena);
  end if;
  if p_datos ? 'valor_hora' then
    v_precio := coalesce((p_datos->>'valor_hora')::numeric, v_precio);
  end if;

  v_val := public.plc_validar_politica(v_pol, v_precio, v_sena);
  if coalesce(v_val->>'ok', 'false') <> 'true' then
    return v_val;
  end if;

  if p_campo_id is null then
    if p_datos ? 'valor_hora' or p_datos ? 'valor_reserva' then
      update public.canchas
      set valor_hora = coalesce((p_datos->>'valor_hora')::numeric, valor_hora),
          valor_reserva = coalesce((p_datos->>'valor_reserva')::numeric, valor_reserva)
      where id = p_cancha_id;
    end if;
    update public.politica_predio
    set
      reserva_sena_nunca_devuelve = coalesce((p_datos->>'reserva_sena_nunca_devuelve')::boolean, reserva_sena_nunca_devuelve),
      reserva_devolucion_total_horas = coalesce((p_datos->>'reserva_devolucion_total_horas')::numeric, reserva_devolucion_total_horas),
      reserva_cobro_total_horas = coalesce((p_datos->>'reserva_cobro_total_horas')::numeric, reserva_cobro_total_horas),
      desafios_habilitados = coalesce((p_datos->>'desafios_habilitados')::boolean, desafios_habilitados),
      horarios = coalesce(p_datos->'horarios', horarios),
      anticipacion_min_f5_horas = coalesce((p_datos->>'anticipacion_min_f5_horas')::numeric, anticipacion_min_f5_horas),
      anticipacion_min_f7_horas = coalesce((p_datos->>'anticipacion_min_f7_horas')::numeric, anticipacion_min_f7_horas),
      anticipacion_min_f9_horas = coalesce((p_datos->>'anticipacion_min_f9_horas')::numeric, anticipacion_min_f9_horas),
      anticipacion_min_f11_horas = coalesce((p_datos->>'anticipacion_min_f11_horas')::numeric, anticipacion_min_f11_horas),
      cierre_sin_rival_mas_24h_horas = coalesce((p_datos->>'cierre_sin_rival_mas_24h_horas')::numeric, cierre_sin_rival_mas_24h_horas),
      cierre_sin_rival_menos_24h_horas = coalesce((p_datos->>'cierre_sin_rival_menos_24h_horas')::numeric, cierre_sin_rival_menos_24h_horas),
      permitir_seguir_hasta_inicio = coalesce((p_datos->>'permitir_seguir_hasta_inicio')::boolean, permitir_seguir_hasta_inicio),
      tolerancia_walkover_min = coalesce((p_datos->>'tolerancia_walkover_min')::int, tolerancia_walkover_min),
      predio_cancela = coalesce(p_datos->>'predio_cancela', predio_cancela),
      sena_amistoso_mas_48 = coalesce((p_datos->>'sena_amistoso_mas_48')::numeric, sena_amistoso_mas_48),
      sena_amistoso_48_24 = coalesce((p_datos->>'sena_amistoso_48_24')::numeric, sena_amistoso_48_24),
      sena_amistoso_menos_24 = coalesce((p_datos->>'sena_amistoso_menos_24')::numeric, sena_amistoso_menos_24),
      sena_cancha_mas_48 = coalesce((p_datos->>'sena_cancha_mas_48')::numeric, sena_cancha_mas_48),
      sena_cancha_48_24 = coalesce((p_datos->>'sena_cancha_48_24')::numeric, sena_cancha_48_24),
      sena_cancha_menos_24 = coalesce((p_datos->>'sena_cancha_menos_24')::numeric, sena_cancha_menos_24),
      updated_at = now()
    where cancha_id = p_cancha_id;
  else
    if p_datos ? 'valor_hora' or p_datos ? 'valor_reserva' then
      update public.campos
      set valor_hora = coalesce((p_datos->>'valor_hora')::numeric, valor_hora),
          valor_reserva = coalesce((p_datos->>'valor_reserva')::numeric, valor_reserva)
      where id = p_campo_id;
    end if;
    insert into public.politica_campo (campo_id, cancha_id)
    values (p_campo_id, p_cancha_id)
    on conflict (campo_id) do nothing;
    update public.politica_campo
    set
      reserva_sena_nunca_devuelve = coalesce((p_datos->>'reserva_sena_nunca_devuelve')::boolean, reserva_sena_nunca_devuelve),
      reserva_devolucion_total_horas = coalesce((p_datos->>'reserva_devolucion_total_horas')::numeric, reserva_devolucion_total_horas),
      reserva_cobro_total_horas = coalesce((p_datos->>'reserva_cobro_total_horas')::numeric, reserva_cobro_total_horas),
      desafios_habilitados = coalesce((p_datos->>'desafios_habilitados')::boolean, desafios_habilitados),
      horarios = coalesce(p_datos->'horarios', horarios),
      anticipacion_min_f5_horas = coalesce((p_datos->>'anticipacion_min_f5_horas')::numeric, anticipacion_min_f5_horas),
      anticipacion_min_f7_horas = coalesce((p_datos->>'anticipacion_min_f7_horas')::numeric, anticipacion_min_f7_horas),
      anticipacion_min_f9_horas = coalesce((p_datos->>'anticipacion_min_f9_horas')::numeric, anticipacion_min_f9_horas),
      anticipacion_min_f11_horas = coalesce((p_datos->>'anticipacion_min_f11_horas')::numeric, anticipacion_min_f11_horas),
      cierre_sin_rival_mas_24h_horas = coalesce((p_datos->>'cierre_sin_rival_mas_24h_horas')::numeric, cierre_sin_rival_mas_24h_horas),
      cierre_sin_rival_menos_24h_horas = coalesce((p_datos->>'cierre_sin_rival_menos_24h_horas')::numeric, cierre_sin_rival_menos_24h_horas),
      permitir_seguir_hasta_inicio = coalesce((p_datos->>'permitir_seguir_hasta_inicio')::boolean, permitir_seguir_hasta_inicio),
      tolerancia_walkover_min = coalesce((p_datos->>'tolerancia_walkover_min')::int, tolerancia_walkover_min),
      predio_cancela = coalesce(p_datos->>'predio_cancela', predio_cancela),
      sena_amistoso_mas_48 = coalesce((p_datos->>'sena_amistoso_mas_48')::numeric, sena_amistoso_mas_48),
      sena_amistoso_48_24 = coalesce((p_datos->>'sena_amistoso_48_24')::numeric, sena_amistoso_48_24),
      sena_amistoso_menos_24 = coalesce((p_datos->>'sena_amistoso_menos_24')::numeric, sena_amistoso_menos_24),
      sena_cancha_mas_48 = coalesce((p_datos->>'sena_cancha_mas_48')::numeric, sena_cancha_mas_48),
      sena_cancha_48_24 = coalesce((p_datos->>'sena_cancha_48_24')::numeric, sena_cancha_48_24),
      sena_cancha_menos_24 = coalesce((p_datos->>'sena_cancha_menos_24')::numeric, sena_cancha_menos_24),
      updated_at = now()
    where campo_id = p_campo_id;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.aceptar_condiciones_inscripcion(p_inscripcion_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_i public.desafio_inscripciones%rowtype;
  v_d public.desafios%rowtype;
  v_cond jsonb;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  select * into v_i from public.desafio_inscripciones where id = p_inscripcion_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_existe');
  end if;
  if v_i.capitan_id is distinct from v_user and not public.es_capitan(v_i.equipo_id) then
    return jsonb_build_object('ok', false, 'error', 'no_capitan');
  end if;
  select * into v_d from public.desafios where id = v_i.desafio_id for update;
  if v_d.condiciones is null then
    if v_d.disponibilidad_id is null then
      return jsonb_build_object('ok', false, 'error', 'turno_no_existe');
    end if;
    v_cond := public.calcular_condiciones(
      v_d.disponibilidad_id,
      case when v_d.modalidad = 'por_la_cancha' then 'por_la_cancha' else 'amistoso' end,
      now()
    );
    if coalesce(v_cond->>'ok', 'false') <> 'true' then
      return v_cond;
    end if;
    update public.desafios
    set condiciones = v_cond,
        condiciones_version = coalesce((v_cond->>'version')::int, 1),
        condiciones_congeladas_at = now(),
        condiciones_aceptadas_por = v_user
    where id = v_d.id;
  else
    v_cond := v_d.condiciones;
  end if;

  update public.desafio_inscripciones
  set condiciones = v_cond,
      condiciones_version = coalesce((v_cond->>'version')::int, 1),
      condiciones_aceptadas_at = now(),
      condiciones_aceptadas_por = v_user,
      updated_at = now()
  where id = v_i.id;

  return jsonb_build_object('ok', true, 'condiciones', v_cond);
end;
$$;

-- ---------------------------------------------------------------------------
-- crear_partido: montos y cierre salen de calcular_condiciones; snapshot al crear
-- ---------------------------------------------------------------------------
create or replace function public.crear_partido(
  p_disponibilidad_id uuid,
  p_equipo_id uuid,
  p_convocados uuid[],
  p_regla_empate text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_disp public.disponibilidades%rowtype;
  v_campo public.campos%rowtype;
  v_cancha public.canchas%rowtype;
  v_tipo public.match_tipo;
  v_val jsonb;
  v_cond jsonb;
  v_conv uuid[];
  v_tarifa numeric;
  v_precio numeric;
  v_total numeric;
  v_desafio uuid;
  v_insc uuid;
  v_inicio timestamp;
  v_duracion int;
  v_eq_nombre text;
  v_titulo text;
  v_uid uuid;
  v_cierre timestamptz;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  if not public.es_capitan(p_equipo_id) then
    return jsonb_build_object('ok', false, 'error', 'no_capitan');
  end if;
  if p_regla_empate not in ('penales', 'mitad_cada_uno') then
    return jsonb_build_object('ok', false, 'error', 'regla_empate_invalida');
  end if;

  v_cond := public.calcular_condiciones(p_disponibilidad_id, 'por_la_cancha', now());
  if coalesce(v_cond->>'ok', 'false') <> 'true' then
    return v_cond;
  end if;
  if coalesce((v_cond->>'desafios_habilitados')::boolean, true) is not true then
    return jsonb_build_object('ok', false, 'error', 'desafios_no_habilitados');
  end if;
  if coalesce((v_cond->>'horario_habilitado')::boolean, true) is not true then
    return jsonb_build_object('ok', false, 'error', 'horario_no_habilitado');
  end if;
  if coalesce((v_cond->>'anticipacion_ok')::boolean, true) is not true then
    return jsonb_build_object(
      'ok', false,
      'error', 'anticipacion_insuficiente',
      'minimo', (v_cond->>'anticipacion_minima_horas')::numeric
    );
  end if;

  v_precio := coalesce((v_cond->>'precio_cancha')::numeric, 0);
  v_tarifa := coalesce((v_cond->>'tarifa_servicio_equipo')::numeric, 0);
  v_total := coalesce((v_cond->>'monto_equipo_a')::numeric, v_precio + v_tarifa);
  if v_tarifa <= 0 then
    return jsonb_build_object('ok', false, 'error', 'tarifa_no_configurada');
  end if;

  select * into v_disp from public.disponibilidades where id = p_disponibilidad_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'turno_no_existe');
  end if;
  if v_disp.estado is distinct from 'disponible' then
    return jsonb_build_object('ok', false, 'error', 'turno_no_disponible');
  end if;

  v_inicio := public.inicio_turno(v_disp.fecha, v_disp.hora_inicio);
  if v_inicio <= public.ahora_argentina() then
    return jsonb_build_object('ok', false, 'error', 'turno_pasado');
  end if;

  select * into v_campo from public.campos where id = v_disp.campo_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'campo_no_existe');
  end if;
  select * into v_cancha from public.canchas where id = v_campo.cancha_id;

  v_tipo := public.tipo_desde_campo(v_campo.tipo);
  v_val := public.validar_convocados_mayores(p_equipo_id, p_convocados, v_tipo::text);
  if coalesce(v_val->>'ok', 'false') <> 'true' then
    return v_val;
  end if;
  select array_agg(x::uuid) into v_conv
  from jsonb_array_elements_text(v_val->'convocados') as x;
  if v_user <> all (v_conv) then
    v_conv := array_append(v_conv, v_user);
  end if;

  v_duracion := greatest(1, round(extract(epoch from (v_disp.hora_fin - v_disp.hora_inicio)) / 60.0)::int);
  select nombre into v_eq_nombre from public.equipos where id = p_equipo_id;
  v_titulo := 'Partido en ' || coalesce(v_cancha.nombre, 'la cancha');
  v_cierre := coalesce((v_cond->>'cierre_sin_rival')::timestamptz, (v_inicio - interval '2 hours') at time zone 'America/Argentina/Buenos_Aires');

  update public.disponibilidades
  set estado = 'reservado_pendiente'
  where id = v_disp.id and estado = 'disponible';
  if not found then
    return jsonb_build_object('ok', false, 'error', 'turno_no_disponible');
  end if;

  insert into public.desafios (
    owner_id, cancha_id, titulo, tipo, premio, direccion, barrio, place_id, lat, lng,
    fecha, hora_inicio, duracion_min, descripcion, estado,
    cierre_inscripcion, modalidad, disponibilidad_id, precio_cancha, tarifa_servicio, regla_empate,
    condiciones, condiciones_version, condiciones_congeladas_at, condiciones_aceptadas_por
  ) values (
    v_user,
    v_cancha.id,
    v_titulo,
    v_tipo,
    0,
    coalesce(v_cancha.direccion, 'A confirmar'),
    v_cancha.barrio,
    v_cancha.place_id,
    coalesce(v_cancha.lat, 0),
    coalesce(v_cancha.lng, 0),
    v_disp.fecha,
    v_disp.hora_inicio,
    v_duracion,
    null,
    'pendiente_pago',
    v_cierre,
    'por_la_cancha',
    v_disp.id,
    v_precio,
    v_tarifa,
    p_regla_empate,
    v_cond,
    coalesce((v_cond->>'version')::int, 1),
    now(),
    v_user
  )
  returning id into v_desafio;

  insert into public.desafio_inscripciones (
    desafio_id, equipo_id, capitan_id, estado, expira_at,
    monto_cancha, monto_servicio, monto_total,
    condiciones, condiciones_version, condiciones_aceptadas_at, condiciones_aceptadas_por
  ) values (
    v_desafio, p_equipo_id, v_user, 'pendiente_pago', now() + interval '15 minutes',
    v_precio, v_tarifa, v_total,
    v_cond, coalesce((v_cond->>'version')::int, 1), now(), v_user
  )
  returning id into v_insc;

  insert into public.desafio_convocados (inscripcion_id, desafio_id, usuario_id)
  select v_insc, v_desafio, u from unnest(v_conv) as u;

  foreach v_uid in array v_conv loop
    if v_uid is distinct from v_user then
      perform public.emitir_notificacion(
        v_uid,
        'convocado_partido',
        'Te convocaron a un partido',
        'El capitán te convocó con ' || coalesce(v_eq_nombre, 'tu equipo') || ' a ' || v_titulo || '.',
        jsonb_build_object('desafio_id', v_desafio, 'equipo_id', p_equipo_id, 'destino', 'desafio')
      );
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'desafio_id', v_desafio,
    'inscripcion_id', v_insc,
    'monto_cancha', v_precio,
    'monto_servicio', v_tarifa,
    'monto_total', v_total,
    'expira_at', (now() + interval '15 minutes'),
    'condiciones', v_cond
  );
end;
$$;

-- Copia el snapshot del desafío a la inscripción del rival.
create or replace function public.plc_copiar_snapshot_inscripcion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_d public.desafios%rowtype;
begin
  if new.condiciones is not null then
    return new;
  end if;
  select * into v_d from public.desafios where id = new.desafio_id;
  if v_d.condiciones is not null then
    new.condiciones := v_d.condiciones;
    new.condiciones_version := coalesce(v_d.condiciones_version, (v_d.condiciones->>'version')::int);
    new.condiciones_aceptadas_at := coalesce(new.condiciones_aceptadas_at, now());
    new.condiciones_aceptadas_por := coalesce(new.condiciones_aceptadas_por, new.capitan_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_plc_copiar_snapshot_inscripcion on public.desafio_inscripciones;
create trigger trg_plc_copiar_snapshot_inscripcion
  before insert or update of condiciones on public.desafio_inscripciones
  for each row execute function public.plc_copiar_snapshot_inscripcion();

revoke all on function public.calcular_condiciones(uuid, text, timestamptz) from public;
revoke all on function public.condiciones_de_desafio(uuid) from public;
revoke all on function public.guardar_config_plataforma(text, numeric, boolean, text) from public;
revoke all on function public.guardar_politica_predio(uuid, uuid, jsonb) from public;
revoke all on function public.aceptar_condiciones_inscripcion(uuid) from public;
revoke all on function public.plc_politica_efectiva(uuid) from public;
revoke all on function public.guardar_politica_predio(uuid, uuid, jsonb) from public;

grant execute on function public.calcular_condiciones(uuid, text, timestamptz) to authenticated, anon;
grant execute on function public.condiciones_de_desafio(uuid) to authenticated;
grant execute on function public.guardar_config_plataforma(text, numeric, boolean, text) to authenticated;
grant execute on function public.guardar_politica_predio(uuid, uuid, jsonb) to authenticated;
grant execute on function public.aceptar_condiciones_inscripcion(uuid) to authenticated;
grant execute on function public.plc_politica_efectiva(uuid) to authenticated;
grant execute on function public.plc_tarifa_servicio_equipo(text) to authenticated;
grant execute on function public.plc_matriz_sena_default(numeric) to authenticated;
grant execute on function public.crear_partido(uuid, uuid, uuid[], text) to authenticated;
