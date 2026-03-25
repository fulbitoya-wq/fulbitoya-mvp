-- Foto de campo (cancha/terreno)
-- Ejecutá en Supabase SQL Editor

alter table public.campos
  add column if not exists foto_url text;

-- Bucket para fotos públicas de campos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'campo-fotos',
  'campo-fotos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- Lectura pública
drop policy if exists "Leer fotos de campos (public)" on storage.objects;
create policy "Leer fotos de campos (public)"
  on storage.objects for select
  to public
  using (bucket_id = 'campo-fotos');

-- Subida por owners autenticados (por ahora restringimos por carpeta = auth.uid())
drop policy if exists "Subir foto campo autenticado" on storage.objects;
create policy "Subir foto campo autenticado"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'campo-fotos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

