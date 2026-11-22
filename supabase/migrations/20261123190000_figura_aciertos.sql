-- Figura de la jornada con lo que acertó (F26 R10 v1.2, D115). Pedido de Jesús en el guion de M8:
-- la tarjeta destacaba un análisis de 0/100 de alguien que iba 1.º por sus aciertos. Ahora, en vez
-- del "mejor análisis", trae cada partido cerrado que predijo en esa jornada con sus puntos por parte
-- (resultado, goles, marcador), su bono y su análisis.
-- `security definer`, como antes (F26 R18): solo del 1.º del ranking de la jornada, solo de partidos
-- cerrados y no cancelados (R04, D44) y solo a miembros actuales del grupo. Los puntos por parte se
-- deducen de la predicción y del resultado, que ya se ven en S03 y el muro. Nunca `afirmaciones` ni
-- correo.

drop function public.figura_jornada(bigint, bigint);

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
  -- Sus partidos cerrados de la jornada, por inicio (ver la forma abajo).
  partidos jsonb
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
  suyos as (
    select
      p.inicio,
      p.id,
      jsonb_build_object(
        'partido_id', p.id,
        'estado', p.estado,
        'goles_local', p.goles_local,
        'goles_visitante', p.goles_visitante,
        'local', jsonb_build_object('nombre_corto', el.nombre_corto, 'escudo_url', el.escudo_url,
          'color_primario', el.color_primario, 'color_texto', el.color_texto),
        'visitante', jsonb_build_object('nombre_corto', ev.nombre_corto, 'escudo_url', ev.escudo_url,
          'color_primario', ev.color_primario, 'color_texto', ev.color_texto),
        'resultado', pr.resultado,
        'rango_goles', pr.rango_goles,
        'marcador_local', pr.marcador_local,
        'marcador_visitante', pr.marcador_visitante,
        -- Sin calificación todavía, las partes van vacías ("por calificar").
        'puntos_resultado', c.puntos_resultado,
        'puntos_rango_goles', c.puntos_rango_goles,
        'puntos_marcador', c.puntos_marcador,
        'puntos_base', c.puntos_base,
        'justificacion', nullif(btrim(pr.justificacion), ''),
        'estado_evaluacion', e.estado,
        -- Como `muro_jornada`: bono y explicación solo si está evaluada.
        'bono', case when e.estado = 'EVALUADA' then e.puntos_bono end,
        'explicacion', case when e.estado = 'EVALUADA' then e.explicacion end,
        'es_simulada', p.es_simulado
      ) as fila
    from figura as f
    join public.prediccion as pr on pr.usuario_id = f.usuario_id
    join public.partido as p on p.id = pr.partido_id
    join public.equipo as el on el.id = p.equipo_local_id
    join public.equipo as ev on ev.id = p.equipo_visitante_id
    left join public.calificacion as c on c.prediccion_id = pr.id
    left join public.evaluacion_ia as e on e.prediccion_id = pr.id
    where p.jornada_id = id_jornada
      and p.cierre_predicciones <= now()
      and p.estado <> 'CANCELADO'
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
    coalesce((select jsonb_agg(s.fila order by s.inicio, s.id) from suyos as s), '[]'::jsonb)
  from figura as f
  join public.jornada as j on j.id = id_jornada;
end;
$$;

-- F26 R18 (nivel 3, D115): `authenticated` sí; `anon` no.
revoke execute on function public.figura_jornada(bigint, bigint) from public, anon;
grant execute on function public.figura_jornada(bigint, bigint) to authenticated;
