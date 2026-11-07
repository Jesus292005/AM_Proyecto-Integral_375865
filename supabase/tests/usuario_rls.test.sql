-- T14 — RLS y permisos de `usuario` y `usuario_publico` (F01 CA7, V3, V4, V6). Desde T65 (P-26,
-- D97): nadie lee `correo` por la API y `usuario_publico` solo muestra a quienes comparten grupo.
-- Dos usuarios de Google (A y B); cada prueba actúa como uno de ellos con su token simulado.
-- Todo corre dentro de una transacción que se deshace al final.
begin;

select plan(31);

-- ---------------------------------------------------------------------------
-- Datos de prueba (como postgres)
-- ---------------------------------------------------------------------------

insert into public.equipo (proveedor_id, nombre, nombre_corto, escudo_url)
values (999001, 'Equipo de Prueba', 'PRU', 'https://example.com/escudo.png');

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
values
  (
    '00000000-0000-0000-0000-00000000000a',
    'a@example.com',
    '{"provider": "google"}',
    '{"provider_id": "google-a", "full_name": "Usuario A"}'
  ),
  (
    '00000000-0000-0000-0000-00000000000b',
    'b@example.com',
    '{"provider": "google"}',
    '{"provider_id": "google-b", "full_name": "Usuario B"}'
  );

-- ---------------------------------------------------------------------------
-- Como el usuario A
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

-- V3: solo su propio registro.
select results_eq(
  $$ select id from public.usuario $$,
  $$ values ('00000000-0000-0000-0000-00000000000a'::uuid) $$,
  'A solo ve su propio registro en usuario'
);
select throws_ok(
  $$ select correo from public.usuario where id = '00000000-0000-0000-0000-00000000000a' $$,
  '42501', null,
  'F07 CA8: nadie lee correo por la API, tampoco el propio (P-26, D97)'
);
select is(
  (select rol::text from public.usuario where id = '00000000-0000-0000-0000-00000000000a'),
  'USUARIO',
  'A lee su propio rol (S09 lo usa para mostrar S10)'
);
-- CA7: no puede leer el correo de otro usuario.
select throws_ok(
  $$ select correo from public.usuario where id = '00000000-0000-0000-0000-00000000000b' $$,
  '42501', null,
  'CA7: A no puede leer el correo de B'
);

-- V4: columnas que el usuario sí modifica (F11, F18), solo en su fila.
select lives_ok(
  $$ update public.usuario set recordatorios_activos = false
     where id = '00000000-0000-0000-0000-00000000000a' $$,
  'A cambia sus recordatorios'
);
select lives_ok(
  $$ update public.usuario
     set equipo_favorito_id = (select id from public.equipo where proveedor_id = 999001)
     where id = '00000000-0000-0000-0000-00000000000a' $$,
  'A cambia su equipo favorito'
);

-- CA7 / V4: no puede cambiar su propio rol ni sus datos de Google.
select throws_ok(
  $$ update public.usuario set rol = 'ADMIN' where id = '00000000-0000-0000-0000-00000000000a' $$,
  '42501', null,
  'CA7: A no puede cambiar su propio rol'
);
select throws_ok(
  $$ update public.usuario set correo = 'otro@example.com'
     where id = '00000000-0000-0000-0000-00000000000a' $$,
  '42501', null,
  'V4: A no puede cambiar su correo'
);
select throws_ok(
  $$ update public.usuario set nombre = 'Otro nombre'
     where id = '00000000-0000-0000-0000-00000000000a' $$,
  '42501', null,
  'V4: A no puede cambiar su nombre'
);
select throws_ok(
  $$ update public.usuario set foto_url = 'https://example.com/otra.png'
     where id = '00000000-0000-0000-0000-00000000000a' $$,
  '42501', null,
  'V4: A no puede cambiar su foto'
);
select throws_ok(
  $$ update public.usuario set google_id = 'google-b'
     where id = '00000000-0000-0000-0000-00000000000a' $$,
  '42501', null,
  'V2/V4: A no puede cambiar su google_id'
);
select throws_ok(
  $$ update public.usuario set id = '00000000-0000-0000-0000-00000000000b'
     where id = '00000000-0000-0000-0000-00000000000a' $$,
  '42501', null,
  'A no puede cambiar su id'
);

-- CA7: no puede modificar el registro de otro usuario (la fila de B no existe para A).
select is_empty(
  $$ update public.usuario set recordatorios_activos = false
     where id = '00000000-0000-0000-0000-00000000000b' returning id $$,
  'CA7: A no modifica los recordatorios de B'
);
select is_empty(
  $$ update public.usuario set equipo_favorito_id = null
     where id = '00000000-0000-0000-0000-00000000000b' returning id $$,
  'CA7: A no modifica el equipo de B'
);

-- Los registros solo los crean y borran los disparadores y el servidor.
select throws_ok(
  $$ insert into public.usuario (id, google_id, nombre, correo)
     values ('00000000-0000-0000-0000-00000000000c', 'google-c', 'Intruso', 'c@example.com') $$,
  '42501', null,
  'A no puede crear registros de usuario'
);
select throws_ok(
  $$ delete from public.usuario where id = '00000000-0000-0000-0000-00000000000a' $$,
  '42501', null,
  'A no puede borrar su registro'
);
select throws_ok(
  $$ delete from public.usuario where id = '00000000-0000-0000-0000-00000000000b' $$,
  '42501', null,
  'CA7: A no puede borrar el registro de B'
);

-- V3: de los demás solo nombre, foto y equipo, por la vista pública.
select results_eq(
  $$ select nombre from public.usuario_publico order by nombre $$,
  $$ values ('Usuario A') $$,
  'F07 CA8: sin grupo en común, A solo se ve a sí mismo en usuario_publico'
);
select throws_ok(
  $$ select correo from public.usuario_publico $$,
  '42703', null,
  'V3: usuario_publico no expone el correo'
);
select throws_ok(
  $$ update public.usuario_publico set nombre = 'Otro'
     where id = '00000000-0000-0000-0000-00000000000b' $$,
  '42501', null,
  'A no puede modificar la vista pública'
);

-- ---------------------------------------------------------------------------
-- Como el usuario B (simétrico)
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';

select results_eq(
  $$ select id from public.usuario $$,
  $$ values ('00000000-0000-0000-0000-00000000000b'::uuid) $$,
  'B solo ve su propio registro en usuario'
);

-- ---------------------------------------------------------------------------
-- Sin sesión (anon, V6)
-- ---------------------------------------------------------------------------

reset role;
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok(
  $$ select * from public.usuario $$,
  '42501', null,
  'V6: anon no lee usuario'
);
select throws_ok(
  $$ select * from public.usuario_publico $$,
  '42501', null,
  'V6: anon no lee usuario_publico'
);
select throws_ok(
  $$ update public.usuario set rol = 'ADMIN' $$,
  '42501', null,
  'V6: anon no modifica usuario'
);

-- ---------------------------------------------------------------------------
-- Resultado en la base (como postgres)
-- ---------------------------------------------------------------------------

reset role;

select columns_are(
  'public', 'usuario_publico',
  array['id', 'nombre', 'foto_url', 'equipo_favorito_id'],
  'F07 CA8: usuario_publico solo tiene id, nombre, foto y equipo (V3)'
);
select is(
  (select rol::text from public.usuario where id = '00000000-0000-0000-0000-00000000000a'),
  'USUARIO',
  'El rol de A sigue siendo USUARIO'
);
select is(
  (select correo from public.usuario where id = '00000000-0000-0000-0000-00000000000a'),
  'a@example.com',
  'El correo de A no cambió'
);
select is(
  (select recordatorios_activos from public.usuario where id = '00000000-0000-0000-0000-00000000000a'),
  false,
  'Los recordatorios de A sí cambiaron'
);
select is(
  (select equipo_favorito_id from public.usuario where id = '00000000-0000-0000-0000-00000000000a'),
  (select id from public.equipo where proveedor_id = 999001),
  'El equipo favorito de A sí cambió'
);
select is(
  (select recordatorios_activos from public.usuario where id = '00000000-0000-0000-0000-00000000000b'),
  true,
  'Los recordatorios de B no cambiaron'
);
select is(
  (select count(*)::int from public.usuario),
  2,
  'Sigue habiendo exactamente 2 usuarios'
);

select * from finish();
rollback;
