-- T06 — Usuario (03-data-model §2, F01).
-- Ligado a la autenticación de Supabase: se crea solo en el primer inicio de sesión con
-- los datos del token de Google ya validado (V1) y actualiza nombre y foto en cada inicio (Q1).
-- Cada usuario ve solo su registro (V3); de los demás, solo la vista `usuario_publico`.

-- ---------------------------------------------------------------------------
-- Tabla
-- ---------------------------------------------------------------------------

create type public.rol_usuario as enum ('USUARIO', 'ADMIN');

create table public.usuario (
  id uuid primary key references auth.users (id) on delete cascade,
  google_id text not null unique, -- V2
  nombre text not null,
  correo text not null,
  foto_url text,
  equipo_favorito_id bigint references public.equipo (id), -- F18
  rol public.rol_usuario not null default 'USUARIO', -- ADMIN se asigna a mano (Q4)
  recordatorios_activos boolean not null default true, -- F11 (Q2)
  creado_en timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Creación y actualización automáticas desde auth.users
-- ---------------------------------------------------------------------------

-- Primer inicio de sesión. Solo cuentas de Google: cualquier otro proveedor hace fallar
-- la creación de la cuenta (F01 §13).
create function public.crear_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  datos jsonb := new.raw_user_meta_data;
  id_google text := coalesce(datos ->> 'provider_id', datos ->> 'sub');
begin
  if new.raw_app_meta_data ->> 'provider' is distinct from 'google' or id_google is null then
    raise exception 'Solo se permite iniciar sesión con Google (F01).';
  end if;

  insert into public.usuario (id, google_id, nombre, correo, foto_url)
  values (
    new.id,
    id_google,
    coalesce(
      nullif(datos ->> 'full_name', ''),
      nullif(datos ->> 'name', ''),
      split_part(new.email, '@', 1)
    ),
    new.email,
    coalesce(datos ->> 'avatar_url', datos ->> 'picture')
  );
  return new;
end;
$$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_usuario();

-- Q1: Supabase actualiza los datos de Google en cada inicio de sesión; se copian nombre y foto.
create function public.actualizar_usuario_desde_google()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  datos jsonb := new.raw_user_meta_data;
begin
  update public.usuario
  set
    nombre = coalesce(nullif(datos ->> 'full_name', ''), nullif(datos ->> 'name', ''), nombre),
    foto_url = coalesce(datos ->> 'avatar_url', datos ->> 'picture')
  where id = new.id;
  return new;
end;
$$;

create trigger al_actualizar_datos_google
  after update of raw_user_meta_data on auth.users
  for each row
  when (old.raw_user_meta_data is distinct from new.raw_user_meta_data)
  execute function public.actualizar_usuario_desde_google();

-- Solo las ejecutan los disparadores.
revoke execute on function public.crear_usuario() from public, anon, authenticated;
revoke execute on function public.actualizar_usuario_desde_google() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Seguridad: RLS + permisos explícitos
-- ---------------------------------------------------------------------------

alter table public.usuario enable row level security;

revoke all on table public.usuario from anon, authenticated;

-- V3: lectura de la fila propia (incluye correo y rol; S09 usa el rol para mostrar S10).
grant select on table public.usuario to authenticated;
-- V3/V4: el usuario solo modifica estas columnas; rol, correo, nombre y google_id no.
grant update (recordatorios_activos, equipo_favorito_id) on table public.usuario to authenticated;

grant select, insert, update, delete on table public.usuario to service_role;

create policy "Cada usuario lee su propio registro"
  on public.usuario for select to authenticated
  using (id = (select auth.uid()));

create policy "Cada usuario modifica su propio registro"
  on public.usuario for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Vista pública (V3: de otros usuarios solo nombre, foto y equipo; rankings y S13)
-- ---------------------------------------------------------------------------

-- Intencional: corre con los permisos de su dueño (security_invoker = false), así muestra
-- estas 4 columnas de todos los usuarios sin abrir la tabla. El asesor de Supabase la marca
-- como "security definer view"; no exponer aquí ninguna otra columna.
-- Muestra a todos los usuarios autenticados; si se restringe a quienes comparten grupo, se
-- cambia en F07.
create view public.usuario_publico
with (security_invoker = false)
as
  select id, nombre, foto_url, equipo_favorito_id
  from public.usuario;

revoke all on table public.usuario_publico from anon, authenticated;
grant select on table public.usuario_publico to authenticated;
