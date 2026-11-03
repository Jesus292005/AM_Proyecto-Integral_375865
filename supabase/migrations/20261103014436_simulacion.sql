-- T37 — Partidos simulados (F09). El administrador "juega" un partido real ya terminado como si
-- fuera de hoy. Tres funciones `security definer` (R9): son la única forma de crear o modificar un
-- partido desde la app; no se abre `insert`/`update` de `partido` a nadie. Cada una verifica el rol
-- en el servidor (R1) y responde con un error identificable.

-- ---------------------------------------------------------------------------
-- Crear (R2, R3)
-- ---------------------------------------------------------------------------

create function public.simulacion_crear(origen bigint, minutos integer default 30)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  partido_origen public.partido;
  id_torneo bigint;
  id_jornada bigint;
  inicio_simulado timestamptz := now() + make_interval(mins => minutos);
  id_simulado bigint;
begin
  if not exists (select 1 from public.usuario where id = auth.uid() and rol = 'ADMIN') then
    raise exception 'SOLO_ADMIN';
  end if;
  if minutos is null or minutos not in (10, 30, 60) then
    raise exception 'MINUTOS_INVALIDOS';
  end if;

  -- R2: real, terminado y con datos listos (D84).
  select * into partido_origen
  from public.partido
  where id = origen
    and not es_simulado
    and estado = 'TERMINADO'
    and listo_para_calificar_en is not null;
  if not found then
    raise exception 'ORIGEN_INVALIDO';
  end if;

  select id into id_torneo from public.torneo where es_actual order by id limit 1;
  select id into id_jornada
  from public.jornada
  where torneo_id = id_torneo and orden = public.jornada_actual();
  if id_jornada is null then
    raise exception 'SIN_TORNEO_ACTUAL';
  end if;

  insert into public.partido (
    torneo_id, jornada_id, equipo_local_id, equipo_visitante_id, inicio, cierre_predicciones,
    estado, es_simulado, partido_origen_id, sincronizado_en
  )
  values (
    id_torneo, id_jornada, partido_origen.equipo_local_id, partido_origen.equipo_visitante_id,
    inicio_simulado, inicio_simulado, 'PROGRAMADO', true, partido_origen.id, now()
  )
  returning id into id_simulado;

  -- La jornada sigue describiendo a sus partidos; F05 la vuelve a cerrar al calificarlo (R3).
  update public.jornada
  set
    fecha_inicio = least(fecha_inicio, inicio_simulado),
    fecha_fin = greatest(fecha_fin, inicio_simulado),
    esta_cerrada = false
  where id = id_jornada;

  return id_simulado;
end;
$$;

-- ---------------------------------------------------------------------------
-- Iniciar ahora (R4)
-- ---------------------------------------------------------------------------

create function public.simulacion_iniciar(partido bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  simulado public.partido;
begin
  if not exists (select 1 from public.usuario where id = auth.uid() and rol = 'ADMIN') then
    raise exception 'SOLO_ADMIN';
  end if;

  -- El parámetro se califica: `partido` también es el nombre de la tabla.
  select * into simulado
  from public.partido as p
  where p.id = simulacion_iniciar.partido and p.es_simulado
  for update;
  if not found then
    raise exception 'NO_ES_SIMULADO';
  end if;
  if simulado.estado <> 'PROGRAMADO' then
    raise exception 'ESTADO_INVALIDO';
  end if;

  -- Cierra las predicciones al instante (F03 R1).
  update public.partido
  set inicio = now(), cierre_predicciones = now(), estado = 'EN_JUEGO'
  where id = simulado.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Terminar (R5)
-- ---------------------------------------------------------------------------

-- Copia del origen, en una sola transacción, el marcador de 90 min (D43) y el de medio tiempo,
-- las estadísticas y los eventos; queda listo para calificar como uno real (D84).
create function public.simulacion_terminar(partido bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  simulado public.partido;
  partido_origen public.partido;
begin
  if not exists (select 1 from public.usuario where id = auth.uid() and rol = 'ADMIN') then
    raise exception 'SOLO_ADMIN';
  end if;

  select * into simulado
  from public.partido as p
  where p.id = simulacion_terminar.partido and p.es_simulado
  for update;
  if not found then
    raise exception 'NO_ES_SIMULADO';
  end if;
  -- Un terminado no se termina dos veces.
  if simulado.estado not in ('PROGRAMADO', 'EN_JUEGO') then
    raise exception 'ESTADO_INVALIDO';
  end if;
  if simulado.cierre_predicciones > now() then
    raise exception 'AUN_NO_CIERRA';
  end if;

  select * into partido_origen from public.partido where id = simulado.partido_origen_id;

  insert into public.estadistica_partido (partido_id, equipo_id, tipo, valor)
  select simulado.id, equipo_id, tipo, valor
  from public.estadistica_partido
  where partido_id = partido_origen.id;

  insert into public.evento_partido (partido_id, equipo_id, minuto, minuto_agregado, tipo, detalle)
  select simulado.id, equipo_id, minuto, minuto_agregado, tipo, detalle
  from public.evento_partido
  where partido_id = partido_origen.id;

  update public.partido
  set
    estado = 'TERMINADO',
    goles_local = partido_origen.goles_local,
    goles_visitante = partido_origen.goles_visitante,
    goles_local_medio_tiempo = partido_origen.goles_local_medio_tiempo,
    goles_visitante_medio_tiempo = partido_origen.goles_visitante_medio_tiempo,
    listo_para_calificar_en = now()
  where id = simulado.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos (R9): solo usuarios con sesión; el rol lo verifica cada función
-- ---------------------------------------------------------------------------

revoke execute on function public.simulacion_crear(bigint, integer) from public, anon, service_role;
revoke execute on function public.simulacion_iniciar(bigint) from public, anon, service_role;
revoke execute on function public.simulacion_terminar(bigint) from public, anon, service_role;
grant execute on function public.simulacion_crear(bigint, integer) to authenticated;
grant execute on function public.simulacion_iniciar(bigint) to authenticated;
grant execute on function public.simulacion_terminar(bigint) to authenticated;
