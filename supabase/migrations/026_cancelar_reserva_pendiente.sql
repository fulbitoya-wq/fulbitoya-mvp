-- Cancela una reserva pendiente si MP falla (para no dejarla en pendiente eternamente)

create or replace function public.cancelar_reserva_pendiente(
  p_reserva_id uuid,
  p_organizador_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int := 0;
begin
  update public.reservas
  set estado_pago = 'cancelado'
  where id = p_reserva_id
    and organizador_id = p_organizador_id
    and estado_pago = 'pendiente';

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    return jsonb_build_object('ok', false, 'error', 'no_hay_reserva_pendiente');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.cancelar_reserva_pendiente(uuid, uuid) from public;
grant execute on function public.cancelar_reserva_pendiente(uuid, uuid) to service_role;

