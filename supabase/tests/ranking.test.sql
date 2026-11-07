-- T69 — Rankings del grupo (F08): suma (R1), miembros actuales (R2), torneo y jornada (R3),
-- simulados (R4), desempates (R5), una función (R6), cálculo en cada lectura (R7), mi posición
-- (R8) y permisos (R11). Todo se deshace al final.
--
-- Grupo G con A, B, C, D y E. F no es miembro al inicio. Torneo actual con J1 y J2; otro torneo
-- con JO. Partidos: 9601, 9602 y 9605 (cancelado) en J1, 9603 en J2, 9604 simulado en J1, 9606 en
-- el otro torneo. Totales del torneo: A 500 (1 exacto, bono 50), B 500 (1 exacto, bono 50),
-- D 500 (1 exacto, bono 0), C 500 (0 exactos), E 0.
begin;

select plan(26);

-- ---------------------------------------------------------------------------
-- Datos de prueba (como postgres)
-- ---------------------------------------------------------------------------

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
  ('Apertura 2099', 1, 'J1'), ('Apertura 2099', 2, 'J2'), ('Clausura 2098', 1, 'JO')
) as j (torneo, orden, nombre) on j.torneo = t.nombre;

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
  now() + interval '1 day', now() + interval '1 day', 'PROGRAMADO', p.simulado, now()
from (values
  (9601, 'J1', false), (9602, 'J1', false), (9603, 'J2', false),
  (9604, 'J1', true), (9605, 'J1', false), (9606, 'JO', false)
) as p (id, jornada, simulado)
join public.jornada j on j.nombre = p.jornada;

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
select ('00000000-0000-0000-0000-00000000000' || u)::uuid, u || '@example.com',
  '{"provider": "google"}',
  jsonb_build_object('provider_id', 'google-' || u, 'full_name', 'Usuario ' || upper(u))
from unnest(array['a', 'b', 'c', 'd', 'e', 'f']) as u;

insert into public.grupo (nombre, codigo_invitacion) values ('Grupo G', public.generar_codigo_invitacion());
insert into public.miembro_grupo (grupo_id, usuario_id)
select g.id, ('00000000-0000-0000-0000-00000000000' || u)::uuid
from public.grupo g, unnest(array['a', 'b', 'c', 'd', 'e']) as u;

-- Predicciones (con el partido abierto) y sus calificaciones.
create temporary table puntos_prueba (usuario text, partido int, r int, g int, m int) on commit drop;
insert into puntos_prueba values
  ('a', 9601, 0, 0, 350), ('a', 9603, 100, 0, 0),
  ('b', 9602, 0, 0, 350), ('b', 9603, 100, 0, 0), ('b', 9601, 0, 0, 0),
  ('d', 9601, 0, 0, 350), ('d', 9603, 0, 150, 0),
  ('c', 9601, 100, 150, 0), ('c', 9603, 100, 150, 0), ('c', 9606, 0, 0, 350),
  ('f', 9601, 100, 0, 0);

insert into public.prediccion (usuario_id, partido_id, resultado)
select ('00000000-0000-0000-0000-00000000000' || x.usuario)::uuid, p.id, 'LOCAL'
from (select usuario, partido from puntos_prueba union all values ('a', 9605), ('e', 9604)) as x
join public.partido p on p.proveedor_id = x.partido;

update public.partido set cierre_predicciones = now() - interval '2 hours', estado = 'TERMINADO';
update public.partido set estado = 'CANCELADO' where proveedor_id = 9605;

insert into public.calificacion (prediccion_id, puntos_resultado, puntos_rango_goles, puntos_marcador, es_simulada)
select pr.id, x.r, x.g, x.m, false
from puntos_prueba x
join public.partido p on p.proveedor_id = x.partido
join public.prediccion pr on pr.partido_id = p.id
  and pr.usuario_id = ('00000000-0000-0000-0000-00000000000' || x.usuario)::uuid;

-- Bono: A y B evaluados (50); B en 9601 con ERROR; D pendiente; C en el otro torneo (100).
insert into public.evaluacion_ia (
  prediccion_id, estado, puntos_bono, explicacion, modelo, version_prompt, evaluada_en, error, es_simulada
)
select pr.id, x.estado::public.estado_evaluacion, x.bono,
  case when x.estado = 'EVALUADA' then 'Bien.' end,
  case when x.estado = 'EVALUADA' then 'modelo' end,
  case when x.estado = 'EVALUADA' then 'v3' end,
  case when x.estado = 'EVALUADA' then now() end,
  case when x.estado = 'ERROR' then 'Falla' end,
  false
from (values
  ('a', 9601, 'EVALUADA', 50), ('b', 9602, 'EVALUADA', 50), ('b', 9601, 'ERROR', null),
  ('d', 9601, 'PENDIENTE', null), ('c', 9606, 'EVALUADA', 100)
) as x (usuario, partido, estado, bono)
join public.partido p on p.proveedor_id = x.partido
join public.prediccion pr on pr.partido_id = p.id
  and pr.usuario_id = ('00000000-0000-0000-0000-00000000000' || x.usuario)::uuid;

create temporary table ids on commit drop as
select
  (select id from public.grupo where nombre = 'Grupo G') as grupo,
  (select id from public.jornada where nombre = 'J1') as j1,
  (select id from public.jornada where nombre = 'J2') as j2,
  (select id from public.jornada where nombre = 'JO') as jo;
grant select on ids to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Como A
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select results_eq(
  $$ select nombre, posicion, puntos_total from public.ranking_grupo((select grupo from ids)) $$,
  $$ values ('Usuario A', 1, 500), ('Usuario B', 1, 500), ('Usuario D', 3, 500),
            ('Usuario C', 4, 500), ('Usuario E', 5, 0) $$,
  'F08 CA4: desempates: total, marcadores exactos y bono; empate completo comparte posición (1, 1, 3)'
);
select results_eq(
  $$ select nombre, puntos_base, puntos_bono, marcadores_exactos
     from public.ranking_grupo((select grupo from ids)) order by nombre $$,
  $$ values ('Usuario A', 450, 50, 1), ('Usuario B', 450, 50, 1), ('Usuario C', 500, 0, 0),
            ('Usuario D', 500, 0, 1), ('Usuario E', 0, 0, 0) $$,
  'F08 CA1: base + bono evaluado del torneo actual; no cuentan otro torneo, el cancelado ni el bono pendiente o con ERROR'
);
select is(
  (select puntos_total from public.ranking_grupo((select grupo from ids)) where nombre = 'Usuario E'),
  0,
  'F08 CA3: un miembro sin predicciones aparece con 0'
);
select results_eq(
  $$ select nombre, posicion, puntos_total from public.ranking_grupo((select grupo from ids), (select j2 from ids)) $$,
  $$ values ('Usuario C', 1, 250), ('Usuario D', 2, 150), ('Usuario A', 3, 100),
            ('Usuario B', 3, 100), ('Usuario E', 5, 0) $$,
  'F08 CA2: el ranking de la jornada suma solo los partidos de esa jornada'
);
select results_eq(
  $$ select nombre, puntos_total from public.ranking_grupo((select grupo from ids), (select j1 from ids))
     where posicion = 1 $$,
  $$ values ('Usuario A', 400), ('Usuario B', 400) $$,
  'F08 CA2: la jornada 1 tiene su propio orden'
);
select throws_ok(
  $$ select * from public.ranking_grupo((select grupo from ids), (select jo from ids)) $$,
  'P0001', 'JORNADA_INVALIDA',
  'F08 CA2: una jornada de otro torneo falla con JORNADA_INVALIDA'
);
select is(
  (select bool_or(incluye_simulados) from public.ranking_grupo((select grupo from ids))),
  false,
  'F08 CA5: sin calificaciones simuladas, incluye_simulados es falso'
);
select results_eq(
  $$ select nombre from public.ranking_grupo((select grupo from ids)) where es_yo $$,
  $$ values ('Usuario A') $$,
  'F08 R6: es_yo marca solo mi fila'
);
select results_eq(
  $$ select nombre, mi_posicion from public.mis_grupos $$,
  $$ values ('Grupo G', 1) $$,
  'F08 CA8: mis_grupos trae mi posición en el ranking del torneo'
);

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000d", "role": "authenticated"}';
select is(
  (select mi_posicion from public.mis_grupos),
  (select posicion from public.ranking_grupo((select grupo from ids)) where es_yo),
  'F08 CA8: mi_posicion coincide con la posición de ranking_grupo (D, 3.º)'
);

-- ---------------------------------------------------------------------------
-- F no es miembro
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000f", "role": "authenticated"}';
select throws_ok(
  $$ select * from public.ranking_grupo((select grupo from ids)) $$,
  'P0001', 'NO_MIEMBRO',
  'F08 CA6: un no miembro recibe NO_MIEMBRO'
);
select is_empty($$ select 1 from public.mis_grupos $$, 'F08 CA8: sin grupos, mis_grupos está vacía');
select throws_ok(
  $$ select * from public.posiciones_grupo((select grupo from ids), 1, null) $$,
  '42501', null,
  'F08 CA6: nadie de authenticated llama directamente a posiciones_grupo'
);
select throws_ok(
  $$ select public.torneo_actual_id() $$,
  '42501', null,
  'F08 R11: torneo_actual_id es interna (sin execute para authenticated)'
);

-- ---------------------------------------------------------------------------
-- Cambios (como postgres) y nueva lectura
-- ---------------------------------------------------------------------------

reset role;
-- F se une "en la jornada 2": cuentan sus puntos desde la jornada 1 (D10).
insert into public.miembro_grupo (grupo_id, usuario_id)
select grupo, '00000000-0000-0000-0000-00000000000f' from ids;
-- Llega la calificación simulada de E en 9604.
insert into public.calificacion (prediccion_id, puntos_resultado, puntos_rango_goles, puntos_marcador, es_simulada)
select pr.id, 100, 0, 0, true
from public.prediccion pr join public.partido p on p.id = pr.partido_id
where p.proveedor_id = 9604 and pr.usuario_id = '00000000-0000-0000-0000-00000000000e';
-- Se guarda el bono pendiente de D (40).
update public.evaluacion_ia
set estado = 'EVALUADA', puntos_bono = 40, explicacion = 'Bien.', modelo = 'modelo',
  version_prompt = 'v3', evaluada_en = now()
where prediccion_id = (
  select pr.id from public.prediccion pr join public.partido p on p.id = pr.partido_id
  where p.proveedor_id = 9601 and pr.usuario_id = '00000000-0000-0000-0000-00000000000d'
);
-- B sale.
delete from public.miembro_grupo
where usuario_id = '00000000-0000-0000-0000-00000000000b' and grupo_id = (select grupo from ids);

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select is(
  (select puntos_total from public.ranking_grupo((select grupo from ids)) where nombre = 'Usuario F'),
  100,
  'F08 CA3: quien se une después aparece con sus puntos desde la jornada 1'
);
select is(
  (select puntos_total from public.ranking_grupo((select grupo from ids)) where nombre = 'Usuario E'),
  100,
  'F08 CA7: la siguiente lectura ya trae la calificación nueva (sin caché)'
);
select results_eq(
  $$ select puntos_total, posicion from public.ranking_grupo((select grupo from ids)) where nombre = 'Usuario D' $$,
  $$ values (540, 1) $$,
  'F08 CA7: un bono que pasa a EVALUADA ya suma en la siguiente lectura'
);
select is(
  (select bool_and(incluye_simulados) from public.ranking_grupo((select grupo from ids))),
  true,
  'F08 CA5: los puntos simulados cuentan e incluye_simulados es verdadero (D40)'
);
select isnt(
  (select max(ultima_calificacion) from public.ranking_grupo((select grupo from ids))),
  null,
  'F08 R6: trae la hora de la última calificación que contó'
);
select is_empty(
  $$ select 1 from public.ranking_grupo((select grupo from ids)) where nombre = 'Usuario B' $$,
  'F08 CA3: quien sale desaparece del ranking (D45)'
);

reset role;
insert into public.miembro_grupo (grupo_id, usuario_id)
select grupo, '00000000-0000-0000-0000-00000000000b' from ids;
set local role authenticated;

select is(
  (select puntos_total from public.ranking_grupo((select grupo from ids)) where nombre = 'Usuario B'),
  500,
  'F08 CA3: si vuelve, recupera todos sus puntos del torneo'
);

-- ---------------------------------------------------------------------------
-- Sin torneo actual, anon y forma de la respuesta
-- ---------------------------------------------------------------------------

reset role;
update public.torneo set es_actual = false;
set local role authenticated;

select throws_ok(
  $$ select * from public.ranking_grupo((select grupo from ids)) $$,
  'P0001', 'SIN_TORNEO_ACTUAL',
  'F08 Estados: sin torneo actual, ranking_grupo lo dice'
);
select results_eq(
  $$ select mi_posicion from public.mis_grupos $$,
  $$ values (null::integer) $$,
  'F08 R8: sin torneo actual, mis_grupos no falla (posición vacía)'
);

reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok(
  $$ select * from public.ranking_grupo(1) $$,
  '42501', null,
  'F08 CA6: anon no puede ejecutar ranking_grupo'
);

reset role;

select is(
  pg_get_function_result('public.ranking_grupo(bigint, bigint)'::regprocedure),
  'TABLE(posicion integer, usuario_id uuid, nombre text, foto_url text, puntos_total integer, puntos_base integer, puntos_bono integer, marcadores_exactos integer, es_yo boolean, incluye_simulados boolean, ultima_calificacion timestamp with time zone)',
  'F08 CA6: la respuesta no trae columnas de más (ni correo ni predicciones)'
);
select is(
  (select count(*)::int from pg_proc where proname in ('ranking_grupo', 'posiciones_grupo', 'mi_posicion_en_grupo')
     and prosecdef and proconfig @> array['search_path=""']),
  3,
  'F08 R11: las funciones security definer tienen search_path vacío'
);

select * from finish();
rollback;
