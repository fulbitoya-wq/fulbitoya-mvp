-- Tests reserva común PLC. Transacción + rollback.

begin;

do $$
declare
  v jsonb;
begin
  v := public.plc_cotizar_reserva('00000000-0000-0000-0000-000000000000', 'sena');
  if coalesce(v->>'ok','true') = 'true' then
    raise exception 'cotizar turno inexistente no falló';
  end if;
end $$;

rollback;
