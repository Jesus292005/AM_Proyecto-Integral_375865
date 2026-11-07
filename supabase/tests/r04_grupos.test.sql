-- T65 — R04 (F07 R6, R7) y P-26 (F07 R8, decisión 1 de D97).
-- A y B comparten dos grupos (G1 y G3); C está solo en G2. Partidos: 9101 ya cerró, 9102 abierto,
-- 9103 cierra justo ahora. Las predicciones se crean con el partido abierto y después se cierran.
-- Todo se deshace al final.
begin;

select plan(25);

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

insert into public.partido (
  proveedor_id, torneo_id, jornada_id, equipo_local_id, equipo_visitante_id, inicio,
  cierre_predicciones, estado, sincronizado_en
)
select p.id, j.torneo_id, j.id,
  (select id from public.equipo where proveedor_id = 999001),
  (select id from public.equipo where proveedor_id = 999002),
  now() + interval '1 day', now() + interval '1 day', 'PROGRAMADO', now()
from (values (9101), (9102), (9103)) as p (id)
cross join public.jornada j
where j.torneo_id = (select id from public.torneo where temporada_proveedor = 2099);

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"provider": "google"}',
    '{"provider_id": "google-a", "full_name": "Usuario A"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"provider": "google"}',
    '{"provider_id": "google-b", "full_name": "Usuario B"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.com', '{"provider": "google"}',
    '{"provider_id": "google-c", "full_name": "Usuario C"}');

insert into public.grupo (nombre, codigo_invitacion)
select n, public.generar_codigo_invitacion() from (values ('Grupo 1'), ('Grupo 2'), ('Grupo 3')) as g (n);
insert into public.miembro_grupo (grupo_id, usuario_id)
select g.id, m.usuario
from (values
  ('Grupo 1', '00000000-0000-0000-0000-00000000000a'::uuid),
  ('Grupo 1', '00000000-0000-0000-0000-00000000000b'::uuid),
  ('Grupo 3', '00000000-0000-0000-0000-00000000000a'::uuid),
  ('Grupo 3', '00000000-0000-0000-0000-00000000000b'::uuid),
  ('Grupo 2', '00000000-0000-0000-0000-00000000000c'::uuid)
) as m (grupo, usuario)
join public.grupo g on g.nombre = m.grupo;

-- Cada uno predice los tres partidos con su justificación.
insert into public.prediccion (usuario_id, partido_id, resultado, justificacion)
select u.id, p.id, 'LOCAL', 'Análisis de ' || u.nombre || ' en ' || p.proveedor_id
from public.usuario u
cross join public.partido p
where p.proveedor_id in (9101, 9102, 9103);

update public.partido set cierre_predicciones = now() - interval '1 minute' where proveedor_id = 9101;
update public.partido set cierre_predicciones = now() where proveedor_id = 9103;

create temporary table grupos_prueba on commit drop as select id, nombre from public.grupo;
grant select on grupos_prueba to authenticated;

-- ---------------------------------------------------------------------------
-- Como A (comparte grupo con B, no con C)
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select results_eq(
  $$ select usuario_id from public.prediccion
     where partido_id = (select id from public.partido where proveedor_id = 9101)
       and usuario_id <> '00000000-0000-0000-0000-00000000000a' $$,
  $$ values ('00000000-0000-0000-0000-00000000000b'::uuid) $$,
  'F07 CA6: después del cierre, A lee la predicción de B (miembro) y no la de C (no miembro)'
);
select is(
  (select justificacion from public.prediccion
   where partido_id = (select id from public.partido where proveedor_id = 9101)
     and usuario_id = '00000000-0000-0000-0000-00000000000b'),
  'Análisis de Usuario B en 9101',
  'F07 CA6: después del cierre, A lee la justificación completa de B'
);
select is_empty(
  $$ select 1 from public.prediccion
     where partido_id = (select id from public.partido where proveedor_id = 9102)
       and usuario_id <> '00000000-0000-0000-0000-00000000000a' $$,
  'F07 CA6: antes del cierre, A no lee la predicción de B ni la de C'
);
select results_eq(
  $$ select usuario_id from public.prediccion
     where partido_id = (select id from public.partido where proveedor_id = 9103)
       and usuario_id <> '00000000-0000-0000-0000-00000000000a' $$,
  $$ values ('00000000-0000-0000-0000-00000000000b'::uuid) $$,
  'F07 CA6: justo en el cierre, A ya lee la predicción de B'
);
select is_empty(
  $$ select 1 from public.prediccion where usuario_id = '00000000-0000-0000-0000-00000000000c' $$,
  'F07 CA6: A nunca lee las predicciones de C (sin grupo en común)'
);
select is_empty(
  $$ update public.prediccion set resultado = 'EMPATE'
     where usuario_id = '00000000-0000-0000-0000-00000000000b' returning id $$,
  'F07 CA6: A no modifica las predicciones de B'
);
select is_empty(
  $$ delete from public.prediccion
     where usuario_id = '00000000-0000-0000-0000-00000000000b' returning id $$,
  'F07 CA6: A no borra las predicciones de B'
);
select results_eq(
  $$ select nombre, justificacion from public.predicciones_grupo
     where partido_id = (select id from public.partido where proveedor_id = 9101) $$,
  $$ values ('Usuario B', 'Análisis de Usuario B en 9101') $$,
  'F07 R7: predicciones_grupo trae a B una sola vez aunque compartan dos grupos'
);
select is_empty(
  $$ select 1 from public.predicciones_grupo
     where partido_id = (select id from public.partido where proveedor_id = 9102) $$,
  'F07 R7: predicciones_grupo está vacía antes del cierre'
);
select is(
  (select count(*)::int from public.mis_puntos),
  3,
  'F07 CA7: mis_puntos sigue devolviendo solo las predicciones propias'
);

-- P-26 (F07 CA8)
select results_eq(
  $$ select nombre from public.usuario_publico order by nombre $$,
  $$ values ('Usuario A'), ('Usuario B') $$,
  'F07 CA8: usuario_publico muestra a A y a quien comparte grupo con A, no a C'
);
select results_eq(
  $$ select id from public.usuario order by id $$,
  $$ values ('00000000-0000-0000-0000-00000000000a'::uuid), ('00000000-0000-0000-0000-00000000000b'::uuid) $$,
  'F07 CA8: en usuario, A lee su fila y la de B'
);
select throws_ok(
  $$ select correo from public.usuario $$,
  '42501', null,
  'F07 CA8: nadie lee correo por la API'
);
select throws_ok(
  $$ select google_id from public.usuario $$,
  '42501', null,
  'F07 CA8: nadie lee google_id por la API'
);
select throws_ok(
  $$ select creado_en from public.usuario $$,
  '42501', null,
  'F07 CA8: nadie lee creado_en por la API'
);

-- ---------------------------------------------------------------------------
-- Como B y como C
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';

select results_eq(
  $$ select usuario_id from public.prediccion
     where partido_id = (select id from public.partido where proveedor_id = 9101)
       and usuario_id <> '00000000-0000-0000-0000-00000000000b' $$,
  $$ values ('00000000-0000-0000-0000-00000000000a'::uuid) $$,
  'F07 CA6: B lee la predicción de A después del cierre'
);

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';

select is_empty(
  $$ select 1 from public.prediccion where usuario_id <> '00000000-0000-0000-0000-00000000000c' $$,
  'F07 CA6: C (sin grupo en común) no lee ninguna predicción ajena, ni cerrada ni abierta'
);
select results_eq(
  $$ select nombre from public.usuario_publico $$,
  $$ values ('Usuario C') $$,
  'F07 CA8: sin compañeros de grupo, C solo se ve a sí mismo'
);

-- ---------------------------------------------------------------------------
-- Al salir (F07 R5)
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select lives_ok(
  $$ select public.salir_grupo((select id from grupos_prueba where nombre = 'Grupo 1')) $$,
  'F07 R5: B sale de G1'
);

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select isnt_empty(
  $$ select 1 from public.prediccion where usuario_id = '00000000-0000-0000-0000-00000000000b' $$,
  'F07 CA6: si aún comparten G3, A sigue leyendo las de B'
);

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select lives_ok(
  $$ select public.salir_grupo((select id from grupos_prueba where nombre = 'Grupo 3')) $$,
  'F07 R5: B sale de G3'
);

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select is_empty(
  $$ select 1 from public.prediccion where usuario_id = '00000000-0000-0000-0000-00000000000b' $$,
  'F07 CA6: sin grupo en común, A deja de leer las predicciones de B'
);
select results_eq(
  $$ select nombre from public.usuario_publico $$,
  $$ values ('Usuario A') $$,
  'F07 CA8: sin grupo en común, A deja de ver a B en usuario_publico'
);

-- ---------------------------------------------------------------------------
-- anon y estructura
-- ---------------------------------------------------------------------------

reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok(
  $$ select * from public.predicciones_grupo $$,
  '42501', null,
  'F07 CA5: anon no lee predicciones_grupo'
);

reset role;

select ok(
  (select 'security_invoker=true' = any (reloptions) from pg_class where oid = 'public.usuario_publico'::regclass),
  'F07 CA8: usuario_publico ya no es security definer (P-26)'
);

select * from finish();
rollback;
