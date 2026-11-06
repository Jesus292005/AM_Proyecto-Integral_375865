-- T57 — Vista `mis_puntos` (F10 R2, R8, R9): estados de la predicción y del bono, total y
-- permisos. Todo se deshace al final.
begin;

select plan(7);

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
  cierre_predicciones, sincronizado_en
)
select p.proveedor, j.torneo_id, j.id,
  (select id from public.equipo where proveedor_id = 999001),
  (select id from public.equipo where proveedor_id = 999002),
  now() + interval '1 day', now() + interval '1 day', now()
from generate_series(9501, 9507) as p (proveedor)
cross join public.jornada j
where j.torneo_id = (select id from public.torneo where temporada_proveedor = 2099);

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
select ('00000000-0000-0000-0000-00000000000' || x)::uuid, x || '@example.com',
  '{"provider": "google"}', jsonb_build_object('provider_id', 'google-' || x, 'full_name', 'Usuario ' || x)
from unnest(array['a', 'b']) as x;

-- A predice los 7; B solo 9501.
insert into public.prediccion (
  usuario_id, partido_id, resultado, rango_goles, marcador_local, marcador_visitante, justificacion
)
select x.u::uuid, p.id, x.r::public.resultado_prediccion, x.g::public.rango_goles, x.ml, x.mv, x.j
from (values
  ('00000000-0000-0000-0000-00000000000a', 9501, null, null, 2, 1, 'Evaluada.'),
  ('00000000-0000-0000-0000-00000000000a', 9502, null, null, 1, 0, 'Con error.'),
  ('00000000-0000-0000-0000-00000000000a', 9503, 'LOCAL', 'G2', null, null, null),
  ('00000000-0000-0000-0000-00000000000a', 9504, 'LOCAL', null, null, null, 'Aún sin evaluación.'),
  ('00000000-0000-0000-0000-00000000000a', 9505, 'EMPATE', null, null, null, 'Pendiente.'),
  ('00000000-0000-0000-0000-00000000000a', 9506, 'LOCAL', null, null, null, null),
  ('00000000-0000-0000-0000-00000000000a', 9507, 'LOCAL', null, null, null, null),
  ('00000000-0000-0000-0000-00000000000b', 9501, 'VISITANTE', null, null, null, null)
) as x (u, proveedor, r, g, ml, mv, j)
join public.partido p on p.proveedor_id = x.proveedor;

update public.partido
set estado = case proveedor_id when 9506 then 'CANCELADO' else 'TERMINADO' end::public.estado_partido
where proveedor_id between 9501 and 9507;

-- 9507 terminado sin calificar; 9506 cancelado.
insert into public.calificacion (prediccion_id, puntos_resultado, puntos_rango_goles, puntos_marcador, es_simulada)
select pr.id, x.r, x.g, x.m, false
from (values
  (9501, 0, 0, 350), (9502, 100, 0, 0), (9503, 100, 0, 0), (9504, 100, 0, 0), (9505, 0, 0, 0)
) as x (proveedor, r, g, m)
join public.partido p on p.proveedor_id = x.proveedor
join public.prediccion pr on pr.partido_id = p.id and pr.usuario_id = '00000000-0000-0000-0000-00000000000a';

insert into public.evaluacion_ia (
  prediccion_id, estado, puntos_bono, explicacion, afirmaciones, modelo, version_prompt, evaluada_en,
  error, es_simulada
)
select pr.id, x.estado::public.estado_evaluacion, x.bono, x.explicacion, x.afirmaciones::jsonb,
  x.modelo, x.version, x.evaluada, x.error, false
from (values
  (9501, 'EVALUADA', 60, 'Leíste bien los tiros.',
    '[{"texto": "Puebla tira más", "veredicto": "ACERTADA", "motivo": "17 contra 10.", "evidencia": ["S2"]}]',
    'claude-haiku-5-5', 'v3', now(), null),
  (9502, 'ERROR', null, null, '[]', null, null, null, 'El modelo rechazó la petición. (3 intentos)'),
  (9505, 'PENDIENTE', null, null, '[]', null, null, null, null)
) as x (proveedor, estado, bono, explicacion, afirmaciones, modelo, version, evaluada, error)
join public.partido p on p.proveedor_id = x.proveedor
join public.prediccion pr on pr.partido_id = p.id and pr.usuario_id = '00000000-0000-0000-0000-00000000000a';

-- ---------------------------------------------------------------------------
-- Como el usuario A
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select results_eq(
  $$ select p.proveedor_id, m.estado_prediccion, m.estado_bono, m.puntos_base::int,
       m.puntos_bono::int, m.puntos_total::int
     from public.mis_puntos m join public.partido p on p.id = m.partido_id
     order by p.proveedor_id $$,
  $$ values
       (9501, 'ACERTADA', 'EVALUADA', 350, 60, 410),
       (9502, 'PARCIAL', 'ERROR', 100, null, 100),
       (9503, 'PARCIAL', 'SIN_JUSTIFICACION', 100, null, 100),
       (9504, 'ACERTADA', 'PENDIENTE', 100, null, 100),
       (9505, 'FALLADA', 'PENDIENTE', 0, null, 0),
       (9506, 'ANULADA', 'SIN_JUSTIFICACION', null, null, null),
       (9507, 'SIN_CALIFICAR', 'SIN_JUSTIFICACION', null, null, null) $$,
  'F10 CA1: estados de la predicción y del bono y total = base + bono evaluado'
);
select results_eq(
  $$ select m.puntos_resultado::int, m.puntos_rango_goles::int, m.puntos_marcador::int
     from public.mis_puntos m join public.partido p on p.id = m.partido_id
     where p.proveedor_id in (9501, 9502) order by p.proveedor_id $$,
  $$ values (0, 0, 350), (100, 0, 0) $$,
  'F10 CA1: el desglose trae las partes de la calificación'
);
select results_eq(
  $$ select p.proveedor_id, m.explicacion, jsonb_array_length(m.afirmaciones)
     from public.mis_puntos m join public.partido p on p.id = m.partido_id
     where m.explicacion is not null or m.afirmaciones is not null $$,
  $$ values (9501, 'Leíste bien los tiros.', 1) $$,
  'F10 CA1: explicación y afirmaciones solo de un bono evaluado'
);
select results_eq(
  $$ select p, has_table_privilege('authenticated', 'public.mis_puntos', p)
     from unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE']) as p $$,
  $$ values ('SELECT', true), ('INSERT', false), ('UPDATE', false), ('DELETE', false) $$,
  'F10 R9: la vista es de solo lectura para el usuario'
);

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';

select results_eq(
  $$ select p.proveedor_id, m.estado_prediccion from public.mis_puntos m
     join public.partido p on p.id = m.partido_id $$,
  $$ values (9501, 'SIN_CALIFICAR') $$,
  'F10 CA2: B solo ve su predicción (sin calificar), nunca las de A'
);

reset role;
set local role anon;

select throws_ok(
  $$ select 1 from public.mis_puntos $$,
  '42501', null,
  'F10 CA2: anon no tiene acceso'
);

reset role;

select ok(
  (select 'security_invoker=true' = any(reloptions) from pg_class where oid = 'public.mis_puntos'::regclass),
  'F10 R9: la vista aplica las RLS de quien consulta (security_invoker)'
);

select * from finish();
rollback;
