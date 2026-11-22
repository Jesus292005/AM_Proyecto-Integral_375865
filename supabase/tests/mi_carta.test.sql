-- T93 — `mi_carta` (F20 R1–R6, CA1, CA2; decisión 3 de D108). Seis partidos en orden de inicio;
-- cada usuario predice los primeros n y recibe los puntos base de `cal` (en ese orden):
--   a: 100 0 150 350 250 100, bonos 80 y 60 (y uno pendiente) → PRE 89 · PUN 67 · ANA 81 · CON 64 → 75 PLATA
--   b: 100 ×5, sin bonos, uno simulado → 99 · 57 · — · 70 → 75 PLATA
--   c: 100 0 100 0 (4 calificadas) → sin media
--   d, e, f, 7: medias 64 (BRONCE), 65 (PLATA), 79 (PLATA) y 80 (ORO) · 8: sin calificaciones
-- (los ids de usuario terminan en un dígito hexadecimal)
-- Todo se deshace al final.
begin;

select plan(13);

insert into public.liga (proveedor_id, nombre, pais) values (999262, 'Liga de Prueba', 'Mexico');
insert into public.torneo (
  liga_id, nombre, temporada_proveedor, prefijo_rondas, fecha_inicio, fecha_fin, es_actual
)
select id, 'Apertura 2099', 2099, 'Apertura', '2099-01-01', '2099-12-31', false
from public.liga where proveedor_id = 999262;
insert into public.jornada (torneo_id, orden, nombre, nombres_proveedor, fase, fecha_inicio, fecha_fin)
select id, 1, 'Jornada 1', array['Apertura - 1'], 'REGULAR', '2099-01-01', '2099-12-31'
from public.torneo where nombre = 'Apertura 2099';
insert into public.equipo (proveedor_id, nombre, nombre_corto, escudo_url)
values
  (999001, 'Local de Prueba', 'Local', 'https://example.com/l.png'),
  (999002, 'Visitante de Prueba', 'Visitante', 'https://example.com/v.png');

-- Abiertos al crear las predicciones; después pasan al pasado, en orden.
insert into public.partido (
  proveedor_id, torneo_id, jornada_id, equipo_local_id, equipo_visitante_id, inicio,
  cierre_predicciones, estado, sincronizado_en
)
select 99900 + n, j.torneo_id, j.id,
  (select id from public.equipo where proveedor_id = 999001),
  (select id from public.equipo where proveedor_id = 999002),
  now() + interval '1 day', now() + interval '1 day', 'PROGRAMADO', now()
from generate_series(1, 6) as n,
  (select j.id, j.torneo_id from public.jornada j join public.torneo t on t.id = j.torneo_id
   where t.nombre = 'Apertura 2099') as j;

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
select ('00000000-0000-0000-0000-00000000000' || u)::uuid, u || '@example.com',
  '{"provider": "google"}', jsonb_build_object('provider_id', 'google-' || u, 'full_name', 'Usuario ' || u)
from unnest(array['a', 'b', 'c', 'd', 'e', 'f', '7', '8']) as u;

create temporary table cal (usuario text, orden int, base int) on commit drop;
insert into cal values
  ('a', 1, 100), ('a', 2, 0), ('a', 3, 150), ('a', 4, 350), ('a', 5, 250), ('a', 6, 100),
  ('b', 1, 100), ('b', 2, 100), ('b', 3, 100), ('b', 4, 100), ('b', 5, 100),
  ('c', 1, 100), ('c', 2, 0), ('c', 3, 100), ('c', 4, 0),
  ('d', 1, 0), ('d', 2, 0), ('d', 3, 100), ('d', 4, 100), ('d', 5, 350),
  ('e', 1, 0), ('e', 2, 0), ('e', 3, 150), ('e', 4, 150), ('e', 5, 350),
  ('f', 1, 0), ('f', 2, 350), ('f', 3, 350), ('f', 4, 350), ('f', 5, 350),
  ('7', 1, 100), ('7', 2, 100), ('7', 3, 100), ('7', 4, 250), ('7', 5, 350);

insert into public.prediccion (usuario_id, partido_id, resultado)
select ('00000000-0000-0000-0000-00000000000' || c.usuario)::uuid, p.id, 'LOCAL'
from cal c join public.partido p on p.proveedor_id = 99900 + c.orden;

update public.partido
set inicio = now() - (10 - (proveedor_id - 99900)) * interval '1 day',
    cierre_predicciones = now() - (10 - (proveedor_id - 99900)) * interval '1 day',
    estado = 'TERMINADO'
where proveedor_id between 99901 and 99906;

-- 0 → nada · 100 → resultado · 150 → rango · 250 → resultado + rango · 350 → marcador.
insert into public.calificacion (
  prediccion_id, puntos_resultado, puntos_rango_goles, puntos_marcador, es_simulada
)
select pr.id,
  case when c.base in (100, 250) then 100 else 0 end,
  case when c.base in (150, 250) then 150 else 0 end,
  case when c.base = 350 then 350 else 0 end,
  c.usuario = 'b' and c.orden = 5
from cal c
join public.partido p on p.proveedor_id = 99900 + c.orden
join public.prediccion pr on pr.partido_id = p.id
  and pr.usuario_id = ('00000000-0000-0000-0000-00000000000' || c.usuario)::uuid;

-- Bonos de A: 80 y 60 evaluados; uno pendiente que no cuenta.
insert into public.evaluacion_ia (
  prediccion_id, estado, puntos_bono, explicacion, modelo, version_prompt, es_simulada, evaluada_en
)
select pr.id, x.estado::public.estado_evaluacion, x.bono,
  case when x.estado = 'EVALUADA' then 'Explicación de prueba.' end,
  case when x.estado = 'EVALUADA' then 'modelo-prueba' end,
  case when x.estado = 'EVALUADA' then 'v-prueba' end,
  false,
  case when x.estado = 'EVALUADA' then now() end
from (values (1, 'EVALUADA', 80), (3, 'EVALUADA', 60), (2, 'PENDIENTE', null))
  as x (orden, estado, bono)
join public.partido p on p.proveedor_id = 99900 + x.orden
join public.prediccion pr on pr.partido_id = p.id
  and pr.usuario_id = '00000000-0000-0000-0000-00000000000a';

-- ---------------------------------------------------------------------------
-- CA1
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select results_eq(
  $$ select calificadas, "precision", punteria, analisis, constancia from public.mi_carta $$,
  $$ values (6, 89, 67, 81, 64) $$,
  'F20 CA1: calcula los 4 atributos (PRE, PUN, ANA con los bonos evaluados, CON con la mejor racha)'
);
select results_eq(
  $$ select media, nivel::text, incluye_simulados from public.mi_carta $$,
  $$ values (75, 'PLATA', false) $$,
  'F20 CA1: la media promedia los 4 atributos y su nivel es PLATA'
);
select is(
  (select count(*)::int from public.mi_carta),
  1,
  'F20 R5: mi_carta siempre devuelve una fila'
);

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select results_eq(
  $$ select "precision", punteria, analisis, constancia, media, nivel::text from public.mi_carta $$,
  $$ values (99, 57, null::integer, 70, 75, 'PLATA') $$,
  'F20 CA1: sin evaluaciones, ANA vacío y la media usa los otros tres'
);
select is(
  (select incluye_simulados from public.mi_carta),
  true,
  'F20 R4: una calificación simulada cuenta y se marca'
);

-- ---------------------------------------------------------------------------
-- CA2
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
select results_eq(
  $$ select calificadas, media, nivel::text from public.mi_carta $$,
  $$ values (4, null::integer, null::text) $$,
  'F20 CA2: con menos de 5 calificadas no hay media ni nivel'
);

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000d", "role": "authenticated"}';
select results_eq($$ select media, nivel::text from public.mi_carta $$, $$ values (64, 'BRONCE') $$,
  'F20 CA2: media 64 es BRONCE');
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000e", "role": "authenticated"}';
select results_eq($$ select media, nivel::text from public.mi_carta $$, $$ values (65, 'PLATA') $$,
  'F20 CA2: media 65 es PLATA');
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000f", "role": "authenticated"}';
select results_eq($$ select media, nivel::text from public.mi_carta $$, $$ values (79, 'PLATA') $$,
  'F20 CA2: media 79 es PLATA');
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000007", "role": "authenticated"}';
select results_eq($$ select media, nivel::text from public.mi_carta $$, $$ values (80, 'ORO') $$,
  'F20 CA2: media 80 es ORO');

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-000000000008", "role": "authenticated"}';
select results_eq(
  $$ select calificadas, "precision", punteria, analisis, constancia, media, incluye_simulados from public.mi_carta $$,
  $$ values (0, null::integer, null::integer, null::integer, null::integer, null::integer, false) $$,
  'F20 CA2: sin calificaciones, todo vacío; cada usuario lee solo su carta'
);

reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok($$ select * from public.mi_carta $$, '42501', null, 'F20 CA2: anon no lee mi_carta');
reset role;

select ok(
  not has_table_privilege('authenticated', 'public.mi_carta', 'insert'),
  'F20 R6: authenticated solo lee mi_carta'
);

select * from finish();
rollback;
