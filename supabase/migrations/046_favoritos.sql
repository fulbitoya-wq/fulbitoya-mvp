-- Favoritos privados. Nadie ve quién lo marcó.

create table if not exists public.jugador_favoritos (
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  jugador_id uuid not null references public.usuarios(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (usuario_id, jugador_id),
  constraint jugador_favoritos_no_auto_chk check (usuario_id <> jugador_id)
);

create index if not exists idx_jugador_favoritos_jugador
  on public.jugador_favoritos (jugador_id);

alter table public.jugador_favoritos enable row level security;

drop policy if exists "Leer propios favoritos" on public.jugador_favoritos;
create policy "Leer propios favoritos"
  on public.jugador_favoritos
  for select
  to authenticated
  using (auth.uid() = usuario_id);

drop policy if exists "Crear propios favoritos" on public.jugador_favoritos;
create policy "Crear propios favoritos"
  on public.jugador_favoritos
  for insert
  to authenticated
  with check (auth.uid() = usuario_id and usuario_id <> jugador_id);

drop policy if exists "Borrar propios favoritos" on public.jugador_favoritos;
create policy "Borrar propios favoritos"
  on public.jugador_favoritos
  for delete
  to authenticated
  using (auth.uid() = usuario_id);

grant select, insert, delete on table public.jugador_favoritos to authenticated;

create or replace function public.toggle_favorito(p_jugador_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_on boolean;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  if p_jugador_id is null then
    return jsonb_build_object('ok', false, 'error', 'jugador_requerido');
  end if;
  if p_jugador_id = uid then
    return jsonb_build_object('ok', false, 'error', 'no_auto');
  end if;
  if not exists (select 1 from public.usuarios u where u.id = p_jugador_id) then
    return jsonb_build_object('ok', false, 'error', 'usuario_no_encontrado');
  end if;

  if exists (
    select 1 from public.jugador_favoritos
    where usuario_id = uid and jugador_id = p_jugador_id
  ) then
    delete from public.jugador_favoritos
    where usuario_id = uid and jugador_id = p_jugador_id;
    v_on := false;
  else
    insert into public.jugador_favoritos (usuario_id, jugador_id)
    values (uid, p_jugador_id);
    v_on := true;
  end if;

  return jsonb_build_object('ok', true, 'favorito', v_on);
end;
$$;

revoke all on function public.toggle_favorito(uuid) from public;
grant execute on function public.toggle_favorito(uuid) to authenticated;
