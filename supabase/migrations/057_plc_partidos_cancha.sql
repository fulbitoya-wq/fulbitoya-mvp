-- Circuito "por la cancha" (Fase 1): partidos con pago por equipo.
-- No toca webhooks ni reservas de Mercado Pago de FulbitoYa.
-- premios_habilitados queda en false.
-- Tests SQL (no corren en db push): supabase/tests/plc_partidos_cancha.sql

-- ---------------------------------------------------------------------------
-- Config
-- ---------------------------------------------------------------------------
create table if not exists public.config_plataforma (
  clave text primary key,
  valor_num numeric,
  valor_bool boolean,
  valor_text text,
  updated_at timestamptz not null default now()
);

alter table public.config_plataforma enable row level security;

drop policy if exists "Leer config plataforma" on public.config_plataforma;
create policy "Leer config plataforma"
  on public.config_plataforma for select
  to authenticated, anon
  using (true);

revoke insert, update, delete on table public.config_plataforma from public, anon, authenticated;
grant select on table public.config_plataforma to authenticated, anon;

insert into public.config_plataforma (clave, valor_num, valor_bool)
values ('tarifa_servicio_equipo', 2000, null)
on conflict (clave) do nothing;

insert into public.config_plataforma (clave, valor_num, valor_bool)
values ('premios_habilitados', null, false)
on conflict (clave) do update
set valor_bool = false;

create or replace function public.config_num(p_clave text)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select valor_num from public.config_plataforma where clave = p_clave;
$$;

create or replace function public.config_bool(p_clave text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(valor_bool, false) from public.config_plataforma where clave = p_clave;
$$;

-- ---------------------------------------------------------------------------
-- Admins de plataforma (resolver disputas)
-- ---------------------------------------------------------------------------
create table if not exists public.plataforma_admins (
  usuario_id uuid primary key references public.usuarios(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.plataforma_admins enable row level security;

drop policy if exists "Leer si soy admin" on public.plataforma_admins;
create policy "Leer si soy admin"
  on public.plataforma_admins for select to authenticated
  using (usuario_id = auth.uid());

revoke insert, update, delete on table public.plataforma_admins from public, anon, authenticated;

create or replace function public.es_admin_plataforma()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.plataforma_admins where usuario_id = auth.uid()
  );
$$;

revoke all on function public.es_admin_plataforma() from public;
grant execute on function public.es_admin_plataforma() to authenticated;

-- ---------------------------------------------------------------------------
-- Columnas del desafío / inscripción / turno
-- ---------------------------------------------------------------------------
alter table public.desafios
  add column if not exists modalidad text,
  add column if not exists disponibilidad_id uuid references public.disponibilidades(id) on delete set null,
  add column if not exists precio_cancha numeric(12,2),
  add column if not exists tarifa_servicio numeric(12,2),
  add column if not exists regla_empate text,
  add column if not exists liquidado_at timestamptz;

update public.desafios
set modalidad = coalesce(modalidad, 'premio')
where modalidad is null;

alter table public.desafios drop constraint if exists desafios_modalidad_chk;
alter table public.desafios
  add constraint desafios_modalidad_chk
  check (modalidad in ('premio', 'por_la_cancha'));

alter table public.desafios drop constraint if exists desafios_regla_empate_chk;
alter table public.desafios
  add constraint desafios_regla_empate_chk
  check (regla_empate is null or regla_empate in ('penales', 'mitad_cada_uno'));

alter table public.desafios alter column modalidad set default 'premio';
alter table public.desafios alter column modalidad set not null;

-- Estados extra del desafío (el tipo enum original no los tenía).
-- Hay que convertir a text ANTES del índice parcial que usa 'liquidado'.
drop policy if exists "Desafios publicos abiertos" on public.desafios;

alter table public.desafios alter column estado drop default;
alter table public.desafios
  alter column estado type text using estado::text;
alter table public.desafios drop constraint if exists desafios_estado_chk;
alter table public.desafios
  add constraint desafios_estado_chk
  check (estado in (
    'pendiente_pago',
    'abierto',
    'completo',
    'cancelado',
    'finalizado',
    'en_disputa',
    'liquidado'
  ));
alter table public.desafios alter column estado set default 'abierto';

create policy "Desafios publicos abiertos"
  on public.desafios
  for select
  using (
    estado in ('abierto', 'completo')
    or owner_id = auth.uid()
    or exists (
      select 1
      from public.desafio_inscripciones i
      where i.desafio_id = desafios.id
        and (
          i.capitan_id = auth.uid()
          or public.es_miembro(i.equipo_id)
        )
    )
  );

create unique index if not exists idx_desafios_disponibilidad_activa
  on public.desafios (disponibilidad_id)
  where disponibilidad_id is not null
    and estado not in ('cancelado', 'liquidado', 'finalizado');

alter table public.desafio_inscripciones
  add column if not exists expira_at timestamptz,
  add column if not exists monto_cancha numeric(12,2),
  add column if not exists monto_servicio numeric(12,2),
  add column if not exists monto_total numeric(12,2),
  add column if not exists mp_payment_id text;

-- Turno reservado a la espera del pago del equipo A (no es reserva de FulbitoYa).
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.disponibilidades'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%disponible%reservado%'
  loop
    execute format('alter table public.disponibilidades drop constraint if exists %I', c.conname);
  end loop;
end $$;

alter table public.disponibilidades
  add constraint disponibilidades_estado_check
  check (estado in ('disponible', 'reservado', 'bloqueado', 'reservado_pendiente'));

-- ---------------------------------------------------------------------------
-- Resultado + movimientos
-- ---------------------------------------------------------------------------
create table if not exists public.resultado_confirmaciones (
  id uuid primary key default gen_random_uuid(),
  desafio_id uuid not null references public.desafios(id) on delete cascade,
  capitan_id uuid not null references public.usuarios(id) on delete cascade,
  equipo_id uuid not null references public.equipos(id) on delete cascade,
  ganador_equipo_id uuid references public.equipos(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (desafio_id, capitan_id)
);

create index if not exists idx_resultado_confirmaciones_desafio
  on public.resultado_confirmaciones (desafio_id);

alter table public.resultado_confirmaciones enable row level security;

drop policy if exists "Leer confirmaciones del partido" on public.resultado_confirmaciones;
create policy "Leer confirmaciones del partido"
  on public.resultado_confirmaciones for select to authenticated
  using (
    capitan_id = auth.uid()
    or public.es_admin_plataforma()
    or exists (
      select 1 from public.desafio_inscripciones i
      where i.desafio_id = resultado_confirmaciones.desafio_id
        and public.es_miembro(i.equipo_id)
    )
  );

revoke insert, update, delete on table public.resultado_confirmaciones from public, anon, authenticated;
grant select on table public.resultado_confirmaciones to authenticated;

create table if not exists public.movimientos (
  id uuid primary key default gen_random_uuid(),
  desafio_id uuid references public.desafios(id) on delete set null,
  inscripcion_id uuid references public.desafio_inscripciones(id) on delete set null,
  usuario_id uuid references public.usuarios(id) on delete set null,
  predio_id uuid references public.canchas(id) on delete set null,
  tipo text not null,
  monto numeric(12,2) not null,
  estado text not null default 'pendiente',
  detalle text,
  mp_refund_id text,
  error_text text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint movimientos_tipo_chk check (tipo in (
    'reembolso_cancha',
    'reembolso_mitad',
    'reembolso_total',
    'tarifa_servicio_retenida',
    'deuda_predio'
  )),
  constraint movimientos_estado_chk check (estado in ('pendiente', 'procesado', 'error'))
);

create index if not exists idx_movimientos_desafio on public.movimientos (desafio_id);
create index if not exists idx_movimientos_estado on public.movimientos (estado);
create unique index if not exists uq_movimientos_reembolso_inscripcion
  on public.movimientos (inscripcion_id, tipo)
  where inscripcion_id is not null
    and tipo in ('reembolso_total', 'reembolso_cancha', 'reembolso_mitad');

alter table public.movimientos enable row level security;

drop policy if exists "Leer movimientos propios o admin" on public.movimientos;
create policy "Leer movimientos propios o admin"
  on public.movimientos for select to authenticated
  using (
    usuario_id = auth.uid()
    or public.es_admin_plataforma()
    or exists (
      select 1 from public.desafio_inscripciones i
      where i.id = movimientos.inscripcion_id
        and public.es_capitan(i.equipo_id)
    )
  );

revoke insert, update, delete on table public.movimientos from public, anon, authenticated;
grant select on table public.movimientos to authenticated;

-- ---------------------------------------------------------------------------
-- Notificaciones nuevas
-- ---------------------------------------------------------------------------
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
    'reembolso_procesado'
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
    'reembolso_procesado'
  ));

create or replace function public.set_preferencia_notificacion(p_tipo text, p_activa boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  if p_tipo not in (
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
    'reembolso_procesado'
  ) then
    return jsonb_build_object('ok', false, 'error', 'tipo_invalido');
  end if;

  insert into public.preferencias_notificacion (usuario_id, tipo, activa)
  values (uid, p_tipo, coalesce(p_activa, true))
  on conflict (usuario_id, tipo) do update
  set activa = excluded.activa;

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.tipo_desde_campo(p_tipo text)
returns public.match_tipo
language sql
immutable
as $$
  select case btrim(coalesce(p_tipo, '5'))
    when '11' then 'f11'::public.match_tipo
    when 'f11' then 'f11'::public.match_tipo
    when '9' then 'f9'::public.match_tipo
    when 'f9' then 'f9'::public.match_tipo
    when '7' then 'f7'::public.match_tipo
    when 'f7' then 'f7'::public.match_tipo
    else 'f5'::public.match_tipo
  end;
$$;

create or replace function public.inicio_turno(p_fecha date, p_hora time)
returns timestamp
language sql
immutable
as $$
  select p_fecha::timestamp + p_hora;
$$;

create or replace function public.validar_convocados_mayores(
  p_equipo_id uuid,
  p_convocados uuid[],
  p_tipo text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_conv uuid[];
  v_uid uuid;
  v_min int;
  v_hoy date := public.ahora_argentina()::date;
  v_fn date;
  v_label text;
  v_faltan text := '';
  v_menores text := '';
begin
  select array_agg(distinct x) into v_conv
  from unnest(coalesce(p_convocados, '{}'::uuid[])) as x
  where x is not null;

  if v_conv is null or cardinality(v_conv) = 0 then
    return jsonb_build_object('ok', false, 'error', 'convocados_requeridos');
  end if;

  v_min := public.minimo_convocados(p_tipo);
  if cardinality(v_conv) < v_min then
    return jsonb_build_object('ok', false, 'error', 'minimo_convocados', 'minimo', v_min);
  end if;

  foreach v_uid in array v_conv loop
    if not exists (
      select 1 from public.equipo_miembros
      where equipo_id = p_equipo_id and usuario_id = v_uid and estado = 'activo'
    ) then
      return jsonb_build_object('ok', false, 'error', 'convocado_no_miembro');
    end if;
    select jp.fecha_nacimiento into v_fn from public.jugador_perfiles jp where jp.usuario_id = v_uid;
    v_label := coalesce(public.etiqueta_jugador(v_uid), 'Alguien');
    if v_fn is null then
      v_faltan := v_faltan || case when v_faltan = '' then '' else ', ' end || v_label;
    elsif v_fn > (v_hoy - interval '18 years')::date then
      v_menores := v_menores || case when v_menores = '' then '' else ', ' end || v_label;
    end if;
  end loop;

  if v_faltan <> '' then
    return jsonb_build_object('ok', false, 'error', 'falta_nacimiento', 'quienes', v_faltan);
  end if;
  if v_menores <> '' then
    return jsonb_build_object('ok', false, 'error', 'menor_18', 'quienes', v_menores);
  end if;

  return jsonb_build_object('ok', true, 'convocados', to_jsonb(v_conv));
end;
$$;

create or replace function public.liberar_turno_partido(p_disponibilidad_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_disponibilidad_id is null then
    return;
  end if;
  update public.disponibilidades
  set estado = 'disponible'
  where id = p_disponibilidad_id
    and estado in ('reservado_pendiente', 'reservado');
end;
$$;

create or replace function public.registrar_movimiento(
  p_desafio_id uuid,
  p_inscripcion_id uuid,
  p_usuario_id uuid,
  p_predio_id uuid,
  p_tipo text,
  p_monto numeric,
  p_detalle text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.movimientos (
    desafio_id, inscripcion_id, usuario_id, predio_id, tipo, monto, estado, detalle
  ) values (
    p_desafio_id, p_inscripcion_id, p_usuario_id, p_predio_id, p_tipo, p_monto, 'pendiente', p_detalle
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- crear_partido
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
  v_conv uuid[];
  v_tarifa numeric;
  v_desafio uuid;
  v_insc uuid;
  v_inicio timestamp;
  v_duracion int;
  v_eq_nombre text;
  v_titulo text;
  v_uid uuid;
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

  v_tarifa := coalesce(public.config_num('tarifa_servicio_equipo'), 0);
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
  if coalesce(v_disp.precio, 0) <= 0 then
    return jsonb_build_object('ok', false, 'error', 'precio_cancha_invalido');
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

  update public.disponibilidades
  set estado = 'reservado_pendiente'
  where id = v_disp.id and estado = 'disponible';
  if not found then
    return jsonb_build_object('ok', false, 'error', 'turno_no_disponible');
  end if;

  insert into public.desafios (
    owner_id, cancha_id, titulo, tipo, premio, direccion, barrio, place_id, lat, lng,
    fecha, hora_inicio, duracion_min, descripcion, estado,
    cierre_inscripcion, modalidad, disponibilidad_id, precio_cancha, tarifa_servicio, regla_empate
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
    (v_inicio - interval '2 hours') at time zone 'America/Argentina/Buenos_Aires',
    'por_la_cancha',
    v_disp.id,
    v_disp.precio,
    v_tarifa,
    p_regla_empate
  )
  returning id into v_desafio;

  insert into public.desafio_inscripciones (
    desafio_id, equipo_id, capitan_id, estado, expira_at,
    monto_cancha, monto_servicio, monto_total
  ) values (
    v_desafio, p_equipo_id, v_user, 'pendiente_pago', now() + interval '15 minutes',
    v_disp.precio, v_tarifa, v_disp.precio + v_tarifa
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
    'monto_cancha', v_disp.precio,
    'monto_servicio', v_tarifa,
    'monto_total', v_disp.precio + v_tarifa,
    'expira_at', (now() + interval '15 minutes')
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- inscribir_equipo (B: reserva 15 min si el partido es por la cancha)
-- ---------------------------------------------------------------------------
create or replace function public.inscribir_equipo(
  p_desafio_id uuid,
  p_equipo_id uuid,
  p_convocados uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_d public.desafios%rowtype;
  v_inicio timestamp;
  v_cierre timestamp;
  v_now timestamp;
  v_ocupados int;
  v_val jsonb;
  v_conv uuid[];
  v_uid uuid;
  v_estado text;
  v_insc uuid;
  v_prev public.desafio_inscripciones%rowtype;
  v_eq_nombre text;
  v_por_cancha boolean;
  v_expira timestamptz;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  if not public.es_capitan(p_equipo_id) then
    return jsonb_build_object('ok', false, 'error', 'no_capitan');
  end if;

  select * into v_d from public.desafios where id = p_desafio_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'desafio_no_existe');
  end if;
  if v_d.estado not in ('abierto', 'completo') then
    return jsonb_build_object('ok', false, 'error', 'desafio_cerrado');
  end if;

  v_por_cancha := v_d.modalidad = 'por_la_cancha';
  v_now := public.ahora_argentina();
  v_inicio := v_d.fecha::timestamp + v_d.hora_inicio;
  v_cierre := case
    when v_d.cierre_inscripcion is not null then timezone('America/Argentina/Buenos_Aires', v_d.cierre_inscripcion)
    else v_inicio - interval '2 hours'
  end;
  if v_now >= v_cierre then
    return jsonb_build_object('ok', false, 'error', 'inscripcion_cerrada');
  end if;

  v_val := public.validar_convocados_mayores(
    p_equipo_id,
    p_convocados,
    v_d.tipo::text
  );
  if v_por_cancha or v_d.premio > 0 then
    if coalesce(v_val->>'ok', 'false') <> 'true' then
      return v_val;
    end if;
  else
    if v_val->>'error' in ('convocados_requeridos', 'minimo_convocados', 'convocado_no_miembro') then
      return v_val;
    end if;
    if coalesce(v_val->>'ok', 'false') <> 'true' and v_val->>'error' not in ('falta_nacimiento', 'menor_18') then
      return v_val;
    end if;
    if v_val->>'error' in ('falta_nacimiento', 'menor_18') then
      select array_agg(distinct x) into v_conv
      from unnest(coalesce(p_convocados, '{}'::uuid[])) as x
      where x is not null;
    end if;
  end if;

  if v_conv is null then
    select array_agg(x::uuid) into v_conv
    from jsonb_array_elements_text(v_val->'convocados') as x;
  end if;
  if v_conv is not null and v_user <> all (v_conv) then
    v_conv := array_append(v_conv, v_user);
  end if;

  if exists (
    select 1
    from public.desafio_convocados c
    join public.desafio_inscripciones i on i.id = c.inscripcion_id
    where c.desafio_id = p_desafio_id
      and c.usuario_id = any (v_conv)
      and i.estado in ('pendiente_pago', 'confirmada')
      and i.equipo_id is distinct from p_equipo_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'convocado_ocupado');
  end if;

  select * into v_prev
  from public.desafio_inscripciones
  where desafio_id = p_desafio_id and equipo_id = p_equipo_id
  for update;

  if found and v_prev.estado in ('pendiente_pago', 'confirmada') then
    return jsonb_build_object('ok', false, 'error', 'ya_inscripto');
  end if;

  v_insc := v_prev.id;

  select count(*) into v_ocupados
  from public.desafio_inscripciones
  where desafio_id = p_desafio_id
    and estado in ('pendiente_pago', 'confirmada');

  if v_ocupados >= 2 then
    return jsonb_build_object('ok', false, 'error', 'cupo_lleno');
  end if;

  if v_por_cancha then
    v_estado := 'pendiente_pago';
    v_expira := now() + interval '15 minutes';
  else
    v_estado := 'confirmada';
    v_expira := null;
  end if;

  if v_prev.id is not null then
    update public.desafio_inscripciones
    set capitan_id = v_user,
        estado = v_estado,
        confirmada_at = case when v_estado = 'confirmada' then now() else null end,
        cancelada_at = null,
        expira_at = v_expira,
        monto_cancha = case when v_por_cancha then v_d.precio_cancha else monto_cancha end,
        monto_servicio = case when v_por_cancha then v_d.tarifa_servicio else monto_servicio end,
        monto_total = case when v_por_cancha then v_d.precio_cancha + v_d.tarifa_servicio else monto_total end,
        updated_at = now()
    where id = v_prev.id
    returning id into v_insc;
    delete from public.desafio_convocados where inscripcion_id = v_insc;
  else
    insert into public.desafio_inscripciones (
      desafio_id, equipo_id, capitan_id, estado, confirmada_at, expira_at,
      monto_cancha, monto_servicio, monto_total
    ) values (
      p_desafio_id, p_equipo_id, v_user, v_estado,
      case when v_estado = 'confirmada' then now() else null end,
      v_expira,
      case when v_por_cancha then v_d.precio_cancha else null end,
      case when v_por_cancha then v_d.tarifa_servicio else null end,
      case when v_por_cancha then v_d.precio_cancha + v_d.tarifa_servicio else null end
    )
    returning id into v_insc;
  end if;

  insert into public.desafio_convocados (inscripcion_id, desafio_id, usuario_id)
  select v_insc, p_desafio_id, u
  from unnest(v_conv) as u;

  select count(*) into v_ocupados
  from public.desafio_inscripciones
  where desafio_id = p_desafio_id and estado = 'confirmada';

  if (not v_por_cancha) and v_ocupados >= 2 then
    update public.desafios set estado = 'completo' where id = p_desafio_id and estado = 'abierto';
  end if;

  select e.nombre into v_eq_nombre from public.equipos e where e.id = p_equipo_id;

  foreach v_uid in array v_conv loop
    if v_uid is distinct from v_user then
      perform public.emitir_notificacion(
        v_uid,
        'convocado_partido',
        'Te convocaron a un partido',
        'El capitán te convocó con ' || coalesce(v_eq_nombre, 'tu equipo') || ' a ' || v_d.titulo || '.',
        jsonb_build_object('desafio_id', p_desafio_id, 'equipo_id', p_equipo_id, 'destino', 'desafio')
      );
    end if;
  end loop;

  if v_d.owner_id is distinct from v_user then
    perform public.emitir_notificacion(
      v_d.owner_id,
      'inscripcion_desafio',
      'Un equipo se inscribió',
      coalesce(v_eq_nombre, 'Un equipo') || ' se anotó a ' || v_d.titulo || '.',
      jsonb_build_object('desafio_id', p_desafio_id, 'equipo_id', p_equipo_id, 'destino', 'desafio')
    );
  end if;

  return jsonb_build_object('ok', true, 'inscripcion_id', v_insc, 'estado', v_estado, 'expira_at', v_expira);
end;
$$;

-- ---------------------------------------------------------------------------
-- confirmar_pago_inscripcion (webhook / tests). service_role.
-- ---------------------------------------------------------------------------
create or replace function public.confirmar_pago_inscripcion(
  p_inscripcion_id uuid,
  p_payment_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_i public.desafio_inscripciones%rowtype;
  v_d public.desafios%rowtype;
  v_pagadas int;
  v_owner uuid;
  v_tarde boolean := false;
  v_cierre timestamp;
begin
  select * into v_i from public.desafio_inscripciones where id = p_inscripcion_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_existe');
  end if;

  if v_i.estado = 'confirmada' then
    return jsonb_build_object('ok', true, 'idempotente', true, 'desafio_id', v_i.desafio_id);
  end if;

  select * into v_d from public.desafios where id = v_i.desafio_id for update;

  if exists (
    select 1 from public.movimientos
    where inscripcion_id = v_i.id and tipo = 'reembolso_total'
  ) then
    return jsonb_build_object(
      'ok', false, 'error', 'pago_fuera_de_tiempo', 'reembolso_total', true, 'idempotente', true
    );
  end if;

  v_cierre := case
    when v_d.cierre_inscripcion is not null then timezone('America/Argentina/Buenos_Aires', v_d.cierre_inscripcion)
    else v_d.fecha::timestamp + v_d.hora_inicio - interval '2 hours'
  end;

  select count(*) into v_pagadas
  from public.desafio_inscripciones
  where desafio_id = v_d.id and estado = 'confirmada';

  v_tarde :=
    v_i.estado is distinct from 'pendiente_pago'
    or v_d.estado not in ('pendiente_pago', 'abierto')
    or (v_i.expira_at is not null and v_i.expira_at < now())
    or v_pagadas >= 2
    or (v_d.estado = 'abierto' and public.ahora_argentina() >= v_cierre);

  if v_tarde then
    if v_i.estado = 'pendiente_pago' then
      update public.desafio_inscripciones
      set estado = 'expirada', updated_at = now()
      where id = v_i.id;
    end if;
    if v_d.estado = 'pendiente_pago' then
      update public.desafios set estado = 'cancelado' where id = v_d.id;
      perform public.liberar_turno_partido(v_d.disponibilidad_id);
    end if;
    perform public.registrar_movimiento(
      v_d.id, v_i.id, v_i.capitan_id, v_d.cancha_id,
      'reembolso_total', coalesce(v_i.monto_total, 0),
      'Pago fuera de tiempo o cupo no disponible'
    );
    return jsonb_build_object('ok', false, 'error', 'pago_fuera_de_tiempo', 'reembolso_total', true);
  end if;

  update public.desafio_inscripciones
  set estado = 'confirmada',
      confirmada_at = now(),
      mp_payment_id = coalesce(p_payment_id, mp_payment_id),
      updated_at = now()
  where id = v_i.id;

  perform public.emitir_notificacion(
    v_i.capitan_id,
    'pago_confirmado',
    'Pago confirmado',
    'El pago de ' || v_d.titulo || ' está confirmado.',
    jsonb_build_object('desafio_id', v_d.id, 'inscripcion_id', v_i.id, 'destino', 'desafio')
  );

  if v_d.estado = 'pendiente_pago' then
    update public.desafios set estado = 'abierto' where id = v_d.id;
    update public.disponibilidades
    set estado = 'reservado'
    where id = v_d.disponibilidad_id and estado = 'reservado_pendiente';
  end if;

  select count(*) into v_pagadas
  from public.desafio_inscripciones
  where desafio_id = v_d.id and estado = 'confirmada';

  if v_pagadas >= 2 then
    update public.desafios set estado = 'completo' where id = v_d.id and estado = 'abierto';
    select capitan_id into v_owner
    from public.desafio_inscripciones
    where desafio_id = v_d.id and estado = 'confirmada' and id is distinct from v_i.id
    limit 1;
    if v_owner is not null then
      perform public.emitir_notificacion(
        v_owner,
        'rival_sumado',
        'Se sumó un rival',
        'Ya hay dos equipos en ' || v_d.titulo || '. El partido está confirmado.',
        jsonb_build_object('desafio_id', v_d.id, 'destino', 'desafio')
      );
    end if;
  end if;

  return jsonb_build_object('ok', true, 'desafio_id', v_d.id, 'pagadas', v_pagadas);
end;
$$;

-- ---------------------------------------------------------------------------
-- liquidar_partido (service_role, idempotente)
-- ---------------------------------------------------------------------------
create or replace function public.liquidar_partido(p_desafio_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_d public.desafios%rowtype;
  v_a public.desafio_inscripciones%rowtype;
  v_b public.desafio_inscripciones%rowtype;
  v_n int;
  v_ganador uuid;
  v_regla text;
  v_empate boolean := false;
  r record;
begin
  select * into v_d from public.desafios where id = p_desafio_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'desafio_no_existe');
  end if;
  if v_d.estado = 'liquidado' then
    return jsonb_build_object('ok', true, 'idempotente', true);
  end if;
  if v_d.modalidad is distinct from 'por_la_cancha' then
    return jsonb_build_object('ok', false, 'error', 'no_es_por_la_cancha');
  end if;
  if v_d.estado not in ('completo', 'en_disputa') then
    return jsonb_build_object('ok', false, 'error', 'no_listo_para_liquidar');
  end if;

  select * into v_a
  from public.desafio_inscripciones
  where desafio_id = p_desafio_id and estado = 'confirmada'
  order by confirmada_at nulls last, created_at
  limit 1;

  select * into v_b
  from public.desafio_inscripciones
  where desafio_id = p_desafio_id and estado = 'confirmada' and id is distinct from v_a.id
  order by confirmada_at nulls last, created_at
  limit 1;

  if v_a.id is null or v_b.id is null then
    return jsonb_build_object('ok', false, 'error', 'faltan_equipos');
  end if;

  select count(*) into v_n
  from public.resultado_confirmaciones
  where desafio_id = p_desafio_id;

  v_regla := v_d.regla_empate;

  if v_n >= 2 then
    if exists (
      select 1
      from public.resultado_confirmaciones a
      join public.resultado_confirmaciones b
        on a.desafio_id = b.desafio_id and a.capitan_id < b.capitan_id
      where a.desafio_id = p_desafio_id
        and a.ganador_equipo_id is distinct from b.ganador_equipo_id
    ) then
      update public.desafios set estado = 'en_disputa' where id = p_desafio_id and estado is distinct from 'en_disputa';
      return jsonb_build_object('ok', false, 'error', 'en_disputa');
    end if;
    select ganador_equipo_id into v_ganador
    from public.resultado_confirmaciones
    where desafio_id = p_desafio_id
    limit 1;
    v_empate := v_ganador is null;
  elsif v_n = 1 then
    select ganador_equipo_id into v_ganador
    from public.resultado_confirmaciones
    where desafio_id = p_desafio_id;
    v_empate := v_ganador is null;
  else
    return jsonb_build_object('ok', false, 'error', 'resultado_incompleto');
  end if;

  if v_empate and v_regla is distinct from 'mitad_cada_uno' then
    return jsonb_build_object('ok', false, 'error', 'empate_no_permitido');
  end if;
  if v_empate then
    v_ganador := null;
  end if;

  if exists (select 1 from public.movimientos where desafio_id = p_desafio_id) then
    update public.desafios set estado = 'liquidado', liquidado_at = coalesce(liquidado_at, now()) where id = p_desafio_id;
    return jsonb_build_object('ok', true, 'idempotente', true);
  end if;

  if v_ganador is null then
    perform public.registrar_movimiento(p_desafio_id, v_a.id, v_a.capitan_id, v_d.cancha_id, 'reembolso_mitad', v_d.precio_cancha / 2, 'Empate: mitad de la cancha');
    perform public.registrar_movimiento(p_desafio_id, v_b.id, v_b.capitan_id, v_d.cancha_id, 'reembolso_mitad', v_d.precio_cancha / 2, 'Empate: mitad de la cancha');
  elsif v_ganador = v_a.equipo_id then
    perform public.registrar_movimiento(p_desafio_id, v_a.id, v_a.capitan_id, v_d.cancha_id, 'reembolso_cancha', v_d.precio_cancha, 'Ganador: devolución del precio de cancha');
  elsif v_ganador = v_b.equipo_id then
    perform public.registrar_movimiento(p_desafio_id, v_b.id, v_b.capitan_id, v_d.cancha_id, 'reembolso_cancha', v_d.precio_cancha, 'Ganador: devolución del precio de cancha');
  else
    return jsonb_build_object('ok', false, 'error', 'ganador_invalido');
  end if;

  perform public.registrar_movimiento(p_desafio_id, v_a.id, null, v_d.cancha_id, 'tarifa_servicio_retenida', v_d.tarifa_servicio, 'Tarifa de servicio equipo A');
  perform public.registrar_movimiento(p_desafio_id, v_b.id, null, v_d.cancha_id, 'tarifa_servicio_retenida', v_d.tarifa_servicio, 'Tarifa de servicio equipo B');
  perform public.registrar_movimiento(p_desafio_id, null, null, v_d.cancha_id, 'deuda_predio', v_d.precio_cancha, 'Cancha a pagar al predio (manual)');

  update public.desafios
  set estado = 'liquidado', liquidado_at = now()
  where id = p_desafio_id;

  return jsonb_build_object('ok', true, 'ganador_equipo_id', v_ganador);
end;
$$;

-- ---------------------------------------------------------------------------
-- confirmar_resultado
-- ---------------------------------------------------------------------------
create or replace function public.confirmar_resultado(
  p_desafio_id uuid,
  p_ganador_equipo_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_d public.desafios%rowtype;
  v_insc public.desafio_inscripciones%rowtype;
  v_inicio timestamp;
  v_mias int;
  v_otro uuid;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;

  select * into v_d from public.desafios where id = p_desafio_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'desafio_no_existe');
  end if;
  if v_d.modalidad is distinct from 'por_la_cancha' then
    return jsonb_build_object('ok', false, 'error', 'no_es_por_la_cancha');
  end if;
  if v_d.estado not in ('completo', 'en_disputa') then
    return jsonb_build_object('ok', false, 'error', 'no_listo_para_resultado');
  end if;

  v_inicio := v_d.fecha::timestamp + v_d.hora_inicio;
  if public.ahora_argentina() < v_inicio then
    return jsonb_build_object('ok', false, 'error', 'partido_no_empezo');
  end if;

  select * into v_insc
  from public.desafio_inscripciones
  where desafio_id = p_desafio_id
    and estado = 'confirmada'
    and (capitan_id = v_user or public.es_capitan(equipo_id))
  limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_capitan');
  end if;

  if p_ganador_equipo_id is null then
    if v_d.regla_empate is distinct from 'mitad_cada_uno' then
      return jsonb_build_object('ok', false, 'error', 'empate_no_permitido');
    end if;
  elsif not exists (
    select 1 from public.desafio_inscripciones
    where desafio_id = p_desafio_id and estado = 'confirmada' and equipo_id = p_ganador_equipo_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'ganador_invalido');
  end if;

  insert into public.resultado_confirmaciones (
    desafio_id, capitan_id, equipo_id, ganador_equipo_id
  ) values (
    p_desafio_id, v_user, v_insc.equipo_id, p_ganador_equipo_id
  )
  on conflict (desafio_id, capitan_id) do update
  set ganador_equipo_id = excluded.ganador_equipo_id,
      updated_at = now()
  where not exists (
    select 1 from public.resultado_confirmaciones o
    where o.desafio_id = excluded.desafio_id and o.capitan_id is distinct from excluded.capitan_id
  );

  get diagnostics v_mias = row_count;
  if v_mias = 0 then
    return jsonb_build_object('ok', false, 'error', 'ya_cerrado');
  end if;

  select count(*) into v_mias from public.resultado_confirmaciones where desafio_id = p_desafio_id;
  if v_mias < 2 then
    select capitan_id into v_otro from public.desafio_inscripciones
    where desafio_id = p_desafio_id and estado = 'confirmada' and capitan_id is distinct from v_user
    limit 1;
    if v_otro is not null then
      perform public.emitir_notificacion(
        v_otro,
        'rival_confirmo_resultado',
        'El rival confirmó el resultado',
        'Confirmá el resultado de ' || v_d.titulo || '.',
        jsonb_build_object('desafio_id', p_desafio_id, 'destino', 'desafio')
      );
    end if;
    return jsonb_build_object('ok', true, 'pendiente_otro', true);
  end if;

  if (
    select ganador_equipo_id from public.resultado_confirmaciones
    where desafio_id = p_desafio_id and capitan_id = v_user
  ) is not distinct from (
    select ganador_equipo_id from public.resultado_confirmaciones
    where desafio_id = p_desafio_id and capitan_id is distinct from v_user
  ) then
    return public.liquidar_partido(p_desafio_id);
  end if;

  update public.desafios set estado = 'en_disputa' where id = p_desafio_id;

  for v_otro in
    select capitan_id from public.desafio_inscripciones
    where desafio_id = p_desafio_id and estado = 'confirmada' and capitan_id is not null
  loop
    perform public.emitir_notificacion(
      v_otro,
      'resultado_en_disputa',
      'Resultado en disputa',
      'No coincidieron las confirmaciones de ' || v_d.titulo || '.',
      jsonb_build_object('desafio_id', p_desafio_id, 'destino', 'desafio')
    );
  end loop;

  return jsonb_build_object('ok', true, 'estado', 'en_disputa');
end;
$$;

create or replace function public.resolver_disputa(
  p_desafio_id uuid,
  p_ganador_equipo_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_d public.desafios%rowtype;
  v_eq uuid;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  if not public.es_admin_plataforma() then
    return jsonb_build_object('ok', false, 'error', 'no_admin');
  end if;

  select * into v_d from public.desafios where id = p_desafio_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'desafio_no_existe');
  end if;
  if v_d.estado is distinct from 'en_disputa' then
    return jsonb_build_object('ok', false, 'error', 'no_esta_en_disputa');
  end if;

  if p_ganador_equipo_id is null then
    if v_d.regla_empate is distinct from 'mitad_cada_uno' then
      return jsonb_build_object('ok', false, 'error', 'empate_no_permitido');
    end if;
  else
    select equipo_id into v_eq
    from public.desafio_inscripciones
    where desafio_id = p_desafio_id and estado = 'confirmada' and equipo_id = p_ganador_equipo_id;
    if v_eq is null then
      return jsonb_build_object('ok', false, 'error', 'ganador_invalido');
    end if;
  end if;

  insert into public.resultado_confirmaciones (desafio_id, capitan_id, equipo_id, ganador_equipo_id)
  select p_desafio_id, i.capitan_id, i.equipo_id, p_ganador_equipo_id
  from public.desafio_inscripciones i
  where i.desafio_id = p_desafio_id and i.estado = 'confirmada' and i.capitan_id is not null
  on conflict (desafio_id, capitan_id) do update
  set ganador_equipo_id = excluded.ganador_equipo_id,
      updated_at = now();

  return public.liquidar_partido(p_desafio_id);
end;
$$;

create or replace function public.monto_a_pagar_inscripcion(p_inscripcion_id uuid)
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
  select * into v_i from public.desafio_inscripciones where id = p_inscripcion_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_existe');
  end if;
  if v_i.capitan_id is distinct from v_user and not public.es_capitan(v_i.equipo_id) then
    return jsonb_build_object('ok', false, 'error', 'no_capitan');
  end if;
  if v_i.estado is distinct from 'pendiente_pago' then
    return jsonb_build_object('ok', false, 'error', 'no_pendiente_pago');
  end if;
  if v_i.expira_at is not null and v_i.expira_at < now() then
    return jsonb_build_object('ok', false, 'error', 'reserva_vencida');
  end if;
  return jsonb_build_object(
    'ok', true,
    'monto_cancha', v_i.monto_cancha,
    'monto_servicio', v_i.monto_servicio,
    'monto_total', v_i.monto_total,
    'expira_at', v_i.expira_at
  );
end;
$$;

create or replace function public.plc_tarea_periodica_partidos()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exp_a int := 0;
  v_exp_b int := 0;
  v_sin_rival int := 0;
  v_plazo int := 0;
  r record;
  v_fin timestamp;
  n int;
begin
  for r in
    select i.id as inscripcion_id, d.id as desafio_id, d.disponibilidad_id, i.capitan_id, i.monto_total, d.titulo, d.cancha_id
    from public.desafio_inscripciones i
    join public.desafios d on d.id = i.desafio_id
    where d.modalidad = 'por_la_cancha'
      and d.estado = 'pendiente_pago'
      and i.estado = 'pendiente_pago'
      and i.expira_at is not null
      and i.expira_at < now()
  loop
    update public.desafio_inscripciones set estado = 'expirada', updated_at = now() where id = r.inscripcion_id;
    update public.desafios set estado = 'cancelado' where id = r.desafio_id;
    perform public.liberar_turno_partido(r.disponibilidad_id);
    v_exp_a := v_exp_a + 1;
  end loop;

  for r in
    select i.id as inscripcion_id
    from public.desafio_inscripciones i
    join public.desafios d on d.id = i.desafio_id
    where d.modalidad = 'por_la_cancha'
      and d.estado = 'abierto'
      and i.estado = 'pendiente_pago'
      and i.expira_at is not null
      and i.expira_at < now()
  loop
    update public.desafio_inscripciones set estado = 'expirada', updated_at = now() where id = r.inscripcion_id;
    v_exp_b := v_exp_b + 1;
  end loop;

  for r in
    select d.id, d.disponibilidad_id, d.titulo, d.cancha_id, d.cierre_inscripcion, d.fecha, d.hora_inicio,
           i.id as inscripcion_id, i.capitan_id, i.monto_total
    from public.desafios d
    join public.desafio_inscripciones i on i.desafio_id = d.id and i.estado = 'confirmada'
    where d.modalidad = 'por_la_cancha'
      and d.estado = 'abierto'
      and public.ahora_argentina() >= coalesce(
            timezone('America/Argentina/Buenos_Aires', d.cierre_inscripcion),
            d.fecha::timestamp + d.hora_inicio - interval '2 hours'
          )
      and (
        select count(*) from public.desafio_inscripciones x
        where x.desafio_id = d.id and x.estado = 'confirmada'
      ) = 1
  loop
    update public.desafios set estado = 'cancelado' where id = r.id;
    update public.desafio_inscripciones
    set estado = 'expirada', updated_at = now()
    where desafio_id = r.id and estado = 'pendiente_pago';
    perform public.liberar_turno_partido(r.disponibilidad_id);
    perform public.registrar_movimiento(
      r.id, r.inscripcion_id, r.capitan_id, r.cancha_id,
      'reembolso_total', coalesce(r.monto_total, 0),
      'Sin rival al cierre de inscripción'
    );
    perform public.emitir_notificacion(
      r.capitan_id,
      'partido_sin_rival_cancelado',
      'Se canceló el partido',
      'No se sumó un rival a ' || r.titulo || '. Te devolvemos todo.',
      jsonb_build_object('desafio_id', r.id, 'destino', 'desafio')
    );
    v_sin_rival := v_sin_rival + 1;
  end loop;

  for r in
    select d.id, d.fecha, d.hora_inicio, d.duracion_min
    from public.desafios d
    where d.modalidad = 'por_la_cancha'
      and d.estado = 'completo'
      and (
        select count(*) from public.resultado_confirmaciones c where c.desafio_id = d.id
      ) = 1
  loop
    v_fin := r.fecha::timestamp + r.hora_inicio + make_interval(mins => coalesce(r.duracion_min, 90));
    if public.ahora_argentina() >= v_fin + interval '2 hours' then
      perform public.liquidar_partido(r.id);
      v_plazo := v_plazo + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'expiradas_equipo_a', v_exp_a,
    'expiradas_equipo_b', v_exp_b,
    'sin_rival', v_sin_rival,
    'plazo_confirmacion', v_plazo
  );
end;
$$;

revoke all on function public.crear_partido(uuid, uuid, uuid[], text) from public;
revoke all on function public.confirmar_pago_inscripcion(uuid, text) from public;
revoke all on function public.liquidar_partido(uuid) from public;
revoke all on function public.confirmar_resultado(uuid, uuid) from public;
revoke all on function public.resolver_disputa(uuid, uuid) from public;
revoke all on function public.monto_a_pagar_inscripcion(uuid) from public;
revoke all on function public.plc_tarea_periodica_partidos() from public;
revoke all on function public.validar_convocados_mayores(uuid, uuid[], text) from public;
revoke all on function public.registrar_movimiento(uuid, uuid, uuid, uuid, text, numeric, text) from public;
revoke all on function public.liberar_turno_partido(uuid) from public;

grant execute on function public.crear_partido(uuid, uuid, uuid[], text) to authenticated;
grant execute on function public.inscribir_equipo(uuid, uuid, uuid[]) to authenticated;
grant execute on function public.confirmar_resultado(uuid, uuid) to authenticated;
grant execute on function public.resolver_disputa(uuid, uuid) to authenticated;
grant execute on function public.monto_a_pagar_inscripcion(uuid) to authenticated;
grant execute on function public.config_num(text) to authenticated, anon;
grant execute on function public.config_bool(text) to authenticated, anon;
grant execute on function public.es_admin_plataforma() to authenticated;

grant execute on function public.confirmar_pago_inscripcion(uuid, text) to service_role;
grant execute on function public.liquidar_partido(uuid) to service_role;
grant execute on function public.plc_tarea_periodica_partidos() to service_role;
grant execute on function public.resolver_disputa(uuid, uuid) to service_role;
