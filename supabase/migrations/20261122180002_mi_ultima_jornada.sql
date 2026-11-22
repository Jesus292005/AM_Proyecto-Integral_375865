-- T106 — "Mi última jornada" para Inicio (F17 R3, R8, R13; D111).
-- (1) La jornada de referencia (decisión 2): la de mayor `orden` del torneo actual con algún
--     partido calificado, aunque siga en curso. La usan este bloque y "Mejor análisis" (T107).
-- (2) `mi_ultima_jornada`: mis puntos de esa jornada y mi mejor análisis.
-- (3) `mis_grupos.mi_posicion_antes`: mi posición en el ranking del torneo de cada grupo sin esa
--     jornada, con el mismo cálculo de F08 (`posiciones_grupo`).

-- ---------------------------------------------------------------------------
-- (1) Jornada de referencia (R3)
-- ---------------------------------------------------------------------------

-- Lee solo `torneo`, `jornada` y `partido`, que ya leen todos los autenticados.
create function public.jornada_referencia()
returns bigint
language sql
stable
set search_path = ''
as $$
  select j.id
  from public.jornada as j
  where j.torneo_id = (select t.id from public.torneo as t where t.es_actual order by t.id limit 1)
    and exists (
      select 1 from public.partido as p where p.jornada_id = j.id and p.calificado_en is not null
    )
  order by j.orden desc
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- (2) Mis puntos de la jornada de referencia (R8)
-- ---------------------------------------------------------------------------

-- Una fila si hay jornada de referencia (aunque no haya predicho), ninguna si no.
-- Como `mis_puntos` (F10 R2): solo suma el bono `EVALUADA`; una justificación sin evaluación
-- todavía cuenta como pendiente.
create view public.mi_ultima_jornada
with (security_invoker = true)
as
with ref as (
  select j.id, j.orden, j.nombre, j.esta_cerrada
  from public.jornada as j
  where j.id = public.jornada_referencia()
),
mias as (
  select
    p.id as partido_id,
    c.puntos_base,
    case when e.estado = 'EVALUADA' then e.puntos_bono end as bono,
    pr.justificacion is not null and (e.id is null or e.estado = 'PENDIENTE') as bono_pendiente,
    c.es_simulada or coalesce(e.es_simulada, false) as simulada,
    e.evaluada_en
  from ref
  join public.partido as p on p.jornada_id = ref.id
  join public.prediccion as pr on pr.partido_id = p.id and pr.usuario_id = (select auth.uid())
  join public.calificacion as c on c.prediccion_id = pr.id
  left join public.evaluacion_ia as e on e.prediccion_id = pr.id
),
-- Mismo desempate que "Mejor análisis" (F17 R10): bono, puntos base, evaluada primero.
mejor as (
  select m.partido_id, m.bono
  from mias as m
  where m.bono is not null
  order by m.bono desc, m.puntos_base desc, m.evaluada_en, m.partido_id
  limit 1
)
select
  ref.id as jornada_id,
  ref.orden as jornada_orden,
  ref.nombre as jornada_nombre,
  not ref.esta_cerrada as en_curso,
  count(m.partido_id)::integer as predicciones_calificadas,
  coalesce(sum(m.puntos_base), 0)::integer as puntos_base,
  coalesce(sum(m.bono), 0)::integer as puntos_bono,
  (coalesce(sum(m.puntos_base), 0) + coalesce(sum(m.bono), 0))::integer as puntos_total,
  (count(*) filter (where m.bono_pendiente))::integer as bonos_pendientes,
  (select mejor.partido_id from mejor) as mejor_analisis_partido_id,
  (select mejor.bono from mejor)::integer as mejor_analisis_bono,
  coalesce(bool_or(m.simulada), false) as incluye_simulados
from ref
left join mias as m on true
group by ref.id, ref.orden, ref.nombre, ref.esta_cerrada;

-- ---------------------------------------------------------------------------
-- (3) Mi posición antes de la jornada de referencia (R8)
-- ---------------------------------------------------------------------------

-- `posiciones_grupo` (F08) recibe un cuarto parámetro opcional: contar solo las jornadas con
-- `orden` menor. Las llamadas de 3 parámetros (ranking, mi posición, insignias) no cambian.
drop function public.posiciones_grupo(bigint, bigint, bigint);

create function public.posiciones_grupo(
  id_grupo bigint,
  id_torneo bigint,
  id_jornada bigint,
  antes_de_orden smallint default null
)
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
    join public.jornada as j on j.id = p.jornada_id
    join public.calificacion as c on c.prediccion_id = pr.id
    left join public.evaluacion_ia as e on e.prediccion_id = pr.id
    where m.grupo_id = id_grupo
      and p.torneo_id = id_torneo
      and (id_jornada is null or p.jornada_id = id_jornada)
      and (antes_de_orden is null or j.orden < antes_de_orden)
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

-- Solo mi posición (como `mi_posicion_en_grupo`, F08 R11). Null si no soy miembro, si no hay
-- jornada de referencia, si es la primera del torneo o si nadie del grupo tenía calificaciones
-- antes de ella (no hay un "antes": todos empatarían en 1.º y la app diría "Bajaste").
create function public.mi_posicion_antes_en_grupo(id_grupo bigint)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  with antes as (
    select pg.usuario_id, pg.posicion, max(pg.ultima_calificacion) over () as hubo_calificaciones
    from public.jornada as ref
    cross join lateral public.posiciones_grupo(id_grupo, ref.torneo_id, null, ref.orden) as pg
    where ref.id = public.jornada_referencia()
      and ref.orden > (select min(j.orden) from public.jornada as j where j.torneo_id = ref.torneo_id)
  )
  select a.posicion
  from antes as a
  where a.usuario_id = (select auth.uid())
    and a.hubo_calificaciones is not null;
$$;

-- Misma vista de F08 con `mi_posicion_antes` al final.
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
  public.mi_posicion_antes_en_grupo(g.id) as mi_posicion_antes
from public.miembro_grupo as m
join public.grupo as g on g.id = m.grupo_id
where m.usuario_id = (select auth.uid());

-- ---------------------------------------------------------------------------
-- Permisos (R13, nivel 3, D111)
-- ---------------------------------------------------------------------------

revoke execute on function public.posiciones_grupo(bigint, bigint, bigint, smallint)
  from public, anon, authenticated;
revoke execute on function public.jornada_referencia() from public, anon;
revoke execute on function public.mi_posicion_antes_en_grupo(bigint) from public, anon;

-- Las vistas `security_invoker` las llaman con el rol de quien consulta.
grant execute on function public.jornada_referencia() to authenticated;
grant execute on function public.mi_posicion_antes_en_grupo(bigint) to authenticated;

revoke all on table public.mi_ultima_jornada from anon, authenticated;
grant select on table public.mi_ultima_jornada to authenticated;
