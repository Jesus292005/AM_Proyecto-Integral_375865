-- T120 — Racha y carta de cualquier compañero de grupo y `perfil_usuario` (F19 R1, R5–R7; D113).
-- Una sola fórmula (R5): la racha (F13 R1–R5) y la carta (F20 R1–R4) se calculan en `racha_de` y
-- `carta_de`, que también usan `mi_racha` y `mi_carta`; esas vistas no cambian de columnas ni de
-- resultado. Las funciones son `security definer` (leen calificaciones y evaluaciones ajenas) y
-- solo calculan para la persona misma o para alguien que comparte hoy un grupo con quien consulta
-- (`comparte_grupo`, F07 R12); si no, `NO_ENCONTRADO`, igual que un id que no existe (R1).
-- Cambia F13 R8 y F20 R6 ("sin security definer"), aprobado con F19 R7 (D113).

-- ---------------------------------------------------------------------------
-- Racha (F13)
-- ---------------------------------------------------------------------------

create function public.racha_de(id_usuario uuid)
returns table (
  racha_actual integer,
  mejor_racha integer,
  incluye_simulados boolean,
  ultima_calificacion timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  -- Sin sesión, la vista propia sigue dando 0 y 0 (F13 R6): `id_usuario` y `auth.uid()` vacíos.
  if id_usuario is distinct from auth.uid() and not public.comparte_grupo(id_usuario) then
    raise exception 'NO_ENCONTRADO';
  end if;

  return query
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
    where pr.usuario_id = id_usuario
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
end;
$$;

create or replace view public.mi_racha
with (security_invoker = true)
as
select * from public.racha_de((select auth.uid()));

-- ---------------------------------------------------------------------------
-- Carta (F20)
-- ---------------------------------------------------------------------------

create function public.carta_de(id_usuario uuid)
returns table (
  calificadas integer,
  "precision" integer,
  punteria integer,
  analisis integer,
  constancia integer,
  media integer,
  nivel public.nivel_metal,
  incluye_simulados boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if id_usuario is distinct from auth.uid() and not public.comparte_grupo(id_usuario) then
    raise exception 'NO_ENCONTRADO';
  end if;

  return query
  with mias as (
    select c.puntos_base, c.es_simulada
    from public.prediccion as pr
    join public.calificacion as c on c.prediccion_id = pr.id
    where pr.usuario_id = id_usuario
  ),
  bonos as (
    select e.puntos_bono, e.es_simulada
    from public.prediccion as pr
    join public.evaluacion_ia as e on e.prediccion_id = pr.id
    where pr.usuario_id = id_usuario and e.estado = 'EVALUADA'
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
        then 40 + round(59 * least((select r.mejor_racha from public.racha_de(id_usuario) as r), 10)::numeric / 10)::integer
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
end;
$$;

create or replace view public.mi_carta
with (security_invoker = true)
as
select * from public.carta_de((select auth.uid()));

-- ---------------------------------------------------------------------------
-- Perfil de otro usuario para S13 (R6)
-- ---------------------------------------------------------------------------

create function public.perfil_usuario(id_usuario uuid)
returns table (
  usuario_id uuid,
  nombre text,
  foto_url text,
  es_yo boolean,
  equipo_nombre_corto text,
  equipo_escudo_url text,
  equipo_color_primario text,
  equipo_color_texto text,
  racha_actual integer,
  mejor_racha integer,
  racha_incluye_simulados boolean,
  ultima_calificacion timestamptz,
  calificadas integer,
  "precision" integer,
  punteria integer,
  analisis integer,
  constancia integer,
  media integer,
  nivel public.nivel_metal,
  carta_incluye_simulados boolean
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
  -- R1: el mismo error para quien no existe y para quien no comparte grupo conmigo.
  if id_usuario is distinct from yo and not public.comparte_grupo(id_usuario) then
    raise exception 'NO_ENCONTRADO';
  end if;

  return query
  select
    u.id,
    u.nombre,
    u.foto_url,
    u.id = yo,
    e.nombre_corto,
    e.escudo_url,
    e.color_primario,
    e.color_texto,
    r.racha_actual,
    r.mejor_racha,
    r.incluye_simulados,
    r.ultima_calificacion,
    c.calificadas,
    c."precision",
    c.punteria,
    c.analisis,
    c.constancia,
    c.media,
    c.nivel,
    c.incluye_simulados
  from public.usuario as u
  left join public.equipo as e on e.id = u.equipo_favorito_id
  cross join lateral public.racha_de(u.id) as r
  cross join lateral public.carta_de(u.id) as c
  where u.id = id_usuario;

  if not found then
    raise exception 'NO_ENCONTRADO';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos (F19 R7, nivel 3, D113)
-- ---------------------------------------------------------------------------

revoke execute on function public.racha_de(uuid) from public, anon;
revoke execute on function public.carta_de(uuid) from public, anon;
revoke execute on function public.perfil_usuario(uuid) from public, anon;

-- `mi_racha` y `mi_carta` (security_invoker) las llaman con el rol de quien consulta; ellas mismas
-- comprueban a quién se le puede calcular.
grant execute on function public.racha_de(uuid) to authenticated;
grant execute on function public.carta_de(uuid) to authenticated;
grant execute on function public.perfil_usuario(uuid) to authenticated;
