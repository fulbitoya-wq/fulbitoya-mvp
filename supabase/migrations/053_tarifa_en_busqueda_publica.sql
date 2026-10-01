-- Publicar modo de juego y tarifa en la lista de jugadores.
-- Mantiene el filtro de no listarse a uno mismo (052).

drop view if exists public.jugador_busqueda_contratacion;
drop view if exists public.jugador_busqueda_publica;

create view public.jugador_busqueda_publica as
select
  u.id,
  u.nombre,
  u.username,
  u.avatar_url,
  jp.zona,
  jp.puesto_principal,
  jp.puesto_secundario,
  jp.pierna,
  jp.formatos,
  jp.modo_juego,
  jp.tarifa_partido
from public.usuarios u
join public.jugador_perfiles jp on jp.usuario_id = u.id
where jp.busca_equipo = true
  and u.username is not null
  and (auth.uid() is null or u.id <> auth.uid());

alter view public.jugador_busqueda_publica set (security_invoker = false);
grant select on public.jugador_busqueda_publica to anon, authenticated;

create view public.jugador_busqueda_contratacion as
select
  u.id,
  u.nombre,
  u.username,
  u.avatar_url,
  jp.zona,
  jp.puesto_principal,
  jp.puesto_secundario,
  jp.pierna,
  jp.formatos,
  jp.modo_juego,
  jp.tarifa_partido
from public.usuarios u
join public.jugador_perfiles jp on jp.usuario_id = u.id
where jp.busca_equipo = true
  and u.username is not null
  and (auth.uid() is null or u.id <> auth.uid());

alter view public.jugador_busqueda_contratacion set (security_invoker = false);
grant select on public.jugador_busqueda_contratacion to authenticated;
