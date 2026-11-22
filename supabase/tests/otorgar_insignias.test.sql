-- T95 — `otorgar_insignias()` (F14 R1, R3–R5, CA1, CA2, CA3; decisiones 4 y 5 de D108).
-- Jornadas: J1, J4 y J5 cerradas, J2 abierta, J3 cerrada con una evaluación pendiente.
-- Grupos: G1 (a, b, c), G3 (a, d) y G4 (a, d, e; e no predice) creados hace 10 días; G2 (a, d)
-- creado hoy, después de J1.
-- Puntos base (bono): J1 a 350 marcador + 100 (70) · b 100 (60) + 0 · c 0 (70) · d 100
--   J2 a 100, 100, 100 simulado · J3 a 0 (pendiente), b 100, c 0 · J4 a 100 (50), b 100 (50), c 0
--   J5 a 100 (49), b 100, c 0
-- Todo se deshace al final.
begin;

select plan(17);

insert into public.liga (proveedor_id, nombre, pais) values (999262, 'Liga de Prueba', 'Mexico');
insert into public.torneo (
  liga_id, nombre, temporada_proveedor, prefijo_rondas, fecha_inicio, fecha_fin, es_actual
)
select id, 'Apertura 2099', 2099, 'Apertura', now() - interval '20 days', now() + interval '20 days', false
from public.liga where proveedor_id = 999262;
insert into public.jornada (torneo_id, orden, nombre, nombres_proveedor, fase, fecha_inicio, fecha_fin)
select t.id, j.orden, 'Jornada ' || j.orden, array['Apertura - ' || j.orden], 'REGULAR',
  now() - interval '15 days', now() + j.fin
from public.torneo t,
  (values (1, interval '-1 day'), (2, interval '1 day'), (3, interval '-1 day'), (4, interval '-1 day'),
          (5, interval '-1 day'))
    as j (orden, fin)
where t.nombre = 'Apertura 2099';
insert into public.equipo (proveedor_id, nombre, nombre_corto, escudo_url)
values
  (999001, 'Local de Prueba', 'Local', 'https://example.com/l.png'),
  (999002, 'Visitante de Prueba', 'Visitante', 'https://example.com/v.png');

-- p1..p7 por jornada; abiertos al predecir y después en el pasado, en orden.
insert into public.partido (
  proveedor_id, torneo_id, jornada_id, equipo_local_id, equipo_visitante_id, inicio,
  cierre_predicciones, estado, sincronizado_en
)
select 99900 + x.n, j.torneo_id, j.id,
  (select id from public.equipo where proveedor_id = 999001),
  (select id from public.equipo where proveedor_id = 999002),
  now() + interval '1 day', now() + interval '1 day', 'PROGRAMADO', now()
from (values (1, 1), (2, 1), (3, 2), (4, 2), (5, 2), (6, 3), (7, 4), (8, 5)) as x (n, jornada)
join public.jornada j on j.orden = x.jornada
join public.torneo t on t.id = j.torneo_id and t.nombre = 'Apertura 2099';

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
select ('00000000-0000-0000-0000-00000000000' || u)::uuid, u || '@example.com',
  '{"provider": "google"}', jsonb_build_object('provider_id', 'google-' || u, 'full_name', 'Usuario ' || u)
from unnest(array['a', 'b', 'c', 'd', 'e']) as u;

insert into public.grupo (nombre, codigo_invitacion, creador_id, creado_en)
values
  ('Grupo Uno', 'AAAAAAA2', '00000000-0000-0000-0000-00000000000a', now() - interval '10 days'),
  ('Grupo Dos', 'AAAAAAA3', '00000000-0000-0000-0000-00000000000a', now()),
  ('Grupo Tres', 'AAAAAAA4', '00000000-0000-0000-0000-00000000000a', now() - interval '10 days'),
  ('Grupo Cuatro', 'AAAAAAA5', '00000000-0000-0000-0000-00000000000a', now() - interval '10 days');
insert into public.miembro_grupo (grupo_id, usuario_id)
select g.id, ('00000000-0000-0000-0000-00000000000' || x.u)::uuid
from (values ('AAAAAAA2', 'a'), ('AAAAAAA2', 'b'), ('AAAAAAA2', 'c'),
             ('AAAAAAA3', 'a'), ('AAAAAAA3', 'd'), ('AAAAAAA4', 'a'), ('AAAAAAA4', 'd'),
             ('AAAAAAA5', 'a'), ('AAAAAAA5', 'd'), ('AAAAAAA5', 'e')) as x (codigo, u)
join public.grupo g on g.codigo_invitacion = x.codigo;

create temporary table cal (usuario text, n int, r int, g int, m int, simulada boolean) on commit drop;
insert into cal values
  ('a', 1, 0, 0, 350, false), ('a', 2, 100, 0, 0, false), ('b', 1, 100, 0, 0, false),
  ('b', 2, 0, 0, 0, false), ('c', 1, 0, 0, 0, false), ('d', 1, 100, 0, 0, false),
  ('a', 3, 100, 0, 0, false), ('a', 4, 100, 0, 0, false), ('a', 5, 100, 0, 0, true),
  ('a', 6, 0, 0, 0, false), ('b', 6, 100, 0, 0, false), ('c', 6, 0, 0, 0, false),
  ('a', 7, 100, 0, 0, false), ('b', 7, 100, 0, 0, false), ('c', 7, 0, 0, 0, false),
  ('a', 8, 100, 0, 0, false), ('b', 8, 100, 0, 0, false), ('c', 8, 0, 0, 0, false);

insert into public.prediccion (usuario_id, partido_id, resultado)
select ('00000000-0000-0000-0000-00000000000' || c.usuario)::uuid, p.id, 'LOCAL'
from cal c join public.partido p on p.proveedor_id = 99900 + c.n;

update public.partido
set inicio = now() - (12 - (proveedor_id - 99900)) * interval '1 day',
    cierre_predicciones = now() - (12 - (proveedor_id - 99900)) * interval '1 day',
    estado = 'TERMINADO'
where proveedor_id between 99901 and 99908;

insert into public.calificacion (prediccion_id, puntos_resultado, puntos_rango_goles, puntos_marcador, es_simulada)
select pr.id, c.r, c.g, c.m, c.simulada
from cal c
join public.partido p on p.proveedor_id = 99900 + c.n
join public.prediccion pr on pr.partido_id = p.id
  and pr.usuario_id = ('00000000-0000-0000-0000-00000000000' || c.usuario)::uuid;

insert into public.evaluacion_ia (
  prediccion_id, estado, puntos_bono, explicacion, modelo, version_prompt, es_simulada, evaluada_en
)
select pr.id, x.estado::public.estado_evaluacion, x.bono,
  case when x.estado = 'EVALUADA' then 'Explicación de prueba.' end,
  case when x.estado = 'EVALUADA' then 'modelo-prueba' end,
  case when x.estado = 'EVALUADA' then 'v-prueba' end,
  false,
  case when x.estado = 'EVALUADA' then now() end
from (values ('a', 2, 'EVALUADA', 70), ('b', 1, 'EVALUADA', 60), ('c', 1, 'EVALUADA', 70),
             ('a', 6, 'PENDIENTE', null), ('a', 7, 'EVALUADA', 50), ('b', 7, 'EVALUADA', 50),
             ('a', 8, 'EVALUADA', 49))
  as x (usuario, n, estado, bono)
join public.partido p on p.proveedor_id = 99900 + x.n
join public.prediccion pr on pr.partido_id = p.id
  and pr.usuario_id = ('00000000-0000-0000-0000-00000000000' || x.usuario)::uuid;

update public.jornada set esta_cerrada = true
where orden in (1, 3, 4, 5)
  and torneo_id = (select id from public.torneo where nombre = 'Apertura 2099');

-- Lo otorgado, legible: usuario, código, grupo y jornada (vacíos en las personales).
create temporary view otorgadas as
select right(o.usuario_id::text, 1) as usuario, i.codigo,
  g.codigo_invitacion as grupo, j.orden::integer as jornada, o.es_simulada
from public.insignia_obtenida o
join public.insignia i on i.id = o.insignia_id
left join public.grupo g on g.id = o.grupo_id
left join public.jornada j on j.id = o.jornada_id
where o.usuario_id in (select id from auth.users where email like '_@example.com');

-- ---------------------------------------------------------------------------
-- CA1: personales
-- ---------------------------------------------------------------------------

select is(public.otorgar_insignias(), 19, 'F14 CA1: la primera corrida otorga 19 insignias');

select results_eq(
  $$ select usuario, codigo from otorgadas where jornada is null and codigo in ('PRIMER_ACIERTO', 'MARCADOR_EXACTO')
     order by codigo, usuario $$,
  $$ values ('a', 'MARCADOR_EXACTO'), ('a', 'PRIMER_ACIERTO'), ('b', 'PRIMER_ACIERTO'), ('d', 'PRIMER_ACIERTO') $$,
  'F14 CA1: "Primer acierto" con puntos base > 0 y "Visionario" con un marcador exacto'
);
select results_eq(
  $$ select usuario from otorgadas where codigo = 'ANALISTA' order by usuario $$,
  $$ values ('a'), ('c') $$,
  'F14 CA1: "Analista" con un bono de 70 o más (60 no alcanza)'
);
select results_eq(
  $$ select usuario, codigo, es_simulada from otorgadas where codigo like 'RACHA%' $$,
  $$ values ('a', 'RACHA_5', true) $$,
  'F14 CA1, R5: "En racha" con 5 seguidas; con un simulado en la racha sale marcada (decisión 4)'
);

-- ---------------------------------------------------------------------------
-- CA2: de jornada
-- ---------------------------------------------------------------------------

select results_eq(
  $$ select usuario, grupo, jornada from otorgadas where codigo = 'TOP_JORNADA' order by jornada, usuario $$,
  $$ values ('a', 'AAAAAAA2', 1), ('a', 'AAAAAAA2', 4), ('b', 'AAAAAAA2', 4), ('a', 'AAAAAAA2', 5) $$,
  'F14 CA2: "Top de la jornada" al 1.º de cada grupo y jornada cerrada; en J4 empatan a y b y la ganan los dos'
);
select is(
  (select count(*)::int from otorgadas where codigo = 'TOP_JORNADA' and grupo in ('AAAAAAA4', 'AAAAAAA5')),
  0,
  'F14 CA2: sin "Top de la jornada" con 2 participantes, aunque el grupo tenga 3 miembros (decisión 5)'
);
select results_eq(
  $$ select usuario, grupo, jornada from otorgadas where codigo = 'MEJOR_ANALISIS' order by grupo, jornada, usuario $$,
  $$ values ('a', 'AAAAAAA2', 1), ('c', 'AAAAAAA2', 1), ('a', 'AAAAAAA2', 4), ('b', 'AAAAAAA2', 4),
            ('a', 'AAAAAAA4', 1), ('a', 'AAAAAAA4', 4), ('a', 'AAAAAAA5', 1), ('a', 'AAAAAAA5', 4) $$,
  'F14 CA2: "Mejor análisis" al mayor bono de cada grupo; empates para todos (70 en J1, 50 en J4: el límite de 50 alcanza)'
);
select is(
  (select count(*)::int from otorgadas where codigo = 'MEJOR_ANALISIS' and jornada = 5),
  0,
  'F14 CA2: sin "Mejor análisis" si el mayor bono del grupo es menor a 50 (49)'
);
select is(
  (select count(*)::int from otorgadas where jornada = 3),
  0,
  'F14 CA2: una jornada cerrada con una evaluación pendiente todavía no reparte insignias'
);
select is(
  (select count(*)::int from otorgadas where jornada = 2),
  0,
  'F14 CA2: una jornada abierta no reparte insignias'
);
select is(
  (select count(*)::int from otorgadas where grupo = 'AAAAAAA3'),
  0,
  'F14 R3: un grupo creado después de la jornada no recibe insignias de ella'
);

-- ---------------------------------------------------------------------------
-- R4: idempotente y sin quitar
-- ---------------------------------------------------------------------------

select is(public.otorgar_insignias(), 0, 'F14 CA1: correrla otra vez no duplica nada');

delete from public.miembro_grupo
where usuario_id = '00000000-0000-0000-0000-00000000000c'
  and grupo_id = (select id from public.grupo where codigo_invitacion = 'AAAAAAA2');
select is(public.otorgar_insignias(), 0, 'F14 R4: salir del grupo no quita ni vuelve a repartir');
select is(
  (select count(*)::int from otorgadas where usuario = 'c' and codigo = 'MEJOR_ANALISIS'),
  1,
  'F14 R4: c conserva su insignia después de salir del grupo'
);

-- ---------------------------------------------------------------------------
-- CA3 y R9: permisos y tarea programada
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select throws_ok($$ select public.otorgar_insignias() $$, '42501', null,
  'F14 CA3: nadie de la API otorga insignias');
reset role;
select ok(
  not has_function_privilege('service_role', 'public.otorgar_insignias()', 'execute'),
  'F14 R9: tampoco la ejecuta la clave secreta (service_role); solo la tarea programada'
);

select is(
  (select count(*)::int from cron.job where jobname = 'otorgar-insignias' and schedule = '*/15 * * * *'),
  1,
  'F14 R3: la tarea programada corre cada 15 min'
);

select * from finish();
rollback;
