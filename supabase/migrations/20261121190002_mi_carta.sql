-- T93 — Carta de jugador (F20 R1–R6, D108). Una fila con mis atributos, mi media y mi nivel,
-- calculados en cada lectura (R5, D52). Histórica (decisión 3): todas mis predicciones
-- calificadas, de cualquier torneo, como la racha (D101). `security_invoker` + `auth.uid()`:
-- solo lo propio, aunque R04 deje leer predicciones del grupo (R6).

-- Nivel de la carta y de las insignias (F14 R2).
create type public.nivel_metal as enum ('BRONCE', 'PLATA', 'ORO');

create view public.mi_carta
with (security_invoker = true)
as
with mias as (
  select c.puntos_base, c.es_simulada
  from public.prediccion as pr
  join public.calificacion as c on c.prediccion_id = pr.id
  where pr.usuario_id = (select auth.uid())
),
bonos as (
  select e.puntos_bono, e.es_simulada
  from public.prediccion as pr
  join public.evaluacion_ia as e on e.prediccion_id = pr.id
  where pr.usuario_id = (select auth.uid()) and e.estado = 'EVALUADA'
),
resumen as (
  select
    count(*)::integer as calificadas,
    count(*) filter (where puntos_base > 0) as aciertos,
    avg(puntos_base) as promedio_base,
    coalesce(bool_or(es_simulada), false) as con_simulados
  from mias
),
-- R1: cada atributo es 40 + redondeo(59 × tasa), de 40 a 99.
atributos as (
  select
    r.calificadas,
    case when r.calificadas > 0
      then 40 + round(59 * r.aciertos::numeric / r.calificadas)::integer end as "precision",
    case when r.calificadas > 0
      then 40 + round(59 * r.promedio_base / 350)::integer end as punteria,
    (select 40 + round(59 * avg(b.puntos_bono) / 100)::integer from bonos as b having count(*) > 0)
      as analisis,
    case when r.calificadas > 0
      then 40 + round(59 * least((select mejor_racha from public.mi_racha), 10)::numeric / 10)::integer
    end as constancia,
    r.con_simulados or coalesce((select bool_or(b.es_simulada) from bonos as b), false)
      as incluye_simulados
  from resumen as r
),
-- R2–R3: la media promedia los atributos con valor y solo existe desde 5 calificadas.
con_media as (
  select
    a.*,
    case when a.calificadas >= 5 then round(
      (a."precision" + a.punteria + a.constancia + coalesce(a.analisis, 0))::numeric
        / (3 + (a.analisis is not null)::integer)
    )::integer end as media
  from atributos as a
)
select
  calificadas,
  "precision",
  punteria,
  analisis,
  constancia,
  media,
  case
    when media >= 80 then 'ORO'
    when media >= 65 then 'PLATA'
    when media is not null then 'BRONCE'
  end::public.nivel_metal as nivel,
  incluye_simulados
from con_media;

-- R6 (nivel 3, D108): solo `authenticated`, que lee con sus RLS.
revoke all on table public.mi_carta from anon, authenticated;
grant select on table public.mi_carta to authenticated;
