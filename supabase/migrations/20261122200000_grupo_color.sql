-- T115 — Color del grupo, editar grupo y líder en `mis_grupos` (F26 R2, R5, R6, R18; D113).
-- El color es uno de una paleta fija de 8 (R2); vacío = por defecto, el de la posición `id mod 8`,
-- para que los grupos no se vean iguales. La app siempre recibe un color resuelto.
-- Solo el `ADMIN` cambia nombre y color, con `editar_grupo` (`security definer`); nadie escribe
-- `grupo` directamente (F07 R12).

-- ---------------------------------------------------------------------------
-- Color (R2)
-- ---------------------------------------------------------------------------

-- El orden importa: el color por defecto es el de la posición `id mod 8`.
create type public.color_grupo as enum (
  'ROJO', 'AMARILLO', 'VERDE', 'TURQUESA', 'AZUL', 'MORADO', 'ROSA', 'CAFE'
);

alter table public.grupo add column color public.color_grupo;

comment on column public.grupo.color is
  'Color elegido por el ADMIN (F26 R2). Vacío = por defecto; usar color_de_grupo() para resolverlo.';

create function public.color_de_grupo(id_grupo bigint, elegido public.color_grupo)
returns public.color_grupo
language sql
stable
set search_path = ''
as $$
  select coalesce(elegido, (enum_range(null::public.color_grupo))[(id_grupo % 8)::integer + 1]);
$$;

-- ---------------------------------------------------------------------------
-- Editar (R6)
-- ---------------------------------------------------------------------------

-- `nombre` o `color` vacíos dejan el valor que ya tenía. El nombre sigue F07 R1.
create function public.editar_grupo(id_grupo bigint, nombre text, color text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  yo uuid := auth.uid();
  limpio text := regexp_replace(nombre, '^\s+|\s+$', '', 'g');
  mi_rol public.rol_grupo;
begin
  if yo is null then
    raise exception 'SIN_SESION';
  end if;

  select m.rol into mi_rol
  from public.miembro_grupo as m
  where m.grupo_id = id_grupo and m.usuario_id = yo;
  if mi_rol is null then
    raise exception 'NO_MIEMBRO';
  end if;
  if mi_rol <> 'ADMIN' then
    raise exception 'NO_ADMIN';
  end if;

  if limpio is not null and char_length(limpio) not between 3 and 30 then
    raise exception 'NOMBRE_INVALIDO';
  end if;
  if color is not null and not (color = any (enum_range(null::public.color_grupo)::text[])) then
    raise exception 'COLOR_INVALIDO';
  end if;

  update public.grupo as g
  set
    nombre = coalesce(limpio, g.nombre),
    color = coalesce(editar_grupo.color::public.color_grupo, g.color)
  where g.id = id_grupo;
end;
$$;

-- ---------------------------------------------------------------------------
-- Líder del ranking del torneo (R5)
-- ---------------------------------------------------------------------------

-- Del 1.º del ranking del torneo actual (misma cuenta que F08), solo el nombre y si soy yo, y
-- cuántos empatan. Sin filas si no soy miembro, no hay torneo actual o nadie tiene puntos.
-- A igual posición, el primero por nombre (el orden de `ranking_grupo`).
create function public.lider_de_grupo(id_grupo bigint)
returns table (lider_nombre text, lider_es_yo boolean, lideres integer)
language sql
stable
security definer
set search_path = ''
as $$
  with primeros as (
    select pg.usuario_id, u.nombre
    from public.posiciones_grupo(id_grupo, public.torneo_actual_id(), null) as pg
    join public.usuario as u on u.id = pg.usuario_id
    where pg.posicion = 1
      and pg.puntos_total > 0
      and public.torneo_actual_id() is not null
      and exists (
        select 1 from public.miembro_grupo as m
        where m.grupo_id = id_grupo and m.usuario_id = (select auth.uid())
      )
  )
  select
    (array_agg(p.nombre order by p.nombre, p.usuario_id))[1],
    bool_or(p.usuario_id = (select auth.uid())),
    count(*)::integer
  from primeros as p
  having count(*) > 0;
$$;

-- Misma vista de F17 con el color resuelto y el líder al final.
create or replace view public.mis_grupos
with (security_invoker = true)
as
select
  g.id,
  g.nombre,
  (select count(*) from public.miembro_grupo as todos where todos.grupo_id = g.id)::integer
    as miembros,
  m.rol,
  m.unido_en,
  public.mi_posicion_en_grupo(g.id) as mi_posicion,
  public.mi_posicion_antes_en_grupo(g.id) as mi_posicion_antes,
  public.color_de_grupo(g.id, g.color) as color,
  l.lider_nombre,
  l.lider_es_yo,
  l.lideres
from public.miembro_grupo as m
join public.grupo as g on g.id = m.grupo_id
left join lateral public.lider_de_grupo(g.id) as l on true
where m.usuario_id = (select auth.uid());

-- ---------------------------------------------------------------------------
-- Permisos (R18, nivel 3, D113)
-- ---------------------------------------------------------------------------

revoke execute on function public.color_de_grupo(bigint, public.color_grupo) from public, anon;
revoke execute on function public.editar_grupo(bigint, text, text) from public, anon;
revoke execute on function public.lider_de_grupo(bigint) from public, anon;

grant execute on function public.editar_grupo(bigint, text, text) to authenticated;
-- `mis_grupos` (security_invoker) las llama con el rol de quien consulta.
grant execute on function public.color_de_grupo(bigint, public.color_grupo) to authenticated;
grant execute on function public.lider_de_grupo(bigint) to authenticated;
