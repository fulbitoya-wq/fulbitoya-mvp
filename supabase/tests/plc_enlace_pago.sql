-- Tests enlace de pago. Transacción + rollback.

begin;

do $$
declare
  v jsonb;
begin
  v := public.plc_ver_enlace('noexiste');
  if coalesce(v->>'ok','true') = 'true' then
    raise exception 'ver enlace inválido no falló';
  end if;
  v := public.plc_predio_publico('no-existe-slug');
  if coalesce(v->>'ok','true') = 'true' then
    raise exception 'predio slug inválido no falló';
  end if;
end $$;

rollback;
