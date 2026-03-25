-- Team invitations (new table for invite flow)
-- Do not modify existing tables.

create table if not exists public.team_invitations (
  id uuid default gen_random_uuid() primary key,
  equipo_id uuid not null references public.equipos(id) on delete cascade,
  email text not null,
  invited_user_id uuid references public.usuarios(id) on delete set null,
  invited_by uuid not null references public.usuarios(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz default now()
);

create index if not exists idx_team_invitations_equipo on public.team_invitations(equipo_id);
create index if not exists idx_team_invitations_email on public.team_invitations(email);
create index if not exists idx_team_invitations_status on public.team_invitations(status);

alter table public.team_invitations enable row level security;

-- Anyone can read (to show in dashboard by email)
create policy "Anyone can read team_invitations"
  on public.team_invitations for select using (true);

-- Captain can insert (invite)
create policy "Captain can invite"
  on public.team_invitations for insert
  with check (
    invited_by = auth.uid()
    and exists (
      select 1 from public.equipo_miembros em
      where em.equipo_id = team_invitations.equipo_id
        and em.usuario_id = auth.uid() and em.es_capitan = true
    )
  );

-- Invitee can update (accept/reject)
create policy "Invitee can update status"
  on public.team_invitations for update
  using (
    invited_user_id = auth.uid()
    or (select email from public.usuarios where id = auth.uid()) = email
  );
