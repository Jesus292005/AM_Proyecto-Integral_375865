-- T119 — Quién falta por predecir en el grupo (F26 R15, R18; D113).
-- De la jornada actual (D86), los partidos abiertos (`PROGRAMADO` o `POSPUESTO` con el cierre por
-- delante, como `mis_pendientes`, F17 R4) y, por miembro actual, **cuántos** le faltan (decisión 2).
-- `security definer`: cuenta predicciones ajenas de partidos abiertos (R04 no deja leerlas) y solo
-- entrega números: nunca qué partidos ni qué predijo nadie.

create function public.faltan_por_predecir(id_grupo bigint)
returns table (
  usuario_id uuid,
  faltan integer,
  abiertos integer,
  jornada_id bigint,
  jornada_nombre text
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

  -- Sin torneo o jornada actual, cada miembro sale con 0 de 0.
  return query
  with actual as (
    select j.id, j.nombre
    from public.jornada as j
    where j.torneo_id = public.torneo_actual_id() and j.orden = public.jornada_actual()
  ),
  partidos_abiertos as (
    select p.id
    from public.partido as p
    join actual as a on a.id = p.jornada_id
    where p.estado in ('PROGRAMADO', 'POSPUESTO') and p.cierre_predicciones > now()
  )
  select
    m.usuario_id,
    (
      select count(*) from partidos_abiertos as ab
      where not exists (
        select 1 from public.prediccion as pr
        where pr.partido_id = ab.id and pr.usuario_id = m.usuario_id
      )
    )::integer,
    (select count(*) from partidos_abiertos)::integer,
    (select a.id from actual as a),
    (select a.nombre from actual as a)
  from public.miembro_grupo as m
  where m.grupo_id = id_grupo
  order by m.usuario_id;
end;
$$;

-- R18 (nivel 3, D113): `authenticated` sí; `anon` no.
revoke execute on function public.faltan_por_predecir(bigint) from public, anon;
grant execute on function public.faltan_por_predecir(bigint) to authenticated;
