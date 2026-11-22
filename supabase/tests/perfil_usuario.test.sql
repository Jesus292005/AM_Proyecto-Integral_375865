-- T120 — `racha_de`, `carta_de` y `perfil_usuario` (F19 R1, R5–R7, CA1, CA2; D113). Todo se
-- deshace al final.
--
-- Grupo G = A y B · grupo H = C. D no tiene grupos. B tiene 6 predicciones calificadas (base 100,
-- 0, 100, 350, 100, 100 en orden de inicio) y un bono evaluado de 80; su equipo favorito es Local.
begin;

select plan(15);

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

insert into public.equipo (proveedor_id, nombre, nombre_corto, escudo_url, color_primario, color_texto)
values
  (999001, 'Local de Prueba', 'Local', 'https://example.com/l.png', '#112233', '#FFFFFF'),
  (999002, 'Visitante de Prueba', 'Visitante', 'https://example.com/v.png', null, null);

insert into public.partido (
  proveedor_id, torneo_id, jornada_id, equipo_local_id, equipo_visitante_id, inicio,
  cierre_predicciones, estado, es_simulado, sincronizado_en
)
select 9900 + n, j.torneo_id, j.id,
  (select id from public.equipo where proveedor_id = 999001),
  (select id from public.equipo where proveedor_id = 999002),
  now() + n * interval '1 hour', now() + n * interval '1 hour', 'PROGRAMADO', false, now()
from generate_series(1, 6) as n
cross join public.jornada j where j.nombre = 'J1';

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
select ('00000000-0000-0000-0000-00000000000' || u)::uuid, u || '@example.com',
  '{"provider": "google"}',
  jsonb_build_object('provider_id', 'google-' || u, 'full_name', 'Usuario ' || upper(u))
from unnest(array['a', 'b', 'c', 'd']) as u;

update public.usuario set equipo_favorito_id = (select id from public.equipo where proveedor_id = 999001)
where id = '00000000-0000-0000-0000-00000000000b';

insert into public.grupo (nombre, codigo_invitacion)
select n, public.generar_codigo_invitacion() from unnest(array['Grupo G', 'Grupo H']) as n;
insert into public.miembro_grupo (grupo_id, usuario_id)
select g.id, ('00000000-0000-0000-0000-00000000000' || x.u)::uuid
from (values ('Grupo G', 'a'), ('Grupo G', 'b'), ('Grupo H', 'c')) as x (grupo, u)
join public.grupo g on g.nombre = x.grupo;

insert into public.prediccion (usuario_id, partido_id, resultado, justificacion)
select '00000000-0000-0000-0000-00000000000b', p.id, 'LOCAL', 'Análisis'
from public.partido p where p.proveedor_id between 9901 and 9906;

update public.partido set cierre_predicciones = inicio - interval '1 day', inicio = inicio - interval '1 day',
  estado = 'TERMINADO', goles_local = 1, goles_visitante = 0, calificado_en = now()
where proveedor_id between 9901 and 9906;

insert into public.calificacion (prediccion_id, puntos_resultado, puntos_rango_goles, puntos_marcador, es_simulada)
select pr.id, case when x.base in (100, 350) then case when x.base = 350 then 0 else 100 end else 0 end,
  0, case when x.base = 350 then 350 else 0 end, false
from (values (9901, 100), (9902, 0), (9903, 100), (9904, 350), (9905, 100), (9906, 100)) as x (partido, base)
join public.partido p on p.proveedor_id = x.partido
join public.prediccion pr on pr.partido_id = p.id;

insert into public.evaluacion_ia (
  prediccion_id, estado, puntos_bono, explicacion, modelo, version_prompt, evaluada_en, es_simulada
)
select pr.id, 'EVALUADA', 80, 'Bien', 'modelo', 'v3', now(), false
from public.prediccion pr join public.partido p on p.id = pr.partido_id where p.proveedor_id = 9901;

-- ---------------------------------------------------------------------------
-- Lo que B ve de sí mismo (F13, F20)
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select set_config('prueba.racha_b', (select row(r.*)::text from public.mi_racha r), true);
select set_config('prueba.carta_b', (select row(c.*)::text from public.mi_carta c), true);
select results_eq(
  $$ select racha_actual, mejor_racha, calificadas, media is not null from public.mi_racha, public.mi_carta $$,
  $$ values (4, 4, 6, true) $$,
  'F19 R5: mi_racha y mi_carta siguen dando lo mismo sobre racha_de y carta_de'
);

-- ---------------------------------------------------------------------------
-- Como A, compañero de B
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select results_eq(
  $$ select nombre, es_yo, equipo_nombre_corto, equipo_color_primario
     from public.perfil_usuario('00000000-0000-0000-0000-00000000000b') $$,
  $$ values ('Usuario B', false, 'Local', '#112233') $$,
  'F19 CA1: perfil_usuario devuelve la fila de un compañero de grupo con su equipo'
);
select is(
  (select row(p.racha_actual, p.mejor_racha, p.racha_incluye_simulados, p.ultima_calificacion)::text
   from public.perfil_usuario('00000000-0000-0000-0000-00000000000b') p),
  current_setting('prueba.racha_b'),
  'F19 CA2: la racha que ve A es la misma que B ve en mi_racha'
);
select is(
  (select row(p.calificadas, p."precision", p.punteria, p.analisis, p.constancia, p.media, p.nivel,
     p.carta_incluye_simulados)::text
   from public.perfil_usuario('00000000-0000-0000-0000-00000000000b') p),
  current_setting('prueba.carta_b'),
  'F19 CA2: la carta que ve A es la misma que B ve en mi_carta'
);
select results_eq(
  $$ select nombre, es_yo, equipo_nombre_corto, calificadas from public.perfil_usuario('00000000-0000-0000-0000-00000000000a') $$,
  $$ values ('Usuario A', true, null::text, 0) $$,
  'F19 CA1: también mi propia fila, sin equipo'
);
select throws_ok(
  $$ select * from public.perfil_usuario('00000000-0000-0000-0000-00000000000c') $$,
  'P0001', 'NO_ENCONTRADO', 'F19 CA1: alguien sin grupo en común da NO_ENCONTRADO'
);
select throws_ok(
  $$ select * from public.perfil_usuario('00000000-0000-0000-0000-0000000000ff') $$,
  'P0001', 'NO_ENCONTRADO', 'F19 CA1: un id que no existe da el mismo NO_ENCONTRADO'
);
select throws_ok(
  $$ select * from public.racha_de('00000000-0000-0000-0000-00000000000c') $$,
  'P0001', 'NO_ENCONTRADO', 'F19 CA2: racha_de no calcula para alguien sin grupo en común'
);
select throws_ok(
  $$ select * from public.carta_de('00000000-0000-0000-0000-00000000000c') $$,
  'P0001', 'NO_ENCONTRADO', 'F19 CA2: carta_de no calcula para alguien sin grupo en común'
);

-- B sale de G.
reset role;
delete from public.miembro_grupo where usuario_id = '00000000-0000-0000-0000-00000000000b';
set local role authenticated;
select throws_ok(
  $$ select * from public.perfil_usuario('00000000-0000-0000-0000-00000000000b') $$,
  'P0001', 'NO_ENCONTRADO', 'F19 CA1: después de salir del grupo, el excompañero da NO_ENCONTRADO'
);

-- Sin sesión: la vista propia sigue dando 0 y 0 (F13 R6); perfil_usuario pide sesión.
set local request.jwt.claims = '{"role": "authenticated"}';
select results_eq(
  $$ select racha_actual, mejor_racha from public.mi_racha $$,
  $$ values (0, 0) $$,
  'F19 R5: sin usuario, mi_racha sigue dando 0 y 0'
);
select throws_ok(
  $$ select * from public.perfil_usuario('00000000-0000-0000-0000-00000000000a') $$,
  'P0001', 'SIN_SESION', 'F19 R6: sin usuario falla con SIN_SESION'
);
reset role;

-- ---------------------------------------------------------------------------
-- Columnas y permisos (R7)
-- ---------------------------------------------------------------------------

select ok(
  pg_get_function_result('public.perfil_usuario(uuid)'::regprocedure) !~ '(correo|google_id|rol|recordatorios|justificacion|resultado|marcador)',
  'F19 CA1: no trae correo, rol, recordatorios ni predicciones'
);
select is(
  (select count(*)::int from pg_proc where proname in ('racha_de', 'carta_de', 'perfil_usuario')
     and prosecdef and proconfig @> array['search_path=""']),
  3,
  'F19 R7: racha_de, carta_de y perfil_usuario son security definer con search_path vacío'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select throws_ok(
  $$ select * from public.perfil_usuario('00000000-0000-0000-0000-00000000000a') $$,
  '42501', null, 'F19 CA1: anon no ejecuta perfil_usuario'
);
reset role;

select * from finish();
rollback;
