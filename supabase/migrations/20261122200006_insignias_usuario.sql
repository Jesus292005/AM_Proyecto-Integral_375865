-- T121 — Vitrina de otro usuario para S13 (F19 R6, R7, decisión 5; D113).
-- Todo el catálogo de F14 R1 con, de esa persona, cuántas veces ganó cada una, cuándo la última y si
-- fue con un simulado. Sin grupo ni jornada (decisión 5) y sin `vista_en` (F14 R7 es solo para las
-- propias). Las mismas columnas que `mis_insignias` menos esas.
-- `security definer`: `insignia_obtenida` solo deja leer las propias (F14 R9). Comprueba R1: la
-- persona misma o alguien que comparte hoy un grupo; si no, `NO_ENCONTRADO`.

create function public.insignias_usuario(id_usuario uuid)
returns table (
  codigo text,
  nombre text,
  descripcion text,
  nivel public.nivel_metal,
  icono text,
  repetible boolean,
  orden smallint,
  veces integer,
  ultima_en timestamptz,
  ultima_simulada boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  yo uuid := auth.uid();
begin
  if yo is null then
    raise exception 'SIN_SESION';
  end if;
  if (id_usuario is distinct from yo and not public.comparte_grupo(id_usuario))
    or not exists (select 1 from public.usuario as u where u.id = id_usuario) then
    raise exception 'NO_ENCONTRADO';
  end if;

  return query
  select
    i.codigo,
    i.nombre,
    i.descripcion,
    i.nivel,
    i.icono,
    i.repetible,
    i.orden,
    coalesce(t.veces, 0),
    u.obtenida_en,
    u.es_simulada
  from public.insignia as i
  left join lateral (
    select count(*)::integer as veces
    from public.insignia_obtenida as o
    where o.insignia_id = i.id and o.usuario_id = id_usuario
  ) as t on true
  left join lateral (
    select o.obtenida_en, o.es_simulada
    from public.insignia_obtenida as o
    where o.insignia_id = i.id and o.usuario_id = id_usuario
    order by o.obtenida_en desc, o.id desc
    limit 1
  ) as u on true
  order by i.orden;
end;
$$;

-- F19 R7 (nivel 3, D113): `authenticated` sí; `anon` no.
revoke execute on function public.insignias_usuario(uuid) from public, anon;
grant execute on function public.insignias_usuario(uuid) to authenticated;
