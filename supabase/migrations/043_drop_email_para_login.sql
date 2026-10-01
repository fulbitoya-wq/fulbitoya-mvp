-- Login solo con email+password. Esta RPC devolvía el email de otro usuario al anon.

revoke all on function public.email_para_login(text) from public;
revoke all on function public.email_para_login(text) from anon, authenticated;
drop function if exists public.email_para_login(text);

-- Por si alguien aplicó la 035 del repo (SELECT de toda la fila a cualquier autenticado).
drop policy if exists "Auth ve perfiles para equipos" on public.usuarios;
