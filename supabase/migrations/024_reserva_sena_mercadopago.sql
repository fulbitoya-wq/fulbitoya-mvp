-- Reservas: pago con Mercado Pago (seña desde campos.valor_reserva)
-- Turno sigue "disponible" hasta que el webhook confirma el pago y pasa a "reservado".

alter table public.reservas
  add column if not exists mercadopago_payment_id text,
  add column if not exists mercadopago_preference_id text;

comment on column public.reservas.mercadopago_payment_id is 'ID de pago MP al aprobarse';
comment on column public.reservas.mercadopago_preference_id is 'ID de preferencia MP (checkout)';

-- Inicia checkout: crea reserva pendiente con monto = valor_reserva del campo (no confía en el cliente).
create or replace function public.iniciar_reserva_sena(p_disponibilidad_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_disp_estado text;
  v_sena numeric;
  v_reserva_id uuid;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;

  select d.estado::text, coalesce(c.valor_reserva, 0)::numeric
  into v_disp_estado, v_sena
  from public.disponibilidades d
  join public.campos c on c.id = d.campo_id
  where d.id = p_disponibilidad_id
  for update of d;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'turno_no_existe');
  end if;

  if v_disp_estado is distinct from 'disponible' then
    return jsonb_build_object('ok', false, 'error', 'turno_no_disponible');
  end if;

  if exists (
    select 1
    from public.reservas r
    where r.disponibilidad_id = p_disponibilidad_id
      and r.estado_pago = 'pendiente'
      and r.created_at > now() - interval '30 minutes'
  ) then
    return jsonb_build_object('ok', false, 'error', 'pago_en_curso');
  end if;

  if v_sena <= 0 then
    return jsonb_build_object('ok', false, 'error', 'senia_no_configurada');
  end if;

  insert into public.reservas (
    disponibilidad_id,
    organizador_id,
    monto_total,
    estado_pago
  )
  values (
    p_disponibilidad_id,
    v_user,
    v_sena,
    'pendiente'
  )
  returning id into v_reserva_id;

  insert into public.reserva_jugadores (
    reserva_id,
    jugador_id,
    monto,
    estado_pago
  )
  values (
    v_reserva_id,
    v_user,
    v_sena,
    'pendiente'
  );

  return jsonb_build_object(
    'ok', true,
    'reserva_id', v_reserva_id,
    'monto_sena', v_sena
  );
end;
$$;

-- Confirmación tras pago aprobado (llamar desde backend con service_role).
create or replace function public.confirmar_pago_reserva(p_reserva_id uuid, p_mp_payment_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_disp_id uuid;
  v_count int;
begin
  if exists (
    select 1
    from public.reservas
    where id = p_reserva_id
      and estado_pago = 'pagado'
  ) then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;

  select disponibilidad_id
  into v_disp_id
  from public.reservas
  where id = p_reserva_id
    and estado_pago = 'pendiente'
  for update;

  if v_disp_id is null then
    return jsonb_build_object('ok', false, 'reason', 'sin_reserva_pendiente');
  end if;

  update public.disponibilidades
  set estado = 'reservado'
  where id = v_disp_id
    and estado = 'disponible';

  get diagnostics v_count = row_count;

  if v_count = 0 then
    update public.reservas
    set estado_pago = 'cancelado',
        mercadopago_payment_id = coalesce(p_mp_payment_id, mercadopago_payment_id)
    where id = p_reserva_id;
    return jsonb_build_object(
      'ok', false,
      'reason', 'turno_ya_reservado',
      'hint', 'Reembolso o contacto con soporte si el pago ya se acreditó.'
    );
  end if;

  update public.reservas
  set estado_pago = 'pagado',
      mercadopago_payment_id = coalesce(p_mp_payment_id, mercadopago_payment_id)
  where id = p_reserva_id;

  update public.reserva_jugadores
  set estado_pago = 'pagado'
  where reserva_id = p_reserva_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.iniciar_reserva_sena(uuid) from public;
grant execute on function public.iniciar_reserva_sena(uuid) to authenticated;

revoke all on function public.confirmar_pago_reserva(uuid, text) from public;
grant execute on function public.confirmar_pago_reserva(uuid, text) to service_role;
