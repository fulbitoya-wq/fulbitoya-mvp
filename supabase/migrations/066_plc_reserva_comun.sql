-- Fase 1: reserva común PorLaCancha. Hold interno 10 min. No toca webhook MP de FulbitoYa.
-- Tests: supabase/tests/plc_reserva_comun.sql

insert into public.config_plataforma (clave, valor_num, valor_bool)
values
  ('comision_app_reserva_pct', 3, null),
  ('plc_hold_reserva_minutos', 10, null)
on conflict (clave) do nothing;

alter table public.politica_predio
  add column if not exists reserva_descuento_total_pct numeric not null default 5,
  add column if not exists reserva_descuento_total_activo boolean not null default true;

alter table public.politica_campo
  add column if not exists reserva_descuento_total_pct numeric,
  add column if not exists reserva_descuento_total_activo boolean;

alter table public.reservas
  add column if not exists origen text not null default 'fulbitoya',
  add column if not exists tipo_cobro text,
  add column if not exists estado_reserva text,
  add column if not exists condiciones jsonb,
  add column if not exists monto_sena numeric(12,2),
  add column if not exists monto_cancha numeric(12,2),
  add column if not exists monto_descuento numeric(12,2),
  add column if not exists acepto_reglas_at timestamptz;

alter table public.reservas drop constraint if exists reservas_origen_chk;
alter table public.reservas
  add constraint reservas_origen_chk check (origen in ('fulbitoya', 'porlacancha'));

alter table public.reservas drop constraint if exists reservas_tipo_cobro_chk;
alter table public.reservas
  add constraint reservas_tipo_cobro_chk check (tipo_cobro is null or tipo_cobro in ('sena', 'total'));

alter table public.reservas drop constraint if exists reservas_estado_reserva_chk;
alter table public.reservas
  add constraint reservas_estado_reserva_chk check (
    estado_reserva is null or estado_reserva in ('reservada', 'jugada', 'cancelada', 'cancelada_predio')
  );

create table if not exists public.plc_checkout_hold (
  id uuid primary key default gen_random_uuid(),
  disponibilidad_id uuid not null references public.disponibilidades(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  tipo_cobro text not null check (tipo_cobro in ('sena', 'total')),
  monto numeric(12,2) not null,
  condiciones jsonb not null,
  expira_at timestamptz not null,
  mp_preference_id text,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_plc_checkout_hold_turno on public.plc_checkout_hold (disponibilidad_id);

alter table public.plc_checkout_hold enable row level security;
revoke all on table public.plc_checkout_hold from public, anon, authenticated;

alter table public.movimientos
  add column if not exists reserva_id uuid references public.reservas(id) on delete set null;

alter table public.movimientos drop constraint if exists movimientos_tipo_chk;
alter table public.movimientos
  add constraint movimientos_tipo_chk check (tipo in (
    'reembolso_cancha',
    'reembolso_mitad',
    'reembolso_total',
    'tarifa_servicio_retenida',
    'deuda_predio',
    'comision_app_reserva',
    'reembolso_reserva'
  ));

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
    'reserva_descuento_total_pct', coalesce(v_c.reserva_descuento_total_pct, v_p.reserva_descuento_total_pct, 5),
    'reserva_descuento_total_activo', coalesce(v_c.reserva_descuento_total_activo, v_p.reserva_descuento_total_activo, true),
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

create or replace function public.plc_guardar_extras_reserva(
  p_cancha_id uuid,
  p_campo_id uuid,
  p_descuento_pct numeric,
  p_descuento_activo boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pct numeric;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  if not public.plc_es_dueno_cancha(p_cancha_id) then
    return jsonb_build_object('ok', false, 'error', 'no_dueno_predio');
  end if;
  v_pct := coalesce(p_descuento_pct, 5);
  if v_pct < 0 or v_pct > 50 then
    return jsonb_build_object('ok', false, 'error', 'politica_invalida');
  end if;
  perform public.plc_asegurar_politica_predio(p_cancha_id);
  if p_campo_id is null then
    update public.politica_predio
    set reserva_descuento_total_pct = v_pct,
        reserva_descuento_total_activo = coalesce(p_descuento_activo, true),
        updated_at = now()
    where cancha_id = p_cancha_id;
  else
    if not exists (select 1 from public.campos where id = p_campo_id and cancha_id = p_cancha_id) then
      return jsonb_build_object('ok', false, 'error', 'campo_no_existe');
    end if;
    insert into public.politica_campo (campo_id, cancha_id)
    values (p_campo_id, p_cancha_id)
    on conflict (campo_id) do nothing;
    update public.politica_campo
    set reserva_descuento_total_pct = v_pct,
        reserva_descuento_total_activo = coalesce(p_descuento_activo, true),
        updated_at = now()
    where campo_id = p_campo_id;
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.plc_es_mayor_18(p_user uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_fn date;
begin
  select fecha_nacimiento into v_fn from public.jugador_perfiles where usuario_id = p_user;
  if v_fn is null then
    return false;
  end if;
  return (v_fn + interval '18 years') <= (public.ahora_argentina())::date;
end;
$$;

create or replace function public.plc_liberar_holds_vencidos()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n int := 0;
  r record;
begin
  for r in
    select h.id, h.disponibilidad_id
    from public.plc_checkout_hold h
    where h.expira_at <= now()
  loop
    delete from public.plc_checkout_hold where id = r.id;
    update public.disponibilidades
    set estado = 'disponible'
    where id = r.disponibilidad_id
      and estado = 'reservado_pendiente'
      and not exists (
        select 1 from public.reservas x
        where x.disponibilidad_id = r.disponibilidad_id
          and x.estado_pago = 'pagado'
          and coalesce(x.estado_reserva, 'reservada') in ('reservada', 'jugada')
      );
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

create or replace function public.plc_cotizar_reserva(p_disponibilidad_id uuid, p_tipo_cobro text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_disp public.disponibilidades%rowtype;
  v_campo public.campos%rowtype;
  v_cancha public.canchas%rowtype;
  v_pol jsonb;
  v_precio numeric;
  v_sena numeric;
  v_pct numeric;
  v_activo boolean;
  v_desc numeric := 0;
  v_pagar numeric;
  v_horas numeric;
  v_tipo text;
  v_inicio timestamp;
begin
  v_tipo := lower(btrim(coalesce(p_tipo_cobro, 'sena')));
  if v_tipo not in ('sena', 'total') then
    return jsonb_build_object('ok', false, 'error', 'tipo_cobro_invalido');
  end if;

  select * into v_disp from public.disponibilidades where id = p_disponibilidad_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'turno_no_existe');
  end if;
  select * into v_campo from public.campos where id = v_disp.campo_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'campo_no_existe');
  end if;
  select * into v_cancha from public.canchas where id = v_campo.cancha_id;

  v_pol := public.plc_politica_efectiva(v_campo.id);
  if coalesce(v_pol->>'ok', 'false') <> 'true' then
    return v_pol;
  end if;

  v_precio := public.plc_centena(coalesce(v_disp.precio, v_campo.valor_hora, 0));
  v_sena := public.plc_centena(coalesce(v_campo.valor_reserva, v_cancha.valor_reserva, 0));
  if v_precio <= 0 then
    return jsonb_build_object('ok', false, 'error', 'precio_cancha_invalido');
  end if;
  if v_tipo = 'sena' and v_sena <= 0 then
    return jsonb_build_object('ok', false, 'error', 'senia_no_configurada');
  end if;

  v_pct := coalesce((v_pol->>'reserva_descuento_total_pct')::numeric, 5);
  v_activo := coalesce((v_pol->>'reserva_descuento_total_activo')::boolean, true);
  if v_tipo = 'total' and v_activo and v_pct > 0 then
    v_desc := public.plc_centena(v_precio * v_pct / 100.0);
    v_pagar := greatest(v_precio - v_desc, 0);
  elsif v_tipo = 'total' then
    v_pagar := v_precio;
  else
    v_pagar := v_sena;
  end if;

  v_inicio := public.inicio_turno(v_disp.fecha, v_disp.hora_inicio);
  v_horas := coalesce((v_pol->>'reserva_devolucion_total_horas')::numeric, 24);

  return jsonb_build_object(
    'ok', true,
    'tipo_cobro', v_tipo,
    'precio_cancha', v_precio,
    'sena', v_sena,
    'descuento', v_desc,
    'descuento_pct', case when v_tipo = 'total' and v_activo then v_pct else 0 end,
    'monto_pagar', v_pagar,
    'cancel_horas_total', v_horas,
    'comision_pct', coalesce(public.config_num('comision_app_reserva_pct'), 3),
    'cancha_id', v_campo.cancha_id,
    'campo_id', v_campo.id,
    'cancha_nombre', v_cancha.nombre,
    'campo_nombre', v_campo.nombre,
    'formato', v_campo.tipo,
    'fecha', v_disp.fecha,
    'hora_inicio', v_disp.hora_inicio,
    'barrio', v_cancha.barrio,
    'inicio', v_inicio,
    'texto_reglas',
      'Si cancelás con más de ' || trim(to_char(v_horas, 'FM999')) ||
      ' h de anticipación te devolvemos todo. Dentro de esas horas, o si no te presentás, se retiene como máximo la seña (' ||
      trim(to_char(v_sena, 'FM999G999G999')) ||
      '). Si pagaste el total, te devolvemos lo que supere la seña. El descuento es por pagar el total por adelantado.'
  );
end;
$$;

create or replace function public.plc_iniciar_checkout_reserva(
  p_disponibilidad_id uuid,
  p_tipo_cobro text,
  p_acepta_reglas boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_disp public.disponibilidades%rowtype;
  v_cot jsonb;
  v_hold uuid;
  v_mins int;
  v_exp timestamptz;
  v_hold_row public.plc_checkout_hold%rowtype;
begin
  perform public.plc_liberar_holds_vencidos();
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  if coalesce(p_acepta_reglas, false) is not true then
    return jsonb_build_object('ok', false, 'error', 'reglas_no_aceptadas');
  end if;
  if not exists (select 1 from public.jugador_perfiles jp where jp.usuario_id = v_user and jp.fecha_nacimiento is not null) then
    return jsonb_build_object('ok', false, 'error', 'falta_nacimiento');
  end if;
  if not public.plc_es_mayor_18(v_user) then
    return jsonb_build_object('ok', false, 'error', 'menor_18');
  end if;

  v_cot := public.plc_cotizar_reserva(p_disponibilidad_id, p_tipo_cobro);
  if coalesce(v_cot->>'ok', 'false') <> 'true' then
    return v_cot;
  end if;

  select * into v_disp from public.disponibilidades where id = p_disponibilidad_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'turno_no_existe');
  end if;

  select * into v_hold_row from public.plc_checkout_hold where disponibilidad_id = p_disponibilidad_id;
  if v_disp.estado = 'disponible' then
    null;
  elsif v_disp.estado = 'reservado_pendiente' and v_hold_row.usuario_id is not distinct from v_user then
    null;
  else
    return jsonb_build_object('ok', false, 'error', 'turno_no_disponible');
  end if;

  v_mins := coalesce(public.config_num('plc_hold_reserva_minutos'), 10)::int;
  v_exp := now() + make_interval(mins => v_mins);

  delete from public.plc_checkout_hold where disponibilidad_id = p_disponibilidad_id;
  insert into public.plc_checkout_hold (
    disponibilidad_id, usuario_id, tipo_cobro, monto, condiciones, expira_at
  ) values (
    p_disponibilidad_id,
    v_user,
    v_cot->>'tipo_cobro',
    (v_cot->>'monto_pagar')::numeric,
    v_cot || jsonb_build_object('acepto_reglas', true, 'acepto_at', now()),
    v_exp
  ) returning id into v_hold;

  update public.disponibilidades
  set estado = 'reservado_pendiente'
  where id = p_disponibilidad_id;

  return jsonb_build_object(
    'ok', true,
    'hold_id', v_hold,
    'expira_at', v_exp,
    'checkout_prueba', public.config_bool('plc_checkout_prueba'),
    'cotizacion', v_cot
  );
end;
$$;

create or replace function public.plc_confirmar_pago_reserva(
  p_hold_id uuid,
  p_mp_payment_id text,
  p_monto numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_h public.plc_checkout_hold%rowtype;
  v_rid uuid;
  v_com numeric;
  v_predio uuid;
begin
  perform public.plc_liberar_holds_vencidos();
  if p_mp_payment_id is not null and exists (
    select 1 from public.reservas where mercadopago_payment_id = p_mp_payment_id
  ) then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;

  select * into v_h from public.plc_checkout_hold where id = p_hold_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'reserva_vencida');
  end if;
  if v_h.expira_at <= now() then
    perform public.plc_liberar_holds_vencidos();
    return jsonb_build_object('ok', false, 'error', 'reserva_vencida');
  end if;
  if p_monto is not null and abs(p_monto - v_h.monto) > 1 then
    return jsonb_build_object('ok', false, 'error', 'monto_invalido');
  end if;

  v_predio := (v_h.condiciones->>'cancha_id')::uuid;

  insert into public.reservas (
    disponibilidad_id, organizador_id, monto_total, estado_pago,
    mercadopago_payment_id, origen, tipo_cobro, estado_reserva, condiciones,
    monto_sena, monto_cancha, monto_descuento, acepto_reglas_at
  ) values (
    v_h.disponibilidad_id,
    v_h.usuario_id,
    v_h.monto,
    'pagado',
    p_mp_payment_id,
    'porlacancha',
    v_h.tipo_cobro,
    'reservada',
    v_h.condiciones,
    (v_h.condiciones->>'sena')::numeric,
    (v_h.condiciones->>'precio_cancha')::numeric,
    coalesce((v_h.condiciones->>'descuento')::numeric, 0),
    now()
  ) returning id into v_rid;

  insert into public.reserva_jugadores (reserva_id, jugador_id, monto, estado_pago)
  values (v_rid, v_h.usuario_id, v_h.monto, 'pagado');

  update public.disponibilidades
  set estado = 'reservado'
  where id = v_h.disponibilidad_id;

  v_com := public.plc_centena(v_h.monto * coalesce((v_h.condiciones->>'comision_pct')::numeric, 3) / 100.0);
  if v_com > 0 then
    insert into public.movimientos (reserva_id, usuario_id, predio_id, tipo, monto, estado, detalle)
    values (
      v_rid, null, v_predio, 'comision_app_reserva', v_com, 'pendiente',
      'Comisión de la app sobre la reserva. Cobro manual al predio.'
    );
  end if;

  delete from public.plc_checkout_hold where id = v_h.id;
  return jsonb_build_object('ok', true, 'reserva_id', v_rid);
end;
$$;

create or replace function public.plc_confirmar_pago_reserva_prueba(p_hold_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_h public.plc_checkout_hold%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  if not public.config_bool('plc_checkout_prueba') then
    return jsonb_build_object('ok', false, 'error', 'checkout_prueba_off');
  end if;
  select * into v_h from public.plc_checkout_hold where id = p_hold_id;
  if not found or v_h.usuario_id is distinct from auth.uid() then
    return jsonb_build_object('ok', false, 'error', 'no_existe');
  end if;
  return public.plc_confirmar_pago_reserva(p_hold_id, 'prueba-res-' || p_hold_id::text, v_h.monto);
end;
$$;

create or replace function public.plc_guardar_preference_hold(p_hold_id uuid, p_preference_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  update public.plc_checkout_hold
  set mp_preference_id = p_preference_id
  where id = p_hold_id and usuario_id = auth.uid();
  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_existe');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.plc_reembolsar_reserva(p_reserva_id uuid, p_monto numeric, p_detalle text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_monto is null or p_monto <= 0 then
    return;
  end if;
  insert into public.movimientos (reserva_id, usuario_id, predio_id, tipo, monto, estado, detalle)
  select p_reserva_id, r.organizador_id, (r.condiciones->>'cancha_id')::uuid, 'reembolso_reserva', p_monto, 'pendiente', p_detalle
  from public.reservas r where r.id = p_reserva_id;
end;
$$;

create or replace function public.plc_cancelar_reserva(p_reserva_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_r public.reservas%rowtype;
  v_inicio timestamp;
  v_horas numeric;
  v_sena numeric;
  v_reemb numeric;
  v_now timestamp := public.ahora_argentina();
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  select * into v_r from public.reservas where id = p_reserva_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_existe');
  end if;
  if v_r.organizador_id is distinct from v_user then
    return jsonb_build_object('ok', false, 'error', 'no_capitan');
  end if;
  if v_r.origen is distinct from 'porlacancha' or v_r.estado_reserva is distinct from 'reservada' then
    return jsonb_build_object('ok', false, 'error', 'no_activa');
  end if;

  v_inicio := coalesce((v_r.condiciones->>'inicio')::timestamp, public.ahora_argentina());
  v_horas := coalesce((v_r.condiciones->>'cancel_horas_total')::numeric, 24);
  v_sena := coalesce(v_r.monto_sena, (v_r.condiciones->>'sena')::numeric, 0);

  if v_inicio - v_now > make_interval(hours => trunc(v_horas)::int) then
    v_reemb := coalesce(v_r.monto_total, 0);
  else
    v_reemb := greatest(coalesce(v_r.monto_total, 0) - v_sena, 0);
  end if;

  update public.reservas
  set estado_reserva = 'cancelada', estado_pago = 'cancelado'
  where id = v_r.id;

  update public.disponibilidades set estado = 'disponible' where id = v_r.disponibilidad_id;
  perform public.plc_reembolsar_reserva(v_r.id, v_reemb, 'Cancelación de reserva');
  return jsonb_build_object('ok', true, 'reembolso', v_reemb);
end;
$$;

create or replace function public.plc_predio_cancela_reserva(p_reserva_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_r public.reservas%rowtype;
  v_cancha uuid;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  select * into v_r from public.reservas where id = p_reserva_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_existe');
  end if;
  v_cancha := (v_r.condiciones->>'cancha_id')::uuid;
  if v_cancha is null or not public.plc_es_dueno_cancha(v_cancha) then
    return jsonb_build_object('ok', false, 'error', 'no_dueno_predio');
  end if;
  if v_r.estado_reserva is distinct from 'reservada' then
    return jsonb_build_object('ok', false, 'error', 'no_activa');
  end if;

  update public.reservas
  set estado_reserva = 'cancelada_predio', estado_pago = 'cancelado'
  where id = v_r.id;
  update public.disponibilidades set estado = 'disponible' where id = v_r.disponibilidad_id;
  perform public.plc_reembolsar_reserva(v_r.id, coalesce(v_r.monto_total, 0), 'El predio canceló el turno');
  return jsonb_build_object('ok', true, 'reembolso', coalesce(v_r.monto_total, 0));
end;
$$;

create or replace function public.listar_predios_publicos()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_hoy date := public.ahora_argentina()::date;
begin
  perform public.plc_liberar_holds_vencidos();
  return jsonb_build_object(
    'ok', true,
    'predios', coalesce((
      select jsonb_agg(s.p order by s.p->>'nombre')
      from (
        select jsonb_build_object(
          'id', ca.id,
          'nombre', ca.nombre,
          'barrio', ca.barrio,
          'direccion', ca.direccion,
          'lat', ca.lat,
          'lng', ca.lng
        ) as p
        from public.canchas ca
        where coalesce(ca.activa, true)
          and exists (
            select 1
            from public.campos c
            join public.disponibilidades d on d.campo_id = c.id
            where c.cancha_id = ca.id
              and d.estado = 'disponible'
              and d.fecha >= v_hoy
          )
      ) s
    ), '[]'::jsonb)
  );
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
  perform public.plc_liberar_holds_vencidos();
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

create or replace function public.listar_mis_reservas_plc()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  return jsonb_build_object(
    'ok', true,
    'reservas', coalesce((
      select jsonb_agg(s.x order by s.x->>'fecha', s.x->>'hora_inicio')
      from (
        select jsonb_build_object(
          'id', r.id,
          'estado', r.estado_reserva,
          'tipo_cobro', r.tipo_cobro,
          'monto_total', r.monto_total,
          'monto_sena', r.monto_sena,
          'fecha', d.fecha,
          'hora_inicio', d.hora_inicio,
          'cancha_nombre', ca.nombre,
          'campo_nombre', c.nombre,
          'barrio', ca.barrio,
          'condiciones', r.condiciones
        ) as x
        from public.reservas r
        join public.disponibilidades d on d.id = r.disponibilidad_id
        join public.campos c on c.id = d.campo_id
        join public.canchas ca on ca.id = c.cancha_id
        where r.organizador_id = auth.uid()
          and r.origen = 'porlacancha'
      ) s
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.plc_marcar_reservas_jugadas()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n int;
begin
  update public.reservas r
  set estado_reserva = 'jugada'
  from public.disponibilidades d
  where d.id = r.disponibilidad_id
    and r.origen = 'porlacancha'
    and r.estado_reserva = 'reservada'
    and public.inicio_turno(d.fecha, d.hora_inicio) <= public.ahora_argentina();
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

create or replace function public.correr_tarea_periodica_plc()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_holds int;
  v_jug int;
  v_base jsonb;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  if not public.es_admin_plataforma() then
    return jsonb_build_object('ok', false, 'error', 'no_admin');
  end if;
  v_holds := public.plc_liberar_holds_vencidos();
  v_jug := public.plc_marcar_reservas_jugadas();
  v_base := public.plc_tarea_periodica_partidos();
  return coalesce(v_base, '{}'::jsonb) || jsonb_build_object('holds_liberados', v_holds, 'reservas_jugadas', v_jug);
end;
$$;

revoke all on function public.plc_guardar_extras_reserva(uuid, uuid, numeric, boolean) from public;
revoke all on function public.plc_cotizar_reserva(uuid, text) from public;
revoke all on function public.plc_iniciar_checkout_reserva(uuid, text, boolean) from public;
revoke all on function public.plc_confirmar_pago_reserva(uuid, text, numeric) from public;
revoke all on function public.plc_confirmar_pago_reserva_prueba(uuid) from public;
revoke all on function public.plc_guardar_preference_hold(uuid, text) from public;
revoke all on function public.plc_cancelar_reserva(uuid) from public;
revoke all on function public.plc_predio_cancela_reserva(uuid) from public;
revoke all on function public.listar_predios_publicos() from public;
revoke all on function public.listar_mis_reservas_plc() from public;

grant execute on function public.plc_guardar_extras_reserva(uuid, uuid, numeric, boolean) to authenticated;
grant execute on function public.plc_cotizar_reserva(uuid, text) to authenticated, anon;
grant execute on function public.plc_iniciar_checkout_reserva(uuid, text, boolean) to authenticated;
grant execute on function public.plc_confirmar_pago_reserva_prueba(uuid) to authenticated;
grant execute on function public.plc_guardar_preference_hold(uuid, text) to authenticated;
grant execute on function public.plc_cancelar_reserva(uuid) to authenticated;
grant execute on function public.plc_predio_cancela_reserva(uuid) to authenticated;
grant execute on function public.listar_predios_publicos() to authenticated, anon;
grant execute on function public.listar_mis_reservas_plc() to authenticated;
grant execute on function public.plc_confirmar_pago_reserva(uuid, text, numeric) to service_role;
grant execute on function public.plc_liberar_holds_vencidos() to service_role;
grant execute on function public.correr_tarea_periodica_plc() to authenticated;
