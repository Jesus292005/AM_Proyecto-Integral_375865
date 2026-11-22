-- T107 — `mejor_analisis_jornada()` (F17 R10, R13, CA4; D111). Todo se deshace al final.
--
-- Grupo G = A, B y C · grupo H = A y D · grupo K = E (sin A) · X salió de G · Z solo en el grupo S.
-- Jornada de referencia J1 (en curso) con 9951 y 9952 terminados y 9953 con el cierre por delante.
-- Bonos: B 9951 70 (base 100) · C 9952 70 (base 350) · D 9951 65 · E 9951 95 · X 9951 99 ·
-- A 9952 40 · Z 9951 45 · B 9952 ERROR · C 9951 pendiente · B 9953 100 (antes del cierre).
begin;

select plan(12);

update public.torneo set es_actual = false;

insert into public.liga (proveedor_id, nombre, pais) values (999262, 'Liga de Prueba', 'Mexico');
insert into public.torneo (
  liga_id, nombre, temporada_proveedor, prefijo_rondas, fecha_inicio, fecha_fin, es_actual
)
select id, 'Apertura 2099', 2099, 'Apertura', '2099-01-01', '2099-12-31', true
from public.liga where proveedor_id = 999262;

insert into public.jornada (torneo_id, orden, nombre, nombres_proveedor, fase, fecha_inicio, fecha_fin)
select t.id, 1, 'J1', array['J1'], 'REGULAR', '2099-01-01', '2099-12-31'
from public.torneo t where t.nombre = 'Apertura 2099';

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
from (values (9951), (9952), (9953)) as p (id)
cross join public.jornada j
where j.nombre = 'J1';

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
select ('00000000-0000-0000-0000-00000000000' || u)::uuid, u || '@example.com',
  '{"provider": "google"}',
  jsonb_build_object('provider_id', 'google-' || u, 'full_name', 'Usuario ' || upper(u))
from unnest(array['a', 'b', 'c', 'd', 'e', 'f']) as u;
-- X y Z con id aparte (la f del alfabeto hexadecimal ya se usó).
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000010', 'x@example.com', '{"provider": "google"}',
   '{"provider_id": "google-x", "full_name": "Usuario X"}'),
  ('00000000-0000-0000-0000-000000000011', 'z@example.com', '{"provider": "google"}',
   '{"provider_id": "google-z", "full_name": "Usuario Z"}');

create temporary table usuarios_prueba (u text, id uuid) on commit drop;
insert into usuarios_prueba
select u, ('00000000-0000-0000-0000-00000000000' || u)::uuid from unnest(array['a', 'b', 'c', 'd', 'e']) as u;
insert into usuarios_prueba values
  ('x', '00000000-0000-0000-0000-000000000010'), ('z', '00000000-0000-0000-0000-000000000011');

insert into public.grupo (nombre, codigo_invitacion)
select n, public.generar_codigo_invitacion() from unnest(array['Grupo G', 'Grupo H', 'Grupo K', 'Grupo S']) as n;
insert into public.miembro_grupo (grupo_id, usuario_id)
select g.id, up.id
from (values ('Grupo G', 'a'), ('Grupo G', 'b'), ('Grupo G', 'c'), ('Grupo H', 'a'), ('Grupo H', 'd'),
  ('Grupo K', 'e'), ('Grupo S', 'z'), ('Grupo G', 'x')) as x (grupo, u)
join public.grupo g on g.nombre = x.grupo
join usuarios_prueba up on up.u = x.u;

create temporary table puntos_prueba (u text, partido int, base int, estado text, bono int) on commit drop;
insert into puntos_prueba values
  ('b', 9951, 100, 'EVALUADA', 70), ('c', 9952, 350, 'EVALUADA', 70), ('d', 9951, 0, 'EVALUADA', 65),
  ('e', 9951, 0, 'EVALUADA', 95), ('x', 9951, 0, 'EVALUADA', 99), ('a', 9952, 0, 'EVALUADA', 40),
  ('b', 9952, 0, 'ERROR', null), ('c', 9951, 0, 'PENDIENTE', null), ('b', 9953, 0, 'EVALUADA', 100),
  ('z', 9951, 0, 'EVALUADA', 45);

insert into public.prediccion (usuario_id, partido_id, resultado, justificacion)
select up.id, p.id, 'LOCAL', 'Análisis de ' || x.u
from puntos_prueba x
join usuarios_prueba up on up.u = x.u
join public.partido p on p.proveedor_id = x.partido;

update public.partido set cierre_predicciones = now() - interval '2 hours', estado = 'TERMINADO',
  goles_local = 2, goles_visitante = 1, calificado_en = now()
where proveedor_id in (9951, 9952);

insert into public.calificacion (prediccion_id, puntos_resultado, puntos_rango_goles, puntos_marcador, es_simulada)
select pr.id, case when x.base = 100 then 100 else 0 end, 0, case when x.base = 350 then 350 else 0 end, false
from puntos_prueba x
join usuarios_prueba up on up.u = x.u
join public.partido p on p.proveedor_id = x.partido and p.proveedor_id <> 9953
join public.prediccion pr on pr.partido_id = p.id and pr.usuario_id = up.id;

insert into public.evaluacion_ia (
  prediccion_id, estado, puntos_bono, explicacion, modelo, version_prompt, evaluada_en, error, es_simulada
)
select pr.id, x.estado::public.estado_evaluacion, x.bono,
  case when x.estado = 'EVALUADA' then 'Comentario de ' || x.u end,
  case when x.estado = 'EVALUADA' then 'modelo' end,
  case when x.estado = 'EVALUADA' then 'v3' end,
  case when x.estado = 'EVALUADA' then now() end,
  case when x.estado = 'ERROR' then 'Falla' end,
  false
from puntos_prueba x
join usuarios_prueba up on up.u = x.u
join public.partido p on p.proveedor_id = x.partido
join public.prediccion pr on pr.partido_id = p.id and pr.usuario_id = up.id;

-- X sale de G después de que evaluaron su análisis (R09: solo miembros actuales).
delete from public.miembro_grupo where usuario_id = '00000000-0000-0000-0000-000000000010';

-- ---------------------------------------------------------------------------
-- Como A
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select results_eq(
  $$ select nombre, justificacion, puntos_bono, explicacion, grupo_nombre, es_yo from public.mejor_analisis_jornada() $$,
  $$ values ('Usuario C', 'Análisis de c', 70, 'Comentario de c', 'Grupo G', false) $$,
  'F17 CA4: el mayor bono ≥ 50 de mis grupos; a igual bono gana más puntos base; sin los de un grupo ajeno, quien salió, ERROR, pendiente ni antes del cierre'
);
select results_eq(
  $$ select p.proveedor_id, m.goles_local::int, m.goles_visitante::int, m.local_nombre_corto,
       m.local_color_primario, m.jornada_nombre, m.en_curso, m.es_simulada
     from public.mejor_analisis_jornada() m join public.partido p on p.id = m.partido_id $$,
  $$ values (9952, 2, 1, 'Local', '#112233', 'J1', true, false) $$,
  'F17 R10: trae el partido con su marcador, la jornada, si sigue en curso y si es simulado'
);
select is(
  (select count(*)::int from public.mejor_analisis_jornada()),
  1,
  'F17 R10: una sola fila (decisión 3)'
);

-- Empate completo (bono y base): gana la evaluada primero. B tiene la predicción de id menor, así
-- que si decidiera el id ganaría B; C se evaluó antes.
reset role;
update public.calificacion set puntos_resultado = 0, puntos_marcador = 350
where prediccion_id = (
  select pr.id from public.prediccion pr join public.partido p on p.id = pr.partido_id
  where p.proveedor_id = 9951 and pr.usuario_id = '00000000-0000-0000-0000-00000000000b'
);
update public.evaluacion_ia set evaluada_en = now() - interval '1 minute'
where prediccion_id = (
  select pr.id from public.prediccion pr join public.partido p on p.id = pr.partido_id
  where p.proveedor_id = 9952 and pr.usuario_id = '00000000-0000-0000-0000-00000000000c'
);
select ok(
  (select pr.id from public.prediccion pr join public.partido p on p.id = pr.partido_id
   where p.proveedor_id = 9951 and pr.usuario_id = '00000000-0000-0000-0000-00000000000b')
  < (select pr.id from public.prediccion pr join public.partido p on p.id = pr.partido_id
     where p.proveedor_id = 9952 and pr.usuario_id = '00000000-0000-0000-0000-00000000000c'),
  'Preparación: la predicción de B tiene el id menor'
);
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select is(
  (select nombre from public.mejor_analisis_jornada()),
  'Usuario C',
  'F17 CA4: a igual bono y puntos base, gana la evaluada primero (no el id menor)'
);

-- ---------------------------------------------------------------------------
-- Como D (solo H, con A): el propio análisis
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000d", "role": "authenticated"}';
select results_eq(
  $$ select nombre, puntos_bono, grupo_nombre, es_yo from public.mejor_analisis_jornada() $$,
  $$ values ('Usuario D', 65, 'Grupo H', true) $$,
  'F17 CA4: mi propio análisis también cuenta'
);

-- Como Z (solo en su grupo; su único bono es 45): nada.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000011", "role": "authenticated"}';
select is(
  (select count(*)::int from public.mejor_analisis_jornada()),
  0,
  'F17 CA4: un bono menor a 50 no cuenta: con el 45 de Z como único candidato, cero filas'
);

-- Como X (salió de G, sin grupos): ni el suyo, porque ya no comparte grupo con nadie.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000010", "role": "authenticated"}';
select is(
  (select count(*)::int from public.mejor_analisis_jornada()),
  0,
  'F17 CA4: sin grupos no hay mejor análisis'
);

-- ---------------------------------------------------------------------------
-- Permisos y columnas (R13)
-- ---------------------------------------------------------------------------

reset role;
select ok(
  pg_get_function_result('public.mejor_analisis_jornada()'::regprocedure) !~ '(afirmaciones|correo|resultado|marcador_local|rango_goles)',
  'F17 CA4: no trae afirmaciones, correo ni la predicción'
);
select is(
  (select count(*)::int from pg_proc where proname = 'mejor_analisis_jornada'
     and prosecdef and proconfig @> array['search_path=""']),
  1,
  'F17 R13: mejor_analisis_jornada es security definer con search_path vacío'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok(
  $$ select * from public.mejor_analisis_jornada() $$,
  '42501', null,
  'F17 CA4: anon no ejecuta mejor_analisis_jornada'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"role": "authenticated"}';
select throws_ok(
  $$ select * from public.mejor_analisis_jornada() $$,
  'P0001', 'SIN_SESION',
  'F17 R13: sin usuario falla con SIN_SESION'
);
reset role;

select * from finish();
rollback;
