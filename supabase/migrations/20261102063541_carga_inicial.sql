-- T23 — Carga inicial P1 (F02 A4, R1, R5, R7).
-- Guarda en una sola transacción lo que la función del servidor ya validó y convirtió: si algo
-- falla, no queda nada a medias. Idempotente: todo se identifica por `proveedor_id` (R1).
-- Solo la ejecuta `service_role` (la función del servidor con la clave secreta).

create function public.guardar_carga_inicial(carga jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  datos_torneo jsonb := carga -> 'torneo';
  marcar_actual boolean := (carga #>> '{torneo,es_actual}')::boolean;
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
    proveedor_id, torneo_id, jornada_id, equipo_local_id, equipo_visitante_id, inicio, estado,
    goles_local, goles_visitante, goles_local_medio_tiempo, goles_visitante_medio_tiempo,
    sincronizado_en
  )
  select
    p.proveedor_id, id_torneo, jornada.id, local.id, visitante.id, p.inicio,
    coalesce(p.estado, 'PROGRAMADO'),
    p.goles_local, p.goles_visitante, p.goles_local_medio_tiempo, p.goles_visitante_medio_tiempo,
    (carga ->> 'sincronizado_en')::timestamptz
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
