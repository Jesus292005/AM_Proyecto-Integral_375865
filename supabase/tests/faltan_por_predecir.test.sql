-- T119 — `faltan_por_predecir(grupo)` (F26 R15, R18, CA6; D113). Todo se deshace al final.
--
-- Grupo G = A, B y C · grupo H = D. Torneo actual: J1 ya jugada (9930); J2 es la actual, con 9931 y
-- 9932 abiertos y 9933 en juego; J3 con 9934 abierto. Predicciones: A en 9931 y 9932 · B en 9931 y
-- 9934 · C solo en 9933.
begin;

select plan(8);

update public.torneo set es_actual = false;

insert into public.liga (proveedor_id, nombre, pais) values (999262, 'Liga de Prueba', 'Mexico');
insert into public.torneo (
  liga_id, nombre, temporada_proveedor, prefijo_rondas, fecha_inicio, fecha_fin, es_actual
)
select id, 'Apertura 2099', 2099, 'Apertura', '2099-01-01', '2099-12-31', true
from public.liga where proveedor_id = 999262;

insert into public.jornada (torneo_id, orden, nombre, nombres_proveedor, fase, fecha_inicio, fecha_fin)
select t.id, j.orden, j.nombre, array[j.nombre], 'REGULAR', '2099-01-01', '2099-12-31'
from public.torneo t, (values (1, 'J1'), (2, 'J2'), (3, 'J3')) as j (orden, nombre)
where t.nombre = 'Apertura 2099';

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
  now() + p.dentro, now() + p.dentro, 'PROGRAMADO', false, now()
from (values (9930, 'J1', interval '1 hour'), (9931, 'J2', interval '1 day'), (9932, 'J2', interval '2 days'),
  (9933, 'J2', interval '1 hour'), (9934, 'J3', interval '9 days')) as p (id, jornada, dentro)
join public.jornada j on j.nombre = p.jornada;

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
select ('00000000-0000-0000-0000-00000000000' || u)::uuid, u || '@example.com',
  '{"provider": "google"}',
  jsonb_build_object('provider_id', 'google-' || u, 'full_name', 'Usuario ' || upper(u))
from unnest(array['a', 'b', 'c', 'd']) as u;

insert into public.grupo (nombre, codigo_invitacion)
select n, public.generar_codigo_invitacion() from unnest(array['Grupo G', 'Grupo H']) as n;
insert into public.miembro_grupo (grupo_id, usuario_id)
select g.id, ('00000000-0000-0000-0000-00000000000' || x.u)::uuid
from (values ('Grupo G', 'a'), ('Grupo G', 'b'), ('Grupo G', 'c'), ('Grupo H', 'd')) as x (grupo, u)
join public.grupo g on g.nombre = x.grupo;

insert into public.prediccion (usuario_id, partido_id, resultado)
select ('00000000-0000-0000-0000-00000000000' || x.u)::uuid, p.id, 'LOCAL'
from (values ('a', 9931), ('a', 9932), ('b', 9931), ('b', 9934), ('c', 9933)) as x (u, partido)
join public.partido p on p.proveedor_id = x.partido;

-- J1 ya se jugó y 9933 está en juego (cerrado).
update public.partido set inicio = now() - interval '3 days', cierre_predicciones = now() - interval '3 days',
  estado = 'TERMINADO' where proveedor_id = 9930;
update public.partido set inicio = now() - interval '30 minutes', cierre_predicciones = now() - interval '30 minutes',
  estado = 'EN_JUEGO' where proveedor_id = 9933;

select set_config('prueba.g', (select id::text from public.grupo where nombre = 'Grupo G'), true);

-- ---------------------------------------------------------------------------
-- Como A
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select results_eq(
  $$ select u.nombre, f.faltan, f.abiertos, f.jornada_nombre
     from public.faltan_por_predecir(current_setting('prueba.g')::bigint) f
     join public.usuario_publico u on u.id = f.usuario_id
     order by u.nombre $$,
  $$ values ('Usuario A', 0, 2, 'J2'), ('Usuario B', 1, 2, 'J2'), ('Usuario C', 2, 2, 'J2') $$,
  'F26 CA6: cuenta por miembro los partidos abiertos de la jornada actual sin su predicción; no cuenta el cerrado ni el de otra jornada'
);
select ok(
  pg_get_function_result('public.faltan_por_predecir(bigint)'::regprocedure) !~ '(partido|resultado|marcador|rango|justificacion)',
  'F26 CA6: no trae ids de partidos ni predicciones'
);

-- Como D (solo H)
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000d", "role": "authenticated"}';
select throws_ok(
  $$ select * from public.faltan_por_predecir(current_setting('prueba.g')::bigint) $$,
  'P0001', 'NO_MIEMBRO', 'F26 CA6: un grupo ajeno da NO_MIEMBRO'
);
reset role;

-- Quien sale ya no aparece; sin partidos abiertos, 0 de 0.
delete from public.miembro_grupo where usuario_id = '00000000-0000-0000-0000-00000000000c';
update public.partido set cierre_predicciones = now() - interval '1 minute' where proveedor_id in (9931, 9932);
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select results_eq(
  $$ select f.faltan, f.abiertos from public.faltan_por_predecir(current_setting('prueba.g')::bigint) f $$,
  $$ values (0, 0), (0, 0) $$,
  'F26 R15: solo miembros actuales y, sin partidos abiertos, 0 de 0'
);
reset role;

-- ---------------------------------------------------------------------------
-- Permisos (R18)
-- ---------------------------------------------------------------------------

select is(
  (select count(*)::int from pg_proc where proname = 'faltan_por_predecir'
     and prosecdef and proconfig @> array['search_path=""']),
  1,
  'F26 R18: faltan_por_predecir es security definer con search_path vacío'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok(
  $$ select * from public.faltan_por_predecir(1) $$,
  '42501', null, 'F26 CA6: anon no ejecuta faltan_por_predecir'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"role": "authenticated"}';
select throws_ok(
  $$ select * from public.faltan_por_predecir(1) $$,
  'P0001', 'SIN_SESION', 'F26 R15: sin usuario falla con SIN_SESION'
);
reset role;

-- Las predicciones abiertas siguen sin leerse con R04 (lo que cuenta la función no se abre).
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select is(
  (select count(*)::int from public.prediccion p join public.partido pa on pa.id = p.partido_id
   where pa.proveedor_id = 9934),
  0,
  'F26 R18: A sigue sin leer la predicción abierta de B (R04)'
);
reset role;

select * from finish();
rollback;
