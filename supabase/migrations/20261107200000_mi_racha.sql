-- T77 — Rachas de aciertos (F13, D101). Una fila con mi racha actual y mi mejor racha, calculadas
-- en cada lectura a partir de mis calificaciones (R6, D52). `security_invoker`: aplica las RLS de
-- `prediccion` y `calificacion`, y además filtra por `auth.uid()` (R8), así que nunca mezcla las
-- predicciones del grupo que abrió R04.
--
-- Decisiones de D101: acierto = puntos base > 0 (1); solo cuentan mis predicciones calificadas,
-- así que un partido sin predecir o cancelado no rompe nada (2, D44); histórica, de todos los
-- torneos (3); los simulados cuentan (4).

create view public.mi_racha
with (security_invoker = true)
as
with mias as (
  select
    c.puntos_base > 0 as acierto,
    c.es_simulada,
    c.calificada_en,
    p.inicio,
    p.id as partido_id
  from public.prediccion as pr
  join public.calificacion as c on c.prediccion_id = pr.id
  join public.partido as p on p.id = pr.partido_id
  where pr.usuario_id = (select auth.uid())
),
-- R1: en orden de inicio del partido. Los aciertos con el mismo número de fallos antes forman
-- una racha.
ordenadas as (
  select
    acierto,
    es_simulada,
    sum(case when acierto then 0 else 1 end)
      over (order by inicio, partido_id rows between unbounded preceding and current row)
      as fallos_antes
  from mias
),
rachas as (
  select fallos_antes, count(*)::integer as largo, bool_or(es_simulada) as con_simulados
  from ordenadas
  where acierto
  group by fallos_antes
),
-- R4: la racha actual son los aciertos después del último fallo.
totales as (
  select
    (select count(*) from mias where not acierto) as fallos,
    (select max(largo) from rachas) as mejor
)
select
  coalesce((select r.largo from rachas as r, totales as t where r.fallos_antes = t.fallos), 0)
    as racha_actual,
  coalesce((select mejor from totales), 0) as mejor_racha,
  -- R5: alguna calificación simulada está en la racha actual o en una de las mejores.
  coalesce(
    (
      select bool_or(r.con_simulados)
      from rachas as r, totales as t
      where r.fallos_antes = t.fallos or r.largo = t.mejor
    ),
    false
  ) as incluye_simulados,
  (select max(calificada_en) from mias) as ultima_calificacion;

-- R8: solo `authenticated`, que lee con sus RLS.
revoke all on table public.mi_racha from anon, authenticated;
grant select on table public.mi_racha to authenticated;
