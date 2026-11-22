-- T105 — `proximo_partido_equipo` (F17 R6, R13, CA2; D111). Equipo X en el torneo actual:
-- 9801 terminado, 9802 por jugar mañana (de visitante), 9803 en 3 días y 9804 simulado en 1 h.
-- 9805 de X en otro torneo, en 2 h. Equipo Y con solo un partido terminado (9806).
-- A tiene a X de favorito; B, ninguno; C, a Y. Todo se deshace al final.
begin;

select plan(8);

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
join (values ('Apertura 2099', 1, 'J1'), ('Apertura 2099', 2, 'J2'), ('Clausura 2098', 1, 'JO'))
  as j (torneo, orden, nombre) on j.torneo = t.nombre;

insert into public.equipo (proveedor_id, nombre, nombre_corto, escudo_url, color_primario, color_texto)
values
  (999001, 'Equipo X', 'X', 'https://example.com/x.png', '#112233', '#FFFFFF'),
  (999002, 'Equipo Y', 'Y', 'https://example.com/y.png', null, null),
  (999003, 'Equipo Z', 'Z', 'https://example.com/z.png', null, null);

insert into public.partido (
  proveedor_id, torneo_id, jornada_id, equipo_local_id, equipo_visitante_id, inicio,
  cierre_predicciones, estado, es_simulado, sincronizado_en
)
select p.id, j.torneo_id, j.id,
  (select id from public.equipo where proveedor_id = p.local),
  (select id from public.equipo where proveedor_id = p.visitante),
  now() + p.inicio, now() + p.inicio, p.estado::public.estado_partido, p.simulado, now()
from (values
  (9801, 'J1', 999001, 999003, interval '-2 hours', 'TERMINADO', false),
  (9802, 'J1', 999003, 999001, interval '1 day', 'PROGRAMADO', false),
  (9803, 'J2', 999001, 999003, interval '3 days', 'PROGRAMADO', false),
  (9804, 'J1', 999001, 999003, interval '1 hour', 'PROGRAMADO', true),
  (9805, 'JO', 999001, 999003, interval '2 hours', 'PROGRAMADO', false),
  (9806, 'J1', 999002, 999003, interval '-1 day', 'TERMINADO', false)
) as p (id, jornada, local, visitante, inicio, estado, simulado)
join public.jornada j on j.nombre = p.jornada;

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
select ('00000000-0000-0000-0000-00000000000' || u)::uuid, u || '@example.com',
  '{"provider": "google"}', jsonb_build_object('provider_id', 'google-' || u, 'full_name', 'Usuario ' || u)
from unnest(array['a', 'b', 'c']) as u;

update public.usuario set equipo_favorito_id = (select id from public.equipo where proveedor_id = 999001)
where id = '00000000-0000-0000-0000-00000000000a';
update public.usuario set equipo_favorito_id = (select id from public.equipo where proveedor_id = 999002)
where id = '00000000-0000-0000-0000-00000000000c';

-- ---------------------------------------------------------------------------
-- Como A
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select results_eq(
  $$ select p.proveedor_id, v.jornada_nombre, v.local_nombre_corto, v.visitante_nombre_corto,
       v.visitante_color_primario, v.tengo_prediccion
     from public.proximo_partido_equipo v join public.partido p on p.id = v.id $$,
  $$ values (9802, 'J1', 'Z', 'X', '#112233', false) $$,
  'F17 CA2: el siguiente partido por jugar de mi equipo en el torneo actual, aunque sea de visitante; sin simulados ni otro torneo'
);

insert into public.prediccion (partido_id, resultado)
select id, 'VISITANTE' from public.partido where proveedor_id = 9802;
select is(
  (select tengo_prediccion from public.proximo_partido_equipo),
  true,
  'F17 CA2: tengo_prediccion cambia al predecirlo'
);

reset role;
update public.partido set estado = 'EN_JUEGO', inicio = now() - interval '10 minutes',
  cierre_predicciones = now() - interval '10 minutes'
where proveedor_id = 9801;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select results_eq(
  $$ select p.proveedor_id, v.estado::text, v.tengo_prediccion
     from public.proximo_partido_equipo v join public.partido p on p.id = v.id $$,
  $$ values (9801, 'EN_JUEGO', false) $$,
  'F17 CA2: si mi equipo está jugando, ese partido va primero'
);
select is(
  (select count(*)::int from public.proximo_partido_equipo),
  1,
  'F17 R6: una sola fila'
);

-- ---------------------------------------------------------------------------
-- Sin equipo y sin más partidos
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select is(
  (select count(*)::int from public.proximo_partido_equipo),
  0,
  'F17 CA2: sin equipo favorito, cero filas'
);

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
select is(
  (select count(*)::int from public.proximo_partido_equipo),
  0,
  'F17 CA2: sin más partidos de mi equipo en el torneo, cero filas'
);

reset role;
update public.partido set estado = 'TERMINADO' where proveedor_id = 9801;
update public.partido set es_simulado = false where proveedor_id = 9804;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select is(
  (select p.proveedor_id from public.proximo_partido_equipo v join public.partido p on p.id = v.id),
  9804,
  'F17 R6: el mismo partido sí entra cuando no es simulado (el simulado era lo único que lo dejaba fuera)'
);

reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok(
  $$ select * from public.proximo_partido_equipo $$,
  '42501', null,
  'F17 CA2: anon no lee proximo_partido_equipo'
);
reset role;

select * from finish();
rollback;
