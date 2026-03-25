-- Nuevo flujo: NO crear reservas al click.
-- Se crea la preferencia con disponibilidad + usuario.
-- Recién en webhook approved se bloquea disponibilidad y se inserta reserva pagada.

create or replace function public.get_sena_para_disponibilidad(
  p_disponibilidad_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado text;
  v_sena numeric;
begin
  select d.estado::text, coalesce(c.valor_reserva, 0)::numeric
  into v_estado, v_sena
  from public.disponibilidades d
  join public.campos c on c.id = d.campo_id
  where d.id = p_disponibilidad_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'turno_no_existe');
  end if;

  if v_estado is distinct from 'disponible' then
    return jsonb_build_object('ok', false, 'error', 'turno_no_disponible');
  end if;

  if v_sena <= 0 then
    return jsonb_build_object('ok', false, 'error', 'senia_no_configurada');
  end if;

  return jsonb_build_object('ok', true, 'monto', v_sena);
end;
$$;

revoke all on function public.get_sena_para_disponibilidad(uuid) from public;
grant execute on function public.get_sena_para_disponibilidad(uuid) to service_role;

create or replace function public.confirmar_pago_desde_disponibilidad(
  p_disponibilidad_id uuid,
  p_organizador_id uuid,
  p_mp_payment_id text,
  p_monto numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado text;
  v_reserva_id uuid;
begin
  if exists (
    select 1
    from public.reservas
    where mercadopago_payment_id = p_mp_payment_id
  ) then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;

  select estado::text
  into v_estado
  from public.disponibilidades
  where id = p_disponibilidad_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'turno_no_existe');
  end if;

  if v_estado is distinct from 'disponible' then
    return jsonb_build_object('ok', false, 'reason', 'turno_ya_reservado');
  end if;

  update public.disponibilidades
  set estado = 'reservado'
  where id = p_disponibilidad_id
    and estado = 'disponible';

  insert into public.reservas (
    disponibilidad_id,
    organizador_id,
    monto_total,
    estado_pago,
    mercadopago_payment_id
  )
  values (
    p_disponibilidad_id,
    p_organizador_id,
    p_monto,
    'pagado',
    p_mp_payment_id
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
    p_organizador_id,
    p_monto,
    'pagado'
  );

  return jsonb_build_object('ok', true, 'reserva_id', v_reserva_id);
end;
$$;

revoke all on function public.confirmar_pago_desde_disponibilidad(uuid, uuid, text, numeric) from public;
grant execute on function public.confirmar_pago_desde_disponibilidad(uuid, uuid, text, numeric) to service_role;

