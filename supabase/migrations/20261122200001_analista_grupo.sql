-- T116 — "Analista de la jornada" del grupo (F26 R10, R18; D113).
-- `mejor_analisis_jornada` recibe `id_grupo` e `id_jornada` opcionales: con ellos, el mejor análisis
-- de ese grupo en esa jornada con las mismas reglas de F17 R10 (bono `EVALUADA` ≥ 50, miembros
-- actuales, solo partidos cerrados, mismo desempate). Sin argumentos sigue igual para Inicio.
-- Además de F17 R13, comprueba que sea miembro del grupo pedido (`NO_MIEMBRO`) y que la jornada sea
-- del torneo actual (`JORNADA_INVALIDA`, como F08 R6).

drop function public.mejor_analisis_jornada();

create function public.mejor_analisis_jornada(id_grupo bigint default null, id_jornada bigint default null)
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
  if id_grupo is not null and not exists (
    select 1 from public.miembro_grupo as m where m.grupo_id = id_grupo and m.usuario_id = yo
  ) then
    raise exception 'NO_MIEMBRO';
  end if;
  -- Como `ranking_grupo` (F08 R6): solo jornadas del torneo actual.
  if id_jornada is not null and not exists (
    select 1 from public.jornada as j
    where j.id = id_jornada and j.torneo_id = public.torneo_actual_id()
  ) then
    raise exception 'JORNADA_INVALIDA';
  end if;

  return query
  with ref as (
    select j.id, j.nombre, j.esta_cerrada
    from public.jornada as j
    where j.id = coalesce(id_jornada, public.jornada_referencia())
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
    where id_grupo is null or autor.grupo_id = id_grupo
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

-- F17 R13 y F26 R18 (nivel 3): `authenticated` sí; `anon` no.
revoke execute on function public.mejor_analisis_jornada(bigint, bigint) from public, anon;
grant execute on function public.mejor_analisis_jornada(bigint, bigint) to authenticated;
