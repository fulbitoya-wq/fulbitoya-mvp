-- Agregar columna role a equipo_miembros (captain | player)
-- Mantenemos es_capitan para no romper RLS existente; role es la fuente de verdad para la UI.

alter table public.equipo_miembros
  add column if not exists role text not null default 'player'
  check (role in ('captain', 'player'));

comment on column public.equipo_miembros.role is 'captain | player';

-- Rellenar role según es_capitan actual
update public.equipo_miembros
  set role = case when es_capitan then 'captain' else 'player' end;

-- Trigger: mantener es_capitan en sync con role (para RLS que usa es_capitan)
create or replace function public.equipo_miembros_sync_capitan()
returns trigger language plpgsql as $$
begin
  new.es_capitan := (new.role = 'captain');
  return new;
end;
$$;

drop trigger if exists equipo_miembros_sync_capitan on public.equipo_miembros;
create trigger equipo_miembros_sync_capitan
  before insert or update of role on public.equipo_miembros
  for each row execute function public.equipo_miembros_sync_capitan();
