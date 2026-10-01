-- Listado público de jugadores que buscan equipo.
-- No toca migraciones anteriores. La vista no incluye email, teléfono ni fecha de nacimiento.

alter table public.jugador_perfiles
  add column if not exists busca_equipo boolean not null default false;

create index if not exists idx_jugador_perfiles_busca_equipo
  on public.jugador_perfiles (busca_equipo)
  where busca_equipo = true;

-- La tabla completa (incl. fecha_nacimiento) solo la lee el dueño.
drop policy if exists "Leer perfil futbolero" on public.jugador_perfiles;
create policy "Leer perfil futbolero"
  on public.jugador_perfiles
  for select
  using (auth.uid() = usuario_id);

revoke select on table public.jugador_perfiles from anon;

create or replace view public.jugador_busqueda_publica as
select
  u.id,
  u.nombre,
  u.username,
  u.avatar_url,
  jp.zona,
  jp.puesto_principal,
  jp.puesto_secundario,
  jp.pierna,
  jp.formatos
from public.usuarios u
join public.jugador_perfiles jp on jp.usuario_id = u.id
where jp.busca_equipo = true
  and u.username is not null;

alter view public.jugador_busqueda_publica set (security_invoker = false);

grant select on public.jugador_busqueda_publica to anon, authenticated;

create or replace function public.set_busca_equipo(p_activo boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;

  insert into public.jugador_perfiles (usuario_id, busca_equipo, updated_at)
  values (uid, coalesce(p_activo, false), now())
  on conflict (usuario_id) do update set
    busca_equipo = excluded.busca_equipo,
    updated_at = now();

  return jsonb_build_object('ok', true, 'busca_equipo', coalesce(p_activo, false));
end;
$$;

revoke all on function public.set_busca_equipo(boolean) from public;
grant execute on function public.set_busca_equipo(boolean) to authenticated;
