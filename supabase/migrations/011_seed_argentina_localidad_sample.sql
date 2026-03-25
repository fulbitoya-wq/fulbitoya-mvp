-- Seed mínimo para que el selector funcione
-- Provincia: Buenos Aires
-- Partido/Municipio: Esteban Echeverría
-- Localidad: Monte Grande (CP 1842)
-- Ejecutá en Supabase SQL Editor después de 010

do $$
declare
  prov_buenos_aires uuid;
  partido_esteban_echeverria uuid;
begin
  select p.id into prov_buenos_aires
  from public.provincias p
  where lower(p.nombre) = lower('Buenos Aires')
  limit 1;

  if prov_buenos_aires is null then
    insert into public.provincias (id, nombre)
    values (gen_random_uuid(), 'Buenos Aires')
    returning id into prov_buenos_aires;
  end if;

  select m.id into partido_esteban_echeverria
  from public.partidos m
  where m.provincia_id = prov_buenos_aires
    and (
      lower(m.nombre) = lower('Esteban Echeverría')
      or lower(m.nombre) = lower('Esteban Echeverria')
    )
  limit 1;

  if partido_esteban_echeverria is null then
    insert into public.partidos (id, nombre, provincia_id)
    values (
      gen_random_uuid(),
      'Esteban Echeverría',
      prov_buenos_aires
    )
    returning id into partido_esteban_echeverria;
  end if;

  -- Monte Grande, CP 1842
  insert into public.localidades (id, nombre, partido_id, codigo_postal, lat, lng)
  select
    gen_random_uuid(),
    'Monte Grande',
    partido_esteban_echeverria,
    '1842',
    null,
    null
  where not exists (
    select 1
    from public.localidades l
    where l.partido_id = partido_esteban_echeverria
      and lower(l.nombre) = lower('Monte Grande')
      and coalesce(l.codigo_postal, '') = '1842'
  );
end $$;

