-- Tests reserva WhatsApp / reclamo OTP. Transacción + rollback.

begin;

do $$
declare
  v jsonb;
begin
  v := public.plc_ver_reclamo('noexiste');
  if coalesce(v->>'ok','true') = 'true' then
    raise exception 'ver reclamo token inválido no falló';
  end if;
  v := public.plc_cargar_reserva_whatsapp('00000000-0000-0000-0000-000000000000', 'Ana', '1112345678');
  if coalesce(v->>'ok','true') = 'true' then
    raise exception 'cargar sin auth no falló';
  end if;
  if public.plc_normalizar_tel('11 1234-5678') is distinct from '5491112345678' then
    raise exception 'normalizar tel AR falló: %', public.plc_normalizar_tel('11 1234-5678');
  end if;
end $$;

rollback;
