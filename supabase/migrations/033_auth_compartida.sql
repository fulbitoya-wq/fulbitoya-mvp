-- Auth compartida FulbitoYa / JugateLA
-- - origen_registro + avatar_url
-- - handle_new_user: siempre rol jugador, idempotente, mapea Google metadata
-- - el cliente no puede cambiar usuarios.rol

alter table public.usuarios
  add column if not exists origen_registro text,
  add column if not exists avatar_url text;

alter table public.usuarios drop constraint if exists usuarios_origen_registro_chk;
alter table public.usuarios
  add constraint usuarios_origen_registro_chk
  check (origen_registro is null or origen_registro in ('fulbitoya', 'jugatela'));

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
  if v_origen is null or v_origen not in ('fulbitoya', 'jugatela') then
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Bloquear cambio de rol cuando hay JWT de usuario (cliente).
-- service_role / jobs sin auth.uid() pueden actualizar rol en el flujo owner futuro.
create or replace function public.usuarios_prevent_rol_change()
returns trigger
language plpgsql
as $$
begin
  if new.rol is distinct from old.rol and auth.uid() is not null then
    raise exception 'El rol no se puede cambiar desde el cliente';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_usuarios_prevent_rol_change on public.usuarios;
create trigger trg_usuarios_prevent_rol_change
  before update on public.usuarios
  for each row execute function public.usuarios_prevent_rol_change();

drop policy if exists "Usuarios pueden actualizar su perfil" on public.usuarios;
create policy "Usuarios pueden actualizar su perfil"
  on public.usuarios
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
