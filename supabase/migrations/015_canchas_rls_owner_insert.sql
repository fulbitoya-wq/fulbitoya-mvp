-- Asegura RLS para que los dueños puedan insertar/actualizar canchas
-- Ejecutá en Supabase SQL Editor después de 014

alter table public.canchas enable row level security;

-- Recreate owner policy with explicit WITH CHECK so INSERT/UPDATE works
drop policy if exists "Owners gestionan sus canchas" on public.canchas;
drop policy if exists "Owners gestionan canchas" on public.canchas;

create policy "Owners gestionan sus canchas"
  on public.canchas for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

