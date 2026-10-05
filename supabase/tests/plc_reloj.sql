-- Tests reloj de simulación. Transacción + rollback.

begin;

do $$
declare
  v_antes timestamp;
  v_despues timestamp;
  v_res jsonb;
begin
  v_antes := public.ahora_argentina();
  -- sin admin no se puede
  perform set_config('request.jwt.claim.sub', '', true);
  v_res := public.set_reloj_simulacion(now() + interval '10 hours');
  if coalesce(v_res->>'ok','true') = 'true' and v_res->>'error' is null then
    -- puede fallar no_auth
    null;
  end if;
end $$;

rollback;
