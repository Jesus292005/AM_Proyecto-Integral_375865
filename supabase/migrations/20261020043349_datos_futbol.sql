-- T05 — Datos de fútbol (03-data-model §2, F02 parte A).
-- Los llenan las funciones del servidor (service_role, que ignora RLS); los usuarios
-- autenticados solo leen. `sincronizacion` es operativa y queda cerrada para los usuarios.
-- Todas las fechas en UTC (timestamptz, R3). `proveedor_id` = identificador en API-Football.

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

create type public.fase_jornada as enum ('REGULAR', 'LIGUILLA');

-- F02 A6
create type public.estado_partido as enum (
  'PROGRAMADO', 'EN_JUEGO', 'TERMINADO', 'POSPUESTO', 'CANCELADO'
);

create type public.tipo_evento as enum ('GOL', 'TARJETA', 'CAMBIO', 'VAR');

-- F02 A4: un tipo por proceso (P1–P4)
create type public.tipo_sincronizacion as enum (
  'CARGA_INICIAL', 'ACTUALIZACION_DIARIA', 'DETECCION_FINALES', 'DATOS_PARTIDO'
);

-- DETENIDA_POR_TOPE = alerta de R4 (90 consultas en el día)
create type public.estado_sincronizacion as enum (
  'EN_CURSO', 'EXITO', 'ERROR', 'DETENIDA_POR_TOPE'
);

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.liga (
  id bigint generated always as identity primary key,
  proveedor_id integer not null unique,
  nombre text not null,
  pais text not null
);

-- Una mitad de temporada con su propio campeón (Apertura / Clausura).
create table public.torneo (
  id bigint generated always as identity primary key,
  liga_id bigint not null references public.liga (id),
  nombre text not null,
  temporada_proveedor integer not null,
  prefijo_rondas text not null,
  fecha_inicio timestamptz not null,
  fecha_fin timestamptz not null,
  es_actual boolean not null default false,
  constraint torneo_unico unique (liga_id, temporada_proveedor, prefijo_rondas),
  constraint torneo_fechas check (fecha_fin >= fecha_inicio)
);

-- Un solo torneo actual por liga.
create unique index torneo_un_actual_por_liga on public.torneo (liga_id) where es_actual;

-- F02 A7: orden 1–17 = fase regular; 18 en adelante = una jornada por ronda de liguilla (D57).
create table public.jornada (
  id bigint generated always as identity primary key,
  torneo_id bigint not null references public.torneo (id),
  orden smallint not null check (orden >= 1),
  nombre text not null,
  nombres_proveedor text[] not null check (cardinality(nombres_proveedor) >= 1),
  fase public.fase_jornada not null,
  fecha_inicio timestamptz not null,
  fecha_fin timestamptz not null,
  esta_cerrada boolean not null default false,
  constraint jornada_unica unique (torneo_id, orden),
  constraint jornada_fase_segun_orden check ((fase = 'REGULAR') = (orden <= 17)),
  constraint jornada_fechas check (fecha_fin >= fecha_inicio)
);

-- Colores cargados a mano (D70); si faltan, la app usa un color neutro.
create table public.equipo (
  id bigint generated always as identity primary key,
  proveedor_id integer not null unique,
  nombre text not null,
  nombre_corto text not null,
  escudo_url text not null,
  color_primario text check (color_primario ~ '^#[0-9A-Fa-f]{6}$'),
  color_texto text check (color_texto ~ '^#[0-9A-Fa-f]{6}$')
);

-- Marcador de 90 minutos (R2, D43). Los partidos simulados (F09) no vienen de la API.
create table public.partido (
  id bigint generated always as identity primary key,
  proveedor_id integer unique,
  torneo_id bigint not null references public.torneo (id),
  jornada_id bigint not null references public.jornada (id),
  equipo_local_id bigint not null references public.equipo (id),
  equipo_visitante_id bigint not null references public.equipo (id),
  inicio timestamptz not null,
  estado public.estado_partido not null default 'PROGRAMADO',
  goles_local smallint check (goles_local >= 0),
  goles_visitante smallint check (goles_visitante >= 0),
  goles_local_medio_tiempo smallint check (goles_local_medio_tiempo >= 0),
  goles_visitante_medio_tiempo smallint check (goles_visitante_medio_tiempo >= 0),
  es_simulado boolean not null default false,
  partido_origen_id bigint references public.partido (id),
  calificado_en timestamptz,
  sincronizado_en timestamptz not null,
  constraint partido_equipos_distintos check (equipo_local_id <> equipo_visitante_id),
  constraint partido_proveedor_o_simulado check (proveedor_id is not null or es_simulado)
);

-- S02: partidos de una jornada ordenados por hora.
create index partido_jornada_inicio_idx on public.partido (jornada_id, inicio);
-- P3: partidos que ya debieron terminar y no están TERMINADO.
create index partido_estado_inicio_idx on public.partido (estado, inicio);

-- `valor` tal como lo manda la API ("55%", "12", "0.85"); null = sin dato, nunca 0 (D29).
create table public.estadistica_partido (
  id bigint generated always as identity primary key,
  partido_id bigint not null references public.partido (id),
  equipo_id bigint not null references public.equipo (id),
  tipo text not null,
  valor text,
  constraint estadistica_partido_unica unique (partido_id, equipo_id, tipo)
);

create table public.evento_partido (
  id bigint generated always as identity primary key,
  partido_id bigint not null references public.partido (id),
  equipo_id bigint not null references public.equipo (id),
  minuto smallint not null check (minuto >= 0),
  minuto_agregado smallint check (minuto_agregado >= 0),
  tipo public.tipo_evento not null,
  detalle text not null
);

create index evento_partido_partido_idx on public.evento_partido (partido_id);

-- R8: un registro por ejecución. R4 cuenta las consultas del día con `inicio`.
create table public.sincronizacion (
  id bigint generated always as identity primary key,
  tipo public.tipo_sincronizacion not null,
  inicio timestamptz not null default now(),
  fin timestamptz,
  estado public.estado_sincronizacion not null default 'EN_CURSO',
  consultas_usadas smallint not null default 0 check (consultas_usadas >= 0),
  error text,
  constraint sincronizacion_fechas check (fin is null or fin >= inicio)
);

create index sincronizacion_inicio_idx on public.sincronizacion (inicio);

-- ---------------------------------------------------------------------------
-- Seguridad: RLS + permisos explícitos (el proyecto no expone tablas nuevas solo)
-- ---------------------------------------------------------------------------

alter table public.liga enable row level security;
alter table public.torneo enable row level security;
alter table public.jornada enable row level security;
alter table public.equipo enable row level security;
alter table public.partido enable row level security;
alter table public.estadistica_partido enable row level security;
alter table public.evento_partido enable row level security;
alter table public.sincronizacion enable row level security;

-- Sin acceso para `anon` (F01 V6) ni escritura para `authenticated` (F02 B-R2).
revoke all on table
  public.liga, public.torneo, public.jornada, public.equipo, public.partido,
  public.estadistica_partido, public.evento_partido, public.sincronizacion
from anon, authenticated;

grant select on table
  public.liga, public.torneo, public.jornada, public.equipo, public.partido,
  public.estadistica_partido, public.evento_partido
to authenticated;

-- Funciones del servidor (sincronización).
grant select, insert, update, delete on table
  public.liga, public.torneo, public.jornada, public.equipo, public.partido,
  public.estadistica_partido, public.evento_partido, public.sincronizacion
to service_role;

create policy "Usuarios autenticados leen ligas"
  on public.liga for select to authenticated using (true);
create policy "Usuarios autenticados leen torneos"
  on public.torneo for select to authenticated using (true);
create policy "Usuarios autenticados leen jornadas"
  on public.jornada for select to authenticated using (true);
create policy "Usuarios autenticados leen equipos"
  on public.equipo for select to authenticated using (true);
create policy "Usuarios autenticados leen partidos"
  on public.partido for select to authenticated using (true);
create policy "Usuarios autenticados leen estadísticas de partido"
  on public.estadistica_partido for select to authenticated using (true);
create policy "Usuarios autenticados leen eventos de partido"
  on public.evento_partido for select to authenticated using (true);
-- `sincronizacion`: sin políticas → cerrada para todos salvo service_role.
