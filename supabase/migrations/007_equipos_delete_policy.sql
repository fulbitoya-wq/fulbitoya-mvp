-- Allow team creator to delete the team (cascade removes equipo_miembros).
-- No table structure changes.

create policy "Creador puede eliminar equipo"
  on public.equipos for delete
  using (creado_por = auth.uid());
