-- Asegura que el owner pueda insertar/actualizar campos
-- Ejecutá en Supabase SQL Editor después de 016/antes si ya probaste inserts.

alter table public.campos enable row level security;

drop policy if exists "Owners gestionan campos de sus canchas" on public.campos;

create policy "Owners gestionan campos de sus canchas"
  on public.campos for all
  using (
    exists (
      select 1
      from public.canchas
      where id = campos.cancha_id
        and owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.canchas
      where id = campos.cancha_id
        and owner_id = auth.uid()
    )
  );

