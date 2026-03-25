-- Equipos, miembros e invitaciones
-- Ejecutá en Supabase SQL Editor después de 002

-- Tabla equipos (el creador es capitán vía equipo_miembros.es_capitan)
create table if not exists public.equipos (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  ciudad text,
  uniforme_color text,
  uniforme_imagen_url text,
  creado_por uuid not null references public.usuarios(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Miembros del equipo (capitán = uno por equipo)
create table if not exists public.equipo_miembros (
  id uuid default gen_random_uuid() primary key,
  equipo_id uuid not null references public.equipos(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  es_capitan boolean not null default false,
  created_at timestamptz default now(),
  unique(equipo_id, usuario_id)
);

create index if not exists idx_equipo_miembros_equipo on public.equipo_miembros(equipo_id);
create index if not exists idx_equipo_miembros_usuario on public.equipo_miembros(usuario_id);

-- Invitaciones pendientes (capitán invita por email; el usuario acepta o rechaza)
create table if not exists public.equipo_invitaciones (
  id uuid default gen_random_uuid() primary key,
  equipo_id uuid not null references public.equipos(id) on delete cascade,
  invitado_email text not null,
  invitado_id uuid references public.usuarios(id) on delete set null,
  invitado_por uuid not null references public.usuarios(id) on delete cascade,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'aceptada', 'rechazada')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_equipo_invitaciones_equipo on public.equipo_invitaciones(equipo_id);
create index if not exists idx_equipo_invitaciones_email on public.equipo_invitaciones(invitado_email);

alter table public.equipos enable row level security;
alter table public.equipo_miembros enable row level security;
alter table public.equipo_invitaciones enable row level security;

-- RLS equipos: ver todos; crear si verification_level >= 0; editar solo creador/capitán
create policy "Ver equipos"
  on public.equipos for select using (true);

create policy "Crear equipo"
  on public.equipos for insert
  with check (
    auth.uid() = creado_por
    and exists (
      select 1 from public.usuarios u
      where u.id = auth.uid() and u.verification_level >= 0
    )
  );

create policy "Editar equipo solo creador"
  on public.equipos for update
  using (creado_por = auth.uid());

-- RLS equipo_miembros: ver solo si sos miembro del mismo equipo; insert solo capitán
create policy "Ver miembros del equipo"
  on public.equipo_miembros for select
  using (
    usuario_id = auth.uid()
    or exists (
      select 1 from public.equipo_miembros em
      where em.equipo_id = equipo_miembros.equipo_id and em.usuario_id = auth.uid()
    )
  );

create policy "Agregar miembro solo capitán"
  on public.equipo_miembros for insert
  with check (
    exists (
      select 1 from public.equipo_miembros em
      where em.equipo_id = equipo_miembros.equipo_id
        and em.usuario_id = auth.uid()
        and em.es_capitan = true
    )
  );

create policy "Eliminar miembro (capitán o uno mismo)"
  on public.equipo_miembros for delete
  using (
    usuario_id = auth.uid()
    or exists (
      select 1 from public.equipo_miembros em
      where em.equipo_id = equipo_miembros.equipo_id
        and em.usuario_id = auth.uid() and em.es_capitan = true
    )
  );

-- RLS invitaciones
create policy "Ver invitaciones propias o del equipo"
  on public.equipo_invitaciones for select
  using (
    invitado_id = auth.uid()
    or invitado_email = (select email from public.usuarios where id = auth.uid())
    or invitado_por = auth.uid()
    or exists (
      select 1 from public.equipo_miembros em
      where em.equipo_id = equipo_invitaciones.equipo_id and em.usuario_id = auth.uid()
    )
  );

create policy "Crear invitación solo capitán"
  on public.equipo_invitaciones for insert
  with check (
    invitado_por = auth.uid()
    and exists (
      select 1 from public.equipo_miembros em
      where em.equipo_id = equipo_invitaciones.equipo_id
        and em.usuario_id = auth.uid() and em.es_capitan = true
    )
  );

create policy "Actualizar invitación (aceptar/rechazar)"
  on public.equipo_invitaciones for update
  using (
    invitado_id = auth.uid()
    or (select email from public.usuarios where id = auth.uid()) = invitado_email
  );

-- Trigger updated_at en equipos
drop trigger if exists equipos_updated_at on public.equipos;
create trigger equipos_updated_at
  before update on public.equipos
  for each row execute function public.set_updated_at();

drop trigger if exists equipo_invitaciones_updated_at on public.equipo_invitaciones;
create trigger equipo_invitaciones_updated_at
  before update on public.equipo_invitaciones
  for each row execute function public.set_updated_at();
