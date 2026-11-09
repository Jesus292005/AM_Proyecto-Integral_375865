-- T77 — `mi_racha` (F13 R1–R8, D101). A predice, en orden de inicio:
--   torneo 2098: 9701 ✓, 9702 ✓ · torneo 2099: 9711 ✓, 9712 ✓, 9713 ✗, 9714 ✓ (marcador fallado
--   con partes), 9715 cancelado (sin calificación), 9716 ✓, 9717 sin predecir (solo B), 9718 ✓
--   simulado. Racha actual 3 (9714, 9716, 9718) y mejor 4 (9701–9712, cruza torneos).
-- Las calificaciones se guardan en otro orden que el de inicio. Todo se deshace al final.
begin;

select plan(12);

-- ---------------------------------------------------------------------------
-- Datos de prueba (como postgres)
-- ---------------------------------------------------------------------------

insert into public.liga (proveedor_id, nombre, pais) values (999262, 'Liga de Prueba', 'Mexico');

insert into public.torneo (
  liga_id, nombre, temporada_proveedor, prefijo_rondas, fecha_inicio, fecha_fin, es_actual
)
select id, t.nombre, t.temporada, 'Apertura', '2098-01-01', '2099-12-31', false
from public.liga, (values ('Apertura 2098', 2098), ('Apertura 2099', 2099)) as t (nombre, temporada)
where proveedor_id = 999262;

insert into public.jornada (torneo_id, orden, nombre, nombres_proveedor, fase, fecha_inicio, fecha_fin)
select id, 1, 'J1 ' || temporada_proveedor, array['Apertura - 1'], 'REGULAR', '2098-01-01', '2099-12-31'
from public.torneo where temporada_proveedor in (2098, 2099);

insert into public.equipo (proveedor_id, nombre, nombre_corto, escudo_url)
values
  (999001, 'Local de Prueba', 'Local', 'https://example.com/l.png'),
  (999002, 'Visitante de Prueba', 'Visitante', 'https://example.com/v.png');

-- Abiertos al crear las predicciones; después se mueven al pasado.
insert into public.partido (
  proveedor_id, torneo_id, jornada_id, equipo_local_id, equipo_visitante_id, inicio,
  cierre_predicciones, estado, es_simulado, sincronizado_en
)
select p.id, j.torneo_id, j.id,
  (select id from public.equipo where proveedor_id = 999001),
  (select id from public.equipo where proveedor_id = 999002),
  now() + interval '1 day', now() + interval '1 day', 'PROGRAMADO', p.id = 9718, now()
from (values
  (9701, 2098), (9702, 2098), (9711, 2099), (9712, 2099), (9713, 2099), (9714, 2099),
  (9715, 2099), (9716, 2099), (9717, 2099), (9718, 2099), (9719, 2099)
) as p (id, temporada)
join public.torneo t on t.temporada_proveedor = p.temporada
join public.jornada j on j.torneo_id = t.id;

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
select ('00000000-0000-0000-0000-00000000000' || u)::uuid, u || '@example.com',
  '{"provider": "google"}',
  jsonb_build_object('provider_id', 'google-' || u, 'full_name', 'Usuario ' || upper(u))
from unnest(array['a', 'b', 'c']) as u;

insert into public.prediccion (usuario_id, partido_id, resultado)
select ('00000000-0000-0000-0000-00000000000' || x.usuario)::uuid, p.id, 'LOCAL'
from (values
  ('a', 9701), ('a', 9702), ('a', 9711), ('a', 9712), ('a', 9713), ('a', 9715), ('a', 9716),
  ('a', 9718), ('a', 9719), ('b', 9717)
) as x (usuario, partido)
join public.partido p on p.proveedor_id = x.partido;
insert into public.prediccion (usuario_id, partido_id, marcador_local, marcador_visitante)
select '00000000-0000-0000-0000-00000000000a', id, 2, 1 from public.partido where proveedor_id = 9714;

update public.partido
set inicio = now() - x.antes, cierre_predicciones = now() - x.antes, estado = 'TERMINADO'
from (values
  (9701, interval '20 days'), (9702, interval '19 days'), (9711, interval '10 days'),
  (9712, interval '9 days'), (9713, interval '8 days'), (9714, interval '7 days'),
  (9715, interval '156 hours'), (9716, interval '6 days'), (9717, interval '132 hours'),
  (9718, interval '5 days'), (9719, interval '1 day')
) as x (proveedor, antes)
where proveedor_id = x.proveedor;
update public.partido set estado = 'CANCELADO' where proveedor_id = 9715;

-- Calificaciones guardadas en otro orden (`calificada_en`) que el de inicio (R1).
insert into public.calificacion (
  prediccion_id, puntos_resultado, puntos_rango_goles, puntos_marcador, es_simulada, calificada_en
)
select pr.id, x.r, x.g, x.m, x.partido = 9718, now() - x.hace
from (values
  ('a', 9718, 100, 0, 0, interval '1 hour'),
  ('a', 9701, 100, 0, 0, interval '2 hours'),
  ('a', 9713, 0, 0, 0, interval '3 hours'),
  ('a', 9702, 0, 150, 0, interval '4 hours'),
  ('a', 9716, 100, 150, 0, interval '5 hours'),
  ('a', 9711, 0, 0, 350, interval '6 hours'),
  ('a', 9714, 100, 0, 0, interval '7 hours'),
  ('a', 9712, 100, 0, 0, interval '8 hours'),
  ('b', 9717, 100, 0, 0, interval '9 hours')
) as x (usuario, partido, r, g, m, hace)
join public.partido p on p.proveedor_id = x.partido
join public.prediccion pr on pr.partido_id = p.id
  and pr.usuario_id = ('00000000-0000-0000-0000-00000000000' || x.usuario)::uuid;

-- ---------------------------------------------------------------------------
-- Como A
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select is(
  (select racha_actual from public.mi_racha),
  3,
  'F13 CA1: racha actual = aciertos desde el último fallo, en orden de inicio y no de calificación'
);
select is(
  (select mejor_racha from public.mi_racha),
  4,
  'F13 CA4: la mejor racha cruza de un torneo al siguiente (histórica, D101)'
);
select is(
  (select count(*)::int from public.mi_racha),
  1,
  'F13 R6: mi_racha siempre devuelve una sola fila'
);
select is(
  (select racha_actual from public.mi_racha),
  3,
  'F13 CA2: un partido cancelado y uno sin mi predicción no rompen la racha'
);
select is(
  (select racha_actual from public.mi_racha),
  3,
  'F13 CA3: el marcador fallado con partes acertadas (100 base) cuenta como acierto'
);
select is(
  (select incluye_simulados from public.mi_racha),
  true,
  'F13 CA4: un simulado en la racha actual cuenta e incluye_simulados lo indica'
);
select isnt(
  (select ultima_calificacion from public.mi_racha),
  null,
  'F13 R6: trae la hora de la última calificación'
);

-- Un fallo al final.
reset role;
insert into public.calificacion (prediccion_id, puntos_resultado, puntos_rango_goles, puntos_marcador, es_simulada)
select pr.id, 0, 0, 0, false
from public.prediccion pr join public.partido p on p.id = pr.partido_id
where p.proveedor_id = 9719 and pr.usuario_id = '00000000-0000-0000-0000-00000000000a';
set local role authenticated;

select results_eq(
  $$ select racha_actual, mejor_racha, incluye_simulados from public.mi_racha $$,
  $$ values (0, 4, false) $$,
  'F13 CA1, CA3: un fallo (0 base) al final deja la actual en 0 y la mejor igual; sin simulados en la mejor, false'
);

-- ---------------------------------------------------------------------------
-- Otros usuarios y anon
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select results_eq(
  $$ select racha_actual, mejor_racha from public.mi_racha $$,
  $$ values (1, 1) $$,
  'F13 CA5: cada usuario lee solo su racha (B, con un acierto)'
);

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
select results_eq(
  $$ select racha_actual, mejor_racha, incluye_simulados, ultima_calificacion from public.mi_racha $$,
  $$ values (0, 0, false, null::timestamptz) $$,
  'F13 CA5: sin calificaciones devuelve 0 y 0'
);

reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok(
  $$ select * from public.mi_racha $$,
  '42501', null,
  'F13 CA5: anon no lee mi_racha'
);

reset role;
select ok(
  (select 'security_invoker=true' = any (reloptions) from pg_class where oid = 'public.mi_racha'::regclass),
  'F13 R8: mi_racha es security_invoker (sin security definer)'
);

select * from finish();
rollback;
