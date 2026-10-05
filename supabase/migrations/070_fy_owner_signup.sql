-- Altas desde FulbitoYa quedan como dueño de predio.
-- No toca Mercado Pago ni migraciones anteriores.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text;
  v_avatar text;
  v_origen text;
  v_rol text;
begin
  v_nombre := coalesce(
    nullif(btrim(new.raw_user_meta_data->>'nombre'), ''),
    nullif(btrim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data->>'name'), '')
  );
  v_avatar := coalesce(
    nullif(btrim(new.raw_user_meta_data->>'avatar_url'), ''),
    nullif(btrim(new.raw_user_meta_data->>'picture'), '')
  );
  v_origen := new.raw_user_meta_data->>'origen_registro';
  if v_origen = 'jugatela' then
    v_origen := 'porlacancha';
  end if;
  if v_origen is null or v_origen not in ('fulbitoya', 'porlacancha') then
    v_origen := null;
  end if;

  v_rol := case when v_origen = 'fulbitoya' then 'owner' else 'jugador' end;

  insert into public.usuarios (
    id,
    email,
    nombre,
    telefono,
    rol,
    origen_registro,
    avatar_url
  )
  values (
    new.id,
    new.email,
    v_nombre,
    new.raw_user_meta_data->>'telefono',
    v_rol,
    v_origen,
    v_avatar
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.fy_asegurar_owner()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  update public.usuarios
  set rol = 'owner'
  where id = auth.uid()
    and rol is distinct from 'owner';
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.fy_asegurar_owner() from public;
grant execute on function public.fy_asegurar_owner() to authenticated;
