-- T26 — `jornada_actual` (F02 Q4): jornada del próximo partido por jugar del torneo actual, o la
-- última si el torneo terminó. Todo corre dentro de una transacción que se deshace al final.
begin;

select plan(9);

-- ---------------------------------------------------------------------------
-- Datos de prueba (como postgres): un torneo actual con 3 jornadas y otro que no es actual
-- ---------------------------------------------------------------------------

insert into public.liga (proveedor_id, nombre, pais) values (999262, 'Liga de Prueba', 'Mexico');

insert into public.torneo (
  liga_id, nombre, temporada_proveedor, prefijo_rondas, fecha_inicio, fecha_fin, es_actual
)
select id, t.nombre, 2099, t.prefijo, '2099-07-01', '2099-12-31', t.actual
from public.liga, (values ('Apertura 2099', 'Apertura', true), ('Clausura 2100', 'Clausura', false))
  as t (nombre, prefijo, actual)
where proveedor_id = 999262;

insert into public.jornada (
  torneo_id, orden, nombre, nombres_proveedor, fase, fecha_inicio, fecha_fin
)
select t.id, j.orden, 'Jornada ' || j.orden, array['Apertura - ' || j.orden], 'REGULAR',
  '2099-07-01', '2099-07-31'
from public.torneo t, (values (1), (2), (3)) as j (orden)
where t.prefijo_rondas = 'Apertura' and t.temporada_proveedor = 2099;

insert into public.equipo (proveedor_id, nombre, nombre_corto, escudo_url)
values
  (999001, 'Local de Prueba', 'Local', 'https://example.com/l.png'),
  (999002, 'Visitante de Prueba', 'Visitante', 'https://example.com/v.png');

-- Jornada 1: 5 y 6 de julio. Jornada 2: 12 de julio (cancelado) y 13. Jornada 3: 19.
insert into public.partido (
  proveedor_id, torneo_id, jornada_id, equipo_local_id, equipo_visitante_id, inicio,
  cierre_predicciones, estado, sincronizado_en
)
select p.id, j.torneo_id, j.id,
  (select id from public.equipo where proveedor_id = 999001),
  (select id from public.equipo where proveedor_id = 999002),
  p.inicio, p.inicio, p.estado::public.estado_partido, now()
from (values
  (9990011, 1, timestamptz '2099-07-05 20:00+00', 'TERMINADO'),
  (9990012, 1, timestamptz '2099-07-06 20:00+00', 'TERMINADO'),
  (9990021, 2, timestamptz '2099-07-12 20:00+00', 'CANCELADO'),
  (9990022, 2, timestamptz '2099-07-13 20:00+00', 'PROGRAMADO'),
  (9990031, 3, timestamptz '2099-07-19 20:00+00', 'PROGRAMADO')
) as p (id, orden, inicio, estado)
join public.jornada j on j.orden = p.orden
join public.torneo t on t.id = j.torneo_id and t.temporada_proveedor = 2099;

-- Solo este torneo es el actual en la base de prueba.
update public.torneo set es_actual = false where temporada_proveedor <> 2099;

-- ---------------------------------------------------------------------------
-- Como usuario autenticado
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select is(public.jornada_actual('2099-06-30 00:00+00'), 1::smallint,
  'Antes del torneo: la jornada del primer partido');
select is(public.jornada_actual('2099-07-06 00:00+00'), 1::smallint,
  'A media jornada: la misma jornada (queda un partido por jugar)');
select is(public.jornada_actual('2099-07-06 20:00+00'), 1::smallint,
  'Un partido que empieza justo ahora todavía cuenta como por jugar');
select is(public.jornada_actual('2099-07-07 00:00+00'), 2::smallint,
  'Terminada una jornada: la siguiente');
select is(public.jornada_actual('2099-07-12 21:00+00'), 2::smallint,
  'Un partido cancelado no cuenta como próximo partido');
select is(public.jornada_actual('2099-07-14 00:00+00'), 3::smallint,
  'La jornada del próximo partido');
select is(public.jornada_actual('2099-08-01 00:00+00'), 3::smallint,
  'Torneo terminado: la última jornada');
select ok(public.jornada_actual() is not null, 'Sin argumento usa la hora actual');

reset role;
set local role anon;
select throws_ok($$ select public.jornada_actual() $$, '42501', null,
  'anon no puede ejecutarla (F01 V6)');

select * from finish();
rollback;
