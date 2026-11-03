-- T41 — Notificaciones (F11a): selección de recordatorios (R5) y permisos (R10). `now()` no
-- cambia dentro de la transacción. Todo se deshace al final.
begin;

select plan(27);

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
select id, 7, 'Jornada 7', array['Apertura - 7'], 'REGULAR', '2099-07-01', '2099-07-31'
from public.torneo where temporada_proveedor = 2099;

insert into public.equipo (proveedor_id, nombre, nombre_corto, escudo_url)
values
  (999001, 'Club América', 'América', 'https://example.com/l.png'),
  (999002, 'Pumas UNAM', 'Pumas', 'https://example.com/v.png');

-- 9201: cierra en 30 min. 9202: en 60 min (justo en el borde). 9203: en 61 min. 9204: ya cerró.
-- 9205: cancelado en 30 min. 9206: pospuesto con nuevo cierre en 45 min.
insert into public.partido (
  proveedor_id, torneo_id, jornada_id, equipo_local_id, equipo_visitante_id, inicio,
  cierre_predicciones, estado, sincronizado_en
)
select p.id, j.torneo_id, j.id,
  (select id from public.equipo where proveedor_id = 999001),
  (select id from public.equipo where proveedor_id = 999002),
  now() + p.desfase, now() + p.desfase, p.estado::public.estado_partido, now()
from (values
  (9201, interval '30 minutes', 'PROGRAMADO'),
  (9202, interval '60 minutes', 'PROGRAMADO'),
  (9203, interval '61 minutes', 'PROGRAMADO'),
  (9204, interval '-1 minute', 'PROGRAMADO'),
  (9205, interval '30 minutes', 'CANCELADO'),
  (9206, interval '45 minutes', 'POSPUESTO')
) as p (id, desfase, estado)
cross join public.jornada j
where j.nombre = 'Jornada 7'
  and j.torneo_id = (select id from public.torneo where temporada_proveedor = 2099);

-- A: candidato normal. B: predijo 9201. C: recordatorios apagados. D: sin dispositivo.
-- E: ya notificado de 9201.
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
select ('00000000-0000-0000-0000-00000000000' || x)::uuid, x || '@example.com',
  '{"provider": "google"}', jsonb_build_object('provider_id', 'google-' || x, 'full_name', 'Usuario ' || x)
from unnest(array['a', 'b', 'c', 'd', 'e']) as x;

update public.usuario set recordatorios_activos = false
where id = '00000000-0000-0000-0000-00000000000c';

insert into public.dispositivo (usuario_id, token)
select ('00000000-0000-0000-0000-00000000000' || x)::uuid, 'ExponentPushToken[' || x || ']'
from unnest(array['a', 'b', 'c', 'e']) as x;
insert into public.dispositivo (usuario_id, token)
values ('00000000-0000-0000-0000-00000000000a', 'ExponentPushToken[a2]');

insert into public.prediccion (usuario_id, partido_id, resultado)
select '00000000-0000-0000-0000-00000000000b', id, 'LOCAL'
from public.partido where proveedor_id = 9201;

insert into public.notificacion_enviada (usuario_id, tipo, partido_id)
select '00000000-0000-0000-0000-00000000000e', 'RECORDATORIO', id
from public.partido where proveedor_id = 9201;

-- ---------------------------------------------------------------------------
-- CA1: selección (como postgres, que es lo que usa la clave secreta)
-- ---------------------------------------------------------------------------

create temporary table pendientes as
select r.*, p.proveedor_id
from public.recordatorios_pendientes(now()) r
join public.partido p on p.id = r.partido_id;

select results_eq(
  $$ select proveedor_id, local, visitante, jornada_orden::int, tokens
     from pendientes where usuario_id = '00000000-0000-0000-0000-00000000000a' order by 1 $$,
  $$ values
       (9201, 'América', 'Pumas', 7, array['ExponentPushToken[a]', 'ExponentPushToken[a2]']),
       (9202, 'América', 'Pumas', 7, array['ExponentPushToken[a]', 'ExponentPushToken[a2]']),
       (9206, 'América', 'Pumas', 7, array['ExponentPushToken[a]', 'ExponentPushToken[a2]']) $$,
  'F11a CA1: devuelve al usuario sin predicción con partidos que cierran en 60 min o menos (también pospuestos), con todos sus tokens'
);
select is_empty(
  $$ select 1 from pendientes where usuario_id = '00000000-0000-0000-0000-00000000000b' and proveedor_id = 9201 $$,
  'F11a CA1: excluye al que ya predijo ese partido'
);
select isnt_empty(
  $$ select 1 from pendientes where usuario_id = '00000000-0000-0000-0000-00000000000b' and proveedor_id = 9202 $$,
  'F11a CA1: al que predijo otro partido sí le recuerda este'
);
select is_empty(
  $$ select 1 from pendientes where usuario_id = '00000000-0000-0000-0000-00000000000c' $$,
  'F11a CA1: excluye a quien apagó los recordatorios'
);
select is_empty(
  $$ select 1 from pendientes where usuario_id = '00000000-0000-0000-0000-00000000000d' $$,
  'F11a CA1: excluye a quien no tiene dispositivo'
);
select is_empty(
  $$ select 1 from pendientes where usuario_id = '00000000-0000-0000-0000-00000000000e' and proveedor_id = 9201 $$,
  'F11a CA1: excluye lo ya notificado'
);
select is_empty(
  $$ select 1 from pendientes where proveedor_id = 9205 $$,
  'F11a CA1: excluye un partido cancelado'
);
select is_empty(
  $$ select 1 from pendientes where proveedor_id = 9204 $$,
  'F11a CA1: excluye un partido cuyo cierre ya pasó'
);
select is_empty(
  $$ select 1 from pendientes where proveedor_id = 9203 $$,
  'F11a CA1: excluye un partido que cierra en más de 60 min'
);

-- ---------------------------------------------------------------------------
-- CA2: permisos, como el usuario A
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select results_eq(
  $$ select token from public.dispositivo order by token $$,
  $$ values ('ExponentPushToken[a]'), ('ExponentPushToken[a2]') $$,
  'F11a CA2: A lee solo sus dispositivos'
);
select is_empty(
  $$ delete from public.dispositivo where token = 'ExponentPushToken[b]' returning id $$,
  'F11a CA2: A no borra dispositivos ajenos'
);
select lives_ok(
  $$ select public.registrar_dispositivo('ExponentPushToken[b]') $$,
  'F11a CA2: registrar un token existente no falla'
);
select results_eq(
  $$ select count(*)::int from public.dispositivo where token = 'ExponentPushToken[b]' $$,
  $$ values (1) $$,
  'F11a R3: el token de B pasa a A (A ya lo ve como suyo)'
);
select lives_ok(
  $$ select public.registrar_dispositivo('ExponentPushToken[nuevo]') $$,
  'F11a R2: A registra un token nuevo'
);
select throws_ok(
  $$ select public.registrar_dispositivo('no-es-un-token') $$,
  '23514', null,
  'F11a R2: rechaza un texto que no es un token de Expo'
);
select throws_ok(
  $$ insert into public.dispositivo (usuario_id, token)
     values ('00000000-0000-0000-0000-00000000000a', 'ExponentPushToken[directo]') $$,
  '42501', null,
  'F11a R10: el registro solo va por la función'
);
select isnt_empty(
  $$ delete from public.dispositivo where token = 'ExponentPushToken[nuevo]' returning id $$,
  'F11a CA6: A borra su propio token (cerrar sesión)'
);
select throws_ok(
  $$ select id from public.notificacion_enviada $$,
  '42501', null,
  'F11a CA2: authenticated no lee notificacion_enviada'
);
select throws_ok(
  $$ select * from public.recordatorios_pendientes(now()) $$,
  '42501', null,
  'F11a CA2: authenticated no ejecuta recordatorios_pendientes'
);

-- Sin sesión (token sin usuario).
set local request.jwt.claims = '{"role": "authenticated"}';
select throws_ok(
  $$ select public.registrar_dispositivo('ExponentPushToken[sin-sesion]') $$,
  'P0001', 'SIN_SESION',
  'F11a R10: registrar sin sesión responde SIN_SESION'
);

-- ---------------------------------------------------------------------------
-- CA2: anon
-- ---------------------------------------------------------------------------

reset request.jwt.claims;
set local role anon;

select throws_ok(
  $$ select * from public.recordatorios_pendientes(now()) $$,
  '42501', null,
  'F11a CA2: anon no ejecuta recordatorios_pendientes'
);

select throws_ok(
  $$ select id from public.dispositivo $$,
  '42501', null,
  'F11a CA2: anon no lee dispositivos'
);
select throws_ok(
  $$ select public.registrar_dispositivo('ExponentPushToken[anon]') $$,
  '42501', null,
  'F11a CA2: anon no registra dispositivos'
);
select throws_ok(
  $$ select id from public.notificacion_enviada $$,
  '42501', null,
  'F11a CA2: anon no lee notificacion_enviada'
);

-- ---------------------------------------------------------------------------
-- Como postgres: el token pasó de cuenta
-- ---------------------------------------------------------------------------

reset role;

select ok(
  not has_function_privilege('service_role', 'public.registrar_dispositivo(text)', 'execute'),
  'F11a R10: service_role no ejecuta registrar_dispositivo (siempre es del usuario con sesión)'
);
select ok(
  has_function_privilege('service_role', 'public.recordatorios_pendientes(timestamptz)', 'execute'),
  'F11a R10: service_role sí ejecuta recordatorios_pendientes'
);
select results_eq(
  $$ select usuario_id from public.dispositivo where token = 'ExponentPushToken[b]' $$,
  $$ values ('00000000-0000-0000-0000-00000000000a'::uuid) $$,
  'F11a CA2: registrar_dispositivo pasa un token existente a quien lo registra'
);

select * from finish();
rollback;
