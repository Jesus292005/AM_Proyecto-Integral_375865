-- T121 — `insignias_usuario` (F19 R6, R7, CA3, decisión 5; D113). Todo se deshace al final.
--
-- Grupo G = A y B · grupo H = C · grupo K = B (A no está). B ganó "Primer acierto" (simulada) y
-- dos veces "Top de la jornada" en K. A tiene "Analista".
begin;

select plan(10);

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
select ('00000000-0000-0000-0000-00000000000' || u)::uuid, u || '@example.com',
  '{"provider": "google"}',
  jsonb_build_object('provider_id', 'google-' || u, 'full_name', 'Usuario ' || upper(u))
from unnest(array['a', 'b', 'c']) as u;

insert into public.grupo (nombre, codigo_invitacion)
select n, public.generar_codigo_invitacion() from unnest(array['Grupo G', 'Grupo H', 'Grupo K']) as n;
insert into public.miembro_grupo (grupo_id, usuario_id)
select g.id, ('00000000-0000-0000-0000-00000000000' || x.u)::uuid
from (values ('Grupo G', 'a'), ('Grupo G', 'b'), ('Grupo H', 'c'), ('Grupo K', 'b')) as x (grupo, u)
join public.grupo g on g.nombre = x.grupo;

insert into public.liga (proveedor_id, nombre, pais) values (999262, 'Liga de Prueba', 'Mexico');
insert into public.torneo (
  liga_id, nombre, temporada_proveedor, prefijo_rondas, fecha_inicio, fecha_fin, es_actual
)
select id, 'Apertura 2099', 2099, 'Apertura', '2099-01-01', '2099-12-31', false
from public.liga where proveedor_id = 999262;
insert into public.jornada (torneo_id, orden, nombre, nombres_proveedor, fase, fecha_inicio, fecha_fin)
select t.id, j.orden, j.nombre, array[j.nombre], 'REGULAR', '2099-01-01', '2099-12-31'
from public.torneo t, (values (1, 'J1'), (2, 'J2')) as j (orden, nombre)
where t.nombre = 'Apertura 2099';

insert into public.insignia_obtenida (usuario_id, insignia_id, obtenida_en, grupo_id, jornada_id, es_simulada)
select ('00000000-0000-0000-0000-00000000000' || x.u)::uuid, i.id, now() - x.hace,
  (select id from public.grupo where nombre = x.grupo), (select id from public.jornada where nombre = x.jornada),
  x.simulada
from (values
  ('b', 'PRIMER_ACIERTO', interval '3 days', null, null, true),
  ('b', 'TOP_JORNADA', interval '2 days', 'Grupo K', 'J1', false),
  ('b', 'TOP_JORNADA', interval '1 day', 'Grupo K', 'J2', false),
  ('a', 'ANALISTA', interval '1 day', null, null, false)
) as x (u, codigo, hace, grupo, jornada, simulada)
join public.insignia i on i.codigo = x.codigo;

-- ---------------------------------------------------------------------------
-- Como A, compañero de B
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select results_eq(
  $$ select codigo, veces, ultima_simulada from public.insignias_usuario('00000000-0000-0000-0000-00000000000b')
     where veces > 0 $$,
  $$ values ('PRIMER_ACIERTO', 1, true), ('TOP_JORNADA', 2, false) $$,
  'F19 CA3: las insignias de un compañero con cuántas veces y si fue con un simulado'
);
select is(
  (select count(*)::int from public.insignias_usuario('00000000-0000-0000-0000-00000000000b')),
  (select count(*)::int from public.insignia),
  'F19 CA3: devuelve todo el catálogo, en el orden de la Vitrina'
);
select ok(
  (select ultima_en > now() - interval '25 hours'
   from public.insignias_usuario('00000000-0000-0000-0000-00000000000b') where codigo = 'TOP_JORNADA'),
  'F19 CA3: con la fecha de la última vez que la ganó'
);
select ok(
  pg_get_function_result('public.insignias_usuario(uuid)'::regprocedure) !~ '(grupo|jornada|vista|nueva)',
  'F19 CA3 (decisión 5): sin grupo, jornada ni vista_en'
);
select throws_ok(
  $$ select * from public.insignias_usuario('00000000-0000-0000-0000-00000000000c') $$,
  'P0001', 'NO_ENCONTRADO', 'F19 CA3: alguien sin grupo en común da NO_ENCONTRADO'
);
select throws_ok(
  $$ select * from public.insignias_usuario('00000000-0000-0000-0000-0000000000ff') $$,
  'P0001', 'NO_ENCONTRADO', 'F19 CA3: un id que no existe da el mismo NO_ENCONTRADO'
);
select results_eq(
  $$ select codigo, veces from public.insignias_usuario('00000000-0000-0000-0000-00000000000a') where veces > 0 $$,
  $$ values ('ANALISTA', 1) $$,
  'F19 R1: también las mías'
);
reset role;

-- B sale de G.
delete from public.miembro_grupo
where usuario_id = '00000000-0000-0000-0000-00000000000b'
  and grupo_id = (select id from public.grupo where nombre = 'Grupo G');
set local role authenticated;
select throws_ok(
  $$ select * from public.insignias_usuario('00000000-0000-0000-0000-00000000000b') $$,
  'P0001', 'NO_ENCONTRADO', 'F19 CA3: después de salir del grupo, el excompañero da NO_ENCONTRADO'
);
reset role;

select is(
  (select count(*)::int from pg_proc where proname = 'insignias_usuario'
     and prosecdef and proconfig @> array['search_path=""']),
  1,
  'F19 R7: insignias_usuario es security definer con search_path vacío'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok(
  $$ select * from public.insignias_usuario('00000000-0000-0000-0000-00000000000a') $$,
  '42501', null, 'F19 R7: anon no ejecuta insignias_usuario'
);
reset role;

select * from finish();
rollback;
