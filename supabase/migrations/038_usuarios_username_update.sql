-- Confirmar que el cliente puede setear usuarios.username.
-- El trigger de 033 solo bloquea cambio de rol; el resto del perfil (username incluido) se permite.
-- RLS UPDATE: misma fila, mismo uid.

create or replace function public.usuarios_prevent_rol_change()
returns trigger
language plpgsql
as $$
begin
  if new.rol is distinct from old.rol and auth.uid() is not null then
    raise exception 'El rol no se puede cambiar desde el cliente';
  end if;
  -- username, telefono, nombre, avatar_url, origen_registro, etc. no se tocan acá
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
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

grant select, insert, update on table public.usuarios to authenticated;
