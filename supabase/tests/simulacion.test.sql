-- T37 — Partidos simulados (F09): crear, iniciar y terminar; permisos (R9) y orígenes válidos
-- (R2). `now()` no cambia dentro de la transacción. Todo se deshace al final.
begin;

select plan(40);

-- ---------------------------------------------------------------------------
-- Datos de prueba (como postgres): un torneo actual de 2024 ya jugado, con 2 jornadas
-- ---------------------------------------------------------------------------

insert into public.liga (proveedor_id, nombre, pais) values (999262, 'Liga de Prueba', 'Mexico');

update public.torneo set es_actual = false;
insert into public.torneo (
  liga_id, nombre, temporada_proveedor, prefijo_rondas, fecha_inicio, fecha_fin, es_actual
)
select id, 'Apertura 2024', 2024, 'Apertura', '2024-07-01', '2024-12-15', true
from public.liga where proveedor_id = 999262;

insert into public.jornada (
  torneo_id, orden, nombre, nombres_proveedor, fase, fecha_inicio, fecha_fin, esta_cerrada
)
select t.id, j.orden, 'Jornada ' || j.orden, array['Apertura - ' || j.orden], 'REGULAR',
  j.inicio, j.inicio, true
from public.torneo t, (values (1, timestamptz '2024-07-06'), (2, timestamptz '2024-07-13'))
  as j (orden, inicio)
where t.temporada_proveedor = 2024 and t.liga_id = (select id from public.liga where proveedor_id = 999262);

insert into public.equipo (proveedor_id, nombre, nombre_corto, escudo_url)
values
  (999001, 'Local de Prueba', 'Local', 'https://example.com/l.png'),
  (999002, 'Visitante de Prueba', 'Visitante', 'https://example.com/v.png');

-- 9101: origen válido (2-1, medio tiempo 1-0, con datos). 9102: terminado sin datos. 9103: por
-- jugar. 9104: real que debió terminar hace poco (para CA6).
insert into public.partido (
  proveedor_id, torneo_id, jornada_id, equipo_local_id, equipo_visitante_id, inicio,
  cierre_predicciones, estado, goles_local, goles_visitante, goles_local_medio_tiempo,
  goles_visitante_medio_tiempo, listo_para_calificar_en, sincronizado_en
)
select p.id, j.torneo_id, j.id,
  (select id from public.equipo where proveedor_id = 999001),
  (select id from public.equipo where proveedor_id = 999002),
  p.inicio, p.inicio, p.estado::public.estado_partido, p.gl, p.gv, p.glm, p.gvm, p.listo, now()
from (values
  (9101, timestamptz '2024-07-06 20:00+00', 'TERMINADO', 2, 1, 1, 0, now()),
  (9102, timestamptz '2024-07-06 22:00+00', 'TERMINADO', 0, 0, 0, 0, null),
  (9103, timestamptz '2024-07-13 20:00+00', 'PROGRAMADO', null, null, null, null, null),
  (9104, now() - interval '1 minute', 'EN_JUEGO', null, null, null, null, null)
) as p (id, inicio, estado, gl, gv, glm, gvm, listo)
join public.jornada j on j.orden = (case when p.id = 9101 or p.id = 9102 then 1 else 2 end)
join public.torneo t on t.id = j.torneo_id and t.es_actual;

insert into public.estadistica_partido (partido_id, equipo_id, tipo, valor)
select p.id, e.id, s.tipo, s.valor
from public.partido p, public.equipo e,
  (values ('Ball Possession', '55%'), ('Total Shots', null)) as s (tipo, valor)
where p.proveedor_id = 9101 and e.proveedor_id in (999001, 999002);

insert into public.evento_partido (partido_id, equipo_id, minuto, minuto_agregado, tipo, detalle)
select p.id, e.id, v.minuto, v.agregado, v.tipo::public.tipo_evento, v.detalle
from public.partido p
cross join (values
  (999001, 30, null, 'GOL', 'Normal Goal'),
  (999002, 60, null, 'TARJETA', 'Yellow Card'),
  (999001, 90, 3, 'GOL', 'Penalty')
) as v (equipo, minuto, agregado, tipo, detalle)
join public.equipo e on e.proveedor_id = v.equipo
where p.proveedor_id = 9101;

-- A usuario normal, C administrador.
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"provider": "google"}',
    '{"provider_id": "google-a", "full_name": "Usuario A"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.com', '{"provider": "google"}',
    '{"provider_id": "google-c", "full_name": "Usuario C"}');
update public.usuario set rol = 'ADMIN' where id = '00000000-0000-0000-0000-00000000000c';

-- ---------------------------------------------------------------------------
-- Como el administrador C
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';

-- CA1: crear.
select lives_ok(
  $$ select public.simulacion_crear((select id from public.partido where proveedor_id = 9101), 10) $$,
  'F09 CA1: el administrador crea un simulado a 10 min'
);
select results_eq(
  $$ select equipo_local_id, equipo_visitante_id, partido_origen_id, es_simulado,
       proveedor_id is null, estado::text, goles_local is null and goles_visitante is null
     from public.partido where es_simulado and inicio = now() + interval '10 minutes' $$,
  $$ select equipo_local_id, equipo_visitante_id, id, true, true, 'PROGRAMADO', true
     from public.partido where proveedor_id = 9101 $$,
  'F09 CA1: mismos equipos y origen, PROGRAMADO, sin proveedor ni marcador'
);
select results_eq(
  $$ select cierre_predicciones = inicio, t.es_actual, j.orden::int
     from public.partido p
     join public.torneo t on t.id = p.torneo_id
     join public.jornada j on j.id = p.jornada_id
     where p.es_simulado and p.inicio = now() + interval '10 minutes' $$,
  $$ values (true, true, 2) $$,
  'F09 CA1: inicio = cierre, en el torneo actual y su jornada actual (la última, con datos de 2024)'
);
select results_eq(
  $$ select j.fecha_fin, j.esta_cerrada from public.jornada j
     join public.torneo t on t.id = j.torneo_id and t.es_actual where j.orden = 2 $$,
  $$ values (now() + interval '10 minutes', false) $$,
  'F09 R3: la jornada se amplía hasta el nuevo inicio y deja de estar cerrada'
);
select results_eq(
  $$ select j.fecha_inicio from public.jornada j
     join public.torneo t on t.id = j.torneo_id and t.es_actual where j.orden = 2 $$,
  $$ values (timestamptz '2024-07-13') $$,
  'F09 R3: si el nuevo inicio es posterior, el inicio de la jornada no cambia'
);
select lives_ok(
  $$ select public.simulacion_crear((select id from public.partido where proveedor_id = 9101)) $$,
  'F09 R3: sin minutos crea a 30 min'
);
select isnt_empty(
  $$ select id from public.partido where es_simulado and inicio = now() + interval '30 minutes' $$,
  'F09 R3: el de 30 min existe'
);
select lives_ok(
  $$ select public.simulacion_crear((select id from public.partido where proveedor_id = 9101), 60) $$,
  'F09 R3: crea a 60 min'
);
select throws_ok(
  $$ select public.simulacion_crear((select id from public.partido where proveedor_id = 9101), 15) $$,
  'P0001', 'MINUTOS_INVALIDOS',
  'F09 R3: solo 10, 30 o 60 minutos'
);

-- CA3: orígenes inválidos.
select throws_ok(
  $$ select public.simulacion_crear(
       (select id from public.partido where es_simulado order by id limit 1), 10) $$,
  'P0001', 'ORIGEN_INVALIDO',
  'F09 CA3: rechaza un simulado como origen'
);
select throws_ok(
  $$ select public.simulacion_crear((select id from public.partido where proveedor_id = 9103), 10) $$,
  'P0001', 'ORIGEN_INVALIDO',
  'F09 CA3: rechaza un partido no terminado'
);
select throws_ok(
  $$ select public.simulacion_crear((select id from public.partido where proveedor_id = 9102), 10) $$,
  'P0001', 'ORIGEN_INVALIDO',
  'F09 CA3: rechaza un partido sin datos listos'
);
select throws_ok(
  $$ select public.simulacion_crear(-1, 10) $$,
  'P0001', 'ORIGEN_INVALIDO',
  'F09 CA3: rechaza un partido que no existe'
);

-- CA5: no termina antes del cierre.
select throws_ok(
  $$ select public.simulacion_terminar(
       (select id from public.partido where es_simulado and inicio = now() + interval '10 minutes')) $$,
  'P0001', 'AUN_NO_CIERRA',
  'F09 CA5: terminar antes del cierre falla'
);

-- ---------------------------------------------------------------------------
-- CA4: el usuario A predice; después de "Iniciar ahora" ya no puede
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.prediccion (partido_id, resultado)
     values ((select id from public.partido where es_simulado and inicio = now() + interval '10 minutes'), 'LOCAL') $$,
  'F09 CA4: antes de iniciar, A predice el simulado'
);

-- CA2: un usuario normal no opera la simulación.
select throws_ok(
  $$ select public.simulacion_crear((select id from public.partido where proveedor_id = 9101), 10) $$,
  'P0001', 'SOLO_ADMIN',
  'F09 CA2: un usuario normal no crea'
);
select throws_ok(
  $$ select public.simulacion_iniciar(
       (select id from public.partido where es_simulado and inicio = now() + interval '10 minutes')) $$,
  'P0001', 'SOLO_ADMIN',
  'F09 CA2: un usuario normal no inicia'
);
select throws_ok(
  $$ select public.simulacion_terminar(
       (select id from public.partido where es_simulado and inicio = now() + interval '10 minutes')) $$,
  'P0001', 'SOLO_ADMIN',
  'F09 CA2: un usuario normal no termina'
);
select throws_ok(
  $$ insert into public.partido (torneo_id, jornada_id, equipo_local_id, equipo_visitante_id,
       inicio, cierre_predicciones, es_simulado, sincronizado_en)
     select torneo_id, jornada_id, equipo_local_id, equipo_visitante_id, now(), now(), true, now()
     from public.partido where proveedor_id = 9101 $$,
  '42501', null,
  'F09 R9: nadie inserta partidos directamente'
);

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';

select lives_ok(
  $$ select public.simulacion_iniciar(
       (select id from public.partido where es_simulado and inicio = now() + interval '10 minutes')) $$,
  'F09 CA4: el administrador inicia el simulado'
);
select results_eq(
  $$ select estado::text, inicio = now(), cierre_predicciones = now()
     from public.partido where es_simulado and partido_origen_id is not null and estado = 'EN_JUEGO' $$,
  $$ values ('EN_JUEGO', true, true) $$,
  'F09 R4: queda EN_JUEGO con inicio y cierre en este momento'
);
select throws_ok(
  $$ select public.simulacion_iniciar(
       (select id from public.partido where es_simulado and estado = 'EN_JUEGO')) $$,
  'P0001', 'ESTADO_INVALIDO',
  'F09 R4: solo se inicia un PROGRAMADO'
);
select throws_ok(
  $$ select public.simulacion_iniciar((select id from public.partido where proveedor_id = 9103)) $$,
  'P0001', 'NO_ES_SIMULADO',
  'F09 R9: no inicia un partido real'
);

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select throws_ok(
  $$ update public.prediccion set resultado = 'EMPATE'
     where partido_id = (select id from public.partido where es_simulado and estado = 'EN_JUEGO') $$,
  'P0001', 'PREDICCIONES_CERRADAS',
  'F09 CA4: después de "Iniciar ahora" no se edita la predicción'
);
-- ---------------------------------------------------------------------------
-- CA5: terminar
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';

select lives_ok(
  $$ select public.simulacion_terminar(
       (select id from public.partido where es_simulado and estado = 'EN_JUEGO')) $$,
  'F09 CA5: el administrador termina el simulado'
);
select results_eq(
  $$ select s.estado::text, s.goles_local::int, s.goles_visitante::int,
       s.goles_local_medio_tiempo::int, s.goles_visitante_medio_tiempo::int,
       s.listo_para_calificar_en = now()
     from public.partido s where s.es_simulado and s.estado = 'TERMINADO' $$,
  $$ values ('TERMINADO', 2, 1, 1, 0, true) $$,
  'F09 CA5: copia el marcador de 90 min y el de medio tiempo y queda listo para calificar'
);
select results_eq(
  $$ select e.equipo_id, e.tipo, e.valor from public.estadistica_partido e
     join public.partido s on s.id = e.partido_id and s.es_simulado and s.estado = 'TERMINADO'
     order by 1, 2 $$,
  $$ select e.equipo_id, e.tipo, e.valor from public.estadistica_partido e
     join public.partido o on o.id = e.partido_id and o.proveedor_id = 9101
     order by 1, 2 $$,
  'F09 CA5: copia las estadísticas (también las vacías, D29)'
);
select results_eq(
  $$ select e.equipo_id, e.minuto::int, e.minuto_agregado::int, e.tipo::text, e.detalle
     from public.evento_partido e
     join public.partido s on s.id = e.partido_id and s.es_simulado and s.estado = 'TERMINADO'
     order by 2 $$,
  $$ select e.equipo_id, e.minuto::int, e.minuto_agregado::int, e.tipo::text, e.detalle
     from public.evento_partido e
     join public.partido o on o.id = e.partido_id and o.proveedor_id = 9101
     order by 2 $$,
  'F09 CA5: copia los eventos'
);
select throws_ok(
  $$ select public.simulacion_terminar(
       (select id from public.partido where es_simulado and estado = 'TERMINADO')) $$,
  'P0001', 'ESTADO_INVALIDO',
  'F09 CA5: no se termina dos veces'
);
select throws_ok(
  $$ select public.simulacion_terminar((select id from public.partido where proveedor_id = 9104)) $$,
  'P0001', 'NO_ES_SIMULADO',
  'F09 R9: no termina un partido real'
);
select results_eq(
  $$ select estado::text, goles_local is null from public.partido where proveedor_id = 9101 $$,
  $$ values ('TERMINADO', false) $$,
  'F09 R5: el origen no cambia'
);

-- R7/CA6: preparar un simulado en juego para la prueba de P3.
select lives_ok(
  $$ select public.simulacion_iniciar(
       (select id from public.partido where es_simulado and inicio = now() + interval '30 minutes')) $$,
  'F09 R4: inicia el de 30 min'
);

-- ---------------------------------------------------------------------------
-- Como anon (CA2)
-- ---------------------------------------------------------------------------

reset request.jwt.claims;
set local role anon;

select throws_ok(
  $$ select public.simulacion_crear(1, 10) $$,
  '42501', null,
  'F09 CA2: anon no ejecuta simulacion_crear'
);
select throws_ok(
  $$ select public.simulacion_iniciar(1) $$,
  '42501', null,
  'F09 CA2: anon no ejecuta simulacion_iniciar'
);
select throws_ok(
  $$ select public.simulacion_terminar(1) $$,
  '42501', null,
  'F09 CA2: anon no ejecuta simulacion_terminar'
);

-- ---------------------------------------------------------------------------
-- Como postgres: P3/P4 no ven simulados (CA6) y permisos de las funciones (R9)
-- ---------------------------------------------------------------------------

reset role;

select results_eq(
  $$ select proveedor_id from public.partidos_pendientes_de_final(now() + interval '2 hours') $$,
  $$ values (9104) $$,
  'F09 CA6: partidos_pendientes_de_final devuelve el real en juego y nunca un simulado'
);
select ok(
  (select count(*) = 2 from public.partido where es_simulado and estado = 'EN_JUEGO'
     or (es_simulado and estado = 'TERMINADO')),
  'F09 CA6: había un simulado en juego y uno terminado sin aparecer'
);
select results_eq(
  $$ select f::text, has_function_privilege('authenticated', f, 'execute'),
       has_function_privilege('anon', f, 'execute'),
       has_function_privilege('service_role', f, 'execute')
     from unnest(array['public.simulacion_crear(bigint, integer)', 'public.simulacion_iniciar(bigint)',
       'public.simulacion_terminar(bigint)']) as f $$,
  $$ values
       ('public.simulacion_crear(bigint, integer)', true, false, false),
       ('public.simulacion_iniciar(bigint)', true, false, false),
       ('public.simulacion_terminar(bigint)', true, false, false) $$,
  'F09 R9: solo authenticated ejecuta las tres funciones'
);
select is(
  (select array_agg(prosecdef and proconfig = array['search_path=""'])
   from pg_proc
   where oid in (
     'public.simulacion_crear(bigint, integer)'::regprocedure,
     'public.simulacion_iniciar(bigint)'::regprocedure,
     'public.simulacion_terminar(bigint)'::regprocedure
   )),
  array[true, true, true],
  'F09 R9: las tres funciones son security definer con search_path vacío'
);
select ok(
  not has_table_privilege('authenticated', 'public.partido', 'update'),
  'F09 R9: authenticated no modifica partidos directamente'
);

select * from finish();
rollback;
