-- origen_registro: JugateLA pasa a PorLaCancha.
-- No toca Mercado Pago ni tablas de reservas.

alter table public.usuarios drop constraint if exists usuarios_origen_registro_chk;

update public.usuarios
set origen_registro = 'porlacancha'
where origen_registro = 'jugatela';

alter table public.usuarios
  add constraint usuarios_origen_registro_chk
  check (origen_registro is null or origen_registro in ('fulbitoya', 'porlacancha'));

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
    'jugador',
    v_origen,
    v_avatar
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
