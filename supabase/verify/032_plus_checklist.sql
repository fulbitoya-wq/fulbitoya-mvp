-- Verificación de objetos del repo desde la migración 032 (inclusive).
-- Corré esto en el SQL Editor del proyecto remoto (rol postgres / dashboard).
-- Pegame el resultado completo (todas las filas). No incluye datos de usuarios.
--
-- estado = OK | FALTA

with expected(migracion, tipo, objeto) as (
  values
    -- 032
    ('032', 'type', 'public.desafio_estado'),
    ('032', 'table', 'public.desafios'),
    ('032', 'column', 'public.desafios.id'),
    ('032', 'column', 'public.desafios.owner_id'),
    ('032', 'column', 'public.desafios.cancha_id'),
    ('032', 'column', 'public.desafios.titulo'),
    ('032', 'column', 'public.desafios.tipo'),
    ('032', 'column', 'public.desafios.premio'),
    ('032', 'column', 'public.desafios.direccion'),
    ('032', 'column', 'public.desafios.barrio'),
    ('032', 'column', 'public.desafios.place_id'),
    ('032', 'column', 'public.desafios.lat'),
    ('032', 'column', 'public.desafios.lng'),
    ('032', 'column', 'public.desafios.fecha'),
    ('032', 'column', 'public.desafios.hora_inicio'),
    ('032', 'column', 'public.desafios.duracion_min'),
    ('032', 'column', 'public.desafios.descripcion'),
    ('032', 'column', 'public.desafios.estado'),
    ('032', 'column', 'public.desafios.created_at'),
    ('032', 'index', 'public.idx_desafios_owner'),
    ('032', 'index', 'public.idx_desafios_estado_fecha'),
    ('032', 'index', 'public.idx_desafios_geo'),
    ('032', 'policy', 'public.desafios.Desafios publicos abiertos'),
    ('032', 'policy', 'public.desafios.Owners insertan desafios'),
    ('032', 'policy', 'public.desafios.Owners actualizan desafios'),
    ('032', 'policy', 'public.desafios.Owners borran desafios'),
    ('032', 'column', 'public.match.direccion'),
    ('032', 'column', 'public.match.place_id'),
    ('032', 'column', 'public.match.lat'),
    ('032', 'column', 'public.match.lng'),
    ('032', 'column', 'public.canchas.place_id'),

    -- 033
    ('033', 'column', 'public.usuarios.origen_registro'),
    ('033', 'column', 'public.usuarios.avatar_url'),
    ('033', 'constraint', 'public.usuarios.usuarios_origen_registro_chk'),
    ('033', 'function', 'public.handle_new_user'),
    ('033', 'function', 'public.usuarios_prevent_rol_change'),
    ('033', 'trigger', 'auth.users.on_auth_user_created'),
    ('033', 'trigger', 'public.usuarios.trg_usuarios_prevent_rol_change'),
    ('033', 'policy', 'public.usuarios.Usuarios pueden actualizar su perfil'),

    -- 034
    ('034', 'column', 'public.usuarios.username'),
    ('034', 'constraint', 'public.usuarios.usuarios_username_format_chk'),
    ('034', 'index', 'public.uq_usuarios_username'),
    ('034', 'column', 'public.equipos.escudo_url'),
    ('034', 'column', 'public.equipos.formato_habitual'),
    ('034', 'column', 'public.equipos.activo'),
    ('034', 'column', 'public.equipo_miembros.rol'),
    ('034', 'column', 'public.equipo_miembros.estado'),
    ('034', 'constraint', 'public.equipo_miembros.equipo_miembros_rol_chk'),
    ('034', 'constraint', 'public.equipo_miembros.equipo_miembros_estado_chk'),
    ('034', 'index', 'public.uq_equipo_un_capitan_activo'),
    ('034', 'function', 'public.equipo_miembros_sync_capitan'),
    ('034', 'trigger', 'public.equipo_miembros.equipo_miembros_sync_capitan'),
    ('034', 'function', 'public.es_miembro'),
    ('034', 'function', 'public.es_capitan'),
    ('034', 'table', 'public.equipo_solicitudes'),
    ('034', 'column', 'public.equipo_solicitudes.id'),
    ('034', 'column', 'public.equipo_solicitudes.equipo_id'),
    ('034', 'column', 'public.equipo_solicitudes.usuario_id'),
    ('034', 'column', 'public.equipo_solicitudes.invitado_por'),
    ('034', 'column', 'public.equipo_solicitudes.tipo'),
    ('034', 'column', 'public.equipo_solicitudes.estado'),
    ('034', 'index', 'public.idx_equipo_solicitudes_equipo'),
    ('034', 'index', 'public.idx_equipo_solicitudes_usuario'),
    ('034', 'index', 'public.uq_equipo_solicitud_pendiente'),
    ('034', 'table', 'public.equipo_enlaces'),
    ('034', 'column', 'public.equipo_enlaces.id'),
    ('034', 'column', 'public.equipo_enlaces.equipo_id'),
    ('034', 'column', 'public.equipo_enlaces.token'),
    ('034', 'column', 'public.equipo_enlaces.activo'),
    ('034', 'column', 'public.equipo_enlaces.creado_por'),
    ('034', 'index', 'public.idx_equipo_enlaces_equipo'),
    ('034', 'index', 'public.uq_equipo_enlace_activo'),
    ('034', 'function', 'public.crear_equipo'),
    ('034', 'function', 'public.generar_enlace_equipo'),
    ('034', 'function', 'public.solicitar_ingreso_por_token'),
    ('034', 'function', 'public.invitar_jugador'),
    ('034', 'function', 'public.responder_solicitud'),
    ('034', 'function', 'public.salir_del_equipo'),
    ('034', 'function', 'public.transferir_capitania'),
    ('034', 'function', 'public.expulsar_jugador'),
    ('034', 'policy', 'public.equipos.Ver equipos activos autenticados'),
    ('034', 'policy', 'public.equipo_miembros.Leer miembros equipos activos'),
    ('034', 'policy', 'public.equipo_solicitudes.Leer solicitudes involucrados'),
    ('034', 'policy', 'public.equipo_enlaces.Leer enlace si miembro'),
    ('034', 'policy', 'public.equipos.Capitan edita equipo'),

    -- 035
    ('035', 'policy', 'public.usuarios.Auth ve perfiles para equipos'),
    ('035', 'policy', 'public.usuarios.Ver usuarios de mis equipos'),

    -- 036 (mismo constraint/función que 033, se re-chequea el texto)
    ('036', 'constraint_def', 'public.usuarios.usuarios_origen_registro_chk.porlacancha'),

    -- 037
    ('037', 'table', 'public.cuenta_eliminacion_solicitudes'),
    ('037', 'column', 'public.cuenta_eliminacion_solicitudes.id'),
    ('037', 'column', 'public.cuenta_eliminacion_solicitudes.email'),
    ('037', 'column', 'public.cuenta_eliminacion_solicitudes.created_at'),
    ('037', 'index', 'public.idx_cuenta_eliminacion_email'),
    ('037', 'policy', 'public.cuenta_eliminacion_solicitudes.Insertar solicitud eliminacion'),
    ('037', 'function', 'public.get_equipo_por_token'),

    -- 038 (función/trigger/policy ya listados en 033)

    -- 039
    ('039', 'table', 'public.desafio_inscripciones'),
    ('039', 'column', 'public.desafio_inscripciones.id'),
    ('039', 'column', 'public.desafio_inscripciones.desafio_id'),
    ('039', 'column', 'public.desafio_inscripciones.equipo_id'),
    ('039', 'column', 'public.desafio_inscripciones.created_at'),
    ('039', 'index', 'public.idx_desafio_inscripciones_desafio'),
    ('039', 'policy', 'public.desafio_inscripciones.Ver inscripciones publicas'),

    -- 040 / 042
    ('040', 'table', 'public.jugador_perfiles'),
    ('040', 'column', 'public.jugador_perfiles.usuario_id'),
    ('040', 'column', 'public.jugador_perfiles.apellido'),
    ('040', 'column', 'public.jugador_perfiles.zona'),
    ('040', 'column', 'public.jugador_perfiles.bio'),
    ('040', 'column', 'public.jugador_perfiles.puesto_principal'),
    ('040', 'column', 'public.jugador_perfiles.puesto_secundario'),
    ('040', 'column', 'public.jugador_perfiles.pierna'),
    ('040', 'column', 'public.jugador_perfiles.formatos'),
    ('040', 'column', 'public.jugador_perfiles.disponibilidad'),
    ('040', 'column', 'public.jugador_perfiles.updated_at'),
    ('040', 'policy', 'public.jugador_perfiles.Leer perfil futbolero'),
    ('040', 'policy', 'public.jugador_perfiles.Escribir propio perfil futbolero'),
    ('042', 'column', 'public.jugador_perfiles.fecha_nacimiento'),
    ('042', 'function', 'public.guardar_mi_perfil'),

    -- 044
    ('044', 'column', 'public.jugador_perfiles.busca_equipo'),
    ('044', 'view', 'public.jugador_busqueda_publica'),
    ('044', 'function', 'public.set_busca_equipo'),

    -- 045
    ('045', 'column', 'public.jugador_perfiles.modo_juego'),
    ('045', 'column', 'public.jugador_perfiles.tarifa_partido'),
    ('045', 'view', 'public.jugador_busqueda_contratacion'),
    ('045', 'function', 'public.set_modo_juego'),
    ('045', 'function', 'public.solicitar_eliminacion_cuenta'),
    ('045', 'table', 'public.cuenta_eliminacion_solicitudes'),

    -- 046
    ('046', 'table', 'public.jugador_favoritos'),
    ('046', 'column', 'public.jugador_favoritos.usuario_id'),
    ('046', 'column', 'public.jugador_favoritos.jugador_id'),
    ('046', 'function', 'public.toggle_favorito'),

    -- 047
    ('047', 'table', 'public.notificaciones'),
    ('047', 'column', 'public.notificaciones.usuario_id'),
    ('047', 'column', 'public.notificaciones.tipo'),
    ('047', 'column', 'public.notificaciones.leida_at'),
    ('047', 'table', 'public.preferencias_notificacion'),
    ('047', 'function', 'public.emitir_notificacion'),
    ('047', 'function', 'public.marcar_todas_notificaciones_leidas'),
    ('047', 'function', 'public.set_preferencia_notificacion'),

    -- 048
    ('048', 'column', 'public.desafios.cierre_inscripcion'),
    ('048', 'column', 'public.desafio_inscripciones.estado'),
    ('048', 'column', 'public.desafio_inscripciones.capitan_id'),
    ('048', 'table', 'public.desafio_convocados'),
    ('048', 'function', 'public.inscribir_equipo'),
    ('048', 'function', 'public.cancelar_inscripcion'),
    ('048', 'function', 'public.editar_convocados'),

    -- 049
    ('049', 'function', 'public.listar_mis_partidos'),

    -- 051
    ('051', 'function', 'public.es_owner_desafio')
),
found as (
  select 'table'::text as tipo, n.nspname || '.' || c.relname as objeto
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where c.relkind = 'r' and n.nspname = 'public'

  union all
  select 'view', n.nspname || '.' || c.relname
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where c.relkind = 'v' and n.nspname = 'public'

  union all
  select 'column', n.nspname || '.' || c.relname || '.' || a.attname
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  where a.attnum > 0 and not a.attisdropped and n.nspname in ('public') and c.relkind = 'r'

  union all
  select 'type', n.nspname || '.' || t.typname
  from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public'

  union all
  select 'function', n.nspname || '.' || p.proname
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'

  union all
  select 'policy', schemaname || '.' || tablename || '.' || policyname
  from pg_policies
  where schemaname = 'public'

  union all
  select 'index', schemaname || '.' || indexname
  from pg_indexes
  where schemaname = 'public'

  union all
  select 'constraint', n.nspname || '.' || c.relname || '.' || con.conname
  from pg_constraint con
  join pg_class c on c.oid = con.conrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'

  union all
  select 'trigger', n.nspname || '.' || c.relname || '.' || t.tgname
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where not t.tgisinternal
),
constraint_ok as (
  select
    '036'::text as migracion,
    'constraint_def'::text as tipo,
    'public.usuarios.usuarios_origen_registro_chk.porlacancha'::text as objeto,
    exists (
      select 1
      from pg_constraint con
      join pg_class c on c.oid = con.conrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'usuarios'
        and con.conname = 'usuarios_origen_registro_chk'
        and pg_get_constraintdef(con.oid) ilike '%porlacancha%'
    ) as ok
)
select
  e.migracion,
  e.tipo,
  e.objeto,
  case
    when e.tipo = 'constraint_def' then (select ok from constraint_ok)
    when exists (select 1 from found f where f.tipo = e.tipo and f.objeto = e.objeto) then true
    else false
  end as ok,
  case
    when e.tipo = 'constraint_def' and not (select ok from constraint_ok)
      then 'FALTA (el check no incluye porlacancha)'
    when e.tipo = 'constraint_def' then 'OK'
    when exists (select 1 from found f where f.tipo = e.tipo and f.objeto = e.objeto) then 'OK'
    else 'FALTA'
  end as estado
from expected e
order by e.migracion, e.tipo, e.objeto;
