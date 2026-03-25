-- Agrega ubicación a canchas para soportar "cerca de tu lugar"
-- Ejecutá en Supabase SQL Editor después de 010 (o después de haber creado la seed)

alter table public.canchas
  add column if not exists provincia_id uuid references public.provincias(id),
  add column if not exists partido_id uuid references public.partidos(id),
  add column if not exists localidad_id uuid references public.localidades(id),
  add column if not exists lat real,
  add column if not exists lng real;

create index if not exists idx_canchas_provincia on public.canchas(provincia_id);
create index if not exists idx_canchas_partido on public.canchas(partido_id);
create index if not exists idx_canchas_localidad on public.canchas(localidad_id);

