-- T104 — `mis_pendientes` (F17 R4, R13, CA1; D111). Torneo actual con J1–J3 y otro torneo.
-- La jornada actual es J1 (su próximo partido es el primero por empezar). Todo se deshace al final.
--
-- J1: 9701 abierto · 9702 abierto con predicción de A · 9703 en juego · 9704 terminado ·
--     9708 cancelado · 9709 por jugar con el cierre ya pasado (F02 R9).
-- J2: 9705 pospuesto · 9706 abierto y simulado. J3: 9707 abierto (dos adelante). Otro torneo: 9710.
begin;

select plan(7);

update public.torneo set es_actual = false;

insert into public.liga (proveedor_id, nombre, pais) values (999262, 'Liga de Prueba', 'Mexico');
insert into public.torneo (
  liga_id, nombre, temporada_proveedor, prefijo_rondas, fecha_inicio, fecha_fin, es_actual
)
select id, t.nombre, t.temporada, t.prefijo, '2099-01-01', '2099-12-31', t.actual
from public.liga, (values
  ('Apertura 2099', 2099, 'Apertura', true),
  ('Clausura 2098', 2098, 'Clausura', false)
) as t (nombre, temporada, prefijo, actual)
where proveedor_id = 999262;

insert into public.jornada (torneo_id, orden, nombre, nombres_proveedor, fase, fecha_inicio, fecha_fin)
select t.id, j.orden, j.nombre, array[j.nombre], 'REGULAR', '2099-01-01', '2099-12-31'
from public.torneo t
join (values
  ('Apertura 2099', 1, 'J1'), ('Apertura 2099', 2, 'J2'), ('Apertura 2099', 3, 'J3'),
  ('Clausura 2098', 1, 'JO')
) as j (torneo, orden, nombre) on j.torneo = t.nombre;

insert into public.equipo (proveedor_id, nombre, nombre_corto, escudo_url, color_primario, color_texto)
values
  (999001, 'Local de Prueba', 'Local', 'https://example.com/l.png', '#112233', '#FFFFFF'),
  (999002, 'Visitante de Prueba', 'Visitante', 'https://example.com/v.png', null, null);

insert into public.partido (
  proveedor_id, torneo_id, jornada_id, equipo_local_id, equipo_visitante_id, inicio,
  cierre_predicciones, estado, es_simulado, sincronizado_en
)
select p.id, j.torneo_id, j.id,
  (select id from public.equipo where proveedor_id = 999001),
  (select id from public.equipo where proveedor_id = 999002),
  now() + p.inicio, now() + p.cierre, p.estado::public.estado_partido, p.simulado, now()
from (values
  (9701, 'J1', interval '1 hour', interval '1 hour', 'PROGRAMADO', false),
  (9702, 'J1', interval '30 minutes', interval '30 minutes', 'PROGRAMADO', false),
  (9703, 'J1', interval '-10 minutes', interval '-10 minutes', 'EN_JUEGO', false),
  (9704, 'J1', interval '-3 days', interval '-3 days', 'TERMINADO', false),
  (9708, 'J1', interval '2 hours', interval '2 hours', 'CANCELADO', false),
  (9709, 'J1', interval '3 hours', interval '-1 hour', 'PROGRAMADO', false),
  (9705, 'J2', interval '5 days', interval '5 days', 'POSPUESTO', false),
  (9706, 'J2', interval '2 days', interval '2 days', 'PROGRAMADO', true),
  (9707, 'J3', interval '9 days', interval '9 days', 'PROGRAMADO', false),
  (9710, 'JO', interval '4 hours', interval '4 hours', 'PROGRAMADO', false)
) as p (id, jornada, inicio, cierre, estado, simulado)
join public.jornada j on j.nombre = p.jornada;

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
select ('00000000-0000-0000-0000-00000000000' || u)::uuid, u || '@example.com',
  '{"provider": "google"}', jsonb_build_object('provider_id', 'google-' || u, 'full_name', 'Usuario ' || u)
from unnest(array['a', 'b']) as u;

insert into public.prediccion (usuario_id, partido_id, resultado)
select '00000000-0000-0000-0000-00000000000a', id, 'LOCAL' from public.partido where proveedor_id = 9702;

-- ---------------------------------------------------------------------------
-- Como A
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select results_eq(
  $$ select p.proveedor_id from public.mis_pendientes m join public.partido p on p.id = m.id $$,
  $$ values (9701), (9706), (9705) $$,
  'F17 CA1: abiertos sin mi predicción de la jornada actual y la siguiente, ordenados por cierre'
);
select is(
  (select count(*)::int from public.mis_pendientes m join public.partido p on p.id = m.id
   where p.proveedor_id in (9702, 9703, 9704, 9708, 9709)),
  0,
  'F17 CA1: no trae el que ya predije, el que está en juego, el terminado, el cancelado ni uno con el cierre pasado'
);
select is(
  (select count(*)::int from public.mis_pendientes m join public.partido p on p.id = m.id
   where p.proveedor_id in (9707, 9710)),
  0,
  'F17 CA1: no trae partidos de dos jornadas adelante ni de otro torneo'
);
select results_eq(
  $$ select m.jornada_orden::int, m.jornada_nombre, m.local_nombre_corto, m.local_color_primario,
       m.visitante_nombre_corto, m.estado::text, m.es_simulado
     from public.mis_pendientes m join public.partido p on p.id = m.id where p.proveedor_id = 9706 $$,
  $$ values (2, 'J2', 'Local', '#112233', 'Visitante', 'PROGRAMADO', true) $$,
  'F17 R4: trae la jornada, los equipos con sus colores, el estado y si es simulado'
);
select is(
  (select count(*)::int from public.mis_pendientes m join public.partido p on p.id = m.id
   where p.proveedor_id = 9705 and m.estado = 'POSPUESTO'),
  1,
  'F17 R4: un pospuesto antes de su cierre sigue pendiente (F03 R1)'
);

-- ---------------------------------------------------------------------------
-- Como B: la predicción de A no quita el partido de los pendientes de B
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';

select results_eq(
  $$ select p.proveedor_id from public.mis_pendientes m join public.partido p on p.id = m.id $$,
  $$ values (9702), (9701), (9706), (9705) $$,
  'F17 CA1: cada usuario ve sus propios pendientes'
);

reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok(
  $$ select * from public.mis_pendientes $$,
  '42501', null,
  'F17 CA1: anon no lee mis_pendientes'
);
reset role;

select * from finish();
rollback;
