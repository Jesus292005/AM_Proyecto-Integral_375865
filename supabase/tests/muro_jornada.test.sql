-- T117 — `muro_jornada(grupo, jornada)` (F26 R11, R18, CA3; D113). Todo se deshace al final.
--
-- Grupo G = A, B y C (X salió) · grupo H = A y D. Torneo actual con J1 y J2; JO de otro torneo.
-- J1: 9991 terminado (hace 3 h), 9992 abierto, 9993 cancelado con el cierre pasado, 9994 en juego
-- (hace 1 h). J2: 9995 terminado.
-- Predicciones con justificación: B 9991 (EVALUADA 70) · C 9991 (sin evaluación) · A 9991 (ERROR) ·
-- D 9991 · X 9991 · B 9992 · B 9993 · C 9994 · B 9995. A 9994 con la justificación en blanco.
begin;

select plan(11);

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
  now() + interval '1 day', now() + interval '1 day', 'PROGRAMADO', p.simulado, now()
from (values (9991, 'J1', false), (9992, 'J1', false), (9993, 'J1', false), (9994, 'J1', true),
  (9995, 'J2', false)) as p (id, jornada, simulado)
join public.jornada j on j.nombre = p.jornada;

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
select ('00000000-0000-0000-0000-00000000000' || u)::uuid, u || '@example.com',
  '{"provider": "google"}',
  jsonb_build_object('provider_id', 'google-' || u, 'full_name', 'Usuario ' || upper(u))
from unnest(array['a', 'b', 'c', 'd', 'e']) as u;
-- E hace de X (salió de G).

insert into public.grupo (nombre, codigo_invitacion)
select n, public.generar_codigo_invitacion() from unnest(array['Grupo G', 'Grupo H']) as n;
insert into public.miembro_grupo (grupo_id, usuario_id)
select g.id, ('00000000-0000-0000-0000-00000000000' || x.u)::uuid
from (values ('Grupo G', 'a'), ('Grupo G', 'b'), ('Grupo G', 'c'), ('Grupo G', 'e'),
  ('Grupo H', 'a'), ('Grupo H', 'd')) as x (grupo, u)
join public.grupo g on g.nombre = x.grupo;

insert into public.prediccion (usuario_id, partido_id, marcador_local, marcador_visitante, justificacion)
select ('00000000-0000-0000-0000-00000000000' || x.u)::uuid, p.id, 2, 1, x.texto
from (values ('b', 9991, 'Análisis de b'), ('c', 9991, 'Análisis de c'), ('a', 9991, 'Análisis de a'),
  ('d', 9991, 'Análisis de d'), ('e', 9991, 'Análisis de e'), ('b', 9992, 'Abierto de b'),
  ('b', 9993, 'Cancelado de b'), ('c', 9994, 'En juego de c'), ('a', 9994, '   '),
  ('b', 9995, 'Otra jornada de b')) as x (u, partido, texto)
join public.partido p on p.proveedor_id = x.partido;

update public.partido set cierre_predicciones = now() - interval '3 hours', inicio = now() - interval '3 hours',
  estado = 'TERMINADO', goles_local = 2, goles_visitante = 1
where proveedor_id in (9991, 9995);
update public.partido set cierre_predicciones = now() - interval '2 hours', inicio = now() - interval '2 hours',
  estado = 'CANCELADO'
where proveedor_id = 9993;
update public.partido set cierre_predicciones = now() - interval '1 hour', inicio = now() - interval '1 hour',
  estado = 'EN_JUEGO', goles_local = 0, goles_visitante = 0
where proveedor_id = 9994;

insert into public.evaluacion_ia (
  prediccion_id, estado, puntos_bono, explicacion, modelo, version_prompt, evaluada_en, error, es_simulada
)
-- La fila ERROR trae bono y explicación (sin modelo, como permite la tabla): el muro no debe darlos.
select pr.id, x.estado::public.estado_evaluacion, x.bono, x.explicacion,
  case when x.estado = 'EVALUADA' then 'modelo' end, case when x.estado = 'EVALUADA' then 'v3' end,
  case when x.estado = 'EVALUADA' then now() end, x.error, false
from (values ('b', 'EVALUADA', 70, 'Comentario de b', null), ('a', 'ERROR', 90, 'No debe salir', 'Falla'))
  as x (u, estado, bono, explicacion, error)
join public.partido p on p.proveedor_id = 9991
join public.prediccion pr on pr.partido_id = p.id
  and pr.usuario_id = ('00000000-0000-0000-0000-00000000000' || x.u)::uuid;

-- X sale de G.
delete from public.miembro_grupo where usuario_id = '00000000-0000-0000-0000-00000000000e';

select set_config('prueba.g', (select id::text from public.grupo where nombre = 'Grupo G'), true);
select set_config('prueba.j1', (select id::text from public.jornada where nombre = 'J1'), true);
select set_config('prueba.jo', (select id::text from public.jornada where nombre = 'JO'), true);

-- ---------------------------------------------------------------------------
-- Como A
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select results_eq(
  $$ select p.proveedor_id, m.nombre, m.justificacion, m.estado_evaluacion::text, m.puntos_bono, m.explicacion, m.es_yo
     from public.muro_jornada(current_setting('prueba.g')::bigint, current_setting('prueba.j1')::bigint) m
     join public.partido p on p.id = m.partido_id $$,
  $$ values
    (9991, 'Usuario B', 'Análisis de b', 'EVALUADA', 70, 'Comentario de b', false),
    (9991, 'Usuario A', 'Análisis de a', 'ERROR', null::int, null::text, true),
    (9991, 'Usuario C', 'Análisis de c', 'PENDIENTE', null, null, false),
    (9994, 'Usuario C', 'En juego de c', 'PENDIENTE', null, null, false) $$,
  'F26 CA3: bono y explicación solo con EVALUADA; solo análisis de miembros actuales en partidos cerrados de la jornada, por partido y con las evaluadas primero; sin abiertos, cancelados, en blanco, de otro grupo, de quien salió ni de otra jornada'
);
select results_eq(
  $$ select m.estado::text, m.goles_local::int, m.local_nombre_corto, m.local_color_primario,
       m.marcador_local::int, m.marcador_visitante::int, m.es_simulada
     from public.muro_jornada(current_setting('prueba.g')::bigint, current_setting('prueba.j1')::bigint) m
     where m.justificacion = 'En juego de c' $$,
  $$ values ('EN_JUEGO', 0, 'Local', '#112233', 2, 1, true) $$,
  'F26 R11: trae el partido con su estado y marcador, la predicción y si es simulado'
);
select is(
  (select count(*)::int from public.muro_jornada(current_setting('prueba.g')::bigint, current_setting('prueba.j1')::bigint)
   where usuario_id = '00000000-0000-0000-0000-00000000000e'),
  0,
  'F26 CA3: quien salió del grupo no aparece'
);
select throws_ok(
  $$ select * from public.muro_jornada(current_setting('prueba.g')::bigint, current_setting('prueba.jo')::bigint) $$,
  'P0001', 'JORNADA_INVALIDA',
  'F26 CA3: una jornada de otro torneo da JORNADA_INVALIDA'
);

-- Como D (solo H)
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000d", "role": "authenticated"}';
select throws_ok(
  $$ select * from public.muro_jornada(current_setting('prueba.g')::bigint, current_setting('prueba.j1')::bigint) $$,
  'P0001', 'NO_MIEMBRO',
  'F26 CA3: el muro de un grupo ajeno da NO_MIEMBRO'
);
-- Como X (salió)
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000e", "role": "authenticated"}';
select throws_ok(
  $$ select * from public.muro_jornada(current_setting('prueba.g')::bigint, current_setting('prueba.j1')::bigint) $$,
  'P0001', 'NO_MIEMBRO',
  'F26 R18: quien salió ya no lee el muro'
);

-- ---------------------------------------------------------------------------
-- Columnas y permisos (R18)
-- ---------------------------------------------------------------------------

reset role;
select ok(
  pg_get_function_result('public.muro_jornada(bigint, bigint)'::regprocedure) !~ '(afirmaciones|correo|google_id|modelo|error)',
  'F26 CA3: no trae afirmaciones, correo ni datos internos de la evaluación'
);
select is(
  (select count(*)::int from pg_proc where proname = 'muro_jornada'
     and prosecdef and proconfig @> array['search_path=""']),
  1,
  'F26 R18: muro_jornada es security definer con search_path vacío'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok(
  $$ select * from public.muro_jornada(1, 1) $$,
  '42501', null,
  'F26 CA3: anon no ejecuta muro_jornada'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"role": "authenticated"}';
select throws_ok(
  $$ select * from public.muro_jornada(1, 1) $$,
  'P0001', 'SIN_SESION',
  'F26 R11: sin usuario falla con SIN_SESION'
);
reset role;

-- Antes del cierre de todos los partidos el muro está vacío.
update public.partido set cierre_predicciones = now() + interval '1 hour' where proveedor_id in (9991, 9994);
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select is_empty(
  $$ select 1 from public.muro_jornada(current_setting('prueba.g')::bigint, current_setting('prueba.j1')::bigint) $$,
  'F26 CA3 (R04): antes del cierre ningún análisis sale en el muro'
);
reset role;

select * from finish();
rollback;
