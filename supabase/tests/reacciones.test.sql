-- T118 — Reacciones: tabla `reaccion`, `reaccionar` y conteos en `muro_jornada` (F26 R13, R18, R19,
-- CA5; D113). Todo se deshace al final.
--
-- Grupo G = A, B, C y E · grupo H = A, B y D. Torneo actual con J1: 9961 terminado y calificado,
-- 9962 abierto. Predicciones: A, B y C en 9961 con justificación; D en 9961 sin justificación;
-- B en 9962 con justificación.
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
select p.id, j.torneo_id, j.id,
  (select id from public.equipo where proveedor_id = 999001),
  (select id from public.equipo where proveedor_id = 999002),
  now() + interval '1 day', now() + interval '1 day', 'PROGRAMADO', false, now()
from (values (9961), (9962)) as p (id)
cross join public.jornada j where j.nombre = 'J1';

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
select ('00000000-0000-0000-0000-00000000000' || u)::uuid, u || '@example.com',
  '{"provider": "google"}',
  jsonb_build_object('provider_id', 'google-' || u, 'full_name', 'Usuario ' || upper(u))
from unnest(array['a', 'b', 'c', 'd', 'e']) as u;

insert into public.grupo (nombre, codigo_invitacion)
select n, public.generar_codigo_invitacion() from unnest(array['Grupo G', 'Grupo H']) as n;
insert into public.miembro_grupo (grupo_id, usuario_id)
select g.id, ('00000000-0000-0000-0000-00000000000' || x.u)::uuid
from (values ('Grupo G', 'a'), ('Grupo G', 'b'), ('Grupo G', 'c'), ('Grupo G', 'e'),
  ('Grupo H', 'a'), ('Grupo H', 'b'), ('Grupo H', 'd')) as x (grupo, u)
join public.grupo g on g.nombre = x.grupo;

insert into public.prediccion (usuario_id, partido_id, resultado, justificacion)
select ('00000000-0000-0000-0000-00000000000' || x.u)::uuid, p.id, 'LOCAL', x.texto
from (values ('a', 9961, 'Análisis de a'), ('b', 9961, 'Análisis de b'), ('c', 9961, 'Análisis de c'),
  ('d', 9961, null), ('b', 9962, 'Abierto de b')) as x (u, partido, texto)
join public.partido p on p.proveedor_id = x.partido;

update public.partido set cierre_predicciones = now() - interval '2 hours', inicio = now() - interval '2 hours',
  estado = 'TERMINADO', goles_local = 1, goles_visitante = 0, calificado_en = now()
where proveedor_id = 9961;

insert into public.calificacion (prediccion_id, puntos_resultado, puntos_rango_goles, puntos_marcador, es_simulada)
select pr.id, 100, 0, 0, false from public.prediccion pr
join public.partido p on p.id = pr.partido_id where p.proveedor_id = 9961;

create temporary table ids (nombre text primary key, id bigint) on commit drop;
insert into ids
select 'g', id from public.grupo where nombre = 'Grupo G'
union all select 'h', id from public.grupo where nombre = 'Grupo H'
union all select 'j1', id from public.jornada where nombre = 'J1'
union all
select x.u || p.proveedor_id, pr.id
from public.prediccion pr
join public.partido p on p.id = pr.partido_id
join (values ('a'), ('b'), ('c'), ('d')) as x (u)
  on pr.usuario_id = ('00000000-0000-0000-0000-00000000000' || x.u)::uuid;
grant select on ids to authenticated;

-- Ranking de G antes de cualquier reacción (P4: reaccionar no lo cambia).
select set_config('prueba.ranking_antes',
  (select string_agg(pg.usuario_id::text || ':' || pg.puntos_total, ',' order by pg.usuario_id)
   from public.posiciones_grupo((select id from ids where nombre = 'g'), public.torneo_actual_id(), null) pg),
  true);

-- Consulta del muro de G o H para B en 9961: conteos y la mía.
create function pg_temp.reacciones_de_b(grupo text)
returns table (bien_visto int, buen_analisis int, la_clavo int, me_rio int, mia text)
language sql
as $$
  select m.reacciones_bien_visto, m.reacciones_buen_analisis, m.reacciones_la_clavo,
    m.reacciones_me_rio, m.mi_reaccion::text
  from public.muro_jornada((select id from ids where nombre = grupo), (select id from ids where nombre = 'j1')) m
  where m.prediccion_id = (select id from ids where nombre = 'b9961');
$$;
grant execute on function pg_temp.reacciones_de_b(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Poner, cambiar y quitar (decisión 1)
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select lives_ok(
  $$ select public.reaccionar((select id from ids where nombre = 'g'), (select id from ids where nombre = 'b9961'), 'BIEN_VISTO') $$,
  'F26 CA5: A reacciona al análisis de B en G'
);
select results_eq(
  $$ select * from pg_temp.reacciones_de_b('g') $$,
  $$ values (1, 0, 0, 0, 'BIEN_VISTO') $$,
  'F26 CA5: el muro trae el conteo de cada reacción y la mía'
);
select lives_ok(
  $$ select public.reaccionar((select id from ids where nombre = 'g'), (select id from ids where nombre = 'b9961'), 'LA_CLAVO') $$,
  'F26 CA5: A cambia su reacción'
);
select results_eq(
  $$ select * from pg_temp.reacciones_de_b('g') $$,
  $$ values (0, 0, 1, 0, 'LA_CLAVO') $$,
  'F26 CA5: una sola reacción por persona: cambiarla mueve el conteo'
);
select results_eq(
  $$ select * from pg_temp.reacciones_de_b('h') $$,
  $$ values (0, 0, 0, 0, null::text) $$,
  'F26 CA5: las reacciones de un grupo no aparecen en el muro de otro'
);

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
select lives_ok(
  $$ select public.reaccionar((select id from ids where nombre = 'g'), (select id from ids where nombre = 'b9961'), 'ME_RIO') $$,
  'F26 CA5: C también reacciona'
);
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000e", "role": "authenticated"}';
select lives_ok(
  $$ select public.reaccionar((select id from ids where nombre = 'g'), (select id from ids where nombre = 'b9961'), 'BIEN_VISTO') $$,
  'F26 CA5: E también reacciona (antes de salir)'
);

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select results_eq(
  $$ select * from pg_temp.reacciones_de_b('g') $$,
  $$ values (1, 0, 1, 1, 'LA_CLAVO') $$,
  'F26 R13: el conteo suma a todos los miembros y la mía sigue siendo la mía'
);
select lives_ok(
  $$ select public.reaccionar((select id from ids where nombre = 'g'), (select id from ids where nombre = 'b9961'), null) $$,
  'F26 CA5: A quita su reacción'
);
select results_eq(
  $$ select * from pg_temp.reacciones_de_b('g') $$,
  $$ values (1, 0, 0, 1, null::text) $$,
  'F26 CA5: al quitarla deja de contar'
);

-- ---------------------------------------------------------------------------
-- Errores
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ select public.reaccionar((select id from ids where nombre = 'g'), (select id from ids where nombre = 'a9961'), 'BIEN_VISTO') $$,
  'P0001', 'PROPIO', 'F26 CA5: no se reacciona a lo propio'
);
select throws_ok(
  $$ select public.reaccionar((select id from ids where nombre = 'g'), (select id from ids where nombre = 'b9962'), 'BIEN_VISTO') $$,
  'P0001', 'ANALISIS_NO_DISPONIBLE', 'F26 CA5: antes del cierre da ANALISIS_NO_DISPONIBLE'
);
select throws_ok(
  $$ select public.reaccionar((select id from ids where nombre = 'h'), (select id from ids where nombre = 'd9961'), 'BIEN_VISTO') $$,
  'P0001', 'ANALISIS_NO_DISPONIBLE', 'F26 CA5: sin justificación da ANALISIS_NO_DISPONIBLE'
);
select throws_ok(
  $$ select public.reaccionar((select id from ids where nombre = 'g'), (select id from ids where nombre = 'b9961'), 'FUEGO') $$,
  'P0001', 'TIPO_INVALIDO', 'F26 R13: un tipo fuera de los 4 da TIPO_INVALIDO'
);

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000d", "role": "authenticated"}';
select throws_ok(
  $$ select public.reaccionar((select id from ids where nombre = 'g'), (select id from ids where nombre = 'b9961'), 'BIEN_VISTO') $$,
  'P0001', 'NO_MIEMBRO', 'F26 CA5: en un grupo ajeno da NO_MIEMBRO'
);
select throws_ok(
  $$ select * from public.reaccion $$,
  '42501', null, 'F26 CA5: nadie lee reaccion directamente'
);
select throws_ok(
  $$ insert into public.reaccion (grupo_id, prediccion_id, usuario_id, tipo)
     values ((select id from ids where nombre = 'h'), (select id from ids where nombre = 'b9961'),
       '00000000-0000-0000-0000-00000000000d', 'BIEN_VISTO') $$,
  '42501', null, 'F26 CA5: nadie escribe reaccion directamente'
);

-- ---------------------------------------------------------------------------
-- Miembros que salen (R13)
-- ---------------------------------------------------------------------------

reset role;
delete from public.miembro_grupo
where usuario_id in ('00000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-00000000000c')
  and grupo_id = (select id from ids where nombre = 'g');
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select results_eq(
  $$ select * from pg_temp.reacciones_de_b('g') $$,
  $$ values (0, 0, 0, 0, null::text) $$,
  'F26 CA5: las reacciones de quien salió dejan de contar'
);
select throws_ok(
  $$ select public.reaccionar((select id from ids where nombre = 'g'), (select id from ids where nombre = 'c9961'), 'BIEN_VISTO') $$,
  'P0001', 'ANALISIS_NO_DISPONIBLE', 'F26 CA5: al análisis de quien salió del grupo no se reacciona'
);
reset role;

-- ---------------------------------------------------------------------------
-- P4: sin puntos, insignias ni racha
-- ---------------------------------------------------------------------------

select is(
  (select string_agg(pg.usuario_id::text || ':' || pg.puntos_total, ',' order by pg.usuario_id)
   from public.posiciones_grupo((select id from ids where nombre = 'g'), public.torneo_actual_id(), null) pg
   where pg.usuario_id in (select ('00000000-0000-0000-0000-00000000000' || u)::uuid from unnest(array['a', 'b']) as u)),
  (select string_agg(x, ',' order by x) from unnest(string_to_array(current_setting('prueba.ranking_antes'), ',')) as x
   where x ~ '^00000000-0000-0000-0000-00000000000[ab]:'),
  'F26 CA5: reaccionar no cambia el ranking del grupo'
);
select set_eq(
  $$ select p.proname::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prosrc ~ 'public\.reaccion\M' $$,
  array['reaccionar', 'muro_jornada'],
  'F26 CA5 (P4): solo reaccionar y muro_jornada usan reaccion (ni el ranking, ni las insignias, ni la racha)'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok(
  $$ select public.reaccionar(1, 1, 'BIEN_VISTO') $$,
  '42501', null, 'F26 R18: anon no ejecuta reaccionar'
);
reset role;

select * from finish();
rollback;
