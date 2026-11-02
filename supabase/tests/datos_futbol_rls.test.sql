-- T27 — Permisos de los datos de fútbol (F02 CA12, B-R2; F01 V6).
-- Los usuarios autenticados solo leen las 7 tablas de fútbol; no crean, modifican ni borran nada,
-- no ven `sincronizacion` y no ejecutan las funciones de sincronización. `anon` no lee nada.
-- Todo corre dentro de una transacción que se deshace al final.
begin;

select plan(45);

-- ---------------------------------------------------------------------------
-- Datos de prueba (como postgres): una fila en cada tabla
-- ---------------------------------------------------------------------------

insert into public.liga (proveedor_id, nombre, pais) values (999262, 'Liga de Prueba', 'Mexico');

insert into public.torneo (
  liga_id, nombre, temporada_proveedor, prefijo_rondas, fecha_inicio, fecha_fin
)
select id, 'Apertura 2099', 2099, 'Apertura', '2099-07-01', '2099-12-31'
from public.liga where proveedor_id = 999262;

insert into public.jornada (
  torneo_id, orden, nombre, nombres_proveedor, fase, fecha_inicio, fecha_fin
)
select id, 1, 'Jornada 1', array['Apertura - 1'], 'REGULAR', '2099-07-05', '2099-07-05'
from public.torneo where temporada_proveedor = 2099;

insert into public.equipo (proveedor_id, nombre, nombre_corto, escudo_url)
values
  (999001, 'Local de Prueba', 'Local', 'https://example.com/l.png'),
  (999002, 'Visitante de Prueba', 'Visitante', 'https://example.com/v.png');

insert into public.partido (
  proveedor_id, torneo_id, jornada_id, equipo_local_id, equipo_visitante_id, inicio,
  cierre_predicciones, estado, goles_local, goles_visitante, sincronizado_en
)
select 9990011, j.torneo_id, j.id,
  (select id from public.equipo where proveedor_id = 999001),
  (select id from public.equipo where proveedor_id = 999002),
  '2099-07-05 20:00+00', '2099-07-05 20:00+00', 'TERMINADO', 2, 1, now()
from public.jornada j join public.torneo t on t.id = j.torneo_id
where t.temporada_proveedor = 2099;

insert into public.estadistica_partido (partido_id, equipo_id, tipo, valor)
select p.id, p.equipo_local_id, 'Total Shots', '17'
from public.partido p where p.proveedor_id = 9990011;

insert into public.evento_partido (partido_id, equipo_id, minuto, tipo, detalle)
select p.id, p.equipo_local_id, 27, 'GOL', 'Normal Goal'
from public.partido p where p.proveedor_id = 9990011;

insert into public.sincronizacion (tipo, estado, consultas_usadas)
values ('CARGA_INICIAL', 'EXITO', 2);

-- Huella de las 8 tablas, para comprobar al final que nada cambió.
create function pg_temp.huella()
returns table (tabla text, huella text)
language sql
as $$
  select 'liga', md5(coalesce(string_agg(x::text, ',' order by x::text), '')) from public.liga x
  union all
  select 'torneo', md5(coalesce(string_agg(x::text, ',' order by x::text), '')) from public.torneo x
  union all
  select 'jornada', md5(coalesce(string_agg(x::text, ',' order by x::text), '')) from public.jornada x
  union all
  select 'equipo', md5(coalesce(string_agg(x::text, ',' order by x::text), '')) from public.equipo x
  union all
  select 'partido', md5(coalesce(string_agg(x::text, ',' order by x::text), '')) from public.partido x
  union all
  select 'estadistica_partido', md5(coalesce(string_agg(x::text, ',' order by x::text), ''))
  from public.estadistica_partido x
  union all
  select 'evento_partido', md5(coalesce(string_agg(x::text, ',' order by x::text), ''))
  from public.evento_partido x
  union all
  select 'sincronizacion', md5(coalesce(string_agg(x::text, ',' order by x::text), ''))
  from public.sincronizacion x
$$;
create temporary table huella_antes as select * from pg_temp.huella();

select is(
  (
    select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relrowsecurity and c.relname = any (array[
      'liga', 'torneo', 'jornada', 'equipo', 'partido', 'estadistica_partido', 'evento_partido',
      'sincronizacion'
    ])
  ),
  8::bigint,
  'RLS activado en las 8 tablas de fútbol'
);

-- ---------------------------------------------------------------------------
-- Como usuario autenticado
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

-- B-R2: lee las 7 tablas de fútbol.
select ok(exists (select 1 from public.liga where proveedor_id = 999262), 'authenticated lee liga');
select ok(exists (select 1 from public.torneo where temporada_proveedor = 2099),
  'authenticated lee torneo');
select ok(exists (select 1 from public.jornada where nombre = 'Jornada 1'),
  'authenticated lee jornada');
select ok(exists (select 1 from public.equipo where proveedor_id = 999001),
  'authenticated lee equipo');
select ok(exists (select 1 from public.partido where proveedor_id = 9990011),
  'authenticated lee partido');
select ok(exists (select 1 from public.estadistica_partido where valor = '17'),
  'authenticated lee estadistica_partido');
select ok(exists (select 1 from public.evento_partido where minuto = 27),
  'authenticated lee evento_partido');

-- CA12: no crea.
select throws_ok($$ insert into public.liga (proveedor_id, nombre, pais) values (1, 'x', 'x') $$,
  '42501', null, 'authenticated no crea ligas');
select throws_ok($$
  insert into public.torneo (liga_id, nombre, temporada_proveedor, prefijo_rondas, fecha_inicio, fecha_fin)
  select liga_id, 'x', 2098, 'x', fecha_inicio, fecha_fin from public.torneo limit 1
$$, '42501', null, 'authenticated no crea torneos');
select throws_ok($$
  insert into public.jornada (torneo_id, orden, nombre, nombres_proveedor, fase, fecha_inicio, fecha_fin)
  select torneo_id, 2, 'x', array['x'], 'REGULAR', fecha_inicio, fecha_fin from public.jornada limit 1
$$, '42501', null, 'authenticated no crea jornadas');
select throws_ok($$
  insert into public.equipo (proveedor_id, nombre, nombre_corto, escudo_url) values (1, 'x', 'x', 'x')
$$, '42501', null, 'authenticated no crea equipos');
select throws_ok($$
  insert into public.partido (
    proveedor_id, torneo_id, jornada_id, equipo_local_id, equipo_visitante_id, inicio,
    cierre_predicciones, sincronizado_en
  )
  select 1, torneo_id, jornada_id, equipo_visitante_id, equipo_local_id, inicio, inicio, now()
  from public.partido limit 1
$$, '42501', null, 'authenticated no crea partidos');
select throws_ok($$
  insert into public.estadistica_partido (partido_id, equipo_id, tipo, valor)
  select partido_id, equipo_id, 'x', 'x' from public.estadistica_partido limit 1
$$, '42501', null, 'authenticated no crea estadísticas');
select throws_ok($$
  insert into public.evento_partido (partido_id, equipo_id, minuto, tipo, detalle)
  select partido_id, equipo_id, 1, 'GOL', 'x' from public.evento_partido limit 1
$$, '42501', null, 'authenticated no crea eventos');

-- CA12: no modifica.
select throws_ok($$ update public.liga set nombre = 'x' $$, '42501', null,
  'authenticated no modifica ligas');
select throws_ok($$ update public.torneo set es_actual = true $$, '42501', null,
  'authenticated no modifica torneos');
select throws_ok($$ update public.jornada set esta_cerrada = true $$, '42501', null,
  'authenticated no modifica jornadas');
select throws_ok($$ update public.equipo set nombre_corto = 'x' $$, '42501', null,
  'authenticated no modifica equipos');
select throws_ok($$ update public.partido set goles_local = 9 $$, '42501', null,
  'authenticated no modifica partidos (marcador)');
select throws_ok($$ update public.estadistica_partido set valor = 'x' $$, '42501', null,
  'authenticated no modifica estadísticas');
select throws_ok($$ update public.evento_partido set minuto = 1 $$, '42501', null,
  'authenticated no modifica eventos');

-- CA12: no borra.
select throws_ok($$ delete from public.liga $$, '42501', null, 'authenticated no borra ligas');
select throws_ok($$ delete from public.torneo $$, '42501', null, 'authenticated no borra torneos');
select throws_ok($$ delete from public.jornada $$, '42501', null,
  'authenticated no borra jornadas');
select throws_ok($$ delete from public.equipo $$, '42501', null, 'authenticated no borra equipos');
select throws_ok($$ delete from public.partido $$, '42501', null,
  'authenticated no borra partidos');
select throws_ok($$ delete from public.estadistica_partido $$, '42501', null,
  'authenticated no borra estadísticas');
select throws_ok($$ delete from public.evento_partido $$, '42501', null,
  'authenticated no borra eventos');

-- `sincronizacion` es operativa: cerrada para los usuarios.
select throws_ok($$ select * from public.sincronizacion $$, '42501', null,
  'authenticated no lee sincronizacion');
select throws_ok($$ insert into public.sincronizacion (tipo) values ('CARGA_INICIAL') $$, '42501',
  null, 'authenticated no escribe en sincronizacion');

-- Funciones: las de sincronización solo para el servidor; la jornada actual sí (S02). Se revisa
-- el permiso de la función en sí: intentar ejecutarla fallaría de todos modos por las tablas.
select ok(not has_function_privilege('public.guardar_carga_inicial(jsonb)', 'execute'),
  'authenticated no ejecuta guardar_carga_inicial');
select ok(not has_function_privilege('public.actualizar_estados_partidos(jsonb)', 'execute'),
  'authenticated no ejecuta actualizar_estados_partidos');
select ok(not has_function_privilege('public.guardar_datos_partido(jsonb)', 'execute'),
  'authenticated no ejecuta guardar_datos_partido');
select ok(
  not has_function_privilege('public.partidos_pendientes_de_final(timestamptz)', 'execute'),
  'authenticated no ejecuta partidos_pendientes_de_final'
);
select lives_ok($$ select public.jornada_actual() $$, 'authenticated ejecuta jornada_actual');

-- ---------------------------------------------------------------------------
-- Como anon (sin sesión): no lee nada (F01 V6)
-- ---------------------------------------------------------------------------

reset role;
set local role anon;

select throws_ok($$ select * from public.liga $$, '42501', null, 'anon no lee liga');
select throws_ok($$ select * from public.torneo $$, '42501', null, 'anon no lee torneo');
select throws_ok($$ select * from public.jornada $$, '42501', null, 'anon no lee jornada');
select throws_ok($$ select * from public.equipo $$, '42501', null, 'anon no lee equipo');
select throws_ok($$ select * from public.partido $$, '42501', null, 'anon no lee partido');
select throws_ok($$ select * from public.estadistica_partido $$, '42501', null,
  'anon no lee estadistica_partido');
select throws_ok($$ select * from public.evento_partido $$, '42501', null,
  'anon no lee evento_partido');
select throws_ok($$ select * from public.sincronizacion $$, '42501', null,
  'anon no lee sincronizacion');

-- ---------------------------------------------------------------------------
-- Como postgres: nada cambió
-- ---------------------------------------------------------------------------

reset role;

select results_eq(
  $$ select * from pg_temp.huella() order by tabla $$,
  $$ select * from huella_antes order by tabla $$,
  'Ninguna de las 8 tablas cambió'
);

select * from finish();
rollback;
