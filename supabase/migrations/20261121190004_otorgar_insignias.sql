-- T95 — Otorgar insignias (F14 R1, R3–R5, R9; decisiones 4 y 5 de D108). La corre la tarea
-- programada (20261121190005) como dueño; nadie de la API la ejecuta. Idempotente: los índices
-- únicos de T94 evitan repetir (R4), así que correrla otra vez solo agrega lo nuevo.
-- Decisión 4: los simulados cuentan y quedan marcados (`es_simulada`).

create function public.otorgar_insignias()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  total integer := 0;
  nuevas integer;
begin
  -- -------------------------------------------------------------------------
  -- Personales (R1): la primera vez que se cumple, en orden de inicio del partido.
  -- -------------------------------------------------------------------------

  with calificadas as (
    select pr.usuario_id, p.id as partido_id, p.inicio, c.puntos_base, c.puntos_marcador,
      c.es_simulada
    from public.prediccion as pr
    join public.calificacion as c on c.prediccion_id = pr.id
    join public.partido as p on p.id = pr.partido_id
  ),
  primeras as (
    select distinct on (k.usuario_id, i.id) k.usuario_id, i.id as insignia_id, k.partido_id,
      k.es_simulada
    from calificadas as k
    join public.insignia as i on (i.codigo = 'PRIMER_ACIERTO' and k.puntos_base > 0)
      or (i.codigo = 'MARCADOR_EXACTO' and k.puntos_marcador > 0)
    order by k.usuario_id, i.id, k.inicio, k.partido_id
  )
  insert into public.insignia_obtenida (usuario_id, insignia_id, partido_id, es_simulada)
  select usuario_id, insignia_id, partido_id, es_simulada from primeras
  on conflict (usuario_id, insignia_id) where jornada_id is null do nothing;
  get diagnostics nuevas = row_count;
  total := total + nuevas;

  -- Analista: primer bono de IA de 70 o más.
  insert into public.insignia_obtenida (usuario_id, insignia_id, partido_id, es_simulada)
  select distinct on (pr.usuario_id) pr.usuario_id, i.id, p.id, e.es_simulada
  from public.prediccion as pr
  join public.evaluacion_ia as e on e.prediccion_id = pr.id
  join public.partido as p on p.id = pr.partido_id
  join public.insignia as i on i.codigo = 'ANALISTA'
  where e.estado = 'EVALUADA' and e.puntos_bono >= 70
  order by pr.usuario_id, p.inicio, p.id
  on conflict (usuario_id, insignia_id) where jornada_id is null do nothing;
  get diagnostics nuevas = row_count;
  total := total + nuevas;

  -- Rachas: mejor racha de F13 (mismo cálculo que `mi_racha`, para todos los usuarios). Es
  -- simulada solo si todas las rachas que la cumplen tienen algún simulado.
  with ordenadas as (
    select
      pr.usuario_id,
      c.puntos_base > 0 as acierto,
      c.es_simulada,
      sum(case when c.puntos_base > 0 then 0 else 1 end) over (
        partition by pr.usuario_id order by p.inicio, p.id
        rows between unbounded preceding and current row
      ) as fallos_antes
    from public.prediccion as pr
    join public.calificacion as c on c.prediccion_id = pr.id
    join public.partido as p on p.id = pr.partido_id
  ),
  rachas as (
    select usuario_id, count(*) as largo, bool_or(es_simulada) as con_simulados
    from ordenadas
    where acierto
    group by usuario_id, fallos_antes
  )
  insert into public.insignia_obtenida (usuario_id, insignia_id, es_simulada)
  select r.usuario_id, i.id, bool_and(r.con_simulados)
  from rachas as r
  join (values ('RACHA_5', 5), ('RACHA_10', 10)) as m (codigo, minimo) on r.largo >= m.minimo
  join public.insignia as i on i.codigo = m.codigo
  group by r.usuario_id, i.id
  on conflict (usuario_id, insignia_id) where jornada_id is null do nothing;
  get diagnostics nuevas = row_count;
  total := total + nuevas;

  -- -------------------------------------------------------------------------
  -- De jornada (R3): jornada cerrada (F05 R7), sin evaluaciones pendientes, que terminó después
  -- de crearse el grupo y en los últimos 30 días (no se reparten jornadas viejas a grupos nuevos
  -- ni se recalcula todo el historial cada 15 min). Miembros actuales (R09).
  -- -------------------------------------------------------------------------

  with listas as (
    select j.id, j.torneo_id, j.fecha_fin
    from public.jornada as j
    where j.esta_cerrada
      and j.fecha_fin >= now() - interval '30 days'
      and not exists (
        select 1
        from public.partido as p
        join public.prediccion as pr on pr.partido_id = p.id
        join public.evaluacion_ia as e on e.prediccion_id = pr.id
        where p.jornada_id = j.id and e.estado = 'PENDIENTE'
      )
  ),
  pares as (
    select l.id as jornada_id, l.torneo_id, g.id as grupo_id
    from listas as l
    join public.grupo as g on g.creado_en <= l.fecha_fin
  ),
  -- Decisión 5: "Top de la jornada" solo con 3 o más miembros que predijeron esa jornada.
  con_participantes as (
    select x.*
    from pares as x
    where (
      select count(distinct pr.usuario_id)
      from public.miembro_grupo as m
      join public.prediccion as pr on pr.usuario_id = m.usuario_id
      join public.partido as p on p.id = pr.partido_id
      where m.grupo_id = x.grupo_id and p.jornada_id = x.jornada_id
    ) >= 3
  )
  insert into public.insignia_obtenida (usuario_id, insignia_id, grupo_id, jornada_id, es_simulada)
  select pg.usuario_id, i.id, x.grupo_id, x.jornada_id, pg.con_simulados
  from con_participantes as x
  cross join lateral public.posiciones_grupo(x.grupo_id, x.torneo_id, x.jornada_id) as pg
  join public.insignia as i on i.codigo = 'TOP_JORNADA'
  -- Empates: todos los 1.º (R3). Sin puntos no hay top.
  where pg.posicion = 1 and pg.puntos_total > 0
  on conflict (usuario_id, insignia_id, grupo_id, jornada_id) where jornada_id is not null
  do nothing;
  get diagnostics nuevas = row_count;
  total := total + nuevas;

  -- Mejor análisis: el mayor bono de la jornada entre los miembros del grupo, con 50 o más.
  with listas as (
    select j.id, j.fecha_fin
    from public.jornada as j
    where j.esta_cerrada
      and j.fecha_fin >= now() - interval '30 days'
      and not exists (
        select 1
        from public.partido as p
        join public.prediccion as pr on pr.partido_id = p.id
        join public.evaluacion_ia as e on e.prediccion_id = pr.id
        where p.jornada_id = j.id and e.estado = 'PENDIENTE'
      )
  ),
  bonos as (
    select l.id as jornada_id, m.grupo_id, pr.usuario_id, p.id as partido_id, p.inicio,
      e.puntos_bono, e.es_simulada,
      max(e.puntos_bono) over (partition by l.id, m.grupo_id) as mejor
    from listas as l
    join public.partido as p on p.jornada_id = l.id
    join public.prediccion as pr on pr.partido_id = p.id
    join public.evaluacion_ia as e on e.prediccion_id = pr.id and e.estado = 'EVALUADA'
    join public.miembro_grupo as m on m.usuario_id = pr.usuario_id
    join public.grupo as g on g.id = m.grupo_id and g.creado_en <= l.fecha_fin
  ),
  ganadores as (
    select distinct on (jornada_id, grupo_id, usuario_id) jornada_id, grupo_id, usuario_id,
      partido_id, es_simulada
    from bonos
    where puntos_bono = mejor and mejor >= 50
    order by jornada_id, grupo_id, usuario_id, inicio, partido_id
  )
  insert into public.insignia_obtenida (
    usuario_id, insignia_id, grupo_id, jornada_id, partido_id, es_simulada
  )
  select w.usuario_id, i.id, w.grupo_id, w.jornada_id, w.partido_id, w.es_simulada
  from ganadores as w
  join public.insignia as i on i.codigo = 'MEJOR_ANALISIS'
  on conflict (usuario_id, insignia_id, grupo_id, jornada_id) where jornada_id is not null
  do nothing;
  get diagnostics nuevas = row_count;
  total := total + nuevas;

  return total;
end;
$$;

-- R9 (nivel 3, D108): solo la tarea programada.
revoke execute on function public.otorgar_insignias() from public, anon, authenticated, service_role;
