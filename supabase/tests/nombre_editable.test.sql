-- T91 — Nombre visible editable (F28 R4–R6, CA1, CA2; decisión 1 de D108). A cambia su nombre;
-- B no lo cambia. Todo se deshace al final.
begin;

select plan(15);

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
select ('00000000-0000-0000-0000-00000000000' || u)::uuid, u || '@example.com',
  '{"provider": "google"}',
  jsonb_build_object(
    'provider_id', 'google-' || u, 'full_name', 'Nombre Completo De ' || upper(u),
    'avatar_url', 'https://example.com/' || u || '.png'
  )
from unnest(array['a', 'b']) as u;

-- ---------------------------------------------------------------------------
-- CA1: como A
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

update public.usuario set nombre = '  Chucho   10 ' where id = '00000000-0000-0000-0000-00000000000a';
select is(
  (select nombre from public.usuario where id = '00000000-0000-0000-0000-00000000000a'),
  'Chucho 10',
  'F28 CA1: guarda el nombre sin espacios en los extremos y con los repetidos juntos'
);

select throws_ok(
  $$ update public.usuario set nombre = 'Al' where id = '00000000-0000-0000-0000-00000000000a' $$,
  'P0001', 'NOMBRE_INVALIDO',
  'F28 CA1: 2 caracteres es NOMBRE_INVALIDO'
);
select throws_ok(
  $$ update public.usuario set nombre = 'Ana#10' where id = '00000000-0000-0000-0000-00000000000a' $$,
  'P0001', 'NOMBRE_INVALIDO',
  'F28 CA1: un símbolo no permitido es NOMBRE_INVALIDO'
);
select throws_ok(
  $$ update public.usuario set nombre = 'abcdefghijklmnopqrstu' where id = '00000000-0000-0000-0000-00000000000a' $$,
  'P0001', 'NOMBRE_INVALIDO',
  'F28 CA1: 21 caracteres es NOMBRE_INVALIDO'
);
select throws_ok(
  $$ update public.usuario set nombre = '      ' where id = '00000000-0000-0000-0000-00000000000a' $$,
  'P0001', 'NOMBRE_INVALIDO',
  'F28 CA1: solo espacios es NOMBRE_INVALIDO'
);
select throws_ok(
  $$ update public.usuario set nombre = '...' where id = '00000000-0000-0000-0000-00000000000a' $$,
  'P0001', 'NOMBRE_INVALIDO',
  'F28 CA1: sin ninguna letra ni número es NOMBRE_INVALIDO'
);

update public.usuario set nombre = E'\tTab  Ana\n' where id = '00000000-0000-0000-0000-00000000000a';
select is(
  (select nombre from public.usuario where id = '00000000-0000-0000-0000-00000000000a'),
  'Tab Ana',
  'F28 CA1: tabuladores y saltos de línea en los extremos también se quitan'
);

update public.usuario set nombre = 'Ñoño_Águila-9.' where id = '00000000-0000-0000-0000-00000000000a';
select is(
  (select nombre from public.usuario where id = '00000000-0000-0000-0000-00000000000a'),
  'Ñoño_Águila-9.',
  'F28 CA1: acepta acentos, ñ, números, punto, guion y guion bajo'
);

update public.usuario set nombre = 'Intruso' where id = '00000000-0000-0000-0000-00000000000b';
select throws_ok(
  $$ update public.usuario set nombre_editado = false where id = '00000000-0000-0000-0000-00000000000a' $$,
  '42501', null,
  'F28 CA1: nadie escribe nombre_editado desde la API'
);
select throws_ok(
  $$ update public.usuario set rol = 'ADMIN' where id = '00000000-0000-0000-0000-00000000000a' $$,
  '42501', null,
  'F28 CA1: el rol sigue sin poder cambiarse (F01 V4)'
);

reset role;
select results_eq(
  $$ select nombre, nombre_editado from public.usuario where id = '00000000-0000-0000-0000-00000000000b' $$,
  $$ values ('Nombre Completo De B', false) $$,
  'F28 CA1: A no cambia el nombre de B'
);
select is(
  (select nombre_editado from public.usuario where id = '00000000-0000-0000-0000-00000000000a'),
  true,
  'F28 R5: cambiar el nombre propio marca nombre_editado'
);

-- ---------------------------------------------------------------------------
-- CA2: nuevo inicio de sesión con Google
-- ---------------------------------------------------------------------------

-- Desde D109 la copia sale de la identidad de Google (`auth.identities`).
insert into auth.identities (provider_id, user_id, identity_data, provider)
select 'google-' || u, ('00000000-0000-0000-0000-00000000000' || u)::uuid,
  jsonb_build_object('sub', 'google-' || u, 'full_name', 'Nombre Completo De ' || upper(u)), 'google'
from unnest(array['a', 'b']) as u;
update auth.identities
set identity_data = jsonb_build_object(
  'sub', provider_id,
  'full_name', 'Otro Nombre De Google',
  'avatar_url', 'https://example.com/nueva-' || right(user_id::text, 1) || '.png'
)
where user_id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');

select results_eq(
  $$ select nombre, foto_url from public.usuario where id = '00000000-0000-0000-0000-00000000000a' $$,
  $$ values ('Ñoño_Águila-9.', 'https://example.com/nueva-a.png') $$,
  'F28 CA2: con nombre editado, Google actualiza la foto pero no el nombre'
);
select results_eq(
  $$ select nombre, foto_url from public.usuario where id = '00000000-0000-0000-0000-00000000000b' $$,
  $$ values ('Otro Nombre De Google', 'https://example.com/nueva-b.png') $$,
  'F28 CA2: sin nombre editado, Google actualiza nombre y foto (F01 Q1); un nombre largo de Google sigue valiendo'
);

select ok(
  not has_function_privilege('authenticated', 'public.validar_nombre_propio()', 'execute'),
  'F28 R6: la API no ejecuta el disparador directamente'
);

select * from finish();
rollback;
