-- Fondo de predio/complejo (separado del logo)
alter table public.canchas
  add column if not exists fondo_url text;

-- Bucket para fondos públicos de predios
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'predio-fondos',
  'predio-fondos',
  true,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- Lectura pública
drop policy if exists "Leer fondos de predios (public)" on storage.objects;
create policy "Leer fondos de predios (public)"
  on storage.objects for select
  to public
  using (bucket_id = 'predio-fondos');

-- Subida por owners autenticados (carpeta auth.uid())
drop policy if exists "Subir fondo predio autenticado" on storage.objects;
create policy "Subir fondo predio autenticado"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'predio-fondos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
