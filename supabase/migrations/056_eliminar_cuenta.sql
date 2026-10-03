-- Baja inmediata de la propia cuenta (App Store 5.1.1v). No borra equipos ajenos:
-- si sos capitán con plantel, hay que transferir antes.

create or replace function public.eliminar_mi_cuenta()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_nombres text;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;

  select string_agg(e.nombre, ', ' order by e.nombre)
  into v_nombres
  from public.equipo_miembros em
  join public.equipos e on e.id = em.equipo_id
  where em.usuario_id = uid
    and em.estado = 'activo'
    and (em.es_capitan = true or em.rol = 'capitan')
    and exists (
      select 1
      from public.equipo_miembros o
      where o.equipo_id = em.equipo_id
        and o.usuario_id <> uid
        and o.estado = 'activo'
    );

  if v_nombres is not null then
    return jsonb_build_object('ok', false, 'error', 'capitan_debe_transferir', 'equipos', v_nombres);
  end if;

  -- Equipos donde sos el único miembro activo: se cierran con la cuenta.
  delete from public.equipos e
  where e.id in (
    select em.equipo_id
    from public.equipo_miembros em
    where em.usuario_id = uid
      and em.estado = 'activo'
      and (em.es_capitan = true or em.rol = 'capitan')
      and not exists (
        select 1
        from public.equipo_miembros o
        where o.equipo_id = em.equipo_id
          and o.usuario_id <> uid
          and o.estado = 'activo'
      )
  );

  -- No borrar planteles ajenos si figurás como creado_por histórico.
  update public.equipos e
  set creado_por = c.usuario_id
  from public.equipo_miembros c
  where e.creado_por = uid
    and c.equipo_id = e.id
    and c.estado = 'activo'
    and (c.es_capitan = true or c.rol = 'capitan')
    and c.usuario_id <> uid;

  delete from auth.users where id = uid;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.eliminar_mi_cuenta() from public;
grant execute on function public.eliminar_mi_cuenta() to authenticated;

create or replace function public.solicitar_eliminacion_cuenta()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.eliminar_mi_cuenta();
end;
$$;
