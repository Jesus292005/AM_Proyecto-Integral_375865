-- T25 — Detección de finales P3 y datos del partido P4 (F02 A4, CA7; D84, D85).
-- P3 revisa el estado de los partidos que ya debieron terminar; P4 descarga estadísticas y
-- eventos de los terminados y los marca como listos para calificar (F05). Las escrituras van en
-- funciones transaccionales que solo ejecuta `service_role`.

-- ---------------------------------------------------------------------------
-- D84: listo para calificar
-- ---------------------------------------------------------------------------

-- null = P4 pendiente. Se llena al guardar las estadísticas y eventos del partido terminado.
alter table public.partido add column listo_para_calificar_en timestamptz;

-- ---------------------------------------------------------------------------
-- Pendientes (D85): la usan la tarea programada y la función del servidor
-- ---------------------------------------------------------------------------

-- P3: partidos que ya debieron terminar (inicio + 115 min, A4) y siguen sin terminar, solo dentro
-- de las 6 h siguientes al inicio (después los corrige P2). P4: terminados de los últimos 3 días
-- sin datos. Las ventanas evitan gastar consultas en partidos atorados o en los datos viejos.
create function public.partidos_pendientes_de_final(ahora timestamptz)
returns table (proveedor_id integer, estado public.estado_partido)
language sql
stable
set search_path = ''
as $$
  select p.proveedor_id, p.estado
  from public.partido as p
  where p.proveedor_id is not null
    and not p.es_simulado
    and (
      (
        p.estado in ('PROGRAMADO', 'EN_JUEGO')
        and p.inicio <= ahora - interval '115 minutes'
        and p.inicio >= ahora - interval '6 hours'
      )
      or (
        p.estado = 'TERMINADO'
        and p.listo_para_calificar_en is null
        and p.inicio >= ahora - interval '3 days'
      )
    )
  order by p.inicio, p.proveedor_id;
$$;

-- ---------------------------------------------------------------------------
-- P3: estado y marcador de 90 minutos
-- ---------------------------------------------------------------------------

-- `estado` null = estado desconocido en la API (A6): el partido conserva el suyo.
create function public.actualizar_estados_partidos(datos jsonb)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  total integer;
begin
  update public.partido as partido
  set
    estado = coalesce(p.estado, partido.estado),
    goles_local = p.goles_local,
    goles_visitante = p.goles_visitante,
    goles_local_medio_tiempo = p.goles_local_medio_tiempo,
    goles_visitante_medio_tiempo = p.goles_visitante_medio_tiempo,
    sincronizado_en = (datos ->> 'sincronizado_en')::timestamptz
  from jsonb_to_recordset(datos -> 'partidos') as p (
    proveedor_id integer,
    estado public.estado_partido,
    goles_local smallint,
    goles_visitante smallint,
    goles_local_medio_tiempo smallint,
    goles_visitante_medio_tiempo smallint
  )
  where partido.proveedor_id = p.proveedor_id;
  get diagnostics total = row_count;
  return total;
end;
$$;

-- ---------------------------------------------------------------------------
-- P4: estadísticas y eventos (CA7)
-- ---------------------------------------------------------------------------

-- Solo para partidos TERMINADO. Estadísticas: se actualizan por (partido, equipo, tipo); `valor`
-- null = sin dato (D29). Eventos: no tienen clave natural, así que se reemplazan los del partido.
-- Un equipo inexistente deja el id en null y la restricción `not null` aborta todo.
create function public.guardar_datos_partido(datos jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  id_partido bigint;
  estado_partido public.estado_partido;
  total_estadisticas integer;
  total_eventos integer;
begin
  select p.id, p.estado into id_partido, estado_partido
  from public.partido as p
  where p.proveedor_id = (datos ->> 'partido_proveedor_id')::integer;

  if id_partido is null then
    raise exception 'No existe el partido %', datos ->> 'partido_proveedor_id';
  end if;
  if estado_partido <> 'TERMINADO' then
    raise exception 'El partido % no está TERMINADO (%)', datos ->> 'partido_proveedor_id',
      estado_partido;
  end if;

  insert into public.estadistica_partido (partido_id, equipo_id, tipo, valor)
  select id_partido, equipo.id, e.tipo, e.valor
  from jsonb_to_recordset(datos -> 'estadisticas') as e (
    equipo_proveedor_id integer, tipo text, valor text
  )
  left join public.equipo as equipo on equipo.proveedor_id = e.equipo_proveedor_id
  on conflict (partido_id, equipo_id, tipo) do update set valor = excluded.valor;
  get diagnostics total_estadisticas = row_count;

  delete from public.evento_partido where partido_id = id_partido;
  insert into public.evento_partido (
    partido_id, equipo_id, minuto, minuto_agregado, tipo, detalle
  )
  select id_partido, equipo.id, e.minuto, e.minuto_agregado, e.tipo, e.detalle
  from jsonb_to_recordset(datos -> 'eventos') as e (
    equipo_proveedor_id integer,
    minuto smallint,
    minuto_agregado smallint,
    tipo public.tipo_evento,
    detalle text
  )
  left join public.equipo as equipo on equipo.proveedor_id = e.equipo_proveedor_id;
  get diagnostics total_eventos = row_count;

  update public.partido
  set listo_para_calificar_en = (datos ->> 'sincronizado_en')::timestamptz
  where id = id_partido;

  return jsonb_build_object('estadisticas', total_estadisticas, 'eventos', total_eventos);
end;
$$;

revoke execute on function public.partidos_pendientes_de_final(timestamptz)
  from public, anon, authenticated;
revoke execute on function public.actualizar_estados_partidos(jsonb)
  from public, anon, authenticated;
revoke execute on function public.guardar_datos_partido(jsonb) from public, anon, authenticated;
grant execute on function public.partidos_pendientes_de_final(timestamptz) to service_role;
grant execute on function public.actualizar_estados_partidos(jsonb) to service_role;
grant execute on function public.guardar_datos_partido(jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Tarea programada cada 15 min (A4, D85)
-- ---------------------------------------------------------------------------

-- Solo llama a la función si hay pendientes: sin ellos no hay llamada ni registro vacío. Usa los
-- mismos secretos de Vault que la actualización diaria (D83).
select cron.schedule(
  'detectar-finales',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'url_proyecto')
      || '/functions/v1/detectar-finales',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'clave_secreta')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  )
  where exists (select 1 from public.partidos_pendientes_de_final(now()));
  $$
);
