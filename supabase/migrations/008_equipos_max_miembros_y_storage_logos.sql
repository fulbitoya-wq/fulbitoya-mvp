-- Capacidad máxima de miembros por equipo y bucket para logos
-- Ejecutá en Supabase SQL Editor después de 007

alter table public.equipos
  add column if not exists max_miembros integer;

comment on column public.equipos.max_miembros is 'Cantidad máxima de jugadores en el equipo (null = sin límite)';

-- Bucket público para logos de equipos (crear solo si no existe)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'equipo-logos',
  'equipo-logos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- Política: usuarios autenticados pueden subir en su carpeta (user_id/nombre_archivo)
create policy "Subir logo de equipo"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'equipo-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Política: lectura pública para mostrar logos
create policy "Leer logos de equipos"
  on storage.objects for select
  to public
  using (bucket_id = 'equipo-logos');

-- Opcional: permitir al usuario borrar sus propios archivos en su carpeta
create policy "Borrar propio logo"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'equipo-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
