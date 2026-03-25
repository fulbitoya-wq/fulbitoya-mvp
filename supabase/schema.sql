-- FulbitoYa! — Schema Supabase
-- Ejecutá este script en el SQL Editor de tu proyecto Supabase

-- Usuarios (perfil extendido de auth.users)
create table if not exists public.usuarios (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  nombre text,
  telefono text,
  rol text check (rol in ('owner', 'jugador')) default 'jugador',
  created_at timestamptz default now()
);

-- Canchas
create table if not exists public.canchas (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references public.usuarios(id) on delete cascade,
  nombre text not null,
  direccion text,
  barrio text,
  logo_url text,
  estacionamiento boolean default false,
  buffet boolean default false,
  vestuarios boolean default false,
  provincia_id uuid references public.provincias(id),
  partido_id uuid references public.partidos(id),
  localidad_id uuid references public.localidades(id),
  lat real,
  lng real,
  descripcion text,
  foto_url text,
  fondo_url text,
  activa boolean default true,
  created_at timestamptz default now()
);

-- Campos (terrenos dentro de una cancha)
create table if not exists public.campos (
  id uuid default gen_random_uuid() primary key,
  cancha_id uuid references public.canchas(id) on delete cascade,
  nombre text not null,
  tipo text check (tipo in ('5', '7', '9', '11')),
  superficie text check (superficie in ('cesped_natural', 'cesped_sintetico', 'tierra', 'cemento')),
  valor_hora numeric(10,2) not null default 0,
  valor_reserva numeric(10,2) not null default 0,
  luz boolean default false,
  camaras boolean default false,
  minutero boolean default false,
  marcador_gol boolean default false,
  foto_url text,
  -- Opcional (texto libre para el dueño)
  observaciones text,
  created_at timestamptz default now()
);

-- Disponibilidades (turnos ofrecidos por el owner)
create table if not exists public.disponibilidades (
  id uuid default gen_random_uuid() primary key,
  campo_id uuid references public.campos(id) on delete cascade,
  fecha date not null,
  hora_inicio time not null,
  hora_fin time not null,
  precio numeric(10,2) not null,
  estado text check (estado in ('disponible', 'reservado', 'bloqueado')) default 'disponible',
  created_at timestamptz default now()
);

-- Reservas
create table if not exists public.reservas (
  id uuid default gen_random_uuid() primary key,
  disponibilidad_id uuid references public.disponibilidades(id),
  organizador_id uuid references public.usuarios(id),
  monto_total numeric(10,2),
  mercadopago_payment_id text,
  mercadopago_preference_id text,
  estado_pago text check (estado_pago in ('pendiente', 'pagado', 'cancelado')) default 'pendiente',
  necesita_jugadores boolean default false,
  jugadores_necesarios int default 0,
  created_at timestamptz default now()
);

-- Split pago (jugadores que se suman a una reserva)
create table if not exists public.reserva_jugadores (
  id uuid default gen_random_uuid() primary key,
  reserva_id uuid references public.reservas(id) on delete cascade,
  jugador_id uuid references public.usuarios(id),
  monto numeric(10,2),
  estado_pago text check (estado_pago in ('pendiente', 'pagado', 'cancelado')) default 'pendiente',
  created_at timestamptz default now()
);

-- Habilitar RLS en todas las tablas
alter table public.usuarios enable row level security;
alter table public.canchas enable row level security;
alter table public.campos enable row level security;
alter table public.disponibilidades enable row level security;
alter table public.reservas enable row level security;
alter table public.reserva_jugadores enable row level security;

-- Políticas básicas (ajustar según reglas de negocio)
-- Usuarios: cada uno ve/edita su propio perfil
create policy "Usuarios pueden ver su perfil" on public.usuarios for select using (auth.uid() = id);
create policy "Usuarios pueden actualizar su perfil" on public.usuarios for update using (auth.uid() = id);
create policy "Usuarios pueden insertar su perfil" on public.usuarios for insert with check (auth.uid() = id);

-- Canchas: owners ven/editan las suyas; todos pueden leer activas
create policy "Todos pueden ver canchas activas" on public.canchas for select using (activa = true);
create policy "Owners gestionan sus canchas" on public.canchas for all using (auth.uid() = owner_id);

-- Campos: lectura pública; escritura solo owner de la cancha
create policy "Todos pueden ver campos" on public.campos for select using (true);
create policy "Owners gestionan campos de sus canchas" on public.campos for all using (
  exists (select 1 from public.canchas where id = campos.cancha_id and owner_id = auth.uid())
);

-- Disponibilidades: lectura pública; escritura owner
create policy "Todos pueden ver disponibilidades" on public.disponibilidades for select using (true);
create policy "Owners gestionan disponibilidades" on public.disponibilidades for all using (
  exists (
    select 1 from public.campos c
    join public.canchas ch on ch.id = c.cancha_id
    where c.id = disponibilidades.campo_id and ch.owner_id = auth.uid()
  )
);

-- Reservas y reserva_jugadores: políticas según organizador/jugador (simplificadas)
create policy "Usuarios ven sus reservas" on public.reservas for select using (
  organizador_id = auth.uid() or exists (
    select 1 from public.reserva_jugadores where reserva_id = reservas.id and jugador_id = auth.uid()
  )
);
create policy "Owners ven reservas de sus canchas" on public.reservas for select using (
  exists (
    select 1 from public.disponibilidades d
    join public.campos c on c.id = d.campo_id
    join public.canchas ch on ch.id = c.cancha_id
    where d.id = reservas.disponibilidad_id and ch.owner_id = auth.uid()
  )
);
create policy "Usuarios pueden crear reservas" on public.reservas for insert with check (organizador_id = auth.uid());

create policy "Jugadores ven sus filas en reserva_jugadores" on public.reserva_jugadores for select using (jugador_id = auth.uid());
create policy "Organizador ve jugadores de su reserva" on public.reserva_jugadores for select using (
  exists (select 1 from public.reservas where id = reserva_id and organizador_id = auth.uid())
);
create policy "Insert reserva_jugadores" on public.reserva_jugadores for insert with check (true);
