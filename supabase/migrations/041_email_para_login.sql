-- Resolver email de login a partir de email o teléfono (anon, sin devolver otros datos).

create or replace function public.email_para_login(p_identificador text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_raw text := btrim(coalesce(p_identificador, ''));
  v_digits text;
  v_email text;
begin
  if v_raw = '' then
    return null;
  end if;

  if position('@' in v_raw) > 0 then
    select u.email into v_email
    from public.usuarios u
    where lower(u.email) = lower(v_raw)
    limit 1;
    return v_email;
  end if;

  v_digits := regexp_replace(v_raw, '[^0-9]+', '', 'g');
  if length(v_digits) < 8 then
    return null;
  end if;

  select u.email into v_email
  from public.usuarios u
  where u.telefono is not null
    and btrim(u.telefono) <> ''
    and right(regexp_replace(u.telefono, '[^0-9]+', '', 'g'), 10) = right(v_digits, 10)
  limit 1;

  return v_email;
end;
$$;

revoke all on function public.email_para_login(text) from public;
grant execute on function public.email_para_login(text) to anon, authenticated;
