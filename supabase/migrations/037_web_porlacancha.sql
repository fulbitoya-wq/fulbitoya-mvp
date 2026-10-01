-- Solicitudes de baja de cuenta (web pública) + ficha de equipo por token de enlace.
-- No toca Mercado Pago.

create table if not exists public.cuenta_eliminacion_solicitudes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_cuenta_eliminacion_email
  on public.cuenta_eliminacion_solicitudes (lower(email));

alter table public.cuenta_eliminacion_solicitudes enable row level security;

revoke all on table public.cuenta_eliminacion_solicitudes from public, anon, authenticated;

grant insert (email) on table public.cuenta_eliminacion_solicitudes to anon, authenticated;

drop policy if exists "Insertar solicitud eliminacion" on public.cuenta_eliminacion_solicitudes;
create policy "Insertar solicitud eliminacion"
  on public.cuenta_eliminacion_solicitudes
  for insert
  to anon, authenticated
  with check (
    email is not null
    and length(btrim(email)) >= 5
    and email ~* '^[^@]+@[^@]+\.[^@]+$'
  );

create or replace function public.get_equipo_por_token(p_token text)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_equipo_id uuid;
  v_nombre text;
  v_escudo text;
  v_formato text;
  v_zona text;
  v_miembros integer;
begin
  if p_token is null or btrim(p_token) = '' then
    return null;
  end if;

  select e.id, e.nombre, e.escudo_url, e.formato_habitual::text
  into v_equipo_id, v_nombre, v_escudo, v_formato
  from public.equipo_enlaces l
  join public.equipos e on e.id = l.equipo_id
  where l.token = p_token
    and l.activo = true
    and e.activo = true;

  if v_equipo_id is null then
    return null;
  end if;

  select nullif(
    concat_ws(
      ', ',
      nullif(loc.nombre, ''),
      nullif(par.nombre, ''),
      nullif(prov.nombre, '')
    ),
    ''
  )
  into v_zona
  from public.equipos e
  left join public.localidades loc on loc.id = e.localidad_id
  left join public.partidos par on par.id = e.partido_id
  left join public.provincias prov on prov.id = e.provincia_id
  where e.id = v_equipo_id;

  select count(*)::int
  into v_miembros
  from public.equipo_miembros em
  where em.equipo_id = v_equipo_id
    and em.estado = 'activo';

  return jsonb_build_object(
    'ok', true,
    'nombre', v_nombre,
    'escudo_url', v_escudo,
    'formato', v_formato,
    'zona', v_zona,
    'miembros', v_miembros
  );
end;
$$;

revoke all on function public.get_equipo_por_token(text) from public;
grant execute on function public.get_equipo_por_token(text) to anon, authenticated;
