-- T117 — Muro de análisis revelados de una jornada del grupo (F26 R11, R18, R19; D113).
-- Una fila por predicción **con justificación** de los miembros actuales del grupo (yo incluido)
-- en partidos de esa jornada cuyo cierre ya pasó (R04), sin cancelados (D44).
-- `security definer`: lee predicciones, evaluaciones y usuarios ajenos sin abrir esas tablas y
-- solo devuelve las columnas de abajo: el bono y la explicación de la IA solo si la evaluación
-- está `EVALUADA`; nunca `afirmaciones`, correo ni predicciones de partidos abiertos.

create function public.muro_jornada(id_grupo bigint, id_jornada bigint)
returns table (
  prediccion_id bigint,
  partido_id bigint,
  inicio timestamptz,
  estado public.estado_partido,
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
  usuario_id uuid,
  nombre text,
  foto_url text,
  es_yo boolean,
  resultado public.resultado_prediccion,
  rango_goles public.rango_goles,
  marcador_local smallint,
  marcador_visitante smallint,
  justificacion text,
  estado_evaluacion public.estado_evaluacion,
  puntos_bono integer,
  explicacion text,
  es_simulada boolean
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
  if not exists (
    select 1 from public.miembro_grupo as m where m.grupo_id = id_grupo and m.usuario_id = yo
  ) then
    raise exception 'NO_MIEMBRO';
  end if;
  -- Como `ranking_grupo` (F08 R6): solo jornadas del torneo actual.
  if not exists (
    select 1 from public.jornada as j
    where j.id = id_jornada and j.torneo_id = public.torneo_actual_id()
  ) then
    raise exception 'JORNADA_INVALIDA';
  end if;

  return query
  select
    pr.id,
    p.id,
    p.inicio,
    p.estado,
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
    pr.usuario_id,
    u.nombre,
    u.foto_url,
    pr.usuario_id = yo,
    pr.resultado,
    pr.rango_goles,
    pr.marcador_local,
    pr.marcador_visitante,
    pr.justificacion,
    coalesce(e.estado, 'PENDIENTE'),
    case when e.estado = 'EVALUADA' then e.puntos_bono::integer end,
    case when e.estado = 'EVALUADA' then e.explicacion end,
    p.es_simulado
  from public.partido as p
  join public.prediccion as pr on pr.partido_id = p.id
  join public.miembro_grupo as autor on autor.usuario_id = pr.usuario_id and autor.grupo_id = id_grupo
  join public.usuario as u on u.id = pr.usuario_id
  join public.equipo as el on el.id = p.equipo_local_id
  join public.equipo as ev on ev.id = p.equipo_visitante_id
  left join public.evaluacion_ia as e on e.prediccion_id = pr.id
  where p.jornada_id = id_jornada
    and p.cierre_predicciones <= now()
    and p.estado <> 'CANCELADO'
    and nullif(btrim(pr.justificacion), '') is not null
  -- Por partido y, dentro de cada uno, las evaluadas primero por bono (R11).
  order by p.inicio, p.id, (e.estado = 'EVALUADA') desc nulls last, e.puntos_bono desc nulls last,
    u.nombre, pr.id;
end;
$$;

-- R18 (nivel 3, D113): `authenticated` sí; `anon` no.
revoke execute on function public.muro_jornada(bigint, bigint) from public, anon;
grant execute on function public.muro_jornada(bigint, bigint) to authenticated;
