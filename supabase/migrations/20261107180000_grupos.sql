-- T64 — Grupos privados (F07): tablas, código de invitación (R2), crear / unirse / salir (R3–R5),
-- ayudas para las RLS y permisos (R12). `authenticated` solo lee; toda escritura pasa por las
-- tres funciones `security definer`, que usan `auth.uid()` como único usuario posible.
-- Límites de la decisión 2 (D97): 30 miembros por grupo y 10 grupos por usuario.

-- ---------------------------------------------------------------------------
-- Tipos y tablas
-- ---------------------------------------------------------------------------

create type public.rol_grupo as enum ('ADMIN', 'MIEMBRO');

create table public.grupo (
  id bigint generated always as identity primary key,
  nombre text not null check (char_length(nombre) between 3 and 30), -- R1, ya recortado
  -- R2: forma canónica, sin guion (la app lo muestra como ABCD-EFGH). 31 caracteres sin 0 O 1 I L.
  codigo_invitacion text not null unique check (codigo_invitacion ~ '^[2-9A-HJKMNP-Z]{8}$'),
  creador_id uuid references public.usuario (id) on delete set null,
  creado_en timestamptz not null default now()
);

create table public.miembro_grupo (
  grupo_id bigint not null references public.grupo (id) on delete cascade,
  usuario_id uuid not null references public.usuario (id) on delete cascade,
  rol public.rol_grupo not null default 'MIEMBRO',
  unido_en timestamptz not null default now(),
  primary key (grupo_id, usuario_id)
);

-- "Mis grupos" y `comparte_grupo` buscan por usuario.
create index miembro_grupo_usuario_idx on public.miembro_grupo (usuario_id);

-- ---------------------------------------------------------------------------
-- Código de invitación (R2)
-- ---------------------------------------------------------------------------

-- Bytes criptográficos; se descartan los ≥ 248 (= 8 × 31) para que cada carácter tenga la misma
-- probabilidad. 31⁸ ≈ 8.5 × 10¹¹ combinaciones.
create function public.generar_codigo_invitacion()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alfabeto constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  codigo text := '';
  bytes bytea;
  b integer;
begin
  while char_length(codigo) < 8 loop
    bytes := extensions.gen_random_bytes(16);
    for i in 0..15 loop
      b := get_byte(bytes, i);
      if b < 248 and char_length(codigo) < 8 then
        codigo := codigo || substr(alfabeto, b % 31 + 1, 1);
      end if;
    end loop;
  end loop;
  return codigo;
end;
$$;

-- Ignora mayúsculas y minúsculas, guiones y espacios (R2).
create function public.normalizar_codigo_invitacion(codigo text)
returns text
language sql
immutable
set search_path = ''
as $$
  select upper(regexp_replace(coalesce(codigo, ''), '[[:space:]-]', '', 'g'));
$$;

-- ---------------------------------------------------------------------------
-- Ayudas para las RLS (evitan la recursión de políticas sobre `miembro_grupo`)
-- ---------------------------------------------------------------------------

create function public.es_miembro(id_grupo bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.miembro_grupo
    where grupo_id = id_grupo and usuario_id = (select auth.uid())
  );
$$;

-- R04 / R12: ¿comparto al menos un grupo con `otro`? (F07 R6, R8)
create function public.comparte_grupo(otro uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.miembro_grupo as yo
    join public.miembro_grupo as el on el.grupo_id = yo.grupo_id
    where yo.usuario_id = (select auth.uid()) and el.usuario_id = otro
  );
$$;

-- ---------------------------------------------------------------------------
-- Crear (R1, R3)
-- ---------------------------------------------------------------------------

create function public.crear_grupo(nombre text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  yo uuid := auth.uid();
  limpio text := regexp_replace(coalesce(nombre, ''), '^\s+|\s+$', '', 'g');
  id_grupo bigint;
  intentos integer := 0;
begin
  if yo is null then
    raise exception 'SIN_SESION';
  end if;
  if char_length(limpio) not between 3 and 30 then
    raise exception 'NOMBRE_INVALIDO';
  end if;

  -- Un usuario a la vez: dos llamadas simultáneas no pasan juntas el límite.
  perform 1 from public.usuario where id = yo for update;
  if (select count(*) from public.miembro_grupo where usuario_id = yo) >= 10 then
    raise exception 'LIMITE_GRUPOS';
  end if;

  loop
    begin
      insert into public.grupo (nombre, codigo_invitacion, creador_id)
      values (limpio, public.generar_codigo_invitacion(), yo)
      returning id into id_grupo;
      exit;
    exception when unique_violation then
      intentos := intentos + 1;
      if intentos >= 5 then
        raise;
      end if;
    end;
  end loop;

  insert into public.miembro_grupo (grupo_id, usuario_id, rol) values (id_grupo, yo, 'ADMIN');
  return id_grupo;
end;
$$;

-- ---------------------------------------------------------------------------
-- Unirse (R4): el mismo camino para el código escrito y el QR (F12)
-- ---------------------------------------------------------------------------

create function public.unirse_grupo(codigo text)
returns table (grupo_id bigint, ya_era_miembro boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  yo uuid := auth.uid();
  normal text := public.normalizar_codigo_invitacion(codigo);
  id_grupo bigint;
begin
  if yo is null then
    raise exception 'SIN_SESION';
  end if;
  if normal !~ '^[2-9A-HJKMNP-Z]{8}$' then
    raise exception 'CODIGO_INVALIDO';
  end if;

  -- Bloquea el grupo: dos uniones simultáneas no pasan juntas el límite de miembros.
  select g.id into id_grupo from public.grupo as g where g.codigo_invitacion = normal for update;
  if id_grupo is null then
    raise exception 'CODIGO_NO_EXISTE';
  end if;

  if exists (
    select 1 from public.miembro_grupo as m where m.grupo_id = id_grupo and m.usuario_id = yo
  ) then
    return query select id_grupo, true;
    return;
  end if;

  perform 1 from public.usuario where id = yo for update;
  if (select count(*) from public.miembro_grupo as m where m.usuario_id = yo) >= 10 then
    raise exception 'LIMITE_GRUPOS';
  end if;
  if (select count(*) from public.miembro_grupo as m where m.grupo_id = id_grupo) >= 30 then
    raise exception 'GRUPO_LLENO';
  end if;

  insert into public.miembro_grupo (grupo_id, usuario_id) values (id_grupo, yo);
  return query select id_grupo, false;
end;
$$;

-- ---------------------------------------------------------------------------
-- Salir (R5, decisión 3 de D97)
-- ---------------------------------------------------------------------------

create function public.salir_grupo(id_grupo bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  yo uuid := auth.uid();
  rol_saliente public.rol_grupo;
begin
  if yo is null then
    raise exception 'SIN_SESION';
  end if;

  perform 1 from public.grupo where id = id_grupo for update;

  delete from public.miembro_grupo
  where grupo_id = id_grupo and usuario_id = yo
  returning rol into rol_saliente;
  if rol_saliente is null then
    raise exception 'NO_MIEMBRO';
  end if;

  -- El último en salir borra el grupo y su código.
  if not exists (select 1 from public.miembro_grupo where grupo_id = id_grupo) then
    delete from public.grupo where id = id_grupo;
    return;
  end if;

  -- Sin ningún ADMIN, el miembro más antiguo pasa a ADMIN.
  if not exists (
    select 1 from public.miembro_grupo where grupo_id = id_grupo and rol = 'ADMIN'
  ) then
    update public.miembro_grupo
    set rol = 'ADMIN'
    where grupo_id = id_grupo
      and usuario_id = (
        select usuario_id from public.miembro_grupo
        where grupo_id = id_grupo
        order by unido_en, usuario_id
        limit 1
      );
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Vistas para la app (F07 R9, R10)
-- ---------------------------------------------------------------------------

-- S04: mis grupos con su número de miembros.
create view public.mis_grupos
with (security_invoker = true)
as
select
  g.id,
  g.nombre,
  (select count(*) from public.miembro_grupo as todos where todos.grupo_id = g.id)::integer
    as miembros,
  m.rol,
  m.unido_en
from public.miembro_grupo as m
join public.grupo as g on g.id = m.grupo_id
where m.usuario_id = (select auth.uid());

-- S08: miembros de un grupo con su nombre y foto (de `usuario_publico`).
create view public.miembros_grupo
with (security_invoker = true)
as
select
  m.grupo_id,
  m.usuario_id,
  u.nombre,
  u.foto_url,
  m.rol,
  m.unido_en,
  m.usuario_id = (select auth.uid()) as es_yo
from public.miembro_grupo as m
join public.usuario_publico as u on u.id = m.usuario_id;

-- ---------------------------------------------------------------------------
-- Seguridad: RLS + permisos explícitos (R12)
-- ---------------------------------------------------------------------------

alter table public.grupo enable row level security;
alter table public.miembro_grupo enable row level security;

revoke all on table public.grupo, public.miembro_grupo from anon, authenticated;
revoke all on table public.mis_grupos, public.miembros_grupo from anon, authenticated;

grant select on table public.grupo, public.miembro_grupo to authenticated;
grant select on table public.mis_grupos, public.miembros_grupo to authenticated;
grant select, insert, update, delete on table public.grupo, public.miembro_grupo to service_role;

create policy "Los miembros leen su grupo"
  on public.grupo for select to authenticated
  using (public.es_miembro(id));

create policy "Los miembros leen a los miembros de su grupo"
  on public.miembro_grupo for select to authenticated
  using (public.es_miembro(grupo_id));

revoke execute on function public.generar_codigo_invitacion() from public, anon, authenticated;
revoke execute on function public.normalizar_codigo_invitacion(text) from public, anon, authenticated;
revoke execute on function public.es_miembro(bigint) from public, anon;
revoke execute on function public.comparte_grupo(uuid) from public, anon;
revoke execute on function public.crear_grupo(text) from public, anon;
revoke execute on function public.unirse_grupo(text) from public, anon;
revoke execute on function public.salir_grupo(bigint) from public, anon;

-- Las políticas evalúan las ayudas con el rol de quien consulta.
grant execute on function public.es_miembro(bigint) to authenticated;
grant execute on function public.comparte_grupo(uuid) to authenticated;
grant execute on function public.crear_grupo(text) to authenticated;
grant execute on function public.unirse_grupo(text) to authenticated;
grant execute on function public.salir_grupo(bigint) to authenticated;
