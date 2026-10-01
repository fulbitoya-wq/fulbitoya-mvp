-- QA: Mis partidos incluye plantel inscripto (no solo capitán/convocado).
create or replace function public.listar_mis_partidos()
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

  return jsonb_build_object(
    'ok', true,
    'items', coalesce((
      select jsonb_agg(x.row order by x.fecha asc, x.hora_inicio asc)
      from (
        select distinct on (d.id)
          d.fecha,
          d.hora_inicio,
          jsonb_build_object(
            'id', d.id,
            'titulo', d.titulo,
            'tipo', d.tipo,
            'premio', d.premio,
            'direccion', d.direccion,
            'barrio', d.barrio,
            'lat', d.lat,
            'lng', d.lng,
            'fecha', d.fecha,
            'hora_inicio', d.hora_inicio,
            'duracion_min', d.duracion_min,
            'descripcion', d.descripcion,
            'estado', d.estado,
            'cancha_id', d.cancha_id,
            'inscripcion_id', i.id,
            'inscripcion_estado', i.estado,
            'mi_equipo_id', e.id,
            'mi_equipo_nombre', e.nombre,
            'mi_rol', case
              when public.es_capitan(i.equipo_id) then 'capitan'
              when exists (
                select 1 from public.desafio_convocados c
                where c.inscripcion_id = i.id and c.usuario_id = uid
              ) then 'convocado'
              else 'plantel'
            end
          ) as row
        from public.desafio_inscripciones i
        join public.desafios d on d.id = i.desafio_id
        join public.equipos e on e.id = i.equipo_id
        where (
          i.capitan_id = uid
          or public.es_miembro(i.equipo_id)
          or exists (
            select 1 from public.desafio_convocados c
            where c.inscripcion_id = i.id and c.usuario_id = uid
          )
        )
        order by d.id, case
          when public.es_capitan(i.equipo_id) then 0
          when i.capitan_id = uid then 1
          else 2
        end, i.created_at desc
      ) x
    ), '[]'::jsonb)
  );
end;
$$;
