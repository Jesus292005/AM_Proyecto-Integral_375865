-- T107 — "Mejor análisis de la jornada en mis grupos" para Inicio (F17 R10, R13; D111).
-- En la jornada de referencia (T106), la predicción con bono `EVALUADA` más alto, con 50 o más
-- (decisión 4), entre los miembros actuales de mis grupos (yo incluido), solo de partidos cuyo
-- cierre ya pasó (R04). Una fila o ninguna (decisión 3).
-- `security definer`: lee justificaciones y evaluaciones ajenas sin abrir esas tablas; solo
-- devuelve las columnas de abajo (nunca `afirmaciones`, correo ni predicciones abiertas).

create function public.mejor_analisis_jornada()
returns table (
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
  usuario_id uuid,
  nombre text,
  foto_url text,
  es_yo boolean,
  justificacion text,
  puntos_bono integer,
  explicacion text,
  grupo_id bigint,
  grupo_nombre text,
  jornada_id bigint,
  jornada_nombre text,
  en_curso boolean,
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

  return query
  with ref as (
    select j.id, j.nombre, j.esta_cerrada
    from public.jornada as j
    where j.id = public.jornada_referencia()
  ),
  -- Una fila por predicción, con el grupo compartido de menor `id` (R10).
  candidatas as (
    select distinct on (pr.id)
      pr.id,
      pr.usuario_id,
      pr.partido_id,
      pr.justificacion,
      e.puntos_bono,
      e.explicacion,
      e.evaluada_en,
      -- Como `mi_ultima_jornada`: simulada si lo es la calificación o la evaluación (R08).
      coalesce(c.es_simulada, false) or e.es_simulada as es_simulada,
      coalesce(c.puntos_base, 0) as puntos_base,
      g.id as grupo_id,
      g.nombre as grupo_nombre
    from ref
    join public.partido as p on p.jornada_id = ref.id and p.cierre_predicciones <= now()
    join public.prediccion as pr on pr.partido_id = p.id
    join public.evaluacion_ia as e
      on e.prediccion_id = pr.id and e.estado = 'EVALUADA' and e.puntos_bono >= 50
    left join public.calificacion as c on c.prediccion_id = pr.id
    join public.miembro_grupo as autor on autor.usuario_id = pr.usuario_id
    join public.miembro_grupo as mio on mio.grupo_id = autor.grupo_id and mio.usuario_id = yo
    join public.grupo as g on g.id = autor.grupo_id
    order by pr.id, g.id
  )
  select
    k.partido_id,
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
    k.usuario_id,
    u.nombre,
    u.foto_url,
    k.usuario_id = yo,
    k.justificacion,
    k.puntos_bono::integer,
    k.explicacion,
    k.grupo_id,
    k.grupo_nombre,
    ref.id,
    ref.nombre,
    not ref.esta_cerrada,
    k.es_simulada
  from candidatas as k
  cross join ref
  join public.partido as p on p.id = k.partido_id
  join public.equipo as el on el.id = p.equipo_local_id
  join public.equipo as ev on ev.id = p.equipo_visitante_id
  join public.usuario as u on u.id = k.usuario_id
  -- Desempate (R10): bono, puntos base, evaluada primero.
  order by k.puntos_bono desc, k.puntos_base desc, k.evaluada_en, k.id
  limit 1;
end;
$$;

-- R13 (nivel 3, D111): `authenticated` sí; `anon` no.
revoke execute on function public.mejor_analisis_jornada() from public, anon;
grant execute on function public.mejor_analisis_jornada() to authenticated;
