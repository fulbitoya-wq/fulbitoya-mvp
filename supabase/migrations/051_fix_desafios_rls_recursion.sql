-- Corta el bucle RLS: desafios ↔ desafio_convocados.
-- Lectura pública de desafíos no debe consultar convocados.
-- Quien necesita ver un desafío pasado usa listar_mis_partidos (security definer).

create or replace function public.es_owner_desafio(p_desafio_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.desafios d
    where d.id = p_desafio_id
      and d.owner_id = auth.uid()
  );
$$;

revoke all on function public.es_owner_desafio(uuid) from public;
grant execute on function public.es_owner_desafio(uuid) to authenticated;

drop policy if exists "Desafios publicos abiertos" on public.desafios;
create policy "Desafios publicos abiertos"
  on public.desafios
  for select
  using (
    estado in ('abierto', 'completo')
    or owner_id = auth.uid()
    or exists (
      select 1
      from public.desafio_inscripciones i
      where i.desafio_id = desafios.id
        and (
          i.capitan_id = auth.uid()
          or public.es_miembro(i.equipo_id)
        )
    )
  );

drop policy if exists "Leer convocados involucrados" on public.desafio_convocados;
create policy "Leer convocados involucrados"
  on public.desafio_convocados
  for select
  to authenticated
  using (
    usuario_id = auth.uid()
    or public.es_owner_desafio(desafio_id)
    or exists (
      select 1
      from public.desafio_inscripciones i
      where i.id = desafio_convocados.inscripcion_id
        and public.es_miembro(i.equipo_id)
    )
  );
