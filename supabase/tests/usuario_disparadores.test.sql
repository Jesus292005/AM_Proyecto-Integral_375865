-- T14 — Disparadores de `usuario` (T06): creación al primer inicio de sesión (F01 CA1, V1),
-- un registro por cuenta de Google (CA2, V2), solo Google (F01 §13) y Q1.
-- Supabase inserta y actualiza `auth.users` con los datos del token de Google ya validado;
-- aquí se simula con inserciones directas. Todo se deshace al final.
begin;

select plan(21);

-- ---------------------------------------------------------------------------
-- CA1: el primer inicio de sesión crea el usuario
-- ---------------------------------------------------------------------------

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
values (
  '00000000-0000-0000-0000-0000000000c1',
  'carlos@example.com',
  '{"provider": "google"}',
  '{"provider_id": "google-c1", "full_name": "Carlos Pérez", "avatar_url": "https://example.com/c1.png"}'
);

select results_eq(
  $$ select google_id, nombre, correo, foto_url, rol::text, recordatorios_activos
     from public.usuario where id = '00000000-0000-0000-0000-0000000000c1' $$,
  $$ values ('google-c1', 'Carlos Pérez', 'carlos@example.com', 'https://example.com/c1.png',
             'USUARIO', true) $$,
  'CA1: crea el usuario con googleId, nombre, correo, foto, rol USUARIO y recordatorios (Q2)'
);
select isnt(
  (select creado_en from public.usuario where id = '00000000-0000-0000-0000-0000000000c1'),
  null,
  'CA1: guarda la fecha de creación'
);
select is(
  (select equipo_favorito_id from public.usuario where id = '00000000-0000-0000-0000-0000000000c1'),
  null,
  'Sin equipo favorito al inicio (F18)'
);

-- Variantes de los nombres de campo que puede mandar Supabase (sub / name / picture).
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
values (
  '00000000-0000-0000-0000-0000000000c2',
  'diana@example.com',
  '{"provider": "google"}',
  '{"sub": "google-c2", "name": "Diana", "picture": "https://example.com/c2.png"}'
);

select results_eq(
  $$ select google_id, nombre, foto_url from public.usuario
     where id = '00000000-0000-0000-0000-0000000000c2' $$,
  $$ values ('google-c2', 'Diana', 'https://example.com/c2.png') $$,
  'Usa sub, name y picture si no vienen provider_id, full_name y avatar_url'
);

-- Sin nombre de Google: la parte del correo antes de la @ (T06 #5).
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
values (
  '00000000-0000-0000-0000-0000000000c3',
  'sin.nombre@example.com',
  '{"provider": "google"}',
  '{"provider_id": "google-c3", "full_name": ""}'
);

select results_eq(
  $$ select nombre, foto_url from public.usuario where id = '00000000-0000-0000-0000-0000000000c3' $$,
  $$ values ('sin.nombre', null::text) $$,
  'Sin nombre de Google usa la parte del correo antes de la @; sin foto queda vacía'
);

-- ---------------------------------------------------------------------------
-- CA2 / V2: una cuenta de Google, un usuario
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
     values ('00000000-0000-0000-0000-0000000000c4', 'otra@example.com', '{"provider": "google"}',
             '{"provider_id": "google-c1", "full_name": "Duplicado"}') $$,
  '23505', null,
  'V2: una segunda cuenta con el mismo googleId se rechaza'
);
select is(
  (select count(*)::int from public.usuario where google_id = 'google-c1'),
  1,
  'CA2: sigue habiendo un solo usuario con ese googleId'
);

-- ---------------------------------------------------------------------------
-- Solo cuentas de Google (F01 §13)
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
     values ('00000000-0000-0000-0000-0000000000c5', 'correo@example.com', '{"provider": "email"}',
             '{}') $$,
  'P0001', 'Solo se permite iniciar sesión con Google (F01).',
  'Una cuenta de correo no se puede crear'
);
select throws_ok(
  $$ insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
     values ('00000000-0000-0000-0000-0000000000c6', 'sinid@example.com', '{"provider": "google"}',
             '{"full_name": "Sin id"}') $$,
  'P0001', 'Solo se permite iniciar sesión con Google (F01).',
  'Una cuenta de Google sin id de Google no se puede crear'
);
select is(
  (select count(*)::int from auth.users
   where id in ('00000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-0000000000c6')),
  0,
  'Las cuentas rechazadas no quedan en auth.users'
);

-- ---------------------------------------------------------------------------
-- Q1: nombre y foto se actualizan desde Google en cada inicio de sesión
-- ---------------------------------------------------------------------------

update auth.users
set
  email = 'carlos.nuevo@example.com',
  raw_user_meta_data =
    '{"provider_id": "google-c1", "full_name": "Carlos P.", "avatar_url": "https://example.com/c1-nueva.png"}'
where id = '00000000-0000-0000-0000-0000000000c1';

select results_eq(
  $$ select nombre, foto_url from public.usuario where id = '00000000-0000-0000-0000-0000000000c1' $$,
  $$ values ('Carlos P.', 'https://example.com/c1-nueva.png') $$,
  'Q1: actualiza nombre y foto'
);
select is(
  (select correo from public.usuario where id = '00000000-0000-0000-0000-0000000000c1'),
  'carlos@example.com',
  'Q1: el correo no se actualiza'
);

-- Si Google deja de mandar el nombre se conserva el anterior; la foto sigue lo que mande Google.
update auth.users
set raw_user_meta_data = '{"provider_id": "google-c1"}'
where id = '00000000-0000-0000-0000-0000000000c1';

select results_eq(
  $$ select nombre, foto_url from public.usuario where id = '00000000-0000-0000-0000-0000000000c1' $$,
  $$ values ('Carlos P.', null::text) $$,
  'Q1: sin nombre de Google conserva el anterior; sin foto la quita'
);

-- Otros cambios en auth.users (p. ej. el último inicio de sesión) no tocan usuario.
update public.usuario set nombre = 'Cambio manual' where id = '00000000-0000-0000-0000-0000000000c2';
update auth.users set last_sign_in_at = now() where id = '00000000-0000-0000-0000-0000000000c2';

select is(
  (select nombre from public.usuario where id = '00000000-0000-0000-0000-0000000000c2'),
  'Cambio manual',
  'Cambios sin datos de Google nuevos no actualizan usuario'
);

-- Los cambios del usuario (F11, F18) sobreviven a un nuevo inicio de sesión.
update public.usuario set recordatorios_activos = false
where id = '00000000-0000-0000-0000-0000000000c2';
update auth.users
set raw_user_meta_data = '{"sub": "google-c2", "name": "Diana R."}'
where id = '00000000-0000-0000-0000-0000000000c2';

select results_eq(
  $$ select nombre, recordatorios_activos, rol::text from public.usuario
     where id = '00000000-0000-0000-0000-0000000000c2' $$,
  $$ values ('Diana R.', false, 'USUARIO') $$,
  'Un nuevo inicio de sesión no toca recordatorios ni rol'
);

-- ---------------------------------------------------------------------------
-- Borrado de la cuenta (B18): borra también el usuario
-- ---------------------------------------------------------------------------

delete from auth.users where id = '00000000-0000-0000-0000-0000000000c3';

select is_empty(
  $$ select id from public.usuario where id = '00000000-0000-0000-0000-0000000000c3' $$,
  'Borrar la cuenta de auth.users borra su usuario'
);

-- ---------------------------------------------------------------------------
-- Las funciones de los disparadores no se pueden llamar desde la app
-- ---------------------------------------------------------------------------

select ok(
  not has_function_privilege('authenticated', 'public.crear_usuario()', 'execute'),
  'authenticated no ejecuta crear_usuario'
);
select ok(
  not has_function_privilege('anon', 'public.crear_usuario()', 'execute'),
  'anon no ejecuta crear_usuario'
);
select ok(
  not has_function_privilege('authenticated', 'public.actualizar_usuario_desde_google()', 'execute'),
  'authenticated no ejecuta actualizar_usuario_desde_google'
);
select ok(
  not has_function_privilege('anon', 'public.actualizar_usuario_desde_google()', 'execute'),
  'anon no ejecuta actualizar_usuario_desde_google'
);
select is(
  (select count(*)::int from public.usuario),
  2,
  'Quedan los 2 usuarios esperados'
);

select * from finish();
rollback;
