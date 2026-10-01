-- Listar jugadores con busca_equipo aunque todavía no tengan username.

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
  and (auth.uid() is null or u.id <> auth.uid());

alter view public.jugador_busqueda_contratacion set (security_invoker = false);
grant select on public.jugador_busqueda_contratacion to authenticated;

create or replace function public.invitar_jugador(p_equipo_id uuid, p_identificador text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_target uuid;
  v_id text;
  v_nombre text;
  v_quien text;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;
  if not public.es_capitan(p_equipo_id) then
    return jsonb_build_object('ok', false, 'error', 'no_capitan');
  end if;

  v_id := lower(btrim(p_identificador));
  if v_id = '' then
    return jsonb_build_object('ok', false, 'error', 'identificador_requerido');
  end if;

  select u.id into v_target
  from public.usuarios u
  where u.id::text = btrim(p_identificador)
     or u.username = v_id
     or u.telefono = btrim(p_identificador)
  limit 1;

  if v_target is null then
    return jsonb_build_object('ok', false, 'error', 'usuario_no_encontrado');
  end if;
  if v_target = v_user then
    return jsonb_build_object('ok', false, 'error', 'no_auto_invitar');
  end if;

  if exists (
    select 1 from public.equipo_miembros
    where equipo_id = p_equipo_id and usuario_id = v_target and estado = 'activo'
  ) then
    return jsonb_build_object('ok', false, 'error', 'ya_es_miembro');
  end if;

  insert into public.equipo_solicitudes (equipo_id, usuario_id, invitado_por, tipo, estado)
  values (p_equipo_id, v_target, v_user, 'invitacion', 'pendiente');

  select e.nombre into v_nombre from public.equipos e where e.id = p_equipo_id;
  v_quien := coalesce(public.etiqueta_jugador(v_user), 'Alguien');

  perform public.emitir_notificacion(
    v_target,
    'invitacion_equipo',
    'Te invitaron a un equipo',
    v_quien || ' te invitó a ' || coalesce(v_nombre, 'un equipo') || '.',
    jsonb_build_object('equipo_id', p_equipo_id, 'destino', 'inbox')
  );

  return jsonb_build_object('ok', true, 'usuario_id', v_target);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'ya_pendiente');
end;
$$;

