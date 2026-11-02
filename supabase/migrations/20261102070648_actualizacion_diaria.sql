-- T24 — Actualización diaria P2 (F02 A4, R9, CA8; D82, D83).
-- P2 reutiliza `guardar_carga_inicial` (la misma carga con el torneo actual). Esta migración agrega
-- el cierre de predicciones propio de cada partido y programa P2 todos los días.

-- ---------------------------------------------------------------------------
-- D82: cierre de predicciones
-- ---------------------------------------------------------------------------

-- Nace igual a `inicio`. Si el horario cambia antes del cierre, el nuevo inicio es el nuevo cierre;
-- si cambia después (predicciones ya cerradas y visibles), el cierre no se mueve (R9, D46).
alter table public.partido add column cierre_predicciones timestamptz;
update public.partido set cierre_predicciones = inicio;
alter table public.partido alter column cierre_predicciones set not null;

create or replace function public.guardar_carga_inicial(carga jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  datos_torneo jsonb := carga -> 'torneo';
  marcar_actual boolean := (carga #>> '{torneo,es_actual}')::boolean;
  -- "Ahora" para R9: la hora de la sincronización que manda el servidor.
  sincronizado timestamptz := (carga ->> 'sincronizado_en')::timestamptz;
  id_liga bigint;
  id_torneo bigint;
  total_equipos integer;
  total_jornadas integer;
  total_partidos integer;
begin
  insert into public.liga (proveedor_id, nombre, pais)
  values (
    (carga #>> '{liga,proveedor_id}')::integer,
    carga #>> '{liga,nombre}',
    carga #>> '{liga,pais}'
  )
  on conflict (proveedor_id) do update set nombre = excluded.nombre, pais = excluded.pais
  returning id into id_liga;

  -- Un solo torneo actual por liga: se desmarca el anterior antes de marcar este.
  if marcar_actual then
    update public.torneo
    set es_actual = false
    where liga_id = id_liga
      and es_actual
      and (temporada_proveedor, prefijo_rondas) is distinct from (
        (datos_torneo ->> 'temporada_proveedor')::integer,
        datos_torneo ->> 'prefijo_rondas'
      );
  end if;

  insert into public.torneo (
    liga_id, nombre, temporada_proveedor, prefijo_rondas, fecha_inicio, fecha_fin, es_actual
  )
  values (
    id_liga,
    datos_torneo ->> 'nombre',
    (datos_torneo ->> 'temporada_proveedor')::integer,
    datos_torneo ->> 'prefijo_rondas',
    (datos_torneo ->> 'fecha_inicio')::timestamptz,
    (datos_torneo ->> 'fecha_fin')::timestamptz,
    marcar_actual
  )
  on conflict (liga_id, temporada_proveedor, prefijo_rondas) do update set
    nombre = excluded.nombre,
    fecha_inicio = excluded.fecha_inicio,
    fecha_fin = excluded.fecha_fin,
    -- Una carga sin `es_actual` no desmarca el torneo; solo lo desmarca la de otro.
    es_actual = public.torneo.es_actual or excluded.es_actual
  returning id into id_torneo;

  -- Los colores se cargan a mano (D70) y no se tocan.
  insert into public.equipo (proveedor_id, nombre, nombre_corto, escudo_url)
  select e.proveedor_id, e.nombre, e.nombre_corto, e.escudo_url
  from jsonb_to_recordset(carga -> 'equipos') as e (
    proveedor_id integer, nombre text, nombre_corto text, escudo_url text
  )
  on conflict (proveedor_id) do update set
    nombre = excluded.nombre,
    nombre_corto = excluded.nombre_corto,
    escudo_url = excluded.escudo_url;
  get diagnostics total_equipos = row_count;

  -- `esta_cerrada` lo maneja la calificación (F05) y no se toca.
  insert into public.jornada (
    torneo_id, orden, nombre, nombres_proveedor, fase, fecha_inicio, fecha_fin
  )
  select id_torneo, j.orden, j.nombre, j.nombres_proveedor, j.fase, j.fecha_inicio, j.fecha_fin
  from jsonb_to_recordset(carga -> 'jornadas') as j (
    orden smallint,
    nombre text,
    nombres_proveedor text[],
    fase public.fase_jornada,
    fecha_inicio timestamptz,
    fecha_fin timestamptz
  )
  on conflict (torneo_id, orden) do update set
    nombre = excluded.nombre,
    nombres_proveedor = excluded.nombres_proveedor,
    fase = excluded.fase,
    fecha_inicio = excluded.fecha_inicio,
    fecha_fin = excluded.fecha_fin;
  get diagnostics total_jornadas = row_count;

  -- `left join`: una jornada o un equipo que no exista deja el id en null y la restricción
  -- `not null` aborta toda la carga, en vez de omitir el partido sin avisar.
  -- `estado` null = estado desconocido en la API (A6): un partido nuevo entra como PROGRAMADO y
  -- uno existente conserva el suyo (se actualiza aparte, abajo).
  insert into public.partido (
    proveedor_id, torneo_id, jornada_id, equipo_local_id, equipo_visitante_id, inicio,
    cierre_predicciones, estado,
    goles_local, goles_visitante, goles_local_medio_tiempo, goles_visitante_medio_tiempo,
    sincronizado_en
  )
  select
    p.proveedor_id, id_torneo, jornada.id, local.id, visitante.id, p.inicio,
    p.inicio, coalesce(p.estado, 'PROGRAMADO'),
    p.goles_local, p.goles_visitante, p.goles_local_medio_tiempo, p.goles_visitante_medio_tiempo,
    sincronizado
  from jsonb_to_recordset(carga -> 'partidos') as p (
    proveedor_id integer,
    jornada_orden smallint,
    equipo_local_proveedor_id integer,
    equipo_visitante_proveedor_id integer,
    inicio timestamptz,
    estado public.estado_partido,
    goles_local smallint,
    goles_visitante smallint,
    goles_local_medio_tiempo smallint,
    goles_visitante_medio_tiempo smallint
  )
  left join public.jornada as jornada
    on jornada.torneo_id = id_torneo and jornada.orden = p.jornada_orden
  left join public.equipo as local on local.proveedor_id = p.equipo_local_proveedor_id
  left join public.equipo as visitante on visitante.proveedor_id = p.equipo_visitante_proveedor_id
  on conflict (proveedor_id) do update set
    torneo_id = excluded.torneo_id,
    jornada_id = excluded.jornada_id,
    equipo_local_id = excluded.equipo_local_id,
    equipo_visitante_id = excluded.equipo_visitante_id,
    inicio = excluded.inicio,
    -- R9, D46: el nuevo horario mueve el cierre solo si las predicciones siguen abiertas.
    cierre_predicciones = case
      when sincronizado < public.partido.cierre_predicciones then excluded.inicio
      else public.partido.cierre_predicciones
    end,
    goles_local = excluded.goles_local,
    goles_visitante = excluded.goles_visitante,
    goles_local_medio_tiempo = excluded.goles_local_medio_tiempo,
    goles_visitante_medio_tiempo = excluded.goles_visitante_medio_tiempo,
    sincronizado_en = excluded.sincronizado_en;
  get diagnostics total_partidos = row_count;

  update public.partido as partido
  set estado = p.estado
  from jsonb_to_recordset(carga -> 'partidos') as p (
    proveedor_id integer, estado public.estado_partido
  )
  where partido.proveedor_id = p.proveedor_id
    and p.estado is not null
    and partido.estado is distinct from p.estado;

  return jsonb_build_object(
    'equipos', total_equipos,
    'jornadas', total_jornadas,
    'partidos', total_partidos
  );
end;
$$;

revoke execute on function public.guardar_carga_inicial(jsonb) from public, anon, authenticated;
grant execute on function public.guardar_carga_inicial(jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Tarea programada (F02 Q1, D83)
-- ---------------------------------------------------------------------------

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- 06:00 en Tijuana = 14:00 UTC en horario de invierno (desde el 1 de noviembre); en horario de
-- verano (desde el 14 de marzo de 2027) corre a las 07:00 (D83). La URL del proyecto y la clave
-- secreta se guardan en Vault a mano (`url_proyecto`, `clave_secreta`), nunca en el repo.
select cron.schedule(
  'actualizacion-diaria',
  '0 14 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'url_proyecto')
      || '/functions/v1/actualizacion-diaria',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'clave_secreta')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
