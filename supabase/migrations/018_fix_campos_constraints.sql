-- Repara constraints en campos (por intento previo fallido de 016)
-- Ejecutá en Supabase SQL Editor después de 017 (o luego de 016 si ya corriste)

-- Asegura que nombre quede NOT NULL
alter table public.campos
  alter column nombre set not null;

-- Asegura check de tipo
alter table public.campos
  drop constraint if exists campos_tipo_check;

alter table public.campos
  add constraint campos_tipo_check
  check (tipo in ('5', '7', '9', '11'));

-- Asegura check de superficie
-- (Si tu constraint original tenía otro nombre, la re-declaramos con el nombre esperado)
do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.campos'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%superficie in%'
  loop
    execute format('alter table public.campos drop constraint if exists %I', c.conname);
  end loop;
end $$;

-- Asegura que el constraint esperado no exista antes de recrearlo
alter table public.campos
  drop constraint if exists campos_superficie_check;

alter table public.campos
  add constraint campos_superficie_check
  check (superficie in ('cesped_natural', 'cesped_sintetico', 'tierra', 'cemento'));

