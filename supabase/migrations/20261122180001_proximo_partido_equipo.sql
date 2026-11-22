-- T105 — Próximo partido de mi equipo favorito para Inicio (F17 R6, R13; D111).
-- Del equipo favorito (F18), el partido del torneo actual en juego o, si no hay, el siguiente por
-- jugar; sin simulados (son copias de 2024, F09). Cero filas sin equipo o sin más partidos.
-- `security_invoker`: aplica las RLS de `usuario` (mi fila), `partido`, `jornada`, `equipo` y
-- `prediccion` (las propias).

create view public.proximo_partido_equipo
with (security_invoker = true)
as
select
  p.id,
  p.jornada_id,
  j.orden as jornada_orden,
  j.nombre as jornada_nombre,
  p.inicio,
  p.cierre_predicciones,
  p.estado,
  p.goles_local,
  p.goles_visitante,
  el.nombre_corto as local_nombre_corto,
  el.escudo_url as local_escudo_url,
  el.color_primario as local_color_primario,
  el.color_texto as local_color_texto,
  ev.nombre_corto as visitante_nombre_corto,
  ev.escudo_url as visitante_escudo_url,
  ev.color_primario as visitante_color_primario,
  ev.color_texto as visitante_color_texto,
  exists (
    select 1
    from public.prediccion as pr
    where pr.partido_id = p.id and pr.usuario_id = u.id
  ) as tengo_prediccion
from public.usuario as u
join public.partido as p
  on u.equipo_favorito_id in (p.equipo_local_id, p.equipo_visitante_id)
join public.torneo as t on t.id = p.torneo_id and t.es_actual
join public.jornada as j on j.id = p.jornada_id
join public.equipo as el on el.id = p.equipo_local_id
join public.equipo as ev on ev.id = p.equipo_visitante_id
where u.id = (select auth.uid())
  and not p.es_simulado
  and (
    p.estado = 'EN_JUEGO'
    or (p.estado in ('PROGRAMADO', 'POSPUESTO') and p.inicio >= now())
  )
order by (p.estado = 'EN_JUEGO') desc, p.inicio, p.id
limit 1;

-- R13 (nivel 3, D111): solo `authenticated`.
revoke all on table public.proximo_partido_equipo from anon, authenticated;
grant select on table public.proximo_partido_equipo to authenticated;
