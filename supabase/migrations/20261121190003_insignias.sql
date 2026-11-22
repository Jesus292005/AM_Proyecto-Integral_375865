-- T94 — Insignias: catálogo, obtenidas, Vitrina y "vista" (F14 R1, R2, R4, R7–R9; D108).
-- Las otorga `otorgar_insignias()` (T95); aquí solo los datos y lo que la app lee.

-- ---------------------------------------------------------------------------
-- Catálogo (R1–R2). Vive en el servidor (D52): la app pinta lo que llega.
-- ---------------------------------------------------------------------------

create table public.insignia (
  id smallint generated always as identity primary key,
  codigo text not null unique,
  nombre text not null,
  descripcion text not null, -- cómo se gana
  nivel public.nivel_metal not null,
  icono text not null, -- nombre de `Icono` en la app
  repetible boolean not null,
  orden smallint not null unique -- lugar en la Vitrina
);

insert into public.insignia (codigo, nombre, descripcion, nivel, icono, repetible, orden)
values
  ('PRIMER_ACIERTO', 'Primer acierto', 'Gana puntos en una predicción por primera vez.', 'BRONCE', 'check', false, 1),
  ('MARCADOR_EXACTO', 'Visionario', 'Acierta un marcador exacto.', 'PLATA', 'diana', false, 2),
  ('ANALISTA', 'Analista', 'Consigue 70 o más de bono por tu análisis.', 'BRONCE', 'bombilla', false, 3),
  ('RACHA_5', 'En racha', 'Llega a 5 predicciones con puntos seguidas.', 'PLATA', 'llama', false, 4),
  ('RACHA_10', 'Imparable', 'Llega a 10 predicciones con puntos seguidas.', 'ORO', 'llama', false, 5),
  ('TOP_JORNADA', 'Top de la jornada', 'Queda 1.º del ranking de una jornada en un grupo de 3 o más.', 'ORO', 'trofeo', true, 6),
  ('MEJOR_ANALISIS', 'Mejor análisis de la jornada', 'Ten el mayor bono de la jornada en tu grupo (50 o más).', 'PLATA', 'bombilla', true, 7);

-- ---------------------------------------------------------------------------
-- Obtenidas (R4, R5, R7)
-- ---------------------------------------------------------------------------

create table public.insignia_obtenida (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.usuario (id) on delete cascade,
  insignia_id smallint not null references public.insignia (id),
  obtenida_en timestamptz not null default now(),
  -- Solo las de jornada (TOP_JORNADA, MEJOR_ANALISIS). Si el grupo se borra, la insignia se
  -- queda (R4).
  grupo_id bigint references public.grupo (id) on delete set null,
  jornada_id bigint references public.jornada (id) on delete set null,
  partido_id bigint references public.partido (id) on delete set null,
  es_simulada boolean not null, -- R5, decisión 4
  vista_en timestamptz -- R7: vacío = nueva
);

-- R4: una por usuario (personales) o por usuario, grupo y jornada (de jornada).
create unique index insignia_obtenida_personal_unica
  on public.insignia_obtenida (usuario_id, insignia_id) where jornada_id is null;
create unique index insignia_obtenida_jornada_unica
  on public.insignia_obtenida (usuario_id, insignia_id, grupo_id, jornada_id)
  where jornada_id is not null;

-- ---------------------------------------------------------------------------
-- Vitrina (R6, R8): todo el catálogo con lo mío. `security_invoker`: aplica las RLS de abajo y
-- las de `grupo` (el nombre solo si sigo en el grupo).
-- ---------------------------------------------------------------------------

create view public.mis_insignias
with (security_invoker = true)
as
select
  i.codigo,
  i.nombre,
  i.descripcion,
  i.nivel,
  i.icono,
  i.repetible,
  i.orden,
  coalesce(t.veces, 0) as veces,
  coalesce(t.nueva, false) as nueva,
  u.obtenida_en as ultima_en,
  u.es_simulada as ultima_simulada,
  u.grupo as ultimo_grupo,
  u.jornada as ultima_jornada
from public.insignia as i
left join lateral (
  select count(*)::integer as veces, bool_or(o.vista_en is null) as nueva
  from public.insignia_obtenida as o
  where o.insignia_id = i.id and o.usuario_id = (select auth.uid())
) as t on true
left join lateral (
  select o.obtenida_en, o.es_simulada, g.nombre as grupo, j.nombre as jornada
  from public.insignia_obtenida as o
  left join public.grupo as g on g.id = o.grupo_id
  left join public.jornada as j on j.id = o.jornada_id
  where o.insignia_id = i.id and o.usuario_id = (select auth.uid())
  order by o.obtenida_en desc, o.id desc
  limit 1
) as u on true;

-- R7: marca como vistas mis insignias nuevas. Corre con los permisos de quien llama.
create function public.marcar_insignias_vistas()
returns integer
language sql
security invoker
set search_path = ''
as $$
  with marcadas as (
    update public.insignia_obtenida
    set vista_en = now()
    where usuario_id = (select auth.uid()) and vista_en is null
    returning 1
  )
  select count(*)::integer from marcadas;
$$;

-- ---------------------------------------------------------------------------
-- R9: RLS y permisos (nivel 3, D108)
-- ---------------------------------------------------------------------------

alter table public.insignia enable row level security;
alter table public.insignia_obtenida enable row level security;

revoke all on table public.insignia, public.insignia_obtenida, public.mis_insignias
  from anon, authenticated;
grant select on table public.insignia to authenticated;
grant select, update (vista_en) on table public.insignia_obtenida to authenticated;
grant select on table public.mis_insignias to authenticated;
grant select, insert, update, delete on table public.insignia, public.insignia_obtenida
  to service_role;

create policy "Usuarios autenticados leen el catálogo de insignias"
  on public.insignia for select to authenticated using (true);
create policy "Cada usuario lee sus insignias"
  on public.insignia_obtenida for select to authenticated
  using (usuario_id = (select auth.uid()));
create policy "Cada usuario marca sus insignias como vistas"
  on public.insignia_obtenida for update to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

revoke execute on function public.marcar_insignias_vistas() from public, anon;
grant execute on function public.marcar_insignias_vistas() to authenticated;
