-- T59 — Selección de avisos de puntos (F11b R1, R2, R8) y su tarea programada (R7). `now()` no
-- cambia dentro de la transacción. Todo se deshace al final.
begin;

select plan(6);

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
  (999001, 'Club Puebla', 'Puebla', 'https://example.com/l.png'),
  (999002, 'Querétaro FC', 'Querétaro', 'https://example.com/v.png');

-- 9601: calificado hace 5 min. 9602: hace 25 min. 9603: hace 25 h. 9604: terminado sin calificar.
-- 9605: cancelado.
insert into public.partido (
  proveedor_id, torneo_id, jornada_id, equipo_local_id, equipo_visitante_id, inicio,
  cierre_predicciones, sincronizado_en
)
select p.proveedor, j.torneo_id, j.id,
  (select id from public.equipo where proveedor_id = 999001),
  (select id from public.equipo where proveedor_id = 999002),
  now() + interval '1 day', now() + interval '1 day', now()
from generate_series(9601, 9605) as p (proveedor)
cross join public.jornada j
where j.torneo_id = (select id from public.torneo where temporada_proveedor = 2099);

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
select ('00000000-0000-0000-0000-00000000000' || x)::uuid, x || '@example.com',
  '{"provider": "google"}', jsonb_build_object('provider_id', 'google-' || x, 'full_name', 'Usuario ' || x)
from unnest(array['a', 'b', 'c', 'd', 'e', 'f']) as x;

-- Todos con dispositivo menos E. A con los recordatorios apagados (decisión 3: no importa).
insert into public.dispositivo (usuario_id, token)
select ('00000000-0000-0000-0000-00000000000' || x)::uuid, 'ExponentPushToken[' || x || ']'
from unnest(array['a', 'b', 'c', 'd', 'f']) as x;
update public.usuario set recordatorios_activos = false
where id = '00000000-0000-0000-0000-00000000000a';

-- 9601: A sin justificación, B evaluada, C con error, D pendiente, E sin dispositivo, F ya avisado.
-- 9602: D pendiente (pasaron 20 min). 9603–9605: A.
insert into public.prediccion (usuario_id, partido_id, resultado, justificacion)
select ('00000000-0000-0000-0000-00000000000' || x.u)::uuid, p.id, 'LOCAL', x.j
from (values
  ('a', 9601, null), ('b', 9601, 'Evaluada.'), ('c', 9601, 'Con error.'), ('d', 9601, 'Pendiente.'),
  ('e', 9601, null), ('f', 9601, null), ('d', 9602, 'Pendiente.'), ('a', 9603, null),
  ('a', 9604, null), ('a', 9605, null)
) as x (u, proveedor, j)
join public.partido p on p.proveedor_id = x.proveedor;

update public.partido as p
set estado = x.estado::public.estado_partido, goles_local = x.gl, goles_visitante = x.gv,
  listo_para_calificar_en = case when x.estado = 'TERMINADO' then now() end,
  calificado_en = now() - x.hace
from (values
  (9601, 'TERMINADO', 2, 1, interval '5 minutes'),
  (9602, 'TERMINADO', 0, 0, interval '25 minutes'),
  (9603, 'TERMINADO', 1, 0, interval '25 hours'),
  (9604, 'TERMINADO', 1, 0, null),
  (9605, 'CANCELADO', null, null, null)
) as x (proveedor, estado, gl, gv, hace)
where p.proveedor_id = x.proveedor;

insert into public.calificacion (prediccion_id, puntos_resultado, puntos_rango_goles, puntos_marcador, es_simulada)
select pr.id, 100, 0, 0, false
from public.prediccion pr join public.partido p on p.id = pr.partido_id
where p.proveedor_id in (9601, 9602, 9603);

insert into public.evaluacion_ia (
  prediccion_id, estado, puntos_bono, explicacion, modelo, version_prompt, evaluada_en, es_simulada
)
select pr.id, x.estado::public.estado_evaluacion, x.bono, x.explicacion, x.modelo, x.version,
  x.evaluada, false
from (values
  ('b', 9601, 'EVALUADA', 60, 'Bien.', 'claude-haiku-5-5', 'v3', now()),
  ('c', 9601, 'ERROR', null, null, null, null, null),
  ('d', 9601, 'PENDIENTE', null, null, null, null, null),
  ('d', 9602, 'PENDIENTE', null, null, null, null, null)
) as x (u, proveedor, estado, bono, explicacion, modelo, version, evaluada)
join public.partido p on p.proveedor_id = x.proveedor
join public.prediccion pr on pr.partido_id = p.id
  and pr.usuario_id = ('00000000-0000-0000-0000-00000000000' || x.u)::uuid;

insert into public.notificacion_enviada (usuario_id, tipo, partido_id)
select '00000000-0000-0000-0000-00000000000f', 'PUNTOS_LISTOS', id
from public.partido where proveedor_id = 9601;

-- ---------------------------------------------------------------------------
-- Como service_role (la función `avisos-puntos`)
-- ---------------------------------------------------------------------------

set local role service_role;

select results_eq(
  $$ select right(a.usuario_id::text, 1), p.proveedor_id, a.estado_bono, a.puntos_base, a.puntos_bono::int
     from public.avisos_puntos_pendientes(now()) a join public.partido p on p.id = a.partido_id
     order by 1, 2 $$,
  $$ values
       ('a', 9601, 'SIN_JUSTIFICACION', 100, null::int),
       ('b', 9601, 'EVALUADA', 100, 60),
       ('c', 9601, 'ERROR', 100, null),
       ('d', 9602, 'PENDIENTE', 100, null) $$,
  'F11b CA1: listos sin justificación, evaluada, con error y pendiente tras 20 min; fuera: pendiente < 20 min, ya avisado, sin dispositivo, > 24 h, sin calificar y cancelado'
);
select results_eq(
  $$ select a.local, a.visitante, a.goles_local::int, a.goles_visitante::int, a.es_simulado, a.tokens
     from public.avisos_puntos_pendientes(now()) a
     where a.usuario_id = '00000000-0000-0000-0000-00000000000b' $$,
  $$ values ('Puebla', 'Querétaro', 2, 1, false, array['ExponentPushToken[b]']) $$,
  'F11b R4: trae nombres cortos, marcador de 90 min, si es simulado y los tokens del usuario'
);
select is(
  (select count(*)::int from public.avisos_puntos_pendientes(now())
   where usuario_id = '00000000-0000-0000-0000-00000000000a'),
  1,
  'F11b R2: los recordatorios apagados no quitan el aviso de puntos (decisión 3)'
);

reset role;

select results_eq(
  $$ select has_function_privilege('authenticated', 'public.avisos_puntos_pendientes(timestamptz)', 'execute'),
       has_function_privilege('anon', 'public.avisos_puntos_pendientes(timestamptz)', 'execute'),
       has_function_privilege('service_role', 'public.avisos_puntos_pendientes(timestamptz)', 'execute') $$,
  $$ values (false, false, true) $$,
  'F11b CA4: authenticated y anon no ejecutan avisos_puntos_pendientes'
);
select is(
  (select not prosecdef and proconfig = array['search_path=""'] from pg_proc
   where oid = 'public.avisos_puntos_pendientes(timestamptz)'::regprocedure),
  true,
  'F11b R8: sin security definer y con search_path vacío'
);
select results_eq(
  $$ select schedule, command like '%/functions/v1/avisos-puntos%'
       and command like '%where exists (select 1 from public.avisos_puntos_pendientes(now()))%'
       and command like '%name = ''clave_secreta''%'
     from cron.job where jobname = 'avisos-puntos' $$,
  $$ values ('* * * * *', true) $$,
  'F11b R7: tarea cada minuto que solo llama si hay avisos listos'
);

select * from finish();
rollback;
