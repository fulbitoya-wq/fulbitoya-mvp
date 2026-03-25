-- Detalles de predio (canchas) y detalles de campo (campos)
-- Ejecutá en Supabase SQL Editor después de 014/015

-- Predio / complejo
alter table public.canchas
  add column if not exists logo_url text,
  add column if not exists estacionamiento boolean default false,
  add column if not exists buffet boolean default false,
  add column if not exists vestuarios boolean default false;

-- Campo / terreno
alter table public.campos
  add column if not exists luz boolean default false,
  add column if not exists camaras boolean default false,
  add column if not exists minutero boolean default false,
  add column if not exists marcador_gol boolean default false,
  add column if not exists observaciones text;

-- Permitir también tipo '9' si querés ampliar el catálogo
do $$
declare
  c record;
begin
  -- Solo constraints CHECK (contype='c'). Las NOT NULL son contype='n' y no se tocan.
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.campos'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%tipo in%'
  loop
    execute format('alter table public.campos drop constraint if exists %I', c.conname);
  end loop;

  alter table public.campos
    drop constraint if exists campos_tipo_check;

  alter table public.campos
    add constraint campos_tipo_check
    check (tipo in ('5', '7', '9', '11'));
end $$;

-- Storage bucket para logos de predios
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'predio-logos',
  'predio-logos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- Políticas: lectura pública
create policy "Leer logos de predios (public)"
  on storage.objects for select
  to public
  using (bucket_id = 'predio-logos');

-- Políticas: subidas por owners autenticados
drop policy if exists "Subir logo predio autenticado" on storage.objects;
create policy "Subir logo predio autenticado"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'predio-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

