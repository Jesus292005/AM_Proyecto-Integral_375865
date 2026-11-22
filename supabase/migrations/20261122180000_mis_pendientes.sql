-- T104 — Pendientes de predecir para Inicio (F17 R4, R13; D111).
-- Partidos abiertos (F03 R1: `PROGRAMADO` o `POSPUESTO` y antes del cierre) **sin** predicción mía
-- de la jornada actual (D86) y la siguiente (decisión 1). `security_invoker`: aplica las RLS de
-- `partido`, `jornada`, `equipo` (las leen todos los autenticados) y `prediccion` (las propias).
-- Distinto del filtro "Sin predecir" de F23, que es de una sola jornada.

create view public.mis_pendientes
with (security_invoker = true)
as
with actual as (
  select t.id, public.jornada_actual() as orden
  from public.torneo as t
  where t.es_actual
  order by t.id
  limit 1
)
select
  p.id,
  p.jornada_id,
  j.orden as jornada_orden,
  j.nombre as jornada_nombre,
  p.inicio,
  p.cierre_predicciones,
  p.estado,
  p.es_simulado,
  el.nombre_corto as local_nombre_corto,
  el.escudo_url as local_escudo_url,
  el.color_primario as local_color_primario,
  el.color_texto as local_color_texto,
  ev.nombre_corto as visitante_nombre_corto,
  ev.escudo_url as visitante_escudo_url,
  ev.color_primario as visitante_color_primario,
  ev.color_texto as visitante_color_texto
from actual as a
join public.jornada as j on j.torneo_id = a.id and j.orden between a.orden and a.orden + 1
join public.partido as p on p.jornada_id = j.id
join public.equipo as el on el.id = p.equipo_local_id
join public.equipo as ev on ev.id = p.equipo_visitante_id
where p.estado in ('PROGRAMADO', 'POSPUESTO')
  and p.cierre_predicciones > now()
  and not exists (
    select 1
    from public.prediccion as pr
    where pr.partido_id = p.id and pr.usuario_id = (select auth.uid())
  )
order by p.cierre_predicciones, p.inicio, p.id;

-- R13 (nivel 3, D111): solo `authenticated`.
revoke all on table public.mis_pendientes from anon, authenticated;
grant select on table public.mis_pendientes to authenticated;
