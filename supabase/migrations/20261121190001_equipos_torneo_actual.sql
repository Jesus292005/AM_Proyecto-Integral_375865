-- T92 — Equipos del torneo actual para elegir el favorito (F18 R1, R3, R4; D108).
-- Cada equipo con algún partido del torneo actual, una vez. `security_invoker`: aplica las RLS
-- de `equipo`, `partido` y `torneo`, que ya leen todos los usuarios autenticados (F02). El
-- favorito se guarda con el permiso que ya existe (`update (equipo_favorito_id)`, F01 V3).

create view public.equipos_torneo_actual
with (security_invoker = true)
as
select e.id, e.nombre_corto, e.escudo_url, e.color_primario, e.color_texto
from public.equipo as e
where exists (
  select 1
  from public.partido as p
  join public.torneo as t on t.id = p.torneo_id
  where t.es_actual and e.id in (p.equipo_local_id, p.equipo_visitante_id)
);

-- R4 (nivel 3, D108): solo `authenticated`.
revoke all on table public.equipos_torneo_actual from anon, authenticated;
grant select on table public.equipos_torneo_actual to authenticated;
