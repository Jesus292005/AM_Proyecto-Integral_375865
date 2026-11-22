-- T106 — Jornada de referencia, `mi_ultima_jornada` y `mis_grupos.mi_posicion_antes`
-- (F17 R3, R8, R13, CA3; D111). Todo se deshace al final.
--
-- Torneo actual con J1, J2 y J3; otro torneo con JO (calificado). Grupo G = A, B y D; grupo H = A y C;
-- grupo N = D y E (E solo predijo en J2: nadie de N tenía calificaciones antes de J2).
-- J1: 9901 (A 100, B 350, C 100). J2 (en curso): 9902 (A 350 + bono 60, B 0, C 350 + bono 80),
-- 9903 simulado (A 150 con justificación, bono pendiente; C 100 con bono 90 en ERROR), 9904 por
-- calificar. J3: 9905 por jugar. JO: 9906 (A 350 + bono 100).
-- Torneo: A 660, B 350, C 630, D 0. Antes de J2: A 100, B 350, C 100, D 0.
begin;

select plan(15);

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
  ('Apertura 2099', 1, 'J1'), ('Apertura 2099', 2, 'J2'), ('Apertura 2099', 3, 'J3'),
  ('Clausura 2098', 5, 'JO')
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
  (9901, 'J1', false), (9902, 'J2', false), (9903, 'J2', true), (9904, 'J2', false),
  (9905, 'J3', false), (9906, 'JO', false)
) as p (id, jornada, simulado)
join public.jornada j on j.nombre = p.jornada;

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
select ('00000000-0000-0000-0000-00000000000' || u)::uuid, u || '@example.com',
  '{"provider": "google"}',
  jsonb_build_object('provider_id', 'google-' || u, 'full_name', 'Usuario ' || upper(u))
from unnest(array['a', 'b', 'c', 'd', 'e']) as u;

insert into public.grupo (nombre, codigo_invitacion)
values ('Grupo G', public.generar_codigo_invitacion()), ('Grupo H', public.generar_codigo_invitacion()),
  ('Grupo N', public.generar_codigo_invitacion());
insert into public.miembro_grupo (grupo_id, usuario_id)
select g.id, ('00000000-0000-0000-0000-00000000000' || x.u)::uuid
from (values ('Grupo G', 'a'), ('Grupo G', 'b'), ('Grupo G', 'd'), ('Grupo H', 'a'), ('Grupo H', 'c'),
  ('Grupo N', 'd'), ('Grupo N', 'e'))
  as x (grupo, u)
join public.grupo g on g.nombre = x.grupo;

-- Sin nada calificado todavía.
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select is(
  (select count(*)::int from public.mi_ultima_jornada),
  0,
  'F17 CA3: sin partidos calificados en el torneo actual no hay jornada de referencia'
);
reset role;

create temporary table puntos_prueba (usuario text, partido int, r int, m int, justificacion text)
  on commit drop;
insert into puntos_prueba values
  ('a', 9901, 100, 0, null), ('b', 9901, 0, 350, null), ('c', 9901, 100, 0, null),
  ('a', 9902, 0, 350, 'Análisis'), ('b', 9902, 0, 0, null), ('c', 9902, 0, 350, 'Análisis'),
  ('a', 9903, 0, 0, 'Análisis'), ('c', 9903, 100, 0, 'Análisis'),
  ('a', 9906, 0, 350, 'Análisis'), ('e', 9902, 100, 0, null);

insert into public.prediccion (usuario_id, partido_id, resultado, justificacion)
select ('00000000-0000-0000-0000-00000000000' || x.usuario)::uuid, p.id, 'LOCAL', x.justificacion
from puntos_prueba x
join public.partido p on p.proveedor_id = x.partido;

update public.partido set cierre_predicciones = now() - interval '2 hours', estado = 'TERMINADO',
  calificado_en = now()
where proveedor_id in (9901, 9902, 9903, 9906);
update public.jornada set esta_cerrada = true where nombre in ('J1', 'JO');

-- A en 9903: rango de goles acertado (150) sin marcador.
insert into public.calificacion (prediccion_id, puntos_resultado, puntos_rango_goles, puntos_marcador, es_simulada)
select pr.id, x.r, case when x.usuario = 'a' and x.partido = 9903 then 150 else 0 end, x.m,
  p.es_simulado
from puntos_prueba x
join public.partido p on p.proveedor_id = x.partido
join public.prediccion pr on pr.partido_id = p.id
  and pr.usuario_id = ('00000000-0000-0000-0000-00000000000' || x.usuario)::uuid;

insert into public.evaluacion_ia (
  prediccion_id, estado, puntos_bono, explicacion, modelo, version_prompt, evaluada_en, error, es_simulada
)
select pr.id, x.estado::public.estado_evaluacion, x.bono,
  case when x.estado = 'EVALUADA' then 'Bien.' end,
  case when x.estado = 'EVALUADA' then 'modelo' end,
  case when x.estado = 'EVALUADA' then 'v3' end,
  case when x.estado = 'EVALUADA' then now() end,
  case when x.estado = 'ERROR' then 'Falla' end,
  p.es_simulado
from (values
  ('a', 9902, 'EVALUADA', 60), ('c', 9902, 'EVALUADA', 80), ('a', 9903, 'PENDIENTE', null),
  ('c', 9903, 'ERROR', null), ('a', 9906, 'EVALUADA', 100)
) as x (usuario, partido, estado, bono)
join public.partido p on p.proveedor_id = x.partido
join public.prediccion pr on pr.partido_id = p.id
  and pr.usuario_id = ('00000000-0000-0000-0000-00000000000' || x.usuario)::uuid;

-- ---------------------------------------------------------------------------
-- Jornada de referencia (R3)
-- ---------------------------------------------------------------------------

select is(
  (select nombre from public.jornada where id = public.jornada_referencia()),
  'J2',
  'F17 CA3: la jornada de referencia es la de mayor orden del torneo actual con algún partido calificado, aunque siga en curso (decisión 2)'
);

-- ---------------------------------------------------------------------------
-- Como A
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select results_eq(
  $$ select jornada_nombre, en_curso, predicciones_calificadas, puntos_base, puntos_bono, puntos_total,
       bonos_pendientes, incluye_simulados
     from public.mi_ultima_jornada $$,
  $$ values ('J2', true, 2, 500, 60, 560, 1, true) $$,
  'F17 CA3: suma base + bono evaluado de la jornada, cuenta los bonos pendientes y marca los simulados'
);
select results_eq(
  $$ select p.proveedor_id, m.mejor_analisis_bono
     from public.mi_ultima_jornada m join public.partido p on p.id = m.mejor_analisis_partido_id $$,
  $$ values (9902, 60) $$,
  'F17 CA3: mi mejor análisis es mi mayor bono evaluado de esa jornada (no el de otro torneo)'
);
select results_eq(
  $$ select nombre, mi_posicion, mi_posicion_antes from public.mis_grupos order by nombre $$,
  $$ values ('Grupo G', 1, 2), ('Grupo H', 1, 1) $$,
  'F17 CA3: mi_posicion_antes es mi posición en el torneo sin la jornada de referencia'
);

-- ---------------------------------------------------------------------------
-- Como B, C y D
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select results_eq(
  $$ select g.nombre, g.mi_posicion, g.mi_posicion_antes from public.mis_grupos g $$,
  $$ values ('Grupo G', 2, 1) $$,
  'F17 CA3: B bajó de 1.º a 2.º en G'
);

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
select results_eq(
  $$ select puntos_total, puntos_bono, bonos_pendientes, mejor_analisis_bono from public.mi_ultima_jornada $$,
  $$ values (530, 80, 0, 80) $$,
  'F17 R8: un bono con ERROR no suma ni cuenta como pendiente'
);

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000e", "role": "authenticated"}';
select results_eq(
  $$ select g.nombre, g.mi_posicion, g.mi_posicion_antes from public.mis_grupos g $$,
  $$ values ('Grupo N', 1, null::int) $$,
  'F17 CA3: mi_posicion_antes es vacía si nadie del grupo tenía calificaciones antes de la jornada (no hay "antes")'
);

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000d", "role": "authenticated"}';
select results_eq(
  $$ select jornada_nombre, predicciones_calificadas, puntos_total, mejor_analisis_partido_id
     from public.mi_ultima_jornada $$,
  $$ values ('J2', 0, 0, null::bigint) $$,
  'F17 R8: sin predicciones en la jornada, una fila con 0 puntos y sin mejor análisis'
);

-- ---------------------------------------------------------------------------
-- Jornada 1 como referencia: no hay "antes"
-- ---------------------------------------------------------------------------

reset role;
update public.partido set calificado_en = null where proveedor_id in (9902, 9903);
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select results_eq(
  $$ select nombre, mi_posicion_antes from public.mis_grupos order by nombre $$,
  $$ values ('Grupo G', null::int), ('Grupo H', null) $$,
  'F17 CA3: mi_posicion_antes es vacía cuando la jornada de referencia es la primera'
);

reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok(
  $$ select * from public.mi_ultima_jornada $$,
  '42501', null,
  'F17 R13: anon no lee mi_ultima_jornada'
);
reset role;

select is(
  has_function_privilege('authenticated', 'public.posiciones_grupo(bigint, bigint, bigint, smallint)', 'execute'),
  false,
  'F17 R13: posiciones_grupo sigue sin execute para la API'
);
select is(
  has_function_privilege('anon', 'public.jornada_referencia()', 'execute'),
  false,
  'F17 R13: anon no ejecuta jornada_referencia'
);
select is(
  has_function_privilege('anon', 'public.mi_posicion_antes_en_grupo(bigint)', 'execute'),
  false,
  'F17 R13: anon no ejecuta mi_posicion_antes_en_grupo'
);
select is(
  (select count(*)::int from pg_proc where proname in ('posiciones_grupo', 'mi_posicion_antes_en_grupo')
     and prosecdef and proconfig @> array['search_path=""']),
  2,
  'F17 R13: las funciones security definer tienen search_path vacío'
);

select * from finish();
rollback;
