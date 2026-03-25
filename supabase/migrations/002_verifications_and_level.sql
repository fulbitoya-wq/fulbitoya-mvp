-- Verificación de identidad y nivel en usuarios
-- Ejecutá en Supabase SQL Editor

-- 1. Agregar verification_level a usuarios (0=basic, 1=phone_verified, 2=identity_verified)
alter table public.usuarios
  add column if not exists verification_level int not null default 0
  check (verification_level in (0, 1, 2));

comment on column public.usuarios.verification_level is '0=basic, 1=phone_verified, 2=identity_verified';

-- 2. Tabla verifications (user_id se relaciona con usuarios = auth.users)
create table if not exists public.verifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.usuarios(id) on delete cascade,
  dni_front text,
  dni_back text,
  selfie text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

create index if not exists idx_verifications_user_id on public.verifications(user_id);
create index if not exists idx_verifications_status on public.verifications(status);

alter table public.verifications enable row level security;

-- RLS: cada usuario ve solo su propia verificación; insert/update solo el propio
create policy "Usuarios ven su verificación"
  on public.verifications for select
  using (auth.uid() = user_id);

create policy "Usuarios pueden crear/actualizar su verificación"
  on public.verifications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Trigger para updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists verifications_updated_at on public.verifications;
create trigger verifications_updated_at
  before update on public.verifications
  for each row execute function public.set_updated_at();
