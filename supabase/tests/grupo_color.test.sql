-- T115 — Color del grupo, `editar_grupo` y líder en `mis_grupos` (F26 R2, R5, R6, R18, CA1, CA2;
-- D113). Todo se deshace al final.
--
-- Grupo G: A (ADMIN), B y C · grupo H: A (ADMIN) y D · grupo K: E. Torneo actual con J1 y un
-- partido calificado: en G, B 350 y C 100 (B líder); en H, A 100 y D 100 (empate); K sin puntos.
begin;

select plan(22);

update public.torneo set es_actual = false;

insert into public.liga (proveedor_id, nombre, pais) values (999262, 'Liga de Prueba', 'Mexico');
insert into public.torneo (
  liga_id, nombre, temporada_proveedor, prefijo_rondas, fecha_inicio, fecha_fin, es_actual
)
select id, 'Apertura 2099', 2099, 'Apertura', '2099-01-01', '2099-12-31', true
from public.liga where proveedor_id = 999262;

insert into public.jornada (torneo_id, orden, nombre, nombres_proveedor, fase, fecha_inicio, fecha_fin)
select t.id, 1, 'J1', array['J1'], 'REGULAR', '2099-01-01', '2099-12-31'
from public.torneo t where t.nombre = 'Apertura 2099';

insert into public.equipo (proveedor_id, nombre, nombre_corto, escudo_url)
values
  (999001, 'Local de Prueba', 'Local', 'https://example.com/l.png'),
  (999002, 'Visitante de Prueba', 'Visitante', 'https://example.com/v.png');

insert into public.partido (
  proveedor_id, torneo_id, jornada_id, equipo_local_id, equipo_visitante_id, inicio,
  cierre_predicciones, estado, es_simulado, sincronizado_en
)
select 9971, j.torneo_id, j.id,
  (select id from public.equipo where proveedor_id = 999001),
  (select id from public.equipo where proveedor_id = 999002),
  now() + interval '1 day', now() + interval '1 day', 'PROGRAMADO', false, now()
from public.jornada j where j.nombre = 'J1';

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
select ('00000000-0000-0000-0000-00000000000' || u)::uuid, u || '@example.com',
  '{"provider": "google"}',
  jsonb_build_object('provider_id', 'google-' || u, 'full_name', 'Usuario ' || upper(u))
from unnest(array['a', 'b', 'c', 'd', 'e']) as u;

insert into public.grupo (nombre, codigo_invitacion)
select n, public.generar_codigo_invitacion() from unnest(array['Grupo G', 'Grupo H', 'Grupo K']) as n;
insert into public.miembro_grupo (grupo_id, usuario_id, rol)
select g.id, ('00000000-0000-0000-0000-00000000000' || x.u)::uuid, x.rol::public.rol_grupo
from (values ('Grupo G', 'a', 'ADMIN'), ('Grupo G', 'b', 'MIEMBRO'), ('Grupo G', 'c', 'MIEMBRO'),
  ('Grupo H', 'a', 'ADMIN'), ('Grupo H', 'd', 'MIEMBRO'), ('Grupo K', 'e', 'ADMIN')) as x (grupo, u, rol)
join public.grupo g on g.nombre = x.grupo;

create temporary table puntos_prueba (u text, r int, m int) on commit drop;
insert into puntos_prueba values ('a', 100, 0), ('b', 0, 350), ('c', 100, 0), ('d', 100, 0);

insert into public.prediccion (usuario_id, partido_id, resultado)
select ('00000000-0000-0000-0000-00000000000' || x.u)::uuid, p.id, 'LOCAL'
from puntos_prueba x join public.partido p on p.proveedor_id = 9971;

update public.partido set cierre_predicciones = now() - interval '2 hours', estado = 'TERMINADO',
  goles_local = 1, goles_visitante = 0, calificado_en = now()
where proveedor_id = 9971;

insert into public.calificacion (prediccion_id, puntos_resultado, puntos_rango_goles, puntos_marcador, es_simulada)
select pr.id, x.r, 0, x.m, false
from puntos_prueba x
join public.prediccion pr on pr.usuario_id = ('00000000-0000-0000-0000-00000000000' || x.u)::uuid;

-- ---------------------------------------------------------------------------
-- Color por defecto (R2)
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select results_eq(
  $$ select g.color::text from public.mis_grupos g order by g.nombre $$,
  $$ select (enum_range(null::public.color_grupo))[(g.id % 8)::int + 1]::text
     from public.grupo g where g.nombre in ('Grupo G', 'Grupo H') order by g.nombre $$,
  'F26 CA1: un grupo sin color devuelve el de la posición id mod 8'
);
select is(
  (select count(distinct public.color_de_grupo(n, null))::int from generate_series(1, 8) as n),
  8,
  'F26 R2: ocho grupos seguidos sin color tienen los 8 colores de la paleta'
);

-- ---------------------------------------------------------------------------
-- Editar (R6)
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ select public.editar_grupo((select id from public.grupo where nombre = 'Grupo G'), '  Los Compas  ', 'AZUL') $$,
  'F26 CA1: el ADMIN edita nombre y color'
);
select results_eq(
  $$ select nombre, color::text from public.mis_grupos where nombre = 'Los Compas' $$,
  $$ values ('Los Compas', 'AZUL') $$,
  'F26 CA1: el nombre se guarda recortado y el color elegido sale en mis_grupos'
);
select lives_ok(
  $$ select public.editar_grupo((select id from public.grupo where nombre = 'Los Compas'), null, 'ROSA') $$,
  'F26 R6: con el nombre vacío solo cambia el color'
);
select results_eq(
  $$ select nombre, color::text from public.grupo where nombre = 'Los Compas' $$,
  $$ values ('Los Compas', 'ROSA') $$,
  'F26 R6: el nombre se conserva'
);
select throws_ok(
  $$ select public.editar_grupo((select id from public.grupo where nombre = 'Los Compas'), 'ab', null) $$,
  'P0001', 'NOMBRE_INVALIDO', 'F26 CA1: un nombre de 2 caracteres da NOMBRE_INVALIDO'
);
select throws_ok(
  $$ select public.editar_grupo((select id from public.grupo where nombre = 'Los Compas'), repeat('x', 31), null) $$,
  'P0001', 'NOMBRE_INVALIDO', 'F26 CA1: un nombre de 31 caracteres da NOMBRE_INVALIDO'
);
select throws_ok(
  $$ select public.editar_grupo((select id from public.grupo where nombre = 'Los Compas'), null, 'NARANJA') $$,
  'P0001', 'COLOR_INVALIDO', 'F26 CA1: un color fuera de la paleta da COLOR_INVALIDO'
);
select throws_ok(
  $$ update public.grupo set color = 'VERDE' where nombre = 'Los Compas' $$,
  '42501', null, 'F26 CA1: nadie escribe grupo.color directamente'
);

-- B es MIEMBRO de G; E no es miembro de G.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select throws_ok(
  $$ select public.editar_grupo((select id from public.grupo where nombre = 'Los Compas'), 'Otro nombre', null) $$,
  'P0001', 'NO_ADMIN', 'F26 CA1: un MIEMBRO recibe NO_ADMIN'
);
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000e", "role": "authenticated"}';
reset role;
select set_config('prueba.id_g', (select id::text from public.grupo where nombre = 'Los Compas'), true);
set local role authenticated;
select throws_ok(
  $$ select public.editar_grupo(current_setting('prueba.id_g')::bigint, 'Otro nombre', null) $$,
  'P0001', 'NO_MIEMBRO', 'F26 CA1: un no miembro recibe NO_MIEMBRO'
);

-- ---------------------------------------------------------------------------
-- Líder (R5)
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select results_eq(
  $$ select nombre, lider_nombre, lider_es_yo, lideres from public.mis_grupos order by nombre $$,
  $$ values ('Grupo H', 'Usuario A', true, 2), ('Los Compas', 'Usuario B', false, 1) $$,
  'F26 CA2: el líder es el 1.º del ranking del torneo; con empate, lideres > 1 y el primero por nombre'
);
select is(
  (select lider_nombre from public.mis_grupos where nombre = 'Los Compas'),
  (select r.nombre from public.ranking_grupo(current_setting('prueba.id_g')::bigint) r where r.posicion = 1),
  'F26 CA2: el líder coincide con el 1.º de ranking_grupo'
);
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select results_eq(
  $$ select lider_nombre, lider_es_yo, lideres from public.mis_grupos $$,
  $$ values ('Usuario B'::text, true, 1) $$,
  'F26 CA2: si soy el líder, lider_es_yo'
);
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000e", "role": "authenticated"}';
select results_eq(
  $$ select lider_nombre, lider_es_yo, lideres from public.mis_grupos $$,
  $$ values (null::text, null::boolean, null::integer) $$,
  'F26 CA2: sin puntos en el grupo, el líder está vacío'
);
select is_empty(
  $$ select * from public.lider_de_grupo(current_setting('prueba.id_g')::bigint) $$,
  'F26 R18: el líder de un grupo ajeno no se entrega'
);

-- ---------------------------------------------------------------------------
-- Permisos (R18)
-- ---------------------------------------------------------------------------

reset role;
select is(
  (select count(*)::int from pg_proc where proname in ('editar_grupo', 'lider_de_grupo')
     and prosecdef and proconfig @> array['search_path=""']),
  2,
  'F26 R18: editar_grupo y lider_de_grupo son security definer con search_path vacío'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok(
  $$ select public.editar_grupo(1, 'Nombre', null) $$,
  '42501', null, 'F26 CA1: anon no ejecuta editar_grupo'
);
select throws_ok(
  $$ select * from public.lider_de_grupo(1) $$,
  '42501', null, 'F26 R18: anon no ejecuta lider_de_grupo'
);
reset role;

set local role authenticated;
set local request.jwt.claims = '{"role": "authenticated"}';
select throws_ok(
  $$ select public.editar_grupo(1, 'Nombre', null) $$,
  'P0001', 'SIN_SESION', 'F26 R6: sin usuario falla con SIN_SESION'
);
reset role;

select ok(
  not has_table_privilege('authenticated', 'public.grupo', 'UPDATE'),
  'F26 R18: authenticated no tiene UPDATE sobre grupo'
);

select * from finish();
rollback;
