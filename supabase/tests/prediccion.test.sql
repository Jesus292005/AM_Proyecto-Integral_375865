-- T33 — `prediccion`: formas válidas (R02), cierre (F03 R1), una por partido (R01), permisos
-- (F03 R6) y recorte de la justificación (F04 R1). Partidos con cierre relativo a `now()`, que
-- dentro de la transacción no cambia. Todo se deshace al final.
begin;

select plan(49);

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

-- 9001–9005: abiertos. 9010: cierra justo ahora. 9011: ya cerró. 9012–9014: estado no editable
-- con el cierre en el futuro. 9015: pospuesto antes del cierre (nuevo cierre en 2 días). 9016:
-- pospuesto después del inicio (el cierre no se movió, D46). 9020 y 9030: abiertos al crear la
-- predicción; 9020 se cierra después.
insert into public.partido (
  proveedor_id, torneo_id, jornada_id, equipo_local_id, equipo_visitante_id, inicio,
  cierre_predicciones, estado, sincronizado_en
)
select p.id, j.torneo_id, j.id,
  (select id from public.equipo where proveedor_id = 999001),
  (select id from public.equipo where proveedor_id = 999002),
  now() + p.desfase, now() + p.desfase, p.estado::public.estado_partido, now()
from (values
  (9001, interval '1 day', 'PROGRAMADO'),
  (9002, interval '1 day', 'PROGRAMADO'),
  (9003, interval '1 day', 'PROGRAMADO'),
  (9004, interval '1 day', 'PROGRAMADO'),
  (9005, interval '1 day', 'PROGRAMADO'),
  (9010, interval '0', 'PROGRAMADO'),
  (9011, interval '-1 minute', 'PROGRAMADO'),
  (9012, interval '1 hour', 'EN_JUEGO'),
  (9013, interval '1 hour', 'TERMINADO'),
  (9014, interval '1 hour', 'CANCELADO'),
  (9015, interval '2 days', 'POSPUESTO'),
  (9016, interval '-1 hour', 'POSPUESTO'),
  (9020, interval '1 day', 'PROGRAMADO'),
  (9030, interval '1 day', 'PROGRAMADO')
) as p (id, desfase, estado)
cross join public.jornada j
where j.nombre = 'Jornada 1' and j.torneo_id = (
  select id from public.torneo where temporada_proveedor = 2099
);

-- A y B usuarios normales; C administrador.
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"provider": "google"}',
    '{"provider_id": "google-a", "full_name": "Usuario A"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"provider": "google"}',
    '{"provider_id": "google-b", "full_name": "Usuario B"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.com', '{"provider": "google"}',
    '{"provider_id": "google-c", "full_name": "Usuario C"}');
update public.usuario set rol = 'ADMIN' where id = '00000000-0000-0000-0000-00000000000c';

-- Predicciones creadas con el partido abierto; después 9020 cierra.
insert into public.prediccion (usuario_id, partido_id, resultado)
select u.id, p.id, 'LOCAL'
from (values
  ('00000000-0000-0000-0000-00000000000a'::uuid, 9020),
  ('00000000-0000-0000-0000-00000000000b'::uuid, 9020),
  ('00000000-0000-0000-0000-00000000000b'::uuid, 9030)
) as u (id, proveedor)
join public.partido p on p.proveedor_id = u.proveedor;

-- Con justificación (F04): la de A en 9020 antes del cierre y la de B en 9030.
update public.prediccion set justificacion = 'Análisis de ' || u.nombre
from public.usuario u
where u.id = prediccion.usuario_id
  and prediccion.partido_id in (select id from public.partido where proveedor_id in (9020, 9030))
  and (u.nombre = 'Usuario B' or prediccion.partido_id = (select id from public.partido where proveedor_id = 9020));

update public.partido set cierre_predicciones = now() - interval '1 minute' where proveedor_id = 9020;

select results_eq(
  $$ select count(*)::int from public.prediccion where justificacion is not null $$,
  $$ values (3) $$,
  'F04 CA3: preparación: A y B tienen justificaciones guardadas'
);

-- ---------------------------------------------------------------------------
-- Como el usuario A
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

-- CA1: las 4 formas válidas.
select lives_ok(
  $$ insert into public.prediccion (partido_id, resultado)
     values ((select id from public.partido where proveedor_id = 9001), 'LOCAL') $$,
  'F03 CA1: guarda solo el resultado'
);
select lives_ok(
  $$ insert into public.prediccion (partido_id, rango_goles)
     values ((select id from public.partido where proveedor_id = 9002), 'G2') $$,
  'F03 CA1: guarda solo el rango de goles'
);
select lives_ok(
  $$ insert into public.prediccion (partido_id, resultado, rango_goles)
     values ((select id from public.partido where proveedor_id = 9003), 'EMPATE', 'G4_MAS') $$,
  'F03 CA1: guarda resultado y rango'
);
select lives_ok(
  $$ insert into public.prediccion (partido_id, marcador_local, marcador_visitante)
     values ((select id from public.partido where proveedor_id = 9004), 2, 1) $$,
  'F03 CA1: guarda el marcador exacto'
);
-- R4: el servidor pone el usuario y las fechas.
select results_eq(
  $$ select count(*)::int from public.prediccion
     where usuario_id = '00000000-0000-0000-0000-00000000000a'
       and creada_en = now() and actualizada_en = now() $$,
  $$ values (5) $$,
  'F03 R4: el usuario y las fechas los pone el servidor'
);

-- CA2: formas inválidas.
select throws_ok(
  $$ insert into public.prediccion (partido_id)
     values ((select id from public.partido where proveedor_id = 9005)) $$,
  '23514', null,
  'F03 CA2: rechaza una predicción vacía'
);
select throws_ok(
  $$ insert into public.prediccion (partido_id, resultado, marcador_local, marcador_visitante)
     values ((select id from public.partido where proveedor_id = 9005), 'LOCAL', 1, 0) $$,
  '23514', null,
  'F03 CA2: rechaza marcador con resultado'
);
select throws_ok(
  $$ insert into public.prediccion (partido_id, rango_goles, marcador_local, marcador_visitante)
     values ((select id from public.partido where proveedor_id = 9005), 'G0_1', 1, 0) $$,
  '23514', null,
  'F03 CA2: rechaza marcador con rango de goles'
);
select throws_ok(
  $$ insert into public.prediccion (partido_id, marcador_local)
     values ((select id from public.partido where proveedor_id = 9005), 1) $$,
  '23514', null,
  'F03 CA2: rechaza un marcador con un solo número'
);
select throws_ok(
  $$ insert into public.prediccion (partido_id, marcador_local, marcador_visitante)
     values ((select id from public.partido where proveedor_id = 9005), 11, 0) $$,
  '23514', null,
  'F03 CA2: rechaza un marcador mayor que 10'
);
select throws_ok(
  $$ insert into public.prediccion (partido_id, marcador_local, marcador_visitante)
     values ((select id from public.partido where proveedor_id = 9005), 0, -1) $$,
  '23514', null,
  'F03 CA2: rechaza un marcador negativo'
);

-- CA3: guardar otra vez el mismo partido reemplaza (como el upsert de la app).
select lives_ok(
  $$ insert into public.prediccion
       (partido_id, resultado, rango_goles, marcador_local, marcador_visitante)
     values ((select id from public.partido where proveedor_id = 9001), null, null, 3, 0)
     on conflict (usuario_id, partido_id) do update set
       partido_id = excluded.partido_id,
       resultado = excluded.resultado,
       rango_goles = excluded.rango_goles,
       marcador_local = excluded.marcador_local,
       marcador_visitante = excluded.marcador_visitante $$,
  'F03 CA3: guardar dos veces el mismo partido no falla'
);
select results_eq(
  $$ select resultado::text, marcador_local::int, marcador_visitante::int
     from public.prediccion
     where partido_id = (select id from public.partido where proveedor_id = 9001) $$,
  $$ values (null::text, 3, 0) $$,
  'F03 CA3: queda una sola predicción con lo último guardado'
);

-- CA4: en o después del cierre, o con un estado no editable.
select throws_ok(
  $$ insert into public.prediccion (partido_id, resultado)
     values ((select id from public.partido where proveedor_id = 9010), 'LOCAL') $$,
  'P0001', 'PREDICCIONES_CERRADAS',
  'F03 CA4: no crea justo a la hora del cierre'
);
select throws_ok(
  $$ insert into public.prediccion (partido_id, resultado)
     values ((select id from public.partido where proveedor_id = 9011), 'LOCAL') $$,
  'P0001', 'PREDICCIONES_CERRADAS',
  'F03 CA4: no crea después del cierre'
);
select throws_ok(
  $$ update public.prediccion set resultado = 'VISITANTE'
     where partido_id = (select id from public.partido where proveedor_id = 9020) $$,
  'P0001', 'PREDICCIONES_CERRADAS',
  'F03 CA4: no edita después del cierre'
);
select throws_ok(
  $$ delete from public.prediccion
     where partido_id = (select id from public.partido where proveedor_id = 9020) $$,
  'P0001', 'PREDICCIONES_CERRADAS',
  'F03 CA4: no quita después del cierre'
);
select throws_ok(
  $$ insert into public.prediccion (partido_id, resultado)
     values ((select id from public.partido where proveedor_id = 9012), 'LOCAL') $$,
  'P0001', 'PREDICCIONES_CERRADAS',
  'F03 CA4: un partido EN_JUEGO no acepta cambios aunque el cierre no haya pasado'
);
select throws_ok(
  $$ insert into public.prediccion (partido_id, resultado)
     values ((select id from public.partido where proveedor_id = 9013), 'LOCAL') $$,
  'P0001', 'PREDICCIONES_CERRADAS',
  'F03 CA4: un partido TERMINADO no acepta cambios'
);
select throws_ok(
  $$ insert into public.prediccion (partido_id, resultado)
     values ((select id from public.partido where proveedor_id = 9014), 'LOCAL') $$,
  'P0001', 'PREDICCIONES_CERRADAS',
  'F03 CA4: un partido CANCELADO no acepta cambios'
);

-- CA5: pospuestos.
select lives_ok(
  $$ insert into public.prediccion (partido_id, resultado)
     values ((select id from public.partido where proveedor_id = 9015), 'EMPATE') $$,
  'F03 CA5: un pospuesto antes del cierre acepta una predicción'
);
select lives_ok(
  $$ update public.prediccion set rango_goles = 'G3', resultado = null
     where partido_id = (select id from public.partido where proveedor_id = 9015) $$,
  'F03 CA5: y la deja editar hasta su nuevo cierre'
);
select lives_ok(
  $$ delete from public.prediccion
     where partido_id = (select id from public.partido where proveedor_id = 9015) $$,
  'F03 CA5: y la deja quitar (decisión 1, D90)'
);
select throws_ok(
  $$ insert into public.prediccion (partido_id, resultado)
     values ((select id from public.partido where proveedor_id = 9016), 'LOCAL') $$,
  'P0001', 'PREDICCIONES_CERRADAS',
  'F03 CA5: un pospuesto cuyo cierre no se movió sigue cerrado (D46)'
);

-- F04 R1: el servidor recorta y valida la justificación.
select lives_ok(
  $$ update public.prediccion set justificacion = repeat('a', 500)
     where partido_id = (select id from public.partido where proveedor_id = 9002) $$,
  'F04 CA1: guarda una justificación de 500 caracteres'
);
select throws_ok(
  $$ update public.prediccion set justificacion = repeat('a', 501)
     where partido_id = (select id from public.partido where proveedor_id = 9002) $$,
  '23514', null,
  'F04 CA1: rechaza una justificación de 501 caracteres'
);
select results_eq(
  $$ update public.prediccion set justificacion = E'  \n Gana el local.\t '
     where partido_id = (select id from public.partido where proveedor_id = 9002)
     returning justificacion $$,
  $$ values ('Gana el local.') $$,
  'F04 CA2: recorta los espacios al inicio y al final'
);
select results_eq(
  $$ update public.prediccion set justificacion = E'   \n  '
     where partido_id = (select id from public.partido where proveedor_id = 9002)
     returning justificacion $$,
  $$ values (null::text) $$,
  'F04 CA2: una justificación de solo espacios se guarda como null'
);

-- F04 CA3/CA4: la justificación sigue los permisos y el cierre de la predicción.
select is_empty(
  $$ select justificacion from public.prediccion
     where usuario_id = '00000000-0000-0000-0000-00000000000b' $$,
  'F04 CA3: sin grupo en común, A no lee la justificación de B (R04)'
);
select throws_ok(
  $$ update public.prediccion set justificacion = 'Cambio de opinión'
     where partido_id = (select id from public.partido where proveedor_id = 9020) $$,
  'P0001', 'PREDICCIONES_CERRADAS',
  'F04 CA4: no edita la justificación después del cierre'
);
select throws_ok(
  $$ update public.prediccion set justificacion = null
     where partido_id = (select id from public.partido where proveedor_id = 9020) $$,
  'P0001', 'PREDICCIONES_CERRADAS',
  'F04 CA4: no quita la justificación después del cierre'
);
select throws_ok(
  $$ insert into public.prediccion (partido_id, resultado, justificacion)
     values ((select id from public.partido where proveedor_id = 9010), 'LOCAL', 'Tarde.') $$,
  'P0001', 'PREDICCIONES_CERRADAS',
  'F04 CA4: no guarda una justificación justo a la hora del cierre'
);

-- CA6: predicciones de otro usuario.
select is_empty(
  $$ select id from public.prediccion where usuario_id = '00000000-0000-0000-0000-00000000000b' $$,
  'F03 CA6: sin grupo en común, A no lee las predicciones de B (R04)'
);
select throws_ok(
  $$ insert into public.prediccion (usuario_id, partido_id, resultado)
     values ('00000000-0000-0000-0000-00000000000b',
       (select id from public.partido where proveedor_id = 9005), 'LOCAL') $$,
  '42501', null,
  'F03 CA6: A no crea una predicción con el usuario_id de B'
);
select is_empty(
  $$ update public.prediccion set resultado = 'EMPATE'
     where usuario_id = '00000000-0000-0000-0000-00000000000b' returning id $$,
  'F03 CA6: A no modifica las predicciones de B'
);
select is_empty(
  $$ delete from public.prediccion
     where usuario_id = '00000000-0000-0000-0000-00000000000b' returning id $$,
  'F03 CA6: A no quita las predicciones de B'
);
select throws_ok(
  $$ update public.prediccion set partido_id = (select id from public.partido where proveedor_id = 9005)
     where partido_id = (select id from public.partido where proveedor_id = 9003) $$,
  'P0001', 'PREDICCION_INMUTABLE',
  'F03 CA6: nadie cambia el partido_id de una predicción'
);
select throws_ok(
  $$ update public.prediccion set usuario_id = '00000000-0000-0000-0000-00000000000b'
     where partido_id = (select id from public.partido where proveedor_id = 9003) $$,
  '42501', null,
  'F03 R4: A no cambia el usuario_id de su predicción'
);
select throws_ok(
  $$ update public.prediccion set creada_en = now() - interval '1 day'
     where partido_id = (select id from public.partido where proveedor_id = 9003) $$,
  '42501', null,
  'F03 R4: A no cambia las fechas de su predicción'
);
select results_eq(
  $$ select count(*)::int from public.prediccion $$,
  $$ values (5) $$,
  'F03 R5: A lee solo sus predicciones'
);

-- ---------------------------------------------------------------------------
-- Como el administrador C
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';

select is_empty(
  $$ select id from public.prediccion $$,
  'F03 CA6: sin grupo en común, el administrador no lee predicciones ajenas (R04)'
);
select is_empty(
  $$ update public.prediccion set resultado = 'EMPATE' returning id $$,
  'F03 CA6: el administrador no modifica predicciones ajenas'
);
select is_empty(
  $$ select justificacion from public.prediccion where justificacion is not null $$,
  'F04 CA3: sin grupo en común, el administrador no lee justificaciones ajenas (R04)'
);

-- ---------------------------------------------------------------------------
-- Como anon
-- ---------------------------------------------------------------------------

reset request.jwt.claims;
set local role anon;

select throws_ok(
  $$ select id from public.prediccion $$,
  '42501', null,
  'F03 CA6: anon no lee predicciones'
);
select throws_ok(
  $$ insert into public.prediccion (partido_id, resultado)
     values ((select id from public.partido where proveedor_id = 9001), 'LOCAL') $$,
  '42501', null,
  'F03 CA6: anon no crea predicciones'
);

-- ---------------------------------------------------------------------------
-- Eliminar una cuenta (como postgres)
-- ---------------------------------------------------------------------------

reset role;

select lives_ok(
  $$ delete from auth.users where id = '00000000-0000-0000-0000-00000000000b' $$,
  'F03 CA4: eliminar una cuenta con predicciones cerradas no falla'
);
select is_empty(
  $$ select id from public.prediccion where usuario_id = '00000000-0000-0000-0000-00000000000b' $$,
  'F03 CA4: y borra sus predicciones, también las cerradas'
);
select results_eq(
  $$ select count(*)::int from public.prediccion
     where partido_id = (select id from public.partido where proveedor_id = 9020) $$,
  $$ values (1) $$,
  'F03 CA4: las predicciones cerradas de otros usuarios siguen ahí'
);

select * from finish();
rollback;
