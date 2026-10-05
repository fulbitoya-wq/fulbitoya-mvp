-- Fase 2 final: enlace de pago (no bloquea), reserva manual, slug público. Sin SMS.
-- Tests: supabase/tests/plc_enlace_pago.sql

alter table public.canchas add column if not exists slug text;

create unique index if not exists uq_canchas_slug
  on public.canchas (slug)
  where slug is not null;

alter table public.reservas drop constraint if exists reservas_canal_chk;
alter table public.reservas
  add constraint reservas_canal_chk check (canal is null or canal in ('app', 'whatsapp', 'manual'));

alter table public.reservas
  add column if not exists cobro_externo text,
  add column if not exists busca_gente boolean not null default false,
  add column if not exists enlace_pago_id uuid;

alter table public.reservas drop constraint if exists reservas_cobro_externo_chk;
alter table public.reservas
  add constraint reservas_cobro_externo_chk check (
    cobro_externo is null or cobro_externo in ('sena_fuera', 'a_cobrar_predio')
  );

create table if not exists public.plc_enlace_pago (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  disponibilidad_id uuid not null references public.disponibilidades(id) on delete cascade,
  cancha_id uuid not null references public.canchas(id) on delete cascade,
  created_by uuid not null references public.usuarios(id),
  titular_nombre text not null,
  titular_telefono text,
  monto_sena numeric(12,2) not null,
  mensaje_whatsapp text not null,
  reserva_id uuid references public.reservas(id) on delete set null,
  aviso_ocupado_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_plc_enlace_pago_disp on public.plc_enlace_pago (disponibilidad_id, created_at desc);

alter table public.plc_enlace_pago enable row level security;
revoke all on table public.plc_enlace_pago from public, anon, authenticated;

create table if not exists public.reserva_lista (
  id uuid primary key default gen_random_uuid(),
  reserva_id uuid not null references public.reservas(id) on delete cascade,
  usuario_id uuid references public.usuarios(id) on delete set null,
  nombre text not null,
  created_at timestamptz not null default now()
);

alter table public.reserva_lista enable row level security;
drop policy if exists "Lista de la reserva" on public.reserva_lista;
create policy "Lista de la reserva" on public.reserva_lista for select to authenticated
  using (
    exists (
      select 1 from public.reservas r
      where r.id = reserva_lista.reserva_id and r.organizador_id = auth.uid()
    )
  );

revoke insert, update, delete on table public.reserva_lista from public, anon, authenticated;
grant select on table public.reserva_lista to authenticated;

alter table public.notificaciones drop constraint if exists notificaciones_tipo_chk;
alter table public.notificaciones
  add constraint notificaciones_tipo_chk check (tipo in (
    'invitacion_equipo',
    'solicitud_equipo',
    'respuesta_solicitud',
    'respuesta_invitacion',
    'capitan_transferido',
    'expulsado_equipo',
    'convocado_partido',
    'baja_convocatoria',
    'inscripcion_desafio',
    'inscripcion_cancelada',
    'pago_confirmado',
    'rival_sumado',
    'partido_sin_rival_cancelado',
    'rival_confirmo_resultado',
    'resultado_en_disputa',
    'reembolso_procesado',
    'aviso_26h_sin_rival',
    'decision_24h_sin_rival',
    'decision_cierre_sin_rival',
    'turno_liberado_cargo',
    'cancha_conservada',
    'reserva_nueva_predio',
    'turno_enlace_ocupado'
  ));

alter table public.preferencias_notificacion drop constraint if exists preferencias_notificacion_tipo_chk;
alter table public.preferencias_notificacion
  add constraint preferencias_notificacion_tipo_chk check (tipo in (
    'invitacion_equipo',
    'solicitud_equipo',
    'respuesta_solicitud',
    'respuesta_invitacion',
    'capitan_transferido',
    'expulsado_equipo',
    'convocado_partido',
    'baja_convocatoria',
    'inscripcion_desafio',
    'inscripcion_cancelada',
    'pago_confirmado',
    'rival_sumado',
    'partido_sin_rival_cancelado',
    'rival_confirmo_resultado',
    'resultado_en_disputa',
    'reembolso_procesado',
    'aviso_26h_sin_rival',
    'decision_24h_sin_rival',
    'decision_cierre_sin_rival',
    'turno_liberado_cargo',
    'cancha_conservada',
    'reserva_nueva_predio',
    'turno_enlace_ocupado'
  ));

create or replace function public.plc_slugify(p text)
returns text
language plpgsql
immutable
as $$
declare
  s text;
begin
  s := lower(trim(coalesce(p, '')));
  s := regexp_replace(s, '[áàäâ]', 'a', 'gi');
  s := regexp_replace(s, '[éèëê]', 'e', 'gi');
  s := regexp_replace(s, '[íìïî]', 'i', 'gi');
  s := regexp_replace(s, '[óòöô]', 'o', 'gi');
  s := regexp_replace(s, '[úùüû]', 'u', 'gi');
  s := regexp_replace(s, 'ñ', 'n', 'gi');
  s := regexp_replace(s, '[^a-z0-9]+', '-', 'g');
  s := trim(both '-' from s);
  if s is null or s = '' then
    return 'predio';
  end if;
  return left(s, 48);
end;
$$;

create or replace function public.plc_asegurar_slug(p_cancha_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ca public.canchas%rowtype;
  v_base text;
  v_slug text;
  v_n int := 0;
begin
  select * into v_ca from public.canchas where id = p_cancha_id;
  if not found then
    return null;
  end if;
  if v_ca.slug is not null and length(v_ca.slug) > 0 then
    return v_ca.slug;
  end if;
  v_base := public.plc_slugify(v_ca.nombre);
  v_slug := v_base;
  while exists (select 1 from public.canchas where slug = v_slug and id is distinct from p_cancha_id) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n::text;
  end loop;
  update public.canchas set slug = v_slug where id = p_cancha_id;
  return v_slug;
end;
$$;

create or replace function public.plc_formato_dia(p date, p_hora time)
returns text
language sql
stable
as $$
  select to_char(p, 'DD/MM') || ' a las ' || to_char(p_hora, 'HH24:MI');
$$;

create or replace function public.plc_mensaje_pago_default(
  p_nombre text,
  p_fecha date,
  p_hora time,
  p_predio text,
  p_sena numeric,
  p_link text
)
returns text
language plpgsql
immutable
as $$
begin
  return 'Hola ' || coalesce(nullif(trim(p_nombre), ''), '') ||
    ', te dejo el ' || to_char(p_fecha, 'DD/MM') ||
    ' a las ' || to_char(p_hora, 'HH24:MI') ||
    ' en ' || coalesce(p_predio, 'el predio') ||
    '. Pagá la seña de $' || trim(to_char(coalesce(p_sena, 0), 'FM999G999G999')) ||
    ' acá para confirmar: ' || coalesce(p_link, '') ||
    '. Desde la app podés ver tu partido, compartirlo con tus amigos, sumar jugadores o abrir el partido si te falta gente.';
end;
$$;

create or replace function public.plc_alternativas_turno(p_disponibilidad_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_d public.disponibilidades%rowtype;
begin
  select * into v_d from public.disponibilidades where id = p_disponibilidad_id;
  if not found then
    return '[]'::jsonb;
  end if;
  return coalesce((
    select jsonb_agg(x order by x->>'fecha', x->>'hora_inicio')
    from (
      select jsonb_build_object(
        'id', d.id,
        'fecha', d.fecha,
        'hora_inicio', d.hora_inicio,
        'hora_fin', d.hora_fin,
        'precio', d.precio
      ) as x
      from public.disponibilidades d
      where d.campo_id = v_d.campo_id
        and d.id is distinct from v_d.id
        and d.estado = 'disponible'
        and public.inicio_turno(d.fecha, d.hora_inicio) > public.ahora_argentina()
      order by d.fecha, d.hora_inicio
      limit 6
    ) s
  ), '[]'::jsonb);
end;
$$;

create or replace function public.plc_aviso_usuario(
  p_usuario uuid,
  p_tipo text,
  p_titulo text,
  p_cuerpo text,
  p_datos jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_usuario is null then
    return;
  end if;
  insert into public.notificaciones (usuario_id, tipo, titulo, cuerpo, datos)
  values (p_usuario, p_tipo, p_titulo, p_cuerpo, coalesce(p_datos, '{}'::jsonb));
end;
$$;

create or replace function public.plc_crear_enlace_pago(
  p_disponibilidad_id uuid,
  p_nombre text,
  p_telefono text,
  p_monto_sena numeric,
  p_mensaje text
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
  v_nom text;
  v_tel text;
  v_sena numeric;
  v_token text;
  v_msg text;
  v_eid uuid;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  v_nom := nullif(trim(coalesce(p_nombre, '')), '');
  if v_nom is null then
    return jsonb_build_object('ok', false, 'error', 'nombre_requerido');
  end if;
  v_tel := public.plc_normalizar_tel(p_telefono);

  perform public.plc_liberar_holds_vencidos();
  select * into v_d from public.disponibilidades where id = p_disponibilidad_id;
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
  if public.inicio_turno(v_d.fecha, v_d.hora_inicio) <= public.ahora_argentina() then
    return jsonb_build_object('ok', false, 'error', 'turno_pasado');
  end if;

  v_sena := public.plc_centena(coalesce(p_monto_sena, v_campo.valor_reserva, v_ca.valor_reserva, 0));
  if v_sena <= 0 then
    return jsonb_build_object('ok', false, 'error', 'senia_no_configurada');
  end if;
  if v_sena > coalesce(v_d.precio, v_campo.valor_hora, v_sena) then
    return jsonb_build_object('ok', false, 'error', 'sena_supera_maximo');
  end if;

  v_token := encode(gen_random_bytes(18), 'hex');
  v_msg := nullif(trim(coalesce(p_mensaje, '')), '');
  if v_msg is null then
    v_msg := public.plc_mensaje_pago_default(
      v_nom, v_d.fecha, v_d.hora_inicio, v_ca.nombre, v_sena, 'https://porlacancha.com/r/' || v_token
    );
  else
    v_msg := replace(v_msg, '[enlace]', 'https://porlacancha.com/r/' || v_token);
  end if;

  insert into public.plc_enlace_pago (
    token, disponibilidad_id, cancha_id, created_by,
    titular_nombre, titular_telefono, monto_sena, mensaje_whatsapp
  ) values (
    v_token, v_d.id, v_ca.id, auth.uid(),
    v_nom, v_tel, v_sena, v_msg
  ) returning id into v_eid;

  perform public.plc_asegurar_slug(v_ca.id);

  return jsonb_build_object(
    'ok', true,
    'enlace_id', v_eid,
    'token', v_token,
    'titular_nombre', v_nom,
    'titular_telefono', v_tel,
    'monto_sena', v_sena,
    'mensaje', v_msg,
    'fecha', v_d.fecha,
    'hora_inicio', v_d.hora_inicio,
    'cancha_nombre', v_ca.nombre,
    'campo_nombre', v_campo.nombre,
    'slug', (select slug from public.canchas where id = v_ca.id)
  );
end;
$$;

create or replace function public.plc_cargar_reserva_manual(
  p_disponibilidad_id uuid,
  p_nombre text,
  p_telefono text,
  p_cobro_externo text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_d public.disponibilidades%rowtype;
  v_campo public.campos%rowtype;
  v_ca public.canchas%rowtype;
  v_modo text;
  v_nom text;
  v_tel text;
  v_rid uuid;
  v_pago text;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  v_modo := lower(btrim(coalesce(p_cobro_externo, '')));
  if v_modo not in ('sena_fuera', 'a_cobrar_predio') then
    return jsonb_build_object('ok', false, 'error', 'cobro_externo_invalido');
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
  v_nom := nullif(trim(coalesce(p_nombre, '')), '');
  v_tel := public.plc_normalizar_tel(p_telefono);
  v_pago := case when v_modo = 'sena_fuera' then 'pagado' else 'pendiente' end;

  insert into public.reservas (
    disponibilidad_id, organizador_id, monto_total, estado_pago,
    origen, tipo_cobro, estado_reserva, condiciones,
    monto_sena, monto_cancha, monto_descuento,
    canal, cobro_externo, titular_nombre, titular_telefono
  ) values (
    v_d.id,
    null,
    v_d.precio,
    v_pago,
    'porlacancha',
    'sena',
    'reservada',
    jsonb_build_object(
      'cancha_id', v_ca.id,
      'campo_id', v_campo.id,
      'cancha_nombre', v_ca.nombre,
      'campo_nombre', v_campo.nombre,
      'fecha', v_d.fecha,
      'hora_inicio', v_d.hora_inicio,
      'precio_cancha', v_d.precio
    ),
    coalesce(v_campo.valor_reserva, v_ca.valor_reserva, 0),
    v_d.precio,
    0,
    'manual',
    v_modo,
    v_nom,
    v_tel
  ) returning id into v_rid;

  update public.disponibilidades set estado = 'reservado' where id = v_d.id;
  return jsonb_build_object('ok', true, 'reserva_id', v_rid);
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
          'canal', r.canal,
          'cobro_externo', r.cobro_externo,
          'estado_pago', r.estado_pago
        ) as x
        from public.reservas r
        join public.disponibilidades d on d.id = r.disponibilidad_id
        where d.campo_id = p_campo_id
          and d.fecha = p_fecha
          and r.origen = 'porlacancha'
          and r.estado_reserva = 'reservada'
      ) s
    ), '[]'::jsonb),
    'enlaces', coalesce((
      select jsonb_agg(x)
      from (
        select jsonb_build_object(
          'disponibilidad_id', e.disponibilidad_id,
          'token', e.token,
          'titular_nombre', e.titular_nombre,
          'titular_telefono', e.titular_telefono,
          'monto_sena', e.monto_sena,
          'mensaje', e.mensaje_whatsapp,
          'pagado', e.reserva_id is not null
        ) as x
        from public.plc_enlace_pago e
        join public.disponibilidades d on d.id = e.disponibilidad_id
        where d.campo_id = p_campo_id
          and d.fecha = p_fecha
          and e.reserva_id is null
      ) s
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.plc_cotizar_enlace(p_token text, p_tipo_cobro text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_e public.plc_enlace_pago%rowtype;
  v_tot jsonb;
  v_tipo text;
  v_sena numeric;
begin
  select * into v_e from public.plc_enlace_pago where token = trim(p_token);
  if not found then
    return jsonb_build_object('ok', false, 'error', 'enlace_invalido');
  end if;
  v_tipo := lower(btrim(coalesce(p_tipo_cobro, 'sena')));
  if v_tipo not in ('sena', 'total') then
    return jsonb_build_object('ok', false, 'error', 'tipo_cobro_invalido');
  end if;
  v_tot := public.plc_cotizar_reserva(v_e.disponibilidad_id, 'total');
  if coalesce(v_tot->>'ok', 'false') <> 'true' then
    return v_tot;
  end if;
  v_sena := v_e.monto_sena;
  if v_tipo = 'sena' then
    v_tot := v_tot || jsonb_build_object(
      'tipo_cobro', 'sena',
      'sena', v_sena,
      'descuento', 0,
      'descuento_pct', 0,
      'monto_pagar', v_sena
    );
  else
    v_tot := v_tot || jsonb_build_object('sena', v_sena);
  end if;
  return v_tot || jsonb_build_object(
    'titular_nombre', v_e.titular_nombre,
    'enlace_id', v_e.id,
    'token', v_e.token
  );
end;
$$;

create or replace function public.plc_ver_enlace(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_e public.plc_enlace_pago%rowtype;
  v_d public.disponibilidades%rowtype;
  v_ca public.canchas%rowtype;
  v_campo public.campos%rowtype;
  v_cot jsonb;
  v_tomado boolean;
  v_vencido boolean;
begin
  if p_token is null or length(trim(p_token)) < 8 then
    return jsonb_build_object('ok', false, 'error', 'enlace_invalido');
  end if;
  perform public.plc_liberar_holds_vencidos();
  select * into v_e from public.plc_enlace_pago where token = trim(p_token);
  if not found then
    return jsonb_build_object('ok', false, 'error', 'enlace_invalido');
  end if;
  select * into v_d from public.disponibilidades where id = v_e.disponibilidad_id;
  select * into v_campo from public.campos where id = v_d.campo_id;
  select * into v_ca from public.canchas where id = v_e.cancha_id;

  v_vencido := public.inicio_turno(v_d.fecha, v_d.hora_inicio) <= public.ahora_argentina();
  v_tomado := v_e.reserva_id is not null
    or v_d.estado in ('reservado', 'bloqueado')
    or exists (
      select 1 from public.reservas r
      where r.disponibilidad_id = v_d.id
        and r.origen = 'porlacancha'
        and r.estado_reserva = 'reservada'
    );

  if v_tomado or v_vencido then
    if v_tomado and v_e.aviso_ocupado_at is null then
      update public.plc_enlace_pago set aviso_ocupado_at = now() where id = v_e.id;
      perform public.plc_aviso_usuario(
        v_ca.owner_id,
        'turno_enlace_ocupado',
        'Un cliente abrió un enlace ya usado',
        coalesce(v_e.titular_nombre, 'Alguien') || ' abrió el link del ' ||
          to_char(v_d.fecha, 'DD/MM') || ' ' || to_char(v_d.hora_inicio, 'HH24:MI') ||
          ' y ese horario ya no está libre.',
        jsonb_build_object('destino', 'matches', 'disponibilidad_id', v_d.id)
      );
    end if;
    return jsonb_build_object(
      'ok', false,
      'error', case when v_vencido and not v_tomado then 'enlace_vencido' else 'horario_ya_reservado' end,
      'cancha_nombre', v_ca.nombre,
      'campo_nombre', v_campo.nombre,
      'alternativas', public.plc_alternativas_turno(v_d.id)
    );
  end if;

  v_cot := public.plc_cotizar_enlace(v_e.token, 'sena');
  return jsonb_build_object(
    'ok', true,
    'token', v_e.token,
    'titular_nombre', v_e.titular_nombre,
    'cancha_nombre', v_ca.nombre,
    'campo_nombre', v_campo.nombre,
    'fecha', v_d.fecha,
    'hora_inicio', v_d.hora_inicio,
    'hora_fin', v_d.hora_fin,
    'sena', v_e.monto_sena,
    'precio_cancha', v_cot->>'precio_cancha',
    'descuento_pct', v_cot->>'descuento_pct',
    'descuento_activo', coalesce((v_cot->>'descuento_pct')::numeric, 0) > 0
  );
end;
$$;

create or replace function public.plc_iniciar_checkout_enlace(
  p_token text,
  p_tipo_cobro text,
  p_acepta_reglas boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_e public.plc_enlace_pago%rowtype;
  v_disp public.disponibilidades%rowtype;
  v_user uuid := auth.uid();
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

  select * into v_e from public.plc_enlace_pago where token = trim(p_token);
  if not found then
    return jsonb_build_object('ok', false, 'error', 'enlace_invalido');
  end if;
  v_cot := public.plc_cotizar_enlace(v_e.token, p_tipo_cobro);
  if coalesce(v_cot->>'ok', 'false') <> 'true' then
    return v_cot;
  end if;

  select * into v_disp from public.disponibilidades where id = v_e.disponibilidad_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'turno_no_existe');
  end if;
  select * into v_hold_row from public.plc_checkout_hold where disponibilidad_id = v_e.disponibilidad_id;
  if v_disp.estado = 'disponible' then
    null;
  elsif v_disp.estado = 'reservado_pendiente' and v_hold_row.usuario_id is not distinct from v_user then
    null;
  else
    return jsonb_build_object(
      'ok', false,
      'error', 'horario_ya_reservado',
      'alternativas', public.plc_alternativas_turno(v_e.disponibilidad_id)
    );
  end if;

  v_mins := coalesce(public.config_num('plc_hold_reserva_minutos'), 10)::int;
  v_exp := now() + make_interval(mins => v_mins);
  delete from public.plc_checkout_hold where disponibilidad_id = v_e.disponibilidad_id;
  insert into public.plc_checkout_hold (
    disponibilidad_id, usuario_id, tipo_cobro, monto, condiciones, expira_at
  ) values (
    v_e.disponibilidad_id,
    v_user,
    v_cot->>'tipo_cobro',
    (v_cot->>'monto_pagar')::numeric,
    v_cot || jsonb_build_object(
      'acepto_reglas', true,
      'acepto_at', now(),
      'enlace_id', v_e.id,
      'titular_nombre', v_e.titular_nombre,
      'titular_telefono', v_e.titular_telefono,
      'canal', 'whatsapp'
    ),
    v_exp
  ) returning id into v_hold;

  update public.disponibilidades set estado = 'reservado_pendiente' where id = v_e.disponibilidad_id;
  return jsonb_build_object(
    'ok', true,
    'hold_id', v_hold,
    'expira_at', v_exp,
    'checkout_prueba', public.config_bool('plc_checkout_prueba'),
    'cotizacion', v_cot,
    'enlace_id', v_e.id
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
  v_owner uuid;
  v_eid uuid;
begin
  perform public.plc_liberar_holds_vencidos();
  if p_mp_payment_id is not null and exists (
    select 1 from public.reservas where mercadopago_payment_id = p_mp_payment_id
  ) then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;

  select * into v_h from public.plc_checkout_hold where id = p_hold_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'reembolsar', 'motivo', 'reserva_vencida');
  end if;
  if v_h.expira_at <= now() then
    perform public.plc_liberar_holds_vencidos();
    return jsonb_build_object('ok', false, 'error', 'reembolsar', 'motivo', 'reserva_vencida');
  end if;
  if p_monto is not null and abs(p_monto - v_h.monto) > 1 then
    return jsonb_build_object('ok', false, 'error', 'reembolsar', 'motivo', 'monto_invalido');
  end if;

  if exists (
    select 1 from public.reservas r
    where r.disponibilidad_id = v_h.disponibilidad_id
      and r.origen = 'porlacancha'
      and r.estado_reserva = 'reservada'
  ) then
    return jsonb_build_object('ok', false, 'error', 'reembolsar', 'motivo', 'turno_ya_reservado');
  end if;

  v_predio := (v_h.condiciones->>'cancha_id')::uuid;
  v_eid := nullif(v_h.condiciones->>'enlace_id', '')::uuid;

  insert into public.reservas (
    disponibilidad_id, organizador_id, monto_total, estado_pago,
    mercadopago_payment_id, origen, tipo_cobro, estado_reserva, condiciones,
    monto_sena, monto_cancha, monto_descuento, acepto_reglas_at,
    canal, titular_nombre, titular_telefono, enlace_pago_id
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
    now(),
    coalesce(v_h.condiciones->>'canal', 'app'),
    v_h.condiciones->>'titular_nombre',
    v_h.condiciones->>'titular_telefono',
    v_eid
  ) returning id into v_rid;

  insert into public.reserva_jugadores (reserva_id, jugador_id, monto, estado_pago)
  values (v_rid, v_h.usuario_id, v_h.monto, 'pagado');

  update public.disponibilidades
  set estado = 'reservado'
  where id = v_h.disponibilidad_id;

  if v_eid is not null then
    update public.plc_enlace_pago set reserva_id = v_rid where id = v_eid;
  end if;

  v_com := public.plc_centena(v_h.monto * coalesce((v_h.condiciones->>'comision_pct')::numeric, 3) / 100.0);
  if v_com > 0 then
    insert into public.movimientos (reserva_id, usuario_id, predio_id, tipo, monto, estado, detalle)
    values (
      v_rid, null, v_predio, 'comision_app_reserva', v_com, 'pendiente',
      'Comisión de la app sobre la reserva. Cobro manual al predio.'
    );
  end if;

  select owner_id into v_owner from public.canchas where id = v_predio;
  perform public.plc_aviso_usuario(
    v_owner,
    'reserva_nueva_predio',
    'Nueva reserva',
    'Se confirmó el turno del ' || coalesce(v_h.condiciones->>'fecha', '') ||
      ' ' || coalesce(left(v_h.condiciones->>'hora_inicio', 5), '') ||
      ' a nombre de ' || coalesce(v_h.condiciones->>'titular_nombre', 'un jugador') || '.',
    jsonb_build_object('destino', 'matches', 'reserva_id', v_rid)
  );

  delete from public.plc_checkout_hold where id = v_h.id;
  return jsonb_build_object('ok', true, 'reserva_id', v_rid);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'reembolsar', 'motivo', 'turno_ya_reservado');
end;
$$;

create or replace function public.plc_predio_publico(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ca public.canchas%rowtype;
  v_hoy date := public.ahora_argentina()::date;
begin
  perform public.plc_liberar_holds_vencidos();
  select * into v_ca from public.canchas where slug = lower(trim(p_slug)) and coalesce(activa, true);
  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_existe');
  end if;
  return jsonb_build_object(
    'ok', true,
    'id', v_ca.id,
    'nombre', v_ca.nombre,
    'slug', v_ca.slug,
    'barrio', v_ca.barrio,
    'direccion', v_ca.direccion,
    'turnos', coalesce((
      select jsonb_agg(s.x order by s.x->>'fecha', s.x->>'hora_inicio')
      from (
        select jsonb_build_object(
          'id', d.id,
          'fecha', d.fecha,
          'hora_inicio', d.hora_inicio,
          'hora_fin', d.hora_fin,
          'precio', d.precio,
          'campo_nombre', c.nombre,
          'campo_tipo', c.tipo
        ) as x
        from public.disponibilidades d
        join public.campos c on c.id = d.campo_id
        where c.cancha_id = v_ca.id
          and d.estado = 'disponible'
          and d.fecha >= v_hoy
      ) s
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.plc_slug_de_cancha(p_cancha_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  if not public.plc_es_dueno_cancha(p_cancha_id) then
    return jsonb_build_object('ok', false, 'error', 'no_dueno_predio');
  end if;
  v_slug := public.plc_asegurar_slug(p_cancha_id);
  return jsonb_build_object('ok', true, 'slug', v_slug);
end;
$$;

create or replace function public.plc_guardar_lista_reserva(p_reserva_id uuid, p_nombres text[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_r public.reservas%rowtype;
  v_n text;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  select * into v_r from public.reservas where id = p_reserva_id;
  if not found or v_r.organizador_id is distinct from auth.uid() then
    return jsonb_build_object('ok', false, 'error', 'no_capitan');
  end if;
  delete from public.reserva_lista where reserva_id = v_r.id;
  if p_nombres is not null then
    foreach v_n in array p_nombres loop
      v_n := nullif(trim(v_n), '');
      if v_n is not null then
        insert into public.reserva_lista (reserva_id, nombre) values (v_r.id, left(v_n, 80));
      end if;
    end loop;
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.plc_listar_lista_reserva(p_reserva_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_r public.reservas%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  select * into v_r from public.reservas where id = p_reserva_id;
  if not found or v_r.organizador_id is distinct from auth.uid() then
    return jsonb_build_object('ok', false, 'error', 'no_capitan');
  end if;
  return jsonb_build_object(
    'ok', true,
    'nombres', coalesce((
      select jsonb_agg(nombre order by created_at)
      from public.reserva_lista where reserva_id = v_r.id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.plc_abrir_busca_gente(p_reserva_id uuid, p_abrir boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_r public.reservas%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  select * into v_r from public.reservas where id = p_reserva_id for update;
  if not found or v_r.organizador_id is distinct from auth.uid() then
    return jsonb_build_object('ok', false, 'error', 'no_capitan');
  end if;
  if v_r.estado_reserva is distinct from 'reservada' then
    return jsonb_build_object('ok', false, 'error', 'no_activa');
  end if;
  update public.reservas set busca_gente = coalesce(p_abrir, true) where id = v_r.id;
  return jsonb_build_object('ok', true, 'busca_gente', coalesce(p_abrir, true));
end;
$$;

-- El RPC viejo ya no bloquea el turno: redirige al enlace de pago.
create or replace function public.plc_cargar_reserva_whatsapp(
  p_disponibilidad_id uuid,
  p_nombre text,
  p_telefono text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.plc_crear_enlace_pago(p_disponibilidad_id, p_nombre, p_telefono, null, null);
end;
$$;

revoke all on function public.plc_crear_enlace_pago(uuid, text, text, numeric, text) from public;
revoke all on function public.plc_cargar_reserva_manual(uuid, text, text, text) from public;
revoke all on function public.plc_ver_enlace(text) from public;
revoke all on function public.plc_cotizar_enlace(text, text) from public;
revoke all on function public.plc_iniciar_checkout_enlace(text, text, boolean) from public;
revoke all on function public.plc_predio_publico(text) from public;
revoke all on function public.plc_slug_de_cancha(uuid) from public;
revoke all on function public.plc_guardar_lista_reserva(uuid, text[]) from public;
revoke all on function public.plc_listar_lista_reserva(uuid) from public;
revoke all on function public.plc_abrir_busca_gente(uuid, boolean) from public;

grant execute on function public.plc_crear_enlace_pago(uuid, text, text, numeric, text) to authenticated;
grant execute on function public.plc_cargar_reserva_manual(uuid, text, text, text) to authenticated;
grant execute on function public.plc_agenda_reservas_dia(uuid, date) to authenticated;
grant execute on function public.plc_ver_enlace(text) to authenticated, anon;
grant execute on function public.plc_cotizar_enlace(text, text) to authenticated, anon;
grant execute on function public.plc_iniciar_checkout_enlace(text, text, boolean) to authenticated;
grant execute on function public.plc_predio_publico(text) to authenticated, anon;
grant execute on function public.plc_slug_de_cancha(uuid) to authenticated;
grant execute on function public.plc_guardar_lista_reserva(uuid, text[]) to authenticated;
grant execute on function public.plc_listar_lista_reserva(uuid) to authenticated;
grant execute on function public.plc_abrir_busca_gente(uuid, boolean) to authenticated;
grant execute on function public.plc_confirmar_pago_reserva(uuid, text, numeric) to service_role;

alter table public.reservas drop constraint if exists reservas_enlace_pago_fk;
alter table public.reservas
  add constraint reservas_enlace_pago_fk
  foreign key (enlace_pago_id) references public.plc_enlace_pago(id) on delete set null;
