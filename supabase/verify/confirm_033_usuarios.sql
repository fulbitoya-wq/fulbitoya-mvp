-- Confirmá si 033 es FALTA real o falso negativo del checklist
-- (el checklist solo mira tablas pg_class.relkind = 'r').
-- Pegame este resultado junto con el de repair si lo corrés.

select c.relkind as usuarios_relkind
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'usuarios';

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'usuarios'
  and column_name in ('avatar_url', 'origen_registro')
order by 1;

select policyname
from pg_policies
where schemaname = 'public'
  and tablename = 'usuarios'
order by 1;
