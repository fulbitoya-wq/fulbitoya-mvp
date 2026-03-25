-- Simplify equipo_miembros RLS so creator can insert themselves when creating a team.
-- MVP: users can insert themselves; anyone can read team members.

drop policy if exists "Ver miembros del equipo" on public.equipo_miembros;
drop policy if exists "Agregar miembro solo capitán" on public.equipo_miembros;

create policy "Anyone can read team members"
  on public.equipo_miembros for select
  using (true);

create policy "Users can insert themselves as member"
  on public.equipo_miembros for insert
  with check (usuario_id = auth.uid());

-- Keep delete policy so users can leave or captain can remove
-- (existing "Eliminar miembro (capitán o uno mismo)" is fine)
