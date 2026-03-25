-- Team type selector + capacity + colors
-- Ejecutá en Supabase SQL Editor después de 008

alter table public.equipos
  add column if not exists tipo_equipo integer,
  add column if not exists capacidad_max integer,
  add column if not exists color_primario text,
  add column if not exists color_secundario text;

comment on column public.equipos.tipo_equipo is 'Tipo de equipo (5/7/11)';
comment on column public.equipos.capacidad_max is 'Capacidad máxima calculada (tipo_equipo * 2)';
comment on column public.equipos.color_primario is 'Color principal (HEX, ej. #FF0000)';
comment on column public.equipos.color_secundario is 'Color secundario (HEX, ej. #00FF00)';

