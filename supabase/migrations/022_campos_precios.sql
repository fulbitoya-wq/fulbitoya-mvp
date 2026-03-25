-- Campos: precio por hora y precio de reserva (seña)
alter table public.campos
  add column if not exists valor_hora numeric(10,2) not null default 0,
  add column if not exists valor_reserva numeric(10,2) not null default 0;

comment on column public.campos.valor_hora is 'Precio de la cancha por hora';
comment on column public.campos.valor_reserva is 'Monto de seña/reserva inicial';
