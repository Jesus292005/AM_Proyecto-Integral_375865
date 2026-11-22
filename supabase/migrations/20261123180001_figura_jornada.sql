-- Figura de la jornada del grupo (F26 R10 v1.1, D114): reemplaza en S08 al "Analista de la
-- jornada". Pedido de Jesús en el guion de M8: es el 1.º del ranking de la jornada (puntos base +
-- bono, F08 con sus desempates), no el mayor bono de la IA, para que coincida con lo que se ve en
-- el ranking. Con su mejor análisis de esa jornada, si tiene uno evaluado.
-- `security definer`: usa `posiciones_grupo` y lee la justificación, el bono y la explicación de la
-- IA del 1.º, lo mismo que ya muestra `muro_jornada` (F26 R18): solo de partidos cerrados (R04) y
-- solo a miembros actuales del grupo. Nunca `afirmaciones`, correo ni predicciones abiertas.

create function public.figura_jornada(id_grupo bigint, id_jornada bigint)
returns table (
  usuario_id uuid,
  nombre text,
  foto_url text,
  es_yo boolean,
  puntos_total integer,
  puntos_base integer,
  puntos_bono integer,
  -- Cuántos empatan en el 1.º (con el desempate de F08); sale el primero por nombre.
  lideres integer,
  jornada_nombre text,
  en_curso boolean,
  incluye_simulados boolean,
  -- Su mejor análisis de la jornada (vacío si no tiene uno evaluado).
  partido_id bigint,
  goles_local smallint,
  goles_visitante smallint,
  local_nombre_corto text,
  local_escudo_url text,
  local_color_primario text,
  local_color_texto text,
  visitante_nombre_corto text,
  visitante_escudo_url text,
  visitante_color_primario text,
  visitante_color_texto text,
  justificacion text,
  bono_analisis integer,
  explicacion text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
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
  if not exists (
    select 1 from public.jornada as j where j.id = id_jornada and j.torneo_id = id_torneo
  ) then
    raise exception 'JORNADA_INVALIDA';
  end if;

  return query
  with primeros as (
    select pg.usuario_id, pg.puntos_total, pg.puntos_base, pg.puntos_bono, pg.con_simulados,
      u.nombre, u.foto_url, count(*) over () as lideres
    from public.posiciones_grupo(id_grupo, id_torneo, id_jornada) as pg
    join public.usuario as u on u.id = pg.usuario_id
    where pg.posicion = 1 and pg.puntos_total > 0
  ),
  -- A igual posición, el primero por nombre (el orden de `ranking_grupo`).
  figura as (
    select * from primeros as pr order by pr.nombre, pr.usuario_id limit 1
  ),
  mejor as (
    select pr.partido_id, pr.justificacion, e.puntos_bono, e.explicacion
    from figura as f
    join public.prediccion as pr on pr.usuario_id = f.usuario_id
    join public.partido as p
      on p.id = pr.partido_id and p.jornada_id = id_jornada and p.cierre_predicciones <= now()
      and p.estado <> 'CANCELADO'
    join public.evaluacion_ia as e on e.prediccion_id = pr.id and e.estado = 'EVALUADA'
    left join public.calificacion as c on c.prediccion_id = pr.id
    where nullif(btrim(pr.justificacion), '') is not null
    -- El desempate de F17 R10: bono, puntos base, evaluada primero.
    order by e.puntos_bono desc, coalesce(c.puntos_base, 0) desc, e.evaluada_en, pr.id
    limit 1
  )
  select
    f.usuario_id,
    f.nombre,
    f.foto_url,
    f.usuario_id = yo,
    f.puntos_total,
    f.puntos_base,
    f.puntos_bono,
    f.lideres::integer,
    j.nombre,
    not j.esta_cerrada,
    f.con_simulados,
    m.partido_id,
    p.goles_local,
    p.goles_visitante,
    el.nombre_corto,
    el.escudo_url,
    el.color_primario,
    el.color_texto,
    ev.nombre_corto,
    ev.escudo_url,
    ev.color_primario,
    ev.color_texto,
    m.justificacion,
    m.puntos_bono::integer,
    m.explicacion
  from figura as f
  join public.jornada as j on j.id = id_jornada
  left join mejor as m on true
  left join public.partido as p on p.id = m.partido_id
  left join public.equipo as el on el.id = p.equipo_local_id
  left join public.equipo as ev on ev.id = p.equipo_visitante_id;
end;
$$;

-- F26 R18 (nivel 3, D114): `authenticated` sí; `anon` no.
revoke execute on function public.figura_jornada(bigint, bigint) from public, anon;
grant execute on function public.figura_jornada(bigint, bigint) to authenticated;
