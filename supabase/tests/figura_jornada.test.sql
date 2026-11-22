-- Figura de la jornada: `figura_jornada(grupo, jornada)` (F26 R10 v1.1, R18, CA4; D114). Todo se
-- deshace al final.
--
-- Grupo G = A, B y C · grupo H = D. Torneo actual con J1 (9941 y 9942 terminados, 9943 abierto) y
-- J2 (sin calificaciones); JO de otro torneo.
-- Puntos en J1: B 350 + 10 de bono = 360 (1.º, con un bono pequeño) · A 100 + 90 = 190 · C 0.
-- Análisis de B: 9941 bono 10 (evaluado), 9942 sin evaluar, 9943 abierto con bono 100.
begin;

select plan(12);

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
  now() + interval '1 day', now() + interval '1 day', 'PROGRAMADO', false, now()
from (values (9941, 'J1'), (9942, 'J1'), (9943, 'J1'), (9944, 'J2')) as p (id, jornada)
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
from (values ('Grupo G', 'a'), ('Grupo G', 'b'), ('Grupo G', 'c'), ('Grupo H', 'd')) as x (grupo, u)
join public.grupo g on g.nombre = x.grupo;

insert into public.prediccion (usuario_id, partido_id, resultado, justificacion)
select ('00000000-0000-0000-0000-00000000000' || x.u)::uuid, p.id, 'LOCAL', x.texto
from (values ('b', 9941, 'Análisis 9941 de b'), ('b', 9942, 'Análisis 9942 de b'),
  ('b', 9943, 'Abierto de b'), ('a', 9941, 'Análisis de a'), ('c', 9941, null)) as x (u, partido, texto)
join public.partido p on p.proveedor_id = x.partido;

update public.partido set cierre_predicciones = now() - interval '2 hours', estado = 'TERMINADO',
  goles_local = 1, goles_visitante = 0, calificado_en = now()
where proveedor_id in (9941, 9942);

insert into public.calificacion (prediccion_id, puntos_resultado, puntos_rango_goles, puntos_marcador, es_simulada)
select pr.id, x.r, 0, x.m, false
from (values ('b', 9941, 0, 350), ('a', 9941, 100, 0), ('c', 9941, 0, 0), ('b', 9942, 0, 0)) as x (u, partido, r, m)
join public.partido p on p.proveedor_id = x.partido
join public.prediccion pr on pr.partido_id = p.id
  and pr.usuario_id = ('00000000-0000-0000-0000-00000000000' || x.u)::uuid;

insert into public.evaluacion_ia (
  prediccion_id, estado, puntos_bono, explicacion, modelo, version_prompt, evaluada_en, es_simulada
)
select pr.id, 'EVALUADA', x.bono, 'Comentario ' || x.partido || ' de ' || x.u, 'modelo', 'v3', now(), false
from (values ('b', 9941, 10), ('a', 9941, 90), ('b', 9943, 100)) as x (u, partido, bono)
join public.partido p on p.proveedor_id = x.partido
join public.prediccion pr on pr.partido_id = p.id
  and pr.usuario_id = ('00000000-0000-0000-0000-00000000000' || x.u)::uuid;

select set_config('prueba.g', (select id::text from public.grupo where nombre = 'Grupo G'), true);
select set_config('prueba.j1', (select id::text from public.jornada where nombre = 'J1'), true);
select set_config('prueba.j2', (select id::text from public.jornada where nombre = 'J2'), true);
select set_config('prueba.jo', (select id::text from public.jornada where nombre = 'JO'), true);

-- ---------------------------------------------------------------------------
-- Como A
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select results_eq(
  $$ select nombre, es_yo, puntos_total, puntos_base, puntos_bono, lideres, jornada_nombre, en_curso
     from public.figura_jornada(current_setting('prueba.g')::bigint, current_setting('prueba.j1')::bigint) $$,
  $$ values ('Usuario B', false, 360, 350, 10, 1, 'J1', true) $$,
  'F26 CA4 (v1.1): la figura es el 1.º del ranking de la jornada por puntos totales, aunque su bono sea pequeño'
);
select is(
  (select r.nombre from public.ranking_grupo(current_setting('prueba.g')::bigint, current_setting('prueba.j1')::bigint) r
   where r.posicion = 1),
  (select nombre from public.figura_jornada(current_setting('prueba.g')::bigint, current_setting('prueba.j1')::bigint)),
  'F26 CA4 (v1.1): coincide con el 1.º de ranking_grupo de esa jornada'
);
select results_eq(
  $$ select f.justificacion, f.bono_analisis, f.explicacion, p.proveedor_id, f.goles_local::int, f.local_nombre_corto
     from public.figura_jornada(current_setting('prueba.g')::bigint, current_setting('prueba.j1')::bigint) f
     join public.partido p on p.id = f.partido_id $$,
  $$ values ('Análisis 9941 de b', 10, 'Comentario 9941 de b', 9941, 1, 'Local') $$,
  'F26 R10 (v1.1): con su mejor análisis evaluado de un partido cerrado (no el abierto ni el sin evaluar)'
);
select is_empty(
  $$ select 1 from public.figura_jornada(current_setting('prueba.g')::bigint, current_setting('prueba.j2')::bigint) $$,
  'F26 CA4: sin puntos en la jornada, no hay figura'
);
select throws_ok(
  $$ select * from public.figura_jornada(current_setting('prueba.g')::bigint, current_setting('prueba.jo')::bigint) $$,
  'P0001', 'JORNADA_INVALIDA', 'F26 CA4: una jornada de otro torneo da JORNADA_INVALIDA'
);

-- Un análisis de un partido cancelado no sale, aunque tenga más bono (D44, como el muro).
reset role;
update public.partido set estado = 'CANCELADO' where proveedor_id = 9941;
set local role authenticated;
select is_empty(
  $$ select 1 from public.figura_jornada(current_setting('prueba.g')::bigint, current_setting('prueba.j1')::bigint)
     where partido_id is not null $$,
  'F26 CA4: no muestra el análisis de un partido cancelado'
);
reset role;
update public.partido set estado = 'TERMINADO' where proveedor_id = 9941;
set local role authenticated;

-- Empate en el 1.º: A sube a 360 con otro bono (desempate: B tiene más exactos).
reset role;
update public.calificacion set puntos_resultado = 0, puntos_marcador = 350
where prediccion_id = (
  select pr.id from public.prediccion pr join public.partido p on p.id = pr.partido_id
  where p.proveedor_id = 9941 and pr.usuario_id = '00000000-0000-0000-0000-00000000000a'
);
update public.evaluacion_ia set puntos_bono = 10
where prediccion_id = (
  select pr.id from public.prediccion pr join public.partido p on p.id = pr.partido_id
  where p.proveedor_id = 9941 and pr.usuario_id = '00000000-0000-0000-0000-00000000000a'
);
set local role authenticated;
select results_eq(
  $$ select nombre, es_yo, lideres
     from public.figura_jornada(current_setting('prueba.g')::bigint, current_setting('prueba.j1')::bigint) $$,
  $$ values ('Usuario A', true, 2) $$,
  'F26 CA4: con un empate completo dice cuántos empatan (lideres) y sale el primero por nombre'
);

-- Como D (solo H)
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000d", "role": "authenticated"}';
select throws_ok(
  $$ select * from public.figura_jornada(current_setting('prueba.g')::bigint, current_setting('prueba.j1')::bigint) $$,
  'P0001', 'NO_MIEMBRO', 'F26 CA4: el grupo ajeno da NO_MIEMBRO'
);
reset role;

select ok(
  pg_get_function_result('public.figura_jornada(bigint, bigint)'::regprocedure) !~ '(afirmaciones|correo|resultado|marcador_local|rango_goles)',
  'F26 R18: no trae afirmaciones, correo ni la predicción'
);
select is(
  (select count(*)::int from pg_proc where proname = 'figura_jornada'
     and prosecdef and proconfig @> array['search_path=""']),
  1,
  'F26 R18: figura_jornada es security definer con search_path vacío'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok(
  $$ select * from public.figura_jornada(1, 1) $$,
  '42501', null, 'F26 CA4: anon no ejecuta figura_jornada'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"role": "authenticated"}';
select throws_ok(
  $$ select * from public.figura_jornada(1, 1) $$,
  'P0001', 'SIN_SESION', 'F26 R10 (v1.1): sin usuario falla con SIN_SESION'
);
reset role;

select * from finish();
rollback;
