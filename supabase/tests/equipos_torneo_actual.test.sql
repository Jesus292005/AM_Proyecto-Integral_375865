-- T92 — `equipos_torneo_actual` y el equipo favorito (F18 R2–R4, CA1, CA2; D108). Torneo actual
-- de prueba con 3 equipos (uno juega dos partidos y otro solo de visitante) y un equipo de otro
-- torneo. Todo se deshace al final.
begin;

select plan(7);

update public.torneo set es_actual = false;

insert into public.liga (proveedor_id, nombre, pais) values (999262, 'Liga de Prueba', 'Mexico');
insert into public.torneo (
  liga_id, nombre, temporada_proveedor, prefijo_rondas, fecha_inicio, fecha_fin, es_actual
)
select id, t.nombre, t.temporada, 'Apertura', '2098-01-01', '2099-12-31', t.actual
from public.liga,
  (values ('Apertura 2098', 2098, false), ('Apertura 2099', 2099, true)) as t (nombre, temporada, actual)
where proveedor_id = 999262;
insert into public.jornada (torneo_id, orden, nombre, nombres_proveedor, fase, fecha_inicio, fecha_fin)
select id, 1, 'Jornada 1', array['Apertura - 1'], 'REGULAR', '2098-01-01', '2099-12-31'
from public.torneo where temporada_proveedor in (2098, 2099);

insert into public.equipo (proveedor_id, nombre, nombre_corto, escudo_url, color_primario, color_texto)
values
  (999001, 'Equipo Uno', 'Uno', 'https://example.com/1.png', '#112233', '#FFFFFF'),
  (999002, 'Equipo Dos', 'Dos', 'https://example.com/2.png', null, null),
  (999003, 'Equipo Tres', 'Tres', 'https://example.com/3.png', null, null),
  (999004, 'Equipo Viejo', 'Viejo', 'https://example.com/4.png', null, null);

insert into public.partido (
  proveedor_id, torneo_id, jornada_id, equipo_local_id, equipo_visitante_id, inicio,
  cierre_predicciones, estado, sincronizado_en
)
select x.partido, j.torneo_id, j.id,
  (select id from public.equipo where proveedor_id = x.local),
  (select id from public.equipo where proveedor_id = x.visitante),
  now(), now(), 'PROGRAMADO', now()
from (values (99801, 2099, 999001, 999002), (99802, 2099, 999001, 999003), (99803, 2098, 999004, 999001))
  as x (partido, temporada, local, visitante)
join public.torneo t on t.temporada_proveedor = x.temporada and t.prefijo_rondas = 'Apertura'
  and t.liga_id = (select id from public.liga where proveedor_id = 999262)
join public.jornada j on j.torneo_id = t.id;

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
select ('00000000-0000-0000-0000-00000000000' || u)::uuid, u || '@example.com',
  '{"provider": "google"}', jsonb_build_object('provider_id', 'google-' || u, 'full_name', 'Usuario ' || u)
from unnest(array['a', 'b']) as u;

-- ---------------------------------------------------------------------------
-- CA1: la vista
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select results_eq(
  $$ select nombre_corto, color_primario, color_texto from public.equipos_torneo_actual order by nombre_corto $$,
  $$ values ('Dos', null::text, null::text), ('Tres', null, null), ('Uno', '#112233', '#FFFFFF') $$,
  'F18 CA1: cada equipo del torneo actual una sola vez, con sus colores; sin los de otros torneos'
);
select is(
  (select escudo_url from public.equipos_torneo_actual where nombre_corto = 'Uno'),
  'https://example.com/1.png',
  'F18 R3: trae el escudo'
);

-- ---------------------------------------------------------------------------
-- CA2: cambiar y quitar el equipo propio, no el ajeno
-- ---------------------------------------------------------------------------

update public.usuario set equipo_favorito_id = (select id from public.equipo where proveedor_id = 999003)
where id = '00000000-0000-0000-0000-00000000000a';
update public.usuario set equipo_favorito_id = (select id from public.equipo where proveedor_id = 999002)
where id = '00000000-0000-0000-0000-00000000000a';
select is(
  (select e.nombre_corto from public.usuario u join public.equipo e on e.id = u.equipo_favorito_id
   where u.id = '00000000-0000-0000-0000-00000000000a'),
  'Dos',
  'F18 CA2: A elige y cambia su equipo favorito (decisión 2: cuando quiera)'
);
update public.usuario set equipo_favorito_id = null where id = '00000000-0000-0000-0000-00000000000a';
select is(
  (select equipo_favorito_id from public.usuario where id = '00000000-0000-0000-0000-00000000000a'),
  null,
  'F18 CA2: A quita su equipo favorito'
);
update public.usuario set equipo_favorito_id = (select id from public.equipo where proveedor_id = 999001)
where id = '00000000-0000-0000-0000-00000000000b';

reset role;
select is(
  (select equipo_favorito_id from public.usuario where id = '00000000-0000-0000-0000-00000000000b'),
  null,
  'F18 CA2: A no cambia el equipo favorito de B'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok(
  $$ select * from public.equipos_torneo_actual $$,
  '42501', null,
  'F18 CA1: anon no lee equipos_torneo_actual'
);
reset role;

select is(
  (select count(*)::int from public.equipos_torneo_actual where nombre_corto = 'Viejo'),
  0,
  'F18 R3: un equipo que solo jugó otro torneo no aparece'
);

select * from finish();
rollback;
