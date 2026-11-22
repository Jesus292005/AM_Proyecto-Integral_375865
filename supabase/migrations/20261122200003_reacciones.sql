-- T118 — Reacciones a los análisis del muro (F26 R13, R18, R19; D113).
-- Son del muro de cada grupo: una por persona, análisis y grupo (decisión 1). Se escriben solo con
-- `reaccionar` y se leen solo como conteos en `muro_jornada` (de los miembros actuales, sin quién
-- reaccionó). No dan puntos, insignias ni racha (P4): nada de esto las lee.

create type public.tipo_reaccion as enum ('BIEN_VISTO', 'BUEN_ANALISIS', 'LA_CLAVO', 'ME_RIO');

-- La llave primaria indexa (`grupo_id`, `prediccion_id`), lo que pide el muro (R19).
create table public.reaccion (
  grupo_id bigint not null references public.grupo (id) on delete cascade,
  prediccion_id bigint not null references public.prediccion (id) on delete cascade,
  usuario_id uuid not null references public.usuario (id) on delete cascade,
  tipo public.tipo_reaccion not null,
  creada_en timestamptz not null default now(),
  primary key (grupo_id, prediccion_id, usuario_id)
);

-- ---------------------------------------------------------------------------
-- Reaccionar (R13): poner, cambiar (otro tipo) o quitar (tipo vacío)
-- ---------------------------------------------------------------------------

create function public.reaccionar(id_grupo bigint, id_prediccion bigint, tipo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  yo uuid := auth.uid();
  autor uuid;
begin
  if yo is null then
    raise exception 'SIN_SESION';
  end if;
  if not exists (
    select 1 from public.miembro_grupo as m where m.grupo_id = id_grupo and m.usuario_id = yo
  ) then
    raise exception 'NO_MIEMBRO';
  end if;
  if tipo is not null and not (tipo = any (enum_range(null::public.tipo_reaccion)::text[])) then
    raise exception 'TIPO_INVALIDO';
  end if;

  -- Debe estar en el muro de ese grupo (las mismas condiciones de `muro_jornada`).
  select pr.usuario_id into autor
  from public.prediccion as pr
  join public.partido as p on p.id = pr.partido_id
  join public.miembro_grupo as m on m.usuario_id = pr.usuario_id and m.grupo_id = id_grupo
  where pr.id = id_prediccion
    and p.cierre_predicciones <= now()
    and p.estado <> 'CANCELADO'
    and nullif(btrim(pr.justificacion), '') is not null;
  if autor is null then
    raise exception 'ANALISIS_NO_DISPONIBLE';
  end if;
  if autor = yo then
    raise exception 'PROPIO';
  end if;

  if tipo is null then
    delete from public.reaccion as r
    where r.grupo_id = id_grupo and r.prediccion_id = id_prediccion and r.usuario_id = yo;
  else
    insert into public.reaccion as r (grupo_id, prediccion_id, usuario_id, tipo)
    values (id_grupo, id_prediccion, yo, tipo::public.tipo_reaccion)
    on conflict (grupo_id, prediccion_id, usuario_id)
    do update set tipo = excluded.tipo, creada_en = now();
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- El muro con los conteos (T117 + R13)
-- ---------------------------------------------------------------------------

drop function public.muro_jornada(bigint, bigint);

create function public.muro_jornada(id_grupo bigint, id_jornada bigint)
returns table (
  prediccion_id bigint,
  partido_id bigint,
  inicio timestamptz,
  estado public.estado_partido,
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
  resultado public.resultado_prediccion,
  rango_goles public.rango_goles,
  marcador_local smallint,
  marcador_visitante smallint,
  justificacion text,
  estado_evaluacion public.estado_evaluacion,
  puntos_bono integer,
  explicacion text,
  es_simulada boolean,
  reacciones_bien_visto integer,
  reacciones_buen_analisis integer,
  reacciones_la_clavo integer,
  reacciones_me_rio integer,
  mi_reaccion public.tipo_reaccion
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
  -- Como `ranking_grupo` (F08 R6): solo jornadas del torneo actual.
  if not exists (
    select 1 from public.jornada as j
    where j.id = id_jornada and j.torneo_id = public.torneo_actual_id()
  ) then
    raise exception 'JORNADA_INVALIDA';
  end if;

  return query
  select
    pr.id,
    p.id,
    p.inicio,
    p.estado,
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
    pr.usuario_id,
    u.nombre,
    u.foto_url,
    pr.usuario_id = yo,
    pr.resultado,
    pr.rango_goles,
    pr.marcador_local,
    pr.marcador_visitante,
    pr.justificacion,
    coalesce(e.estado, 'PENDIENTE'),
    case when e.estado = 'EVALUADA' then e.puntos_bono::integer end,
    case when e.estado = 'EVALUADA' then e.explicacion end,
    p.es_simulado,
    rx.bien_visto,
    rx.buen_analisis,
    rx.la_clavo,
    rx.me_rio,
    rx.mia
  from public.partido as p
  join public.prediccion as pr on pr.partido_id = p.id
  join public.miembro_grupo as autor on autor.usuario_id = pr.usuario_id and autor.grupo_id = id_grupo
  join public.usuario as u on u.id = pr.usuario_id
  join public.equipo as el on el.id = p.equipo_local_id
  join public.equipo as ev on ev.id = p.equipo_visitante_id
  left join public.evaluacion_ia as e on e.prediccion_id = pr.id
  -- Reacciones de este grupo, solo de sus miembros actuales (R13); nunca quién reaccionó.
  left join lateral (
    select
      count(*) filter (where r.tipo = 'BIEN_VISTO')::integer as bien_visto,
      count(*) filter (where r.tipo = 'BUEN_ANALISIS')::integer as buen_analisis,
      count(*) filter (where r.tipo = 'LA_CLAVO')::integer as la_clavo,
      count(*) filter (where r.tipo = 'ME_RIO')::integer as me_rio,
      (array_agg(r.tipo) filter (where r.usuario_id = yo))[1] as mia
    from public.reaccion as r
    join public.miembro_grupo as rm on rm.grupo_id = r.grupo_id and rm.usuario_id = r.usuario_id
    where r.grupo_id = id_grupo and r.prediccion_id = pr.id
  ) as rx on true
  where p.jornada_id = id_jornada
    and p.cierre_predicciones <= now()
    and p.estado <> 'CANCELADO'
    and nullif(btrim(pr.justificacion), '') is not null
  -- Por partido y, dentro de cada uno, las evaluadas primero por bono (R11).
  order by p.inicio, p.id, (e.estado = 'EVALUADA') desc nulls last, e.puntos_bono desc nulls last,
    u.nombre, pr.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos (R18, nivel 3, D113)
-- ---------------------------------------------------------------------------

-- Sin políticas: `authenticated` no lee ni escribe `reaccion` directamente.
alter table public.reaccion enable row level security;
revoke all on table public.reaccion from anon, authenticated;
grant select, insert, update, delete on table public.reaccion to service_role;

revoke execute on function public.reaccionar(bigint, bigint, text) from public, anon;
revoke execute on function public.muro_jornada(bigint, bigint) from public, anon;
grant execute on function public.reaccionar(bigint, bigint, text) to authenticated;
grant execute on function public.muro_jornada(bigint, bigint) to authenticated;
