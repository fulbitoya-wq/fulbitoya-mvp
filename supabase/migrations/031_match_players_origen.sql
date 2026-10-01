-- Diferencia entre invitación del organizador y solicitud del jugador

do $$
begin
  if not exists (select 1 from pg_type where typname = 'match_player_origen') then
    create type public.match_player_origen as enum ('invitacion', 'solicitud');
  end if;
end$$;

alter table public.match_players
  add column if not exists origen public.match_player_origen not null default 'invitacion';
