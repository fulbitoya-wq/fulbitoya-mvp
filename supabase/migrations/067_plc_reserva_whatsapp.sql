-- Fase 2: reserva cargada por el predio + enlace único + OTP SMS (prueba hasta Twilio).
-- Tests: supabase/tests/plc_reserva_whatsapp.sql

insert into public.config_plataforma (clave, valor_bool)
values ('plc_sms_prueba', true)
on conflict (clave) do nothing;

alter table public.reservas
  add column if not exists canal text,
  add column if not exists titular_nombre text,
  add column if not exists titular_telefono text,
  add column if not exists claim_token text,
  add column if not exists claim_verificado_at timestamptz;

alter table public.reservas drop constraint if exists reservas_canal_chk;
alter table public.reservas
  add constraint reservas_canal_chk check (canal is null or canal in ('app', 'whatsapp'));

create unique index if not exists uq_reservas_claim_token
  on public.reservas (claim_token)
  where claim_token is not null;

create unique index if not exists uq_reservas_plc_turno_activa
  on public.reservas (disponibilidad_id)
  where origen = 'porlacancha' and estado_reserva = 'reservada';

create table if not exists public.plc_reserva_otp (
  id uuid primary key default gen_random_uuid(),
  reserva_id uuid not null references public.reservas(id) on delete cascade,
  telefono text not null,
  codigo_hash text not null,
  expira_at timestamptz not null,
  intentos int not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_plc_reserva_otp_reserva on public.plc_reserva_otp (reserva_id, created_at desc);

alter table public.plc_reserva_otp enable row level security;
revoke all on table public.plc_reserva_otp from public, anon, authenticated;

create or replace function public.plc_normalizar_tel(p text)
returns text
language plpgsql
immutable
as $$
declare
  d text;
begin
  d := regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g');
  if d = '' then
    return null;
  end if;
  if left(d, 2) = '00' then
    d := substr(d, 3);
  end if;
  if left(d, 2) = '54' then
    return d;
  end if;
  if left(d, 1) = '0' then
    d := substr(d, 2);
  end if;
  if length(d) = 10 then
    return '549' || d;
  end if;
  if length(d) = 11 and left(d, 1) = '9' then
    return '54' || d;
  end if;
  return '54' || d;
end;
$$;

create or replace function public.plc_enmascarar_tel(p text)
returns text
language sql
immutable
as $$
  select case
    when p is null or length(p) < 4 then '****'
    else '****' || right(p, 4)
  end;
$$;

create or replace function public.plc_otp_hash(p_codigo text, p_id uuid)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select encode(digest(convert_to(p_codigo || p_id::text, 'utf8'), 'sha256'), 'hex');
$$;

create or replace function public.plc_cargar_reserva_whatsapp(
  p_disponibilidad_id uuid,
  p_nombre text,
  p_telefono text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_d public.disponibilidades%rowtype;
  v_campo public.campos%rowtype;
  v_ca public.canchas%rowtype;
  v_tel text;
  v_nom text;
  v_token text;
  v_rid uuid;
  v_politica jsonb;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;

  v_nom := nullif(trim(coalesce(p_nombre, '')), '');
  if v_nom is null then
    return jsonb_build_object('ok', false, 'error', 'nombre_requerido');
  end if;

  v_tel := public.plc_normalizar_tel(p_telefono);
  if v_tel is null or length(v_tel) < 10 then
    return jsonb_build_object('ok', false, 'error', 'telefono_invalido');
  end if;

  perform public.plc_liberar_holds_vencidos();

  select * into v_d from public.disponibilidades where id = p_disponibilidad_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'turno_no_existe');
  end if;

  select * into v_campo from public.campos where id = v_d.campo_id;
  select * into v_ca from public.canchas where id = v_campo.cancha_id;
  if v_ca.id is null or not public.plc_es_dueno_cancha(v_ca.id) then
    return jsonb_build_object('ok', false, 'error', 'no_dueno_predio');
  end if;

  if v_d.estado is distinct from 'disponible' then
    return jsonb_build_object('ok', false, 'error', 'turno_no_disponible');
  end if;

  delete from public.plc_checkout_hold where disponibilidad_id = v_d.id;

  v_token := encode(gen_random_bytes(18), 'hex');
  v_politica := public.plc_politica_efectiva(v_campo.id);

  insert into public.reservas (
    disponibilidad_id, organizador_id, monto_total, estado_pago,
    origen, tipo_cobro, estado_reserva, condiciones,
    monto_sena, monto_cancha, monto_descuento,
    canal, titular_nombre, titular_telefono, claim_token
  ) values (
    v_d.id,
    null,
    v_d.precio,
    'pendiente',
    'porlacancha',
    null,
    'reservada',
    jsonb_build_object(
      'cancha_id', v_ca.id,
      'campo_id', v_campo.id,
      'cancha_nombre', v_ca.nombre,
      'campo_nombre', v_campo.nombre,
      'fecha', v_d.fecha,
      'hora_inicio', v_d.hora_inicio,
      'hora_fin', v_d.hora_fin,
      'precio_cancha', v_d.precio,
      'inicio', (v_d.fecha::text || ' ' || v_d.hora_inicio::text),
      'cancel_horas_total', coalesce((v_politica->>'reserva_devolucion_total_horas')::numeric, 24)
    ),
    0,
    v_d.precio,
    0,
    'whatsapp',
    v_nom,
    v_tel,
    v_token
  ) returning id into v_rid;

  update public.disponibilidades set estado = 'reservado' where id = v_d.id;

  return jsonb_build_object(
    'ok', true,
    'reserva_id', v_rid,
    'claim_token', v_token,
    'titular_nombre', v_nom,
    'titular_telefono', v_tel,
    'fecha', v_d.fecha,
    'hora_inicio', v_d.hora_inicio,
    'hora_fin', v_d.hora_fin,
    'cancha_nombre', v_ca.nombre,
    'campo_nombre', v_campo.nombre
  );
end;
$$;

create or replace function public.plc_agenda_reservas_dia(p_campo_id uuid, p_fecha date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_cancha uuid;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  select cancha_id into v_cancha from public.campos where id = p_campo_id;
  if v_cancha is null or not public.plc_es_dueno_cancha(v_cancha) then
    return jsonb_build_object('ok', false, 'error', 'no_dueno_predio');
  end if;
  return jsonb_build_object(
    'ok', true,
    'reservas', coalesce((
      select jsonb_agg(x)
      from (
        select jsonb_build_object(
          'disponibilidad_id', r.disponibilidad_id,
          'reserva_id', r.id,
          'titular_nombre', r.titular_nombre,
          'titular_telefono', r.titular_telefono,
          'claim_token', r.claim_token,
          'verificado', r.claim_verificado_at is not null,
          'canal', r.canal
        ) as x
        from public.reservas r
        join public.disponibilidades d on d.id = r.disponibilidad_id
        where d.campo_id = p_campo_id
          and d.fecha = p_fecha
          and r.origen = 'porlacancha'
          and r.estado_reserva = 'reservada'
      ) s
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.plc_ver_reclamo(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_r public.reservas%rowtype;
  v_d public.disponibilidades%rowtype;
begin
  if p_token is null or length(trim(p_token)) < 8 then
    return jsonb_build_object('ok', false, 'error', 'enlace_invalido');
  end if;
  select * into v_r from public.reservas where claim_token = trim(p_token);
  if not found or v_r.canal is distinct from 'whatsapp' then
    return jsonb_build_object('ok', false, 'error', 'enlace_invalido');
  end if;
  if v_r.estado_reserva is distinct from 'reservada' then
    return jsonb_build_object('ok', false, 'error', 'no_activa');
  end if;
  select * into v_d from public.disponibilidades where id = v_r.disponibilidad_id;
  return jsonb_build_object(
    'ok', true,
    'reserva_id', v_r.id,
    'titular_nombre', v_r.titular_nombre,
    'telefono_enmascarado', public.plc_enmascarar_tel(v_r.titular_telefono),
    'verificado', v_r.claim_verificado_at is not null,
    'cancha_nombre', v_r.condiciones->>'cancha_nombre',
    'campo_nombre', v_r.condiciones->>'campo_nombre',
    'fecha', v_d.fecha,
    'hora_inicio', v_d.hora_inicio,
    'hora_fin', v_d.hora_fin
  );
end;
$$;

create or replace function public.plc_emitir_otp_reclamo_usuario(p_token text, p_usuario_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_r public.reservas%rowtype;
  v_oid uuid;
  v_codigo text;
  v_prueba boolean;
  v_n int;
begin
  if p_usuario_id is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  select * into v_r from public.reservas where claim_token = trim(p_token) for update;
  if not found or v_r.canal is distinct from 'whatsapp' then
    return jsonb_build_object('ok', false, 'error', 'enlace_invalido');
  end if;
  if v_r.estado_reserva is distinct from 'reservada' then
    return jsonb_build_object('ok', false, 'error', 'no_activa');
  end if;
  if v_r.claim_verificado_at is not null then
    if v_r.organizador_id = p_usuario_id then
      return jsonb_build_object('ok', true, 'ya_reclamada', true);
    end if;
    return jsonb_build_object('ok', false, 'error', 'ya_reclamada');
  end if;

  select count(*) into v_n
  from public.plc_reserva_otp
  where reserva_id = v_r.id and created_at > now() - interval '1 hour';
  if v_n >= 5 then
    return jsonb_build_object('ok', false, 'error', 'demasiados_intentos');
  end if;

  if exists (
    select 1 from public.plc_reserva_otp
    where reserva_id = v_r.id and created_at > now() - interval '60 seconds'
  ) then
    return jsonb_build_object('ok', false, 'error', 'sms_espera');
  end if;

  v_codigo := lpad((floor(random() * 1000000))::int::text, 6, '0');
  insert into public.plc_reserva_otp (reserva_id, telefono, codigo_hash, expira_at)
  values (v_r.id, v_r.titular_telefono, 'pending', now() + interval '10 minutes')
  returning id into v_oid;

  update public.plc_reserva_otp
  set codigo_hash = public.plc_otp_hash(v_codigo, v_oid)
  where id = v_oid;

  v_prueba := public.config_bool('plc_sms_prueba');

  return jsonb_build_object(
    'ok', true,
    'telefono', v_r.titular_telefono,
    'telefono_enmascarado', public.plc_enmascarar_tel(v_r.titular_telefono),
    'prueba', v_prueba,
    'codigo', case when v_prueba then v_codigo else null end
  );
end;
$$;

create or replace function public.plc_emitir_otp_reclamo(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  if not public.config_bool('plc_sms_prueba') then
    return jsonb_build_object('ok', false, 'error', 'usar_sms_api');
  end if;
  return public.plc_emitir_otp_reclamo_usuario(p_token, auth.uid());
end;
$$;

create or replace function public.plc_verificar_otp_reclamo(p_token text, p_codigo text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_r public.reservas%rowtype;
  v_o public.plc_reserva_otp%rowtype;
  v_code text;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  v_code := regexp_replace(coalesce(p_codigo, ''), '[^0-9]', '', 'g');
  if length(v_code) <> 6 then
    return jsonb_build_object('ok', false, 'error', 'codigo_invalido');
  end if;

  select * into v_r from public.reservas where claim_token = trim(p_token) for update;
  if not found or v_r.canal is distinct from 'whatsapp' then
    return jsonb_build_object('ok', false, 'error', 'enlace_invalido');
  end if;
  if v_r.estado_reserva is distinct from 'reservada' then
    return jsonb_build_object('ok', false, 'error', 'no_activa');
  end if;
  if v_r.claim_verificado_at is not null then
    if v_r.organizador_id = v_user then
      return jsonb_build_object('ok', true, 'reserva_id', v_r.id, 'ya_reclamada', true);
    end if;
    return jsonb_build_object('ok', false, 'error', 'ya_reclamada');
  end if;

  select * into v_o
  from public.plc_reserva_otp
  where reserva_id = v_r.id and consumed_at is null
  order by created_at desc
  limit 1
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'codigo_invalido');
  end if;
  if v_o.expira_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'codigo_vencido');
  end if;
  if v_o.intentos >= 5 then
    return jsonb_build_object('ok', false, 'error', 'demasiados_intentos');
  end if;

  if v_o.codigo_hash is distinct from public.plc_otp_hash(v_code, v_o.id) then
    update public.plc_reserva_otp set intentos = intentos + 1 where id = v_o.id;
    return jsonb_build_object('ok', false, 'error', 'codigo_invalido');
  end if;

  update public.plc_reserva_otp set consumed_at = now() where id = v_o.id;
  update public.reservas
  set organizador_id = v_user, claim_verificado_at = now()
  where id = v_r.id;

  if not exists (
    select 1 from public.reserva_jugadores
    where reserva_id = v_r.id and jugador_id = v_user
  ) then
    insert into public.reserva_jugadores (reserva_id, jugador_id, monto, estado_pago)
    values (v_r.id, v_user, coalesce(v_r.monto_total, 0), coalesce(v_r.estado_pago, 'pendiente'));
  end if;

  update public.usuarios
  set telefono = v_r.titular_telefono
  where id = v_user and (telefono is null or trim(telefono) = '');

  return jsonb_build_object('ok', true, 'reserva_id', v_r.id);
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
          'canal', r.canal,
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

revoke all on function public.plc_cargar_reserva_whatsapp(uuid, text, text) from public;
revoke all on function public.plc_agenda_reservas_dia(uuid, date) from public;
revoke all on function public.plc_ver_reclamo(text) from public;
revoke all on function public.plc_emitir_otp_reclamo(text) from public;
revoke all on function public.plc_emitir_otp_reclamo_usuario(text, uuid) from public;
revoke all on function public.plc_verificar_otp_reclamo(text, text) from public;

grant execute on function public.plc_cargar_reserva_whatsapp(uuid, text, text) to authenticated;
grant execute on function public.plc_agenda_reservas_dia(uuid, date) to authenticated;
grant execute on function public.plc_ver_reclamo(text) to authenticated, anon;
grant execute on function public.plc_emitir_otp_reclamo(text) to authenticated;
grant execute on function public.plc_verificar_otp_reclamo(text, text) to authenticated;
grant execute on function public.plc_emitir_otp_reclamo_usuario(text, uuid) to service_role;
grant execute on function public.plc_normalizar_tel(text) to authenticated, anon, service_role;
grant execute on function public.plc_enmascarar_tel(text) to authenticated, anon, service_role;
