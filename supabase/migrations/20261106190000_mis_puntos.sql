-- T57 — Historial con desglose (F10 R2): una fila por predicción con los puntos y los estados que la
-- app muestra tal cual (D52: la app no suma ni deduce). `security_invoker`: aplica las RLS de
-- `prediccion`, `calificacion` y `evaluacion_ia`, así cada usuario ve solo lo suyo (R8, R9).

create view public.mis_puntos
with (security_invoker = true)
as
select
  pr.id as prediccion_id,
  pr.partido_id,
  c.puntos_resultado,
  c.puntos_rango_goles,
  c.puntos_marcador,
  c.puntos_base,
  -- ACERTADA = todo lo predicho acertó; PARCIAL = alguna parte (incluye el marcador fallado con
  -- partes, D27); FALLADA = ninguna. Sin calificación: ANULADA si el partido se canceló (D44).
  -- Una calificación existente manda aunque el partido cambie después (D47).
  case
    when c.id is null and p.estado = 'CANCELADO' then 'ANULADA'
    when c.id is null then 'SIN_CALIFICAR'
    when c.puntos_base = 0 then 'FALLADA'
    when pr.marcador_local is not null and c.puntos_marcador > 0 then 'ACERTADA'
    when pr.marcador_local is null
      and (pr.resultado is null or c.puntos_resultado > 0)
      and (pr.rango_goles is null or c.puntos_rango_goles > 0) then 'ACERTADA'
    else 'PARCIAL'
  end as estado_prediccion,
  case
    when pr.justificacion is null then 'SIN_JUSTIFICACION'
    when e.id is null then 'PENDIENTE'
    else e.estado::text
  end as estado_bono,
  case when e.estado = 'EVALUADA' then e.puntos_bono end as puntos_bono,
  case when e.estado = 'EVALUADA' then e.explicacion end as explicacion,
  case when e.estado = 'EVALUADA' then e.afirmaciones end as afirmaciones,
  -- Solo base mientras el bono no esté evaluado (R2); null sin calificación.
  c.puntos_base + coalesce(case when e.estado = 'EVALUADA' then e.puntos_bono end, 0) as puntos_total
from public.prediccion as pr
join public.partido as p on p.id = pr.partido_id
left join public.calificacion as c on c.prediccion_id = pr.id
left join public.evaluacion_ia as e on e.prediccion_id = pr.id
-- "Mis" puntos aunque M4 abra las predicciones del grupo (R04): no depende solo de las RLS.
where pr.usuario_id = (select auth.uid());

-- R9: solo `authenticated`, que lee con sus RLS.
revoke all on table public.mis_puntos from anon, authenticated;
grant select on table public.mis_puntos to authenticated;
