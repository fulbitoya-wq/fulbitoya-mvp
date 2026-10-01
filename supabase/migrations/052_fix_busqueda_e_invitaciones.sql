-- Inbox de invitaciones sin embed ambiguo, y búsqueda sin el usuario logueado.

grant select on public.equipo_solicitudes to authenticated;

drop policy if exists "Leer solicitudes involucrados" on public.equipo_solicitudes;
create policy "Leer solicitudes involucrados"
  on public.equipo_solicitudes for select
  to authenticated
  using (
    usuario_id = auth.uid()
    or invitado_por = auth.uid()
    or public.es_capitan(equipo_id)
  );

create or replace function public.listar_invitaciones_recibidas()
returns table (
  id uuid,
  tipo text,
  estado text,
  usuario_id uuid,
  equipo_id uuid,
  created_at timestamptz,
  equipo_nombre text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id,
    s.tipo,
    s.estado,
    s.usuario_id,
    s.equipo_id,
    s.created_at,
    e.nombre as equipo_nombre
  from public.equipo_solicitudes s
  join public.equipos e on e.id = s.equipo_id
  where s.usuario_id = auth.uid()
    and s.tipo = 'invitacion'
    and s.estado = 'pendiente'
  order by s.created_at desc;
$$;

revoke all on function public.listar_invitaciones_recibidas() from public;
grant execute on function public.listar_invitaciones_recibidas() to authenticated;

-- Vista pública: busca_equipo + username, sin el propio usuario si hay sesión.
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
  and u.username is not null
  and (auth.uid() is null or u.id <> auth.uid());

alter view public.jugador_busqueda_publica set (security_invoker = false);
grant select on public.jugador_busqueda_publica to anon, authenticated;

create or replace view public.jugador_busqueda_contratacion as
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
