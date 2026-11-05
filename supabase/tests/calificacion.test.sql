-- T50 — Calificación (F05): selección (R1), una sola vez (R4, R06), simulados (R5), cancelados
-- (R6), cierre de jornada (R7) y permisos (R10). Los puntos los calcula la función pura de T51; aquí
-- se mandan ya calculados. Todo se deshace al final.
begin;

select plan(35);

-- ---------------------------------------------------------------------------
-- Datos de prueba (como postgres)
-- ---------------------------------------------------------------------------

insert into public.liga (proveedor_id, nombre, pais) values (999262, 'Liga de Prueba', 'Mexico');

insert into public.torneo (
  liga_id, nombre, temporada_proveedor, prefijo_rondas, fecha_inicio, fecha_fin, es_actual
)
select id, 'Apertura 2099', 2099, 'Apertura', '2099-07-01', '2099-12-31', false
from public.liga where proveedor_id = 999262;

insert into public.jornada (torneo_id, orden, nombre, nombres_proveedor, fase, fecha_inicio, fecha_fin)
select t.id, j.orden, 'Jornada ' || j.orden, array['Apertura - ' || j.orden], 'REGULAR',
  '2099-07-01', '2099-07-31'
from public.torneo t cross join (values (1), (2)) as j (orden)
where t.temporada_proveedor = 2099;

insert into public.equipo (proveedor_id, nombre, nombre_corto, escudo_url)
values
  (999001, 'Local de Prueba', 'Local', 'https://example.com/l.png'),
  (999002, 'Visitante de Prueba', 'Visitante', 'https://example.com/v.png');

-- Todos nacen abiertos para poder predecirlos; después se llevan a su estado final.
-- Jornada 1: 9301 terminado con 2 predicciones, 9302 cancelado con 1, 9303 terminado sin
-- predicciones. Jornada 2: 9304 terminado sin datos, 9305 en juego, 9306 pospuesto, 9307 ya
-- calificado, 9308 terminado sin marcador y un simulado terminado con 1 predicción.
insert into public.partido (
  proveedor_id, torneo_id, jornada_id, equipo_local_id, equipo_visitante_id, inicio,
  cierre_predicciones, es_simulado, sincronizado_en
)
select p.proveedor, j.torneo_id, j.id,
  (select id from public.equipo where proveedor_id = 999001),
  (select id from public.equipo where proveedor_id = 999002),
  now() + interval '1 day', now() + interval '1 day', p.proveedor is null, now()
from (values
  (9301, 1), (9302, 1), (9303, 1),
  (9304, 2), (9305, 2), (9306, 2), (9307, 2), (9308, 2), (null, 2)
) as p (proveedor, orden)
join public.jornada j on j.orden = p.orden
  and j.torneo_id = (select id from public.torneo where temporada_proveedor = 2099);

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
select ('00000000-0000-0000-0000-00000000000' || x)::uuid, x || '@example.com',
  '{"provider": "google"}', jsonb_build_object('provider_id', 'google-' || x, 'full_name', 'Usuario ' || x)
from unnest(array['a', 'b']) as x;

insert into public.prediccion (usuario_id, partido_id, resultado, marcador_local, marcador_visitante)
select u::uuid, p.id, r::public.resultado_prediccion, ml, mv
from (values
  ('00000000-0000-0000-0000-00000000000a', 9301, null, 2, 1),
  ('00000000-0000-0000-0000-00000000000b', 9301, 'VISITANTE', null, null),
  ('00000000-0000-0000-0000-00000000000a', 9302, 'LOCAL', null, null)
) as x (u, proveedor, r, ml, mv)
join public.partido p on p.proveedor_id = x.proveedor;

insert into public.prediccion (usuario_id, partido_id, resultado)
select '00000000-0000-0000-0000-00000000000a', id, 'EMPATE'
from public.partido where es_simulado and jornada_id in (
  select id from public.jornada where torneo_id = (select id from public.torneo where temporada_proveedor = 2099)
);

update public.partido as p
set estado = x.estado::public.estado_partido,
  goles_local = x.gl, goles_visitante = x.gv,
  listo_para_calificar_en = case when x.listo then now() end,
  calificado_en = case when x.calificado then now() end
from (values
  (9301, 'TERMINADO', 2, 1, true, false),
  (9302, 'CANCELADO', null, null, false, false),
  (9303, 'TERMINADO', 0, 0, true, false),
  (9304, 'TERMINADO', 1, 0, false, false),
  (9305, 'EN_JUEGO', null, null, false, false),
  (9306, 'POSPUESTO', null, null, false, false),
  (9307, 'TERMINADO', 3, 3, true, true),
  (9308, 'TERMINADO', null, null, true, false)
) as x (proveedor, estado, gl, gv, listo, calificado)
where p.proveedor_id = x.proveedor;

update public.partido
set estado = 'TERMINADO', goles_local = 1, goles_visitante = 1, listo_para_calificar_en = now()
where es_simulado and torneo_id = (select id from public.torneo where temporada_proveedor = 2099);

create temporary table ids on commit drop as
select
  (select id from public.partido where proveedor_id = 9301) as p9301,
  (select id from public.partido where proveedor_id = 9302) as p9302,
  (select id from public.partido where proveedor_id = 9303) as p9303,
  (select id from public.partido where proveedor_id = 9304) as p9304,
  (select id from public.partido where es_simulado
     and torneo_id = (select id from public.torneo where temporada_proveedor = 2099)) as simulado,
  (select pr.id from public.prediccion pr join public.partido p on p.id = pr.partido_id
   where p.proveedor_id = 9301 and pr.usuario_id = '00000000-0000-0000-0000-00000000000a') as a9301,
  (select pr.id from public.prediccion pr join public.partido p on p.id = pr.partido_id
   where p.proveedor_id = 9301 and pr.usuario_id = '00000000-0000-0000-0000-00000000000b') as b9301,
  (select pr.id from public.prediccion pr join public.partido p on p.id = pr.partido_id
   where p.proveedor_id = 9302) as a9302,
  (select pr.id from public.prediccion pr join public.partido p on p.id = pr.partido_id
   where p.es_simulado and pr.usuario_id = '00000000-0000-0000-0000-00000000000a'
     and p.torneo_id = (select id from public.torneo where temporada_proveedor = 2099)) as asim;
grant select on ids to service_role, authenticated, anon;

select results_eq(
  $$ select resultado, rango_goles, marcador_exacto from public.valor_puntos $$,
  $$ values (100::smallint, 150::smallint, 350::smallint) $$,
  'F05 R2: valores de puntos de D18/D26 en la base'
);

-- ---------------------------------------------------------------------------
-- Como service_role (la función `calificar`)
-- ---------------------------------------------------------------------------

set local role service_role;

select bag_eq(
  $$ select partido_id from public.partidos_por_calificar(10) $$,
  $$ select unnest(array[p9301, p9303, simulado]) from ids $$,
  'F05 CA4: solo terminados, listos, sin calificar y con marcador (sin 9304, 9305, 9306, 9307, 9308 ni el cancelado)'
);
select is(
  (select count(*)::int from public.partidos_por_calificar(1)),
  1,
  'F05 R1: respeta el límite por ejecución'
);
select results_eq(
  $$ select goles_local, goles_visitante from public.partidos_por_calificar(10)
     where partido_id = (select p9301 from ids) $$,
  $$ values (2::smallint, 1::smallint) $$,
  'F05 R3: entrega el marcador de 90 min guardado'
);

-- CA3: incompleta (falta B) o con una predicción de otro partido: no guarda nada.
select throws_ok(
  format($$ select public.registrar_calificaciones(%s, '[{"prediccion_id": %s,
       "puntos_resultado": 0, "puntos_rango_goles": 0, "puntos_marcador": 350}]') $$,
    (select p9301 from ids), (select a9301 from ids)),
  'P0001', 'CALIFICACION_INCOMPLETA',
  'F05 CA3: si falta una predicción del partido no se guarda nada'
);
select throws_ok(
  format($$ select public.registrar_calificaciones(%s, '[
       {"prediccion_id": %s, "puntos_resultado": 0, "puntos_rango_goles": 0, "puntos_marcador": 350},
       {"prediccion_id": %s, "puntos_resultado": 0, "puntos_rango_goles": 0, "puntos_marcador": 0}]') $$,
    (select p9301 from ids), (select a9301 from ids), (select a9302 from ids)),
  'P0001', 'CALIFICACION_INCOMPLETA',
  'F05 CA3: una predicción de otro partido no cuenta'
);
select is(
  (select count(*)::int from public.calificacion),
  0,
  'F05 CA3: tras los rechazos no hay calificaciones'
);
select is(
  (select calificado_en from public.partido where id = (select p9301 from ids)),
  null,
  'F05 CA3: tras los rechazos el partido sigue sin calificar'
);

-- CA3: completa, una sola vez.
select is(
  public.registrar_calificaciones((select p9301 from ids), jsonb_build_array(
    jsonb_build_object('prediccion_id', (select a9301 from ids), 'puntos_resultado', 0,
      'puntos_rango_goles', 0, 'puntos_marcador', 350),
    jsonb_build_object('prediccion_id', (select b9301 from ids), 'puntos_resultado', 0,
      'puntos_rango_goles', 0, 'puntos_marcador', 0))),
  'CALIFICADO',
  'F05 CA3: califica el partido con todas sus predicciones'
);
select is(
  public.registrar_calificaciones((select p9301 from ids), jsonb_build_array(
    jsonb_build_object('prediccion_id', (select a9301 from ids), 'puntos_resultado', 100,
      'puntos_rango_goles', 150, 'puntos_marcador', 0),
    jsonb_build_object('prediccion_id', (select b9301 from ids), 'puntos_resultado', 100,
      'puntos_rango_goles', 0, 'puntos_marcador', 0))),
  'YA_CALIFICADO',
  'F05 CA3: la segunda llamada responde YA_CALIFICADO'
);
select results_eq(
  $$ select prediccion_id, puntos_base::int, es_simulada from public.calificacion
     order by prediccion_id $$,
  $$ select * from (select a9301, 350, false from ids union all select b9301, 0, false from ids) x
     order by 1 $$,
  'F05 CA3, CA5: una calificación por predicción, sin cambios tras la segunda llamada; real = no simulada'
);
select isnt(
  (select calificado_en from public.partido where id = (select p9301 from ids)),
  null,
  'F05 R4: el partido queda con calificado_en'
);

-- R7: la jornada 1 sigue abierta mientras 9303 no esté calificado (el cancelado no cuenta).
select is(
  (select esta_cerrada from public.jornada j join public.partido p on p.jornada_id = j.id
   where p.id = (select p9301 from ids)),
  false,
  'F05 CA6: la jornada no se cierra con un partido pendiente'
);
select is(
  public.registrar_calificaciones((select p9303 from ids), '[]'),
  'CALIFICADO',
  'F05 R4: un partido sin predicciones también queda calificado'
);
select is(
  (select esta_cerrada from public.jornada j join public.partido p on p.jornada_id = j.id
   where p.id = (select p9301 from ids)),
  true,
  'F05 CA6: con todo calificado o cancelado, la jornada se cierra'
);

-- CA8: el cancelado nunca se califica.
select throws_ok(
  format($$ select public.registrar_calificaciones(%s, '[{"prediccion_id": %s,
       "puntos_resultado": 100, "puntos_rango_goles": 0, "puntos_marcador": 0}]') $$,
    (select p9302 from ids), (select a9302 from ids)),
  'P0001', 'PARTIDO_NO_LISTO',
  'F05 CA8: un partido cancelado no se puede calificar'
);
select is(
  (select count(*)::int from public.calificacion where prediccion_id = (select a9302 from ids)),
  0,
  'F05 CA8: la predicción del cancelado queda sin calificación (anulada)'
);
select throws_ok(
  format($$ select public.registrar_calificaciones(%s, '[]') $$, (select p9304 from ids)),
  'P0001', 'PARTIDO_NO_LISTO',
  'F05 R1: un terminado sin datos listos no se califica'
);

-- CA5: el simulado queda marcado.
select is(
  public.registrar_calificaciones((select simulado from ids), jsonb_build_array(
    jsonb_build_object('prediccion_id', (select asim from ids), 'puntos_resultado', 100,
      'puntos_rango_goles', 0, 'puntos_marcador', 0))),
  'CALIFICADO',
  'F05 CA5: califica el simulado'
);
select results_eq(
  $$ select es_simulada, puntos_base::int from public.calificacion
     where prediccion_id = (select asim from ids) $$,
  $$ values (true, 100) $$,
  'F05 CA5: la calificación del simulado queda con es_simulada'
);
select is(
  (select esta_cerrada from public.jornada j join public.partido p on p.jornada_id = j.id
   where p.id = (select simulado from ids)),
  false,
  'F05 CA6: la jornada 2 sigue abierta (en juego, pospuesto y pendientes)'
);
select is_empty(
  $$ select 1 from public.partidos_por_calificar(10) $$,
  'F05 CA4: ya no quedan partidos por calificar'
);

-- ---------------------------------------------------------------------------
-- Como el usuario A (CA7)
-- ---------------------------------------------------------------------------

reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select bag_eq(
  $$ select prediccion_id from public.calificacion $$,
  $$ select unnest(array[a9301, asim]) from ids $$,
  'F05 CA7: A solo lee las calificaciones de sus predicciones'
);
select is(
  (select count(*)::int from public.valor_puntos),
  1,
  'F05 R10: A lee los valores de puntos'
);
select throws_ok(
  format($$ insert into public.calificacion (prediccion_id, puntos_resultado, puntos_rango_goles,
       puntos_marcador, es_simulada) values (%s, 100, 150, 0, false) $$, (select a9302 from ids)),
  '42501', null,
  'F05 CA7: A no inserta calificaciones'
);
select throws_ok(
  $$ update public.calificacion set puntos_marcador = 999 $$,
  '42501', null,
  'F05 CA7: A no modifica calificaciones'
);
select throws_ok(
  $$ delete from public.calificacion $$,
  '42501', null,
  'F05 CA7: A no borra calificaciones'
);
select throws_ok(
  $$ update public.valor_puntos set resultado = 1000 $$,
  '42501', null,
  'F05 CA7: A no cambia los valores de puntos'
);
select throws_ok(
  $$ select * from public.partidos_por_calificar(10) $$,
  '42501', null,
  'F05 CA7: A no ejecuta partidos_por_calificar'
);
select throws_ok(
  format($$ select public.registrar_calificaciones(%s, '[]') $$, (select p9304 from ids)),
  '42501', null,
  'F05 CA7: A no ejecuta registrar_calificaciones'
);

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';

select bag_eq(
  $$ select prediccion_id from public.calificacion $$,
  $$ select b9301 from ids $$,
  'F05 CA7: B solo lee la suya'
);

-- ---------------------------------------------------------------------------
-- Como anon (CA7)
-- ---------------------------------------------------------------------------

reset role;
set local role anon;

select throws_ok(
  $$ select 1 from public.calificacion $$,
  '42501', null,
  'F05 CA7: anon no lee calificaciones'
);
select throws_ok(
  $$ select 1 from public.valor_puntos $$,
  '42501', null,
  'F05 CA7: anon no lee los valores de puntos'
);

reset role;

select results_eq(
  $$ select f::text, has_function_privilege('authenticated', f, 'execute'),
       has_function_privilege('anon', f, 'execute'),
       has_function_privilege('service_role', f, 'execute')
     from unnest(array['public.partidos_por_calificar(integer)',
       'public.registrar_calificaciones(bigint, jsonb)']) as f $$,
  $$ values
       ('public.partidos_por_calificar(integer)', false, false, true),
       ('public.registrar_calificaciones(bigint, jsonb)', false, false, true) $$,
  'F05 R10: solo service_role ejecuta las dos funciones'
);
select is(
  (select bool_and(not prosecdef and proconfig = array['search_path=""'])
   from pg_proc
   where oid in ('public.partidos_por_calificar(integer)'::regprocedure,
     'public.registrar_calificaciones(bigint, jsonb)'::regprocedure)),
  true,
  'F05 R10: sin security definer y con search_path vacío'
);

select * from finish();
rollback;
