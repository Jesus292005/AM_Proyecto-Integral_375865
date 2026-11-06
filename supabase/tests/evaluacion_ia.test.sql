-- T54 — Evaluación con IA (F06): qué se evalúa (R1), reserva y desenlaces (R8, R11), tope diario
-- (R10) y permisos (R15). `now()` no cambia dentro de la transacción: para "esperar" se mueve
-- `siguiente_intento_en` al pasado como postgres. Todo se deshace al final.
begin;

select plan(36);

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
select id, 1, 'Jornada 1', array['Apertura - 1'], 'REGULAR', '2099-07-01', '2099-07-31'
from public.torneo where temporada_proveedor = 2099;

insert into public.equipo (proveedor_id, nombre, nombre_corto, escudo_url)
values
  (999001, 'Local de Prueba', 'Local', 'https://example.com/l.png'),
  (999002, 'Visitante de Prueba', 'Visitante', 'https://example.com/v.png');

-- 9401: real calificado. 9402: real sin calificar todavía. Y un simulado calificado.
insert into public.partido (
  proveedor_id, torneo_id, jornada_id, equipo_local_id, equipo_visitante_id, inicio,
  cierre_predicciones, es_simulado, sincronizado_en
)
select p.proveedor, j.torneo_id, j.id,
  (select id from public.equipo where proveedor_id = 999001),
  (select id from public.equipo where proveedor_id = 999002),
  now() + interval '1 day', now() + interval '1 day', p.proveedor is null, now()
from (values (9401), (9402), (null)) as p (proveedor)
cross join public.jornada j
where j.torneo_id = (select id from public.torneo where temporada_proveedor = 2099);

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
select ('00000000-0000-0000-0000-00000000000' || x)::uuid, x || '@example.com',
  '{"provider": "google"}', jsonb_build_object('provider_id', 'google-' || x, 'full_name', 'Usuario ' || x)
from unnest(array['a', 'b']) as x;

-- A: 9401 con justificación y 9402 con justificación. B: 9401 sin justificación y el simulado con.
insert into public.prediccion (usuario_id, partido_id, resultado, justificacion)
select x.u::uuid, p.id, 'LOCAL', x.j
from (values
  ('00000000-0000-0000-0000-00000000000a', 9401, 'Puebla tira más.'),
  ('00000000-0000-0000-0000-00000000000a', 9402, 'Habrá penal.'),
  ('00000000-0000-0000-0000-00000000000b', 9401, null)
) as x (u, proveedor, j)
join public.partido p on p.proveedor_id = x.proveedor;

insert into public.prediccion (usuario_id, partido_id, resultado, justificacion)
select '00000000-0000-0000-0000-00000000000b', id, 'EMPATE', 'Querétaro empata.'
from public.partido
where es_simulado and torneo_id = (select id from public.torneo where temporada_proveedor = 2099);

update public.partido
set estado = 'TERMINADO', goles_local = 1, goles_visitante = 0, listo_para_calificar_en = now()
where torneo_id = (select id from public.torneo where temporada_proveedor = 2099);

-- Calificados: 9401 y el simulado (9402 todavía no).
insert into public.calificacion (prediccion_id, puntos_resultado, puntos_rango_goles, puntos_marcador, es_simulada)
select pr.id, 100, 0, 0, p.es_simulado
from public.prediccion pr join public.partido p on p.id = pr.partido_id
where p.proveedor_id = 9401 or p.es_simulado and p.torneo_id = (
  select id from public.torneo where temporada_proveedor = 2099);

create temporary table ids on commit drop as
select
  (select pr.id from public.prediccion pr join public.partido p on p.id = pr.partido_id
   where p.proveedor_id = 9401 and pr.usuario_id = '00000000-0000-0000-0000-00000000000a') as a9401,
  (select pr.id from public.prediccion pr join public.partido p on p.id = pr.partido_id
   where p.proveedor_id = 9402) as a9402,
  (select pr.id from public.prediccion pr join public.partido p on p.id = pr.partido_id
   where p.es_simulado and pr.usuario_id = '00000000-0000-0000-0000-00000000000b'
     and p.torneo_id = (select id from public.torneo where temporada_proveedor = 2099)) as bsim;
grant select on ids to service_role, authenticated, anon;

-- 2 llamadas de hoy y 1 de ayer (día UTC, R10).
insert into public.llamada_ia (inicio, modelo, resultado)
values (now(), 'claude-haiku-5-5', 'OK'), (now(), 'claude-haiku-5-5', 'FALLO'),
  (now() - interval '1 day', 'claude-haiku-5-5', 'OK');

-- ---------------------------------------------------------------------------
-- Como service_role (la función `evaluar`)
-- ---------------------------------------------------------------------------

set local role service_role;

select is(public.llamadas_ia_hoy(now()), 2, 'F06 R10: cuenta solo las llamadas del día UTC');
select is(public.hay_evaluaciones_por_hacer(now(), 150), true,
  'F06 R14: hay predicciones calificadas con justificación sin evaluar');
select is(public.hay_evaluaciones_por_hacer(now(), 2), false,
  'F06 CA5: con el tope diario alcanzado no hay nada que hacer');

select bag_eq(
  $$ select prediccion_id from public.tomar_evaluaciones(10) $$,
  $$ select unnest(array[a9401, bsim]) from ids $$,
  'F06 CA6: solo se toman predicciones calificadas con justificación (no B sin texto, no la de 9402 sin calificar)'
);
select results_eq(
  $$ select prediccion_id, estado::text, intentos::int, es_simulada from public.evaluacion_ia
     order by prediccion_id $$,
  $$ select * from (select a9401, 'PENDIENTE', 1, false from ids
     union all select bsim, 'PENDIENTE', 1, true from ids) x order by 1 $$,
  'F06 R1, R11: crea una evaluación por predicción, marca la simulada y reserva con un intento'
);
select is_empty(
  $$ select 1 from public.tomar_evaluaciones(10) $$,
  'F06 CA6: una evaluación reservada no se vuelve a tomar'
);

-- Guardar (idempotente).
select is(
  public.guardar_evaluacion((select id from public.evaluacion_ia where prediccion_id = (select a9401 from ids)),
    '{"puntos_bono": 80, "explicacion": "Leíste bien los tiros.", "modelo": "claude-haiku-5-5",
      "version_prompt": "v3", "afirmaciones": [{"texto": "Puebla tira más", "veredicto": "ACERTADA",
      "motivo": "17 contra 10.", "evidencia": ["S2"]}]}'),
  true,
  'F06 R11: guarda la evaluación pendiente'
);
select results_eq(
  $$ select estado::text, puntos_bono::int, explicacion, modelo, version_prompt,
       jsonb_array_length(afirmaciones), evaluada_en is not null
     from public.evaluacion_ia where prediccion_id = (select a9401 from ids) $$,
  $$ values ('EVALUADA', 80, 'Leíste bien los tiros.', 'claude-haiku-5-5', 'v3', 1, true) $$,
  'F06 R11: queda EVALUADA con bono, explicación, afirmaciones, modelo y versión'
);
select is(
  public.guardar_evaluacion((select id from public.evaluacion_ia where prediccion_id = (select a9401 from ids)),
    '{"puntos_bono": 0, "explicacion": "Otra.", "modelo": "x", "version_prompt": "x", "afirmaciones": []}'),
  false,
  'F06 CA6: guardar sobre una ya EVALUADA no cambia nada'
);
select is(
  (select puntos_bono::int from public.evaluacion_ia where prediccion_id = (select a9401 from ids)),
  80,
  'F06 CA6: el bono guardado no cambió'
);

-- Fallos: 1 min, 5 min y al 3.º ERROR (CA3).
select is(
  public.registrar_fallo_evaluacion(
    (select id from public.evaluacion_ia where prediccion_id = (select bsim from ids)), 'La salida no es JSON.'),
  'PENDIENTE'::public.estado_evaluacion,
  'F06 CA3: el 1.er fallo deja la evaluación pendiente'
);
select results_eq(
  $$ select siguiente_intento_en - now(), error from public.evaluacion_ia
     where prediccion_id = (select bsim from ids) $$,
  $$ values (interval '1 minute', 'La salida no es JSON.') $$,
  'F06 R8: tras el 1.er fallo se reintenta en 1 min y se guarda el motivo'
);

reset role;
update public.evaluacion_ia set siguiente_intento_en = now() - interval '1 second'
where prediccion_id = (select bsim from ids);
set local role service_role;

select results_eq(
  $$ select prediccion_id, intentos::int from public.tomar_evaluaciones(10) $$,
  $$ select bsim, 2 from ids $$,
  'F06 R8: llegado su momento se vuelve a tomar (2.º intento)'
);
select is(
  public.registrar_fallo_evaluacion(
    (select id from public.evaluacion_ia where prediccion_id = (select bsim from ids)), 'Anthropic respondió 529'),
  'PENDIENTE'::public.estado_evaluacion,
  'F06 CA3: el 2.º fallo deja la evaluación pendiente'
);
select is(
  (select siguiente_intento_en - now() from public.evaluacion_ia where prediccion_id = (select bsim from ids)),
  interval '5 minutes',
  'F06 R8: tras el 2.º fallo se reintenta en 5 min'
);

reset role;
update public.evaluacion_ia set siguiente_intento_en = now() - interval '1 second'
where prediccion_id = (select bsim from ids);
set local role service_role;

select is(
  (select intentos::int from public.tomar_evaluaciones(10)),
  3,
  'F06 R8: 3.er intento'
);
select is(
  public.registrar_fallo_evaluacion(
    (select id from public.evaluacion_ia where prediccion_id = (select bsim from ids)), 'El modelo rechazó la petición.'),
  'ERROR'::public.estado_evaluacion,
  'F06 CA3: al 3.er fallo queda ERROR'
);
select results_eq(
  $$ select c.puntos_base::int from public.calificacion c where c.prediccion_id = (select bsim from ids) $$,
  $$ values (100) $$,
  'F06 CA3, R9: el ERROR no toca los puntos base'
);
select is(
  public.registrar_fallo_evaluacion(
    (select id from public.evaluacion_ia where prediccion_id = (select bsim from ids)), 'otro'),
  null,
  'F06 R8: ERROR es final; otro fallo no la cambia'
);

-- Liberar (401) y una reservada que se quedó sin cerrar con sus 3 intentos.
reset role;
insert into public.calificacion (prediccion_id, puntos_resultado, puntos_rango_goles, puntos_marcador, es_simulada)
select a9402, 0, 0, 0, false from ids;
set local role service_role;

select is(
  (select intentos::int from public.tomar_evaluaciones(10)),
  1,
  'F06 R1: la recién calificada se toma en la siguiente ejecución'
);
select lives_ok(
  $$ select public.liberar_evaluaciones(array[(select id from public.evaluacion_ia
       where prediccion_id = (select a9402 from ids))]) $$,
  'F06 R8: liberar las reservadas'
);
select results_eq(
  $$ select intentos::int, siguiente_intento_en - now(), estado::text from public.evaluacion_ia
     where prediccion_id = (select a9402 from ids) $$,
  $$ values (0, interval '5 minutes', 'PENDIENTE') $$,
  'F06 CA3: con la clave inválida no se gasta el intento y se espera 5 min'
);

reset role;
update public.evaluacion_ia set intentos = 3, siguiente_intento_en = now() - interval '1 second'
where prediccion_id = (select a9402 from ids);
set local role service_role;

select is_empty(
  $$ select 1 from public.tomar_evaluaciones(10) $$,
  'F06 R8: una con 3 intentos no se vuelve a tomar'
);
select is(
  (select estado::text from public.evaluacion_ia where prediccion_id = (select a9402 from ids)),
  'ERROR',
  'F06 R8: una reservada que agotó sus intentos sin cerrarse pasa a ERROR'
);
select is(public.hay_evaluaciones_por_hacer(now(), 150), false,
  'F06 R14: sin pendientes la tarea no llama a la función');

-- Restricciones del modelo de datos.
reset role;
select throws_ok(
  $$ update public.evaluacion_ia set estado = 'EVALUADA' where prediccion_id = (select a9402 from ids) $$,
  '23514', null,
  'F06 R16: EVALUADA exige bono, explicación, modelo, versión y fecha'
);
select throws_ok(
  $$ update public.evaluacion_ia set puntos_bono = 101 where prediccion_id = (select a9401 from ids) $$,
  '23514', null,
  'F06 R3: el bono no pasa de 100 (R07: tampoco baja de 0)'
);

-- ---------------------------------------------------------------------------
-- Como usuarios (CA7)
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select bag_eq(
  $$ select prediccion_id from public.evaluacion_ia $$,
  $$ select unnest(array[a9401, a9402]) from ids $$,
  'F06 CA7: A solo lee las evaluaciones de sus predicciones'
);
select throws_ok(
  $$ update public.evaluacion_ia set puntos_bono = 100 $$,
  '42501', null,
  'F06 CA7: A no modifica evaluaciones'
);
select throws_ok(
  format($$ insert into public.evaluacion_ia (prediccion_id, es_simulada) values (%s, false) $$,
    (select a9402 from ids)),
  '42501', null,
  'F06 CA7: A no crea evaluaciones'
);
select throws_ok(
  $$ select 1 from public.llamada_ia $$,
  '42501', null,
  'F06 CA7: A no lee el registro de llamadas'
);
select throws_ok(
  $$ select * from public.tomar_evaluaciones(1) $$,
  '42501', null,
  'F06 CA7: A no ejecuta tomar_evaluaciones'
);

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';

select bag_eq(
  $$ select prediccion_id from public.evaluacion_ia $$,
  $$ select bsim from ids $$,
  'F06 CA7: B solo lee la suya'
);

reset role;
set local role anon;

select throws_ok(
  $$ select 1 from public.evaluacion_ia $$,
  '42501', null,
  'F06 CA7: anon no lee evaluaciones'
);

reset role;

select results_eq(
  $$ select r, t, p, has_table_privilege(r, 'public.' || t, p)
     from unnest(array['anon', 'authenticated']) as r,
       unnest(array['evaluacion_ia', 'llamada_ia']) as t,
       unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE']) as p
     order by r, t, p $$,
  $$ select r, t, p, (r = 'authenticated' and t = 'evaluacion_ia' and p = 'SELECT')
     from unnest(array['anon', 'authenticated']) as r,
       unnest(array['evaluacion_ia', 'llamada_ia']) as t,
       unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE']) as p
     order by r, t, p $$,
  'F06 CA7: anon no tiene ningún permiso; authenticated solo lee evaluacion_ia (con RLS) y nada de llamada_ia'
);
select results_eq(
  $$ select bool_or(has_function_privilege('authenticated', f, 'execute')),
       bool_or(has_function_privilege('anon', f, 'execute')),
       bool_and(has_function_privilege('service_role', f, 'execute')),
       bool_and(not p.prosecdef and p.proconfig = array['search_path=""'])
     from unnest(array[
       'public.llamadas_ia_hoy(timestamptz)', 'public.hay_evaluaciones_por_hacer(timestamptz, integer)',
       'public.tomar_evaluaciones(integer)', 'public.guardar_evaluacion(bigint, jsonb)',
       'public.registrar_fallo_evaluacion(bigint, text)', 'public.liberar_evaluaciones(bigint[])'
     ]::regprocedure[]) as f
     join pg_proc p on p.oid = f $$,
  $$ values (false, false, true, true) $$,
  'F06 R15: solo service_role ejecuta las 6 funciones; sin security definer y con search_path vacío'
);

select * from finish();
rollback;
