-- RPC: obtener monto de la seña para crear preferencia de Mercado Pago
-- (evita RLS/policies en queries directas desde el backend)

create or replace function public.get_monto_reserva_para_mp(
  p_reserva_id uuid,
  p_organizador_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_monto numeric;
begin
  select monto_total
  into v_monto
  from public.reservas
  where id = p_reserva_id
    and organizador_id = p_organizador_id
    and estado_pago = 'pendiente';

  if v_monto is null then
    return jsonb_build_object('ok', false, 'error', 'reserva_invalid_o_procesada');
  end if;

  return jsonb_build_object('ok', true, 'monto', v_monto);
end;
$$;

revoke all on function public.get_monto_reserva_para_mp(uuid, uuid) from public;
grant execute on function public.get_monto_reserva_para_mp(uuid, uuid) to service_role;

