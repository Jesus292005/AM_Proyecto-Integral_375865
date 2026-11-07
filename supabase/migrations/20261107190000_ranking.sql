-- T69 — Rankings del grupo (F08): torneo actual y jornada, calculados en el servidor en una sola
-- consulta (R6, R10, D52). Se calculan en cada lectura, sin tablas precalculadas (R7).
-- `posiciones_grupo` suma calificaciones y evaluaciones ajenas: solo la llaman las funciones de
-- abajo, que comprueban que quien pregunta sea miembro (R11).

-- ---------------------------------------------------------------------------
-- Cálculo (R1–R5)
-- ---------------------------------------------------------------------------

-- Por miembro actual (R2): base de sus calificaciones + bono solo `EVALUADA` (R1), en partidos del
-- torneo (y de la jornada, si se pide). Sin calificación no suma: un cancelado no cuenta (D44).
-- Orden y desempates (decisión 4 de D97): total, marcadores exactos, bono; empate completo =
-- misma posición (1, 1, 3).
create function public.posiciones_grupo(id_grupo bigint, id_torneo bigint, id_jornada bigint)
returns table (
  usuario_id uuid,
  posicion integer,
  puntos_total integer,
  puntos_base integer,
  puntos_bono integer,
  marcadores_exactos integer,
  con_simulados boolean,
  ultima_calificacion timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with contadas as (
    select
      pr.usuario_id,
      c.puntos_base,
      c.puntos_marcador,
      c.es_simulada,
      c.calificada_en,
      case when e.estado = 'EVALUADA' then e.puntos_bono else 0 end as bono
    from public.miembro_grupo as m
    join public.prediccion as pr on pr.usuario_id = m.usuario_id
    join public.partido as p on p.id = pr.partido_id
    join public.calificacion as c on c.prediccion_id = pr.id
    left join public.evaluacion_ia as e on e.prediccion_id = pr.id
    where m.grupo_id = id_grupo
      and p.torneo_id = id_torneo
      and (id_jornada is null or p.jornada_id = id_jornada)
  ),
  sumas as (
    select
      m.usuario_id,
      coalesce(sum(k.puntos_base), 0)::integer as base,
      coalesce(sum(k.bono), 0)::integer as bono,
      -- Marcador exacto acertado: el único caso con puntos de marcador (F05).
      count(*) filter (where k.puntos_marcador > 0)::integer as exactos,
      coalesce(bool_or(k.es_simulada), false) as simulados,
      max(k.calificada_en) as ultima
    from public.miembro_grupo as m
    left join contadas as k on k.usuario_id = m.usuario_id
    where m.grupo_id = id_grupo
    group by m.usuario_id
  )
  select
    s.usuario_id,
    (rank() over (order by s.base + s.bono desc, s.exactos desc, s.bono desc))::integer,
    s.base + s.bono,
    s.base,
    s.bono,
    s.exactos,
    s.simulados,
    s.ultima
  from sumas as s;
$$;

-- Solo la usan las funciones de abajo (corren como dueño).
create function public.torneo_actual_id()
returns bigint
language sql
stable
set search_path = ''
as $$
  select id from public.torneo where es_actual order by id limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Ranking para S08 (R6)
-- ---------------------------------------------------------------------------

create function public.ranking_grupo(id_grupo bigint, id_jornada bigint default null)
returns table (
  posicion integer,
  usuario_id uuid,
  nombre text,
  foto_url text,
  puntos_total integer,
  puntos_base integer,
  puntos_bono integer,
  marcadores_exactos integer,
  es_yo boolean,
  incluye_simulados boolean,
  ultima_calificacion timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  yo uuid := auth.uid();
  id_torneo bigint := public.torneo_actual_id();
begin
  if yo is null then
    raise exception 'SIN_SESION';
  end if;
  if not exists (
    select 1 from public.miembro_grupo as m where m.grupo_id = id_grupo and m.usuario_id = yo
  ) then
    raise exception 'NO_MIEMBRO';
  end if;
  if id_torneo is null then
    raise exception 'SIN_TORNEO_ACTUAL';
  end if;
  if id_jornada is not null and not exists (
    select 1 from public.jornada as j where j.id = id_jornada and j.torneo_id = id_torneo
  ) then
    raise exception 'JORNADA_INVALIDA';
  end if;

  -- De otros, solo nombre, foto y puntos (R11).
  return query
  select
    pg.posicion,
    pg.usuario_id,
    u.nombre,
    u.foto_url,
    pg.puntos_total,
    pg.puntos_base,
    pg.puntos_bono,
    pg.marcadores_exactos,
    pg.usuario_id = yo,
    bool_or(pg.con_simulados) over (),
    max(pg.ultima_calificacion) over ()
  from public.posiciones_grupo(id_grupo, id_torneo, id_jornada) as pg
  join public.usuario as u on u.id = pg.usuario_id
  order by pg.posicion, u.nombre, pg.usuario_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Mi posición en cada grupo para S04 (R8)
-- ---------------------------------------------------------------------------

-- Null si no soy miembro o no hay torneo actual: nunca falla, para no romper la lista.
create function public.mi_posicion_en_grupo(id_grupo bigint)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select pg.posicion
  from public.posiciones_grupo(id_grupo, public.torneo_actual_id(), null) as pg
  where pg.usuario_id = (select auth.uid())
    and public.torneo_actual_id() is not null;
$$;

-- Misma vista de F07 con `mi_posicion` al final.
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
  public.mi_posicion_en_grupo(g.id) as mi_posicion
from public.miembro_grupo as m
join public.grupo as g on g.id = m.grupo_id
where m.usuario_id = (select auth.uid());

-- ---------------------------------------------------------------------------
-- Permisos (R11)
-- ---------------------------------------------------------------------------

revoke execute on function public.posiciones_grupo(bigint, bigint, bigint) from public, anon, authenticated;
revoke execute on function public.torneo_actual_id() from public, anon, authenticated;
revoke execute on function public.ranking_grupo(bigint, bigint) from public, anon;
revoke execute on function public.mi_posicion_en_grupo(bigint) from public, anon;

grant execute on function public.ranking_grupo(bigint, bigint) to authenticated;
-- `mis_grupos` (security_invoker) la llama con el rol de quien consulta.
grant execute on function public.mi_posicion_en_grupo(bigint) to authenticated;
