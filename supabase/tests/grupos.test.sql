-- T64 — Grupos (F07): crear (R1, R3), código (R2), unirse (R4), salir (R5), RLS y permisos (R12).
-- A, B y C usuarios normales; U1–U40 usuarios de relleno para los límites. Todo se deshace al final.
begin;

select plan(53);

-- ---------------------------------------------------------------------------
-- Datos de prueba (como postgres)
-- ---------------------------------------------------------------------------

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com', '{"provider": "google"}',
    '{"provider_id": "google-a", "full_name": "Usuario A"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com', '{"provider": "google"}',
    '{"provider_id": "google-b", "full_name": "Usuario B"}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@example.com', '{"provider": "google"}',
    '{"provider_id": "google-c", "full_name": "Usuario C"}');

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
select
  ('00000000-0000-0000-0001-' || lpad(n::text, 12, '0'))::uuid,
  'u' || n || '@example.com',
  '{"provider": "google"}',
  jsonb_build_object('provider_id', 'google-u' || n, 'full_name', 'Relleno ' || n)
from generate_series(1, 40) as n;

-- "Lleno": 30 miembros (U1–U30). U32 ya está en 10 grupos ("Diez 1"–"Diez 10").
insert into public.grupo (nombre, codigo_invitacion)
select 'Lleno', public.generar_codigo_invitacion();
insert into public.miembro_grupo (grupo_id, usuario_id)
select (select id from public.grupo where nombre = 'Lleno'),
  ('00000000-0000-0000-0001-' || lpad(n::text, 12, '0'))::uuid
from generate_series(1, 30) as n;

insert into public.grupo (nombre, codigo_invitacion)
select 'Diez ' || n, public.generar_codigo_invitacion() from generate_series(1, 10) as n;
insert into public.miembro_grupo (grupo_id, usuario_id)
select id, '00000000-0000-0000-0001-000000000032' from public.grupo where nombre like 'Diez %';

-- "Salida": A (ADMIN, el más antiguo), C y B, con fechas de unión distintas.
insert into public.grupo (nombre, codigo_invitacion)
select 'Salida', public.generar_codigo_invitacion();
insert into public.miembro_grupo (grupo_id, usuario_id, rol, unido_en)
select (select id from public.grupo where nombre = 'Salida'), m.usuario, m.rol::public.rol_grupo,
  now() - m.antes
from (values
  ('00000000-0000-0000-0000-00000000000a'::uuid, 'ADMIN', interval '3 days'),
  ('00000000-0000-0000-0000-00000000000c'::uuid, 'MIEMBRO', interval '2 days'),
  ('00000000-0000-0000-0000-00000000000b'::uuid, 'MIEMBRO', interval '1 day')
) as m (usuario, rol, antes);

-- Códigos a la mano para las pruebas que actúan como usuarios (no pueden leer grupos ajenos).
create temporary table codigos (id bigint, nombre text, codigo text) on commit drop;
grant select on codigos to authenticated;

-- ---------------------------------------------------------------------------
-- Código de invitación (R2)
-- ---------------------------------------------------------------------------

create temporary table muestra on commit drop as
select public.generar_codigo_invitacion() as codigo from generate_series(1, 1000);

select is(
  (select count(distinct codigo)::int from muestra),
  1000,
  'F07 CA2: 1,000 códigos generados no se repiten'
);
select is(
  (select count(*)::int from muestra where codigo ~ '^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$'),
  1000,
  'F07 CA2: todos tienen 8 caracteres del alfabeto sin 0 O 1 I L'
);
select is(
  public.normalizar_codigo_invitacion(' abcd-efgh '),
  'ABCDEFGH',
  'F07 R2: se ignoran mayúsculas, guiones y espacios'
);

-- ---------------------------------------------------------------------------
-- Crear (como A)
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select lives_ok(
  $$ select public.crear_grupo('   Amigos   ') $$,
  'F07 CA1: A crea un grupo con nombre válido'
);
select is(
  (select nombre from public.grupo where nombre like '%Amigos%'),
  'Amigos',
  'F07 CA1: el nombre se guarda recortado'
);
select results_eq(
  $$ select rol::text from public.miembro_grupo
     where grupo_id = (select id from public.grupo where nombre = 'Amigos') $$,
  $$ values ('ADMIN') $$,
  'F07 CA1: el creador es el único miembro y es ADMIN'
);
select lives_ok(
  $$ select public.crear_grupo(repeat('x', 30)) $$,
  'F07 CA1: 30 caracteres es válido'
);
select lives_ok(
  $$ select public.crear_grupo('Ola') $$,
  'F07 CA1: 3 caracteres es válido'
);
select throws_ok(
  $$ select public.crear_grupo('ab') $$,
  'P0001', 'NOMBRE_INVALIDO',
  'F07 CA1: 2 caracteres se rechaza'
);
select throws_ok(
  $$ select public.crear_grupo(repeat('x', 31)) $$,
  'P0001', 'NOMBRE_INVALIDO',
  'F07 CA1: 31 caracteres se rechaza'
);
select throws_ok(
  $$ select public.crear_grupo('      ') $$,
  'P0001', 'NOMBRE_INVALIDO',
  'F07 CA1: solo espacios se rechaza'
);
select throws_ok(
  $$ insert into public.grupo (nombre, codigo_invitacion) values ('Directo', 'ABCDEFGH') $$,
  '42501', null,
  'F07 CA5: nadie inserta directamente en grupo'
);
select throws_ok(
  $$ insert into public.miembro_grupo (grupo_id, usuario_id)
     values ((select id from public.grupo where nombre = 'Amigos'),
       '00000000-0000-0000-0000-00000000000b') $$,
  '42501', null,
  'F07 CA5: nadie inserta directamente en miembro_grupo'
);
select throws_ok(
  $$ update public.grupo set nombre = 'Otro' where nombre = 'Amigos' $$,
  '42501', null,
  'F07 CA5: nadie modifica directamente un grupo'
);
select throws_ok(
  $$ update public.miembro_grupo set rol = 'ADMIN' $$,
  '42501', null,
  'F07 CA5: nadie modifica directamente su rol en el grupo'
);
select throws_ok(
  $$ delete from public.miembro_grupo $$,
  '42501', null,
  'F07 CA5: nadie borra directamente en miembro_grupo'
);

reset role;
insert into codigos select id, nombre, codigo_invitacion from public.grupo;

-- ---------------------------------------------------------------------------
-- Unirse (como B y C)
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';

select is_empty(
  $$ select 1 from public.grupo where nombre = 'Amigos' $$,
  'F07 CA5: antes de unirse, B no lee el grupo'
);
select is_empty(
  $$ select 1 from public.miembro_grupo where grupo_id = (select id from codigos where nombre = 'Amigos') $$,
  'F07 CA5: antes de unirse, B no lee a los miembros'
);
select results_eq(
  $$ select ya_era_miembro from public.unirse_grupo(
       (select lower(substr(codigo, 1, 4) || '-' || substr(codigo, 5, 4)) from codigos where nombre = 'Amigos')) $$,
  $$ values (false) $$,
  'F07 CA3: B se une con el código en minúsculas y con guion'
);
select results_eq(
  $$ select ya_era_miembro from public.unirse_grupo(
       (select substr(codigo, 1, 4) || ' ' || substr(codigo, 5, 4) from codigos where nombre = 'Amigos')) $$,
  $$ values (true) $$,
  'F07 CA3: unirse otra vez (con espacio) responde que ya era miembro'
);
select is(
  (select count(*)::int from public.miembro_grupo
   where usuario_id = '00000000-0000-0000-0000-00000000000b'
     and grupo_id = (select id from public.grupo where nombre = 'Amigos')),
  1,
  'F07 CA3: unirse dos veces no duplica al miembro'
);
select is(
  (select codigo_invitacion from public.grupo where nombre = 'Amigos'),
  (select codigo from codigos where nombre = 'Amigos'),
  'F07 R2: ya como miembro, B lee el código del grupo'
);
select throws_ok(
  $$ select * from public.unirse_grupo('ABCDEFG') $$,
  'P0001', 'CODIGO_INVALIDO',
  'F07 CA3: un código de 7 caracteres se rechaza'
);
select throws_ok(
  $$ select * from public.unirse_grupo('ABCDEFGO') $$,
  'P0001', 'CODIGO_INVALIDO',
  'F07 CA3: un código con O se rechaza'
);
select throws_ok(
  $$ select * from public.unirse_grupo('ABCDEFG1') $$,
  'P0001', 'CODIGO_INVALIDO',
  'F07 CA3: un código con 1 se rechaza'
);
select throws_ok(
  $$ select * from public.unirse_grupo(
       (select case when codigo = 'ZZZZZZZZ' then 'YYYYYYYY' else 'ZZZZZZZZ' end
        from codigos where nombre = 'Amigos')) $$,
  'P0001', 'CODIGO_NO_EXISTE',
  'F07 CA3: un código con formato válido que no existe se rechaza'
);

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';

select results_eq(
  $$ select ya_era_miembro from public.unirse_grupo((select codigo from codigos where nombre = 'Amigos')) $$,
  $$ values (false) $$,
  'F07 CA3: C se une con el código canónico'
);
select results_eq(
  $$ select nombre, miembros, rol::text from public.mis_grupos order by nombre $$,
  $$ values ('Amigos', 3, 'MIEMBRO'), ('Salida', 3, 'MIEMBRO') $$,
  'F07 R9: mis_grupos de C trae sus grupos con el número de miembros'
);
select results_eq(
  $$ select nombre, es_yo from public.miembros_grupo
     where grupo_id = (select id from public.grupo where nombre = 'Amigos') order by nombre $$,
  $$ values ('Usuario A', false), ('Usuario B', false), ('Usuario C', true) $$,
  'F07 R10: miembros_grupo trae a los miembros con su nombre y quién soy yo'
);
select is_empty(
  $$ select 1 from public.grupo where nombre = 'Ola' $$,
  'F07 CA5: C no lee un grupo de A del que no es miembro'
);
select is_empty(
  $$ select 1 from public.miembros_grupo
     where grupo_id = (select id from codigos where nombre = 'Ola') $$,
  'F07 CA5: C no lee a los miembros de un grupo ajeno'
);

-- Límite de miembros (U31) y de grupos por usuario (U32).
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0001-000000000031", "role": "authenticated"}';

select throws_ok(
  $$ select * from public.unirse_grupo((select codigo from codigos where nombre = 'Lleno')) $$,
  'P0001', 'GRUPO_LLENO',
  'F07 CA3: el miembro 31 se rechaza'
);

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0001-000000000032", "role": "authenticated"}';

select throws_ok(
  $$ select public.crear_grupo('El once') $$,
  'P0001', 'LIMITE_GRUPOS',
  'F07 CA1: con 10 grupos no se crea el 11'
);
select throws_ok(
  $$ select * from public.unirse_grupo((select codigo from codigos where nombre = 'Amigos')) $$,
  'P0001', 'LIMITE_GRUPOS',
  'F07 CA3: con 10 grupos no se une al 11'
);
select results_eq(
  $$ select ya_era_miembro from public.unirse_grupo((select codigo from codigos where nombre = 'Diez 1')) $$,
  $$ values (true) $$,
  'F07 R4: en el límite, volver a unirse a un grupo propio no falla'
);

-- Sin grupos (U33): no ve nada.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0001-000000000033", "role": "authenticated"}';

select is_empty($$ select 1 from public.grupo $$, 'F07 CA5: sin grupos no se lee ningún grupo');
select is_empty($$ select 1 from public.miembro_grupo $$, 'F07 CA5: sin grupos no se lee ningún miembro');
select is_empty($$ select 1 from public.mis_grupos $$, 'F07 R9: sin grupos, mis_grupos está vacía');

-- ---------------------------------------------------------------------------
-- Salir (decisión 3 de D97)
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ select public.salir_grupo((select id from codigos where nombre = 'Amigos')) $$,
  'P0001', 'NO_MIEMBRO',
  'F07 CA4: salir de un grupo ajeno falla'
);

reset role;
create temporary table salida on commit drop as select id from public.grupo where nombre = 'Salida';
grant select on salida to authenticated;
set local role authenticated;

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}';
select lives_ok($$ select public.salir_grupo((select id from salida)) $$, 'F07 CA4: el ADMIN puede salir');
select is_empty(
  $$ select 1 from public.grupo where id = (select id from salida) $$,
  'F07 R5: al salir, A deja de leer el grupo'
);

reset role;
select results_eq(
  $$ select usuario_id, rol::text from public.miembro_grupo
     where grupo_id = (select id from salida) order by unido_en $$,
  $$ values ('00000000-0000-0000-0000-00000000000c'::uuid, 'ADMIN'),
            ('00000000-0000-0000-0000-00000000000b'::uuid, 'MIEMBRO') $$,
  'F07 CA4: sin ADMIN, el miembro más antiguo (C) pasa a ADMIN'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000c", "role": "authenticated"}';
select lives_ok($$ select public.salir_grupo((select id from salida)) $$, 'F07 CA4: C sale');

reset role;
select results_eq(
  $$ select rol::text from public.miembro_grupo where grupo_id = (select id from salida) $$,
  $$ values ('ADMIN') $$,
  'F07 CA4: B, el único que queda, pasa a ADMIN'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}';
select lives_ok($$ select public.salir_grupo((select id from salida)) $$, 'F07 CA4: el último miembro sale');

reset role;
select is_empty(
  $$ select 1 from public.grupo where id = (select id from salida) $$,
  'F07 CA4: al salir el último, el grupo se borra'
);

-- ---------------------------------------------------------------------------
-- Sin sesión (anon)
-- ---------------------------------------------------------------------------

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok($$ select * from public.grupo $$, '42501', null, 'F07 CA5: anon no lee grupo');
select throws_ok($$ select * from public.miembro_grupo $$, '42501', null, 'F07 CA5: anon no lee miembro_grupo');
select throws_ok($$ select * from public.mis_grupos $$, '42501', null, 'F07 CA5: anon no lee mis_grupos');
select throws_ok(
  $$ select public.crear_grupo('Anónimo') $$, '42501', null, 'F07 CA5: anon no crea grupos'
);
select throws_ok(
  $$ select * from public.unirse_grupo('ABCDEFGH') $$, '42501', null, 'F07 CA5: anon no se une'
);
select throws_ok(
  $$ select public.salir_grupo(1) $$, '42501', null, 'F07 CA5: anon no sale'
);
select throws_ok(
  $$ select public.comparte_grupo('00000000-0000-0000-0000-00000000000a') $$,
  '42501', null,
  'F07 CA5: anon no ejecuta comparte_grupo'
);

reset role;

select * from finish();
rollback;
