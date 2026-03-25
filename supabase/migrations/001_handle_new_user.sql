-- Al crear un usuario en Auth, crear su fila en public.usuarios
-- Ejecutá este script en el SQL Editor de tu proyecto Supabase (Dashboard → SQL Editor)

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.usuarios (id, email, nombre, telefono, rol)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'nombre',
    new.raw_user_meta_data->>'telefono',
    coalesce(new.raw_user_meta_data->>'rol', 'jugador')
  );
  return new;
end;
$$;

-- Trigger: después de cada INSERT en auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
