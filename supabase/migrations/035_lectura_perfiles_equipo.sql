-- Lectura de perfiles entre compañeros de equipo (plantel / invitaciones).
-- SELECT policies in Postgres are OR'd: el usuario sigue viendo su fila
-- y además cualquier autenticado puede leer perfiles (la app solo pide
-- id, username, nombre, avatar_url en listados).

drop policy if exists "Auth ve perfiles para equipos" on public.usuarios;
create policy "Auth ve perfiles para equipos"
  on public.usuarios
  for select
  to authenticated
  using (true);
