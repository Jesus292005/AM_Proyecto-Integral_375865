-- T116 — Analista de la jornada del grupo: `mejor_analisis_jornada(id_grupo, id_jornada)`
-- (F26 R10, R18, CA4; D113). Todo se deshace al final.
--
-- Grupo G = A, B y C · grupo H = A, C y D (G tiene el id menor). Torneo actual con J1 (9981 y 9982
-- terminados) y J2 (9983 terminado); JO de otro torneo. Bonos: B 9981 70 · D 9981 90 ·
-- C 9983 80 · A 9982 40.
begin;

select plan(9);

update public.torneo set es_actual = false;

insert into public.liga (proveedor_id, nombre, pais) values (999262, 'Liga de Prueba', 'Mexico');
insert into public.torneo (
  liga_id, nombre, temporada_proveedor, prefijo_rondas, fecha_inicio, fecha_fin, es_actual
)
select id, t.nombre, t.temporada, 'Apertura', '2099-01-01', '2099-12-31', t.actual
from public.liga, (values ('Apertura 2099', 2099, true), ('Clausura 2098', 2098, false))
  as t (nombre, temporada, actual)
where proveedor_id = 999262;

insert into public.jornada (torneo_id, orden, nombre, nombres_proveedor, fase, fecha_inicio, fecha_fin)
select t.id, j.orden, j.nombre, array[j.nombre], 'REGULAR', '2099-01-01', '2099-12-31'
from public.torneo t
join (values ('Apertura 2099', 1, 'J1'), ('Apertura 2099', 2, 'J2'), ('Clausura 2098', 1, 'JO'))
  as j (torneo, orden, nombre) on j.torneo = t.nombre;

insert into public.equipo (proveedor_id, nombre, nombre_corto, escudo_url)
values
  (999001, 'Local de Prueba', 'Local', 'https://example.com/l.png'),
  (999002, 'Visitante de Prueba', 'Visitante', 'https://example.com/v.png');

insert into public.partido (
  proveedor_id, torneo_id, jornada_id, equipo_local_id, equipo_visitante_id, inicio,
  cierre_predicciones, estado, es_simulado, sincronizado_en
)
select p.id, j.torneo_id, j.id,
  (select id from public.equipo where proveedor_id = 999001),
  (select id from public.equipo where proveedor_id = 999002),
  now() + interval '1 day', now() + interval '1 day', 'PROGRAMADO', false, now()
from (values (9981, 'J1'), (9982, 'J1'), (9983, 'J2')) as p (id, jornada)
join public.jornada j on j.nombre = p.jornada;

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
select ('00000000-0000-0000-0000-00000000000' || u)::uuid, u || '@example.com',
  '{"provider": "google"}',
  jsonb_build_object('provider_id', 'google-' || u, 'full_name', 'Usuario ' || upper(u))
from unnest(array['a', 'b', 'c', 'd']) as u;

insert into public.grupo (nombre, codigo_invitacion)
select n, public.generar_codigo_invitacion() from unnest(array['Grupo G', 'Grupo H']) as n;
insert into public.miembro_grupo (grupo_id, usuario_id)
select g.id, ('00000000-0000-0000-0000-00000000000' || x.u)::uuid
from (values ('Grupo G', 'a'), ('Grupo G', 'b'), ('Grupo G', 'c'),
  ('Grupo H', 'a'), ('Grupo H', 'c'), ('Grupo H', 'd')) as x (grupo, u)
join public.grupo g on g.nombre = x.grupo;

create temporary table puntos_prueba (u text, partido int, bono int) on commit drop;
insert into puntos_prueba values ('b', 9981, 70), ('d', 9981, 90), ('c', 9983, 80), ('a', 9982, 40);

insert into public.prediccion (usuario_id, partido_id, resultado, justificacion)
select ('00000000-0000-0000-0000-00000000000' || x.u)::uuid, p.id, 'LOCAL', 'Análisis de ' || x.u
from puntos_prueba x join public.partido p on p.proveedor_id = x.partido;

update public.partido set cierre_predicciones = now() - interval '2 hours', estado = 'TERMINADO',
  goles_local = 1, goles_visitante = 0, calificado_en = now()
where proveedor_id in (9981, 9982, 9983);

insert into public.calificacion (prediccion_id, puntos_resultado, puntos_rango_goles, puntos_marcador, es_simulada)
select pr.id, 100, 0, 0, false from public.prediccion pr
join public.partido p on p.id = pr.partido_id where p.proveedor_id in (9981, 9982, 9983);

insert into public.evaluacion_ia (
  prediccion_id, estado, puntos_bono, explicacion, modelo, version_prompt, evaluada_en, es_simulada
)
select pr.id, 'EVALUADA', x.bono, 'Comentario de ' || x.u, 'modelo', 'v3', now(), false
from puntos_prueba x
join public.partido p on p.proveedor_id = x.partido
join public.prediccion pr on pr.partido_id = p.id
  and pr.usuario_id = ('00000000-0000-0000-0000-00000000000' || x.u)::uuid;

select set_config('prueba.g', (select id::text from public.grupo where nombre = 'Grupo G'), true);
select set_config('prueba.h', (select id::text from public.grupo where nombre = 'Grupo H'), true);
select set_config('prueba.j1', (select id::text from public.jornada where nombre = 'J1'), true);
select set_config('prueba.j2', (select id::text from public.jornada where nombre = 'J2'), true);
select set_config('prueba.jo', (select id::text from public.jornada where nombre = 'JO'), true);

-- ---------------------------------------------------------------------------
-- Como A (en G y en H)
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select results_eq(
  $$ select nombre, puntos_bono, grupo_nombre, jornada_nombre
     from public.mejor_analisis_jornada(current_setting('prueba.g')::bigint, current_setting('prueba.j1')::bigint) $$,
  $$ values ('Usuario B', 70, 'Grupo G', 'J1') $$,
  'F26 CA4: el mejor análisis ≥ 50 de ese grupo en esa jornada, no el 90 de otro grupo mío'
);
select results_eq(
  $$ select nombre, puntos_bono, grupo_nombre
     from public.mejor_analisis_jornada(current_setting('prueba.h')::bigint, current_setting('prueba.j1')::bigint) $$,
  $$ values ('Usuario D', 90, 'Grupo H') $$,
  'F26 CA4: en el otro grupo, su propio mejor análisis'
);
select results_eq(
  $$ select nombre, grupo_nombre
     from public.mejor_analisis_jornada(current_setting('prueba.h')::bigint, current_setting('prueba.j2')::bigint) $$,
  $$ values ('Usuario C', 'Grupo H') $$,
  'F26 R10: el grupo que sale es el pedido aunque el autor esté también en uno de id menor'
);
select results_eq(
  $$ select nombre, jornada_nombre
     from public.mejor_analisis_jornada(current_setting('prueba.g')::bigint) $$,
  $$ values ('Usuario C', 'J2') $$,
  'F26 R10: sin jornada usa la jornada de referencia (F17 R3)'
);
select results_eq(
  $$ select nombre, grupo_nombre, jornada_nombre from public.mejor_analisis_jornada() $$,
  $$ values ('Usuario C', 'Grupo G', 'J2') $$,
  'F26 CA4: sin argumentos sigue igual que en Inicio (F17 R10)'
);
select throws_ok(
  $$ select * from public.mejor_analisis_jornada(current_setting('prueba.g')::bigint, current_setting('prueba.jo')::bigint) $$,
  'P0001', 'JORNADA_INVALIDA',
  'F26 R10: una jornada de otro torneo da JORNADA_INVALIDA'
);

-- Como D (solo en H)
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000d", "role": "authenticated"}';
select throws_ok(
  $$ select * from public.mejor_analisis_jornada(current_setting('prueba.g')::bigint, current_setting('prueba.j1')::bigint) $$,
  'P0001', 'NO_MIEMBRO',
  'F26 CA4: un grupo del que no soy miembro da NO_MIEMBRO'
);
reset role;

select is(
  (select count(*)::int from pg_proc where proname = 'mejor_analisis_jornada'),
  1,
  'F26 R10: una sola mejor_analisis_jornada (los argumentos son opcionales)'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok(
  $$ select * from public.mejor_analisis_jornada(1, 1) $$,
  '42501', null,
  'F26 R18: anon no ejecuta mejor_analisis_jornada con argumentos'
);
reset role;

select * from finish();
rollback;
