-- T94 — Catálogo, obtenidas, Vitrina y vistas (F14 R1, R4, R6–R9, CA3; D108). A tiene
-- "Primer acierto" y dos "Top de la jornada" (una simulada) en su grupo; B tiene "Primer acierto".
-- Todo se deshace al final.
begin;

select plan(18);

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
select ('00000000-0000-0000-0000-00000000000' || u)::uuid, u || '@example.com',
  '{"provider": "google"}', jsonb_build_object('provider_id', 'google-' || u, 'full_name', 'Usuario ' || u)
from unnest(array['a', 'b']) as u;

insert into public.liga (proveedor_id, nombre, pais) values (999262, 'Liga de Prueba', 'Mexico');
insert into public.torneo (
  liga_id, nombre, temporada_proveedor, prefijo_rondas, fecha_inicio, fecha_fin, es_actual
)
select id, 'Apertura 2099', 2099, 'Apertura', '2099-01-01', '2099-12-31', false
from public.liga where proveedor_id = 999262;
insert into public.jornada (torneo_id, orden, nombre, nombres_proveedor, fase, fecha_inicio, fecha_fin)
select t.id, j.orden, 'Jornada ' || j.orden, array['Apertura - ' || j.orden], 'REGULAR', '2099-01-01', '2099-12-31'
from public.torneo t, (values (1), (2)) as j (orden) where t.nombre = 'Apertura 2099';

insert into public.grupo (nombre, codigo_invitacion, creador_id)
values ('Los de prueba', 'ABCDEFGH', '00000000-0000-0000-0000-00000000000a');
insert into public.miembro_grupo (grupo_id, usuario_id, rol)
select id, '00000000-0000-0000-0000-00000000000a', 'ADMIN' from public.grupo where codigo_invitacion = 'ABCDEFGH';

insert into public.insignia_obtenida (usuario_id, insignia_id, obtenida_en, grupo_id, jornada_id, es_simulada)
select x.usuario::uuid, i.id, now() - x.hace,
  case when x.jornada is not null then (select id from public.grupo where codigo_invitacion = 'ABCDEFGH') end,
  (select j.id from public.jornada j join public.torneo t on t.id = j.torneo_id
   where t.nombre = 'Apertura 2099' and j.orden = x.jornada),
  x.simulada
from (values
  ('00000000-0000-0000-0000-00000000000a', 'PRIMER_ACIERTO', interval '3 days', null::int, false),
  ('00000000-0000-0000-0000-00000000000a', 'TOP_JORNADA', interval '2 days', 1, false),
  ('00000000-0000-0000-0000-00000000000a', 'TOP_JORNADA', interval '1 day', 2, true),
  ('00000000-0000-0000-0000-00000000000b', 'PRIMER_ACIERTO', interval '1 day', null::int, false)
) as x (usuario, codigo, hace, jornada, simulada)
join public.insignia i on i.codigo = x.codigo;

select throws_ok(
  $$ insert into public.insignia_obtenida (usuario_id, insignia_id, es_simulada)
     select '00000000-0000-0000-0000-00000000000a', id, false from public.insignia where codigo = 'PRIMER_ACIERTO' $$,
  '23505', null,
  'F14 R4: una insignia personal no se repite para el mismo usuario'
);

-- ---------------------------------------------------------------------------
-- Como A
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select results_eq(
  $$ select codigo, nivel::text, icono, repetible from public.insignia order by orden $$,
  $$ values ('PRIMER_ACIERTO', 'BRONCE', 'check', false), ('MARCADOR_EXACTO', 'PLATA', 'diana', false),
            ('ANALISTA', 'BRONCE', 'bombilla', false), ('RACHA_5', 'PLATA', 'llama', false),
            ('RACHA_10', 'ORO', 'llama', false), ('TOP_JORNADA', 'ORO', 'trofeo', true),
            ('MEJOR_ANALISIS', 'PLATA', 'bombilla', true) $$,
  'F14 R1: el catálogo tiene las 7 insignias con su nivel, ícono y si se repiten'
);
select is(
  (select count(*)::int from public.mis_insignias),
  7,
  'F14 R6: la Vitrina trae todo el catálogo'
);
select results_eq(
  $$ select codigo, veces, nueva from public.mis_insignias where veces > 0 order by orden $$,
  $$ values ('PRIMER_ACIERTO', 1, true), ('TOP_JORNADA', 2, true) $$,
  'F14 R6: cuántas veces gané cada una y si hay alguna sin ver'
);
select results_eq(
  $$ select ultimo_grupo, ultima_jornada, ultima_simulada from public.mis_insignias where codigo = 'TOP_JORNADA' $$,
  $$ values ('Los de prueba', 'Jornada 2', true) $$,
  'F14 R6, R5: la última vez trae grupo, jornada y si fue simulada'
);
select results_eq(
  $$ select veces, nueva, ultima_en from public.mis_insignias where codigo = 'ANALISTA' $$,
  $$ values (0, false, null::timestamptz) $$,
  'F14 R6: una no ganada sale con 0 veces'
);
select is(
  (select count(*)::int from public.insignia_obtenida),
  3,
  'F14 CA3: A lee solo sus insignias obtenidas'
);

select throws_ok(
  $$ insert into public.insignia_obtenida (usuario_id, insignia_id, es_simulada)
     select '00000000-0000-0000-0000-00000000000a', id, false from public.insignia where codigo = 'ANALISTA' $$,
  '42501', null,
  'F14 CA3: nadie se otorga insignias desde la API'
);
select throws_ok(
  $$ delete from public.insignia_obtenida $$,
  '42501', null,
  'F14 CA3: nadie borra insignias desde la API'
);
select throws_ok(
  $$ update public.insignia_obtenida set es_simulada = false $$,
  '42501', null,
  'F14 CA3: de las propias solo se cambia vista_en'
);
select throws_ok(
  $$ insert into public.insignia (codigo, nombre, descripcion, nivel, icono, repetible, orden)
     values ('X', 'X', 'X', 'ORO', 'trofeo', false, 99) $$,
  '42501', null,
  'F14 CA3: nadie cambia el catálogo desde la API'
);

update public.insignia_obtenida set vista_en = now()
where usuario_id = '00000000-0000-0000-0000-00000000000b';
select is(public.marcar_insignias_vistas(), 3, 'F14 R7: marca como vistas mis 3 insignias nuevas');
select is(
  (select count(*)::int from public.mis_insignias where nueva),
  0,
  'F14 R7: después ya no hay nuevas'
);
select is(public.marcar_insignias_vistas(), 0, 'F14 R7: volver a marcar no cambia nada');

reset role;
select is(
  (select vista_en from public.insignia_obtenida where usuario_id = '00000000-0000-0000-0000-00000000000b'),
  null,
  'F14 CA3: A no marca como vistas las de B (ni directo ni con la función)'
);

-- ---------------------------------------------------------------------------
-- anon
-- ---------------------------------------------------------------------------

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok($$ select * from public.insignia $$, '42501', null, 'F14 CA3: anon no lee el catálogo');
select throws_ok($$ select * from public.mis_insignias $$, '42501', null, 'F14 CA3: anon no lee la Vitrina');
select throws_ok($$ select public.marcar_insignias_vistas() $$, '42501', null,
  'F14 CA3: anon no marca insignias');
reset role;

select * from finish();
rollback;
