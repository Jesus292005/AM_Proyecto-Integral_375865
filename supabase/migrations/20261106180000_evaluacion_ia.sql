-- T54 — Evaluación de la justificación con IA (F06): evaluaciones, registro de llamadas y las
-- funciones con las que la función `evaluar` reserva, guarda y reprograma (R8, R10, R11). Sin
-- `security definer`: todo es de `service_role` (R15). 03-data-model v1.6 (R16).

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create type public.estado_evaluacion as enum ('PENDIENTE', 'EVALUADA', 'ERROR');

create table public.evaluacion_ia (
  id bigint generated always as identity primary key,
  -- R1: una por predicción; solo de predicciones calificadas con justificación.
  prediccion_id bigint not null unique references public.prediccion (id) on delete cascade,
  estado public.estado_evaluacion not null default 'PENDIENTE',
  puntos_bono smallint check (puntos_bono between 0 and 100), -- R07: nunca resta
  explicacion text check (char_length(explicacion) between 1 and 300),
  -- [{ texto, veredicto, motivo, evidencia: [ids] }], máx. 5 (R4, R7).
  afirmaciones jsonb not null default '[]'
    check (jsonb_typeof(afirmaciones) = 'array' and jsonb_array_length(afirmaciones) <= 5),
  intentos smallint not null default 0 check (intentos between 0 and 3), -- R8
  siguiente_intento_en timestamptz not null default now(),
  modelo text,
  version_prompt text,
  error text,
  es_simulada boolean not null, -- R08
  creada_en timestamptz not null default now(),
  evaluada_en timestamptz,
  constraint evaluacion_ia_evaluada_completa check (
    (estado = 'EVALUADA') = (
      puntos_bono is not null and explicacion is not null and evaluada_en is not null
      and modelo is not null and version_prompt is not null
    )
  )
);

create index evaluacion_ia_pendientes_idx on public.evaluacion_ia (siguiente_intento_en)
  where estado = 'PENDIENTE';

-- R10: una fila por llamada a la IA, con sus tokens; cuenta para el tope diario.
create table public.llamada_ia (
  id bigint generated always as identity primary key,
  evaluacion_id bigint references public.evaluacion_ia (id) on delete set null,
  inicio timestamptz not null default now(),
  modelo text not null,
  tokens_entrada integer check (tokens_entrada >= 0),
  tokens_salida integer check (tokens_salida >= 0),
  resultado text not null check (resultado in ('OK', 'FALLO')),
  detalle text
);

create index llamada_ia_inicio_idx on public.llamada_ia (inicio);

-- ---------------------------------------------------------------------------
-- Tope diario (R10)
-- ---------------------------------------------------------------------------

-- Llamadas del día UTC de `ahora` (el mismo día de consultas de F02 R4).
create function public.llamadas_ia_hoy(ahora timestamptz)
returns integer
language sql
stable
set search_path = ''
as $$
  select count(*)::integer
  from public.llamada_ia
  where inicio >= date_trunc('day', ahora at time zone 'UTC') at time zone 'UTC';
$$;

-- ---------------------------------------------------------------------------
-- Pendientes (R14): la usa la tarea programada como guardia
-- ---------------------------------------------------------------------------

-- Hay algo que hacer: una predicción calificada con justificación sin evaluación, o una evaluación
-- pendiente que ya toca, y queda tope diario.
create function public.hay_evaluaciones_por_hacer(ahora timestamptz, tope integer)
returns boolean
language sql
stable
set search_path = ''
as $$
  select public.llamadas_ia_hoy(ahora) < tope
    and (
      exists (
        select 1
        from public.calificacion as c
        join public.prediccion as pr on pr.id = c.prediccion_id
        left join public.evaluacion_ia as e on e.prediccion_id = pr.id
        where pr.justificacion is not null and e.id is null
      )
      or exists (
        select 1 from public.evaluacion_ia
        where estado = 'PENDIENTE' and siguiente_intento_en <= ahora
      )
    );
$$;

-- ---------------------------------------------------------------------------
-- Reserva (R1, R11)
-- ---------------------------------------------------------------------------

-- 1) Crea las evaluaciones que falten. 2) Pasa a ERROR las que agotaron sus 3 intentos sin que
-- nadie las cerrara (la función se cayó a media evaluación). 3) Reserva hasta `limite` con
-- `skip locked`: sube `intentos` y aparta la evaluación 5 min, así otra ejecución no la toma.
create function public.tomar_evaluaciones(limite integer)
returns table (evaluacion_id bigint, prediccion_id bigint, partido_id bigint, intentos smallint)
language plpgsql
set search_path = ''
as $$
begin
  insert into public.evaluacion_ia (prediccion_id, es_simulada)
  select pr.id, c.es_simulada
  from public.calificacion as c
  join public.prediccion as pr on pr.id = c.prediccion_id
  left join public.evaluacion_ia as e on e.prediccion_id = pr.id
  where pr.justificacion is not null and e.id is null
  on conflict on constraint evaluacion_ia_prediccion_id_key do nothing;

  update public.evaluacion_ia as e
  set estado = 'ERROR', error = coalesce(e.error, 'Sin respuesta') || ' (3 intentos)'
  where e.estado = 'PENDIENTE' and e.intentos >= 3 and e.siguiente_intento_en <= now();

  return query
  with tomadas as (
    select e.id
    from public.evaluacion_ia as e
    where e.estado = 'PENDIENTE' and e.intentos < 3 and e.siguiente_intento_en <= now()
    order by e.siguiente_intento_en, e.id
    limit limite
    for update skip locked
  )
  update public.evaluacion_ia as e
  set intentos = e.intentos + 1, siguiente_intento_en = now() + interval '5 minutes'
  from tomadas as t, public.prediccion as pr
  where e.id = t.id and pr.id = e.prediccion_id
  returning e.id, e.prediccion_id, pr.partido_id, e.intentos;
end;
$$;

-- ---------------------------------------------------------------------------
-- Desenlaces (R8, R9, R11)
-- ---------------------------------------------------------------------------

-- `datos`: { puntos_bono, explicacion, afirmaciones, modelo, version_prompt }. Solo escribe si
-- sigue PENDIENTE: guardar dos veces no cambia nada (devuelve false).
create function public.guardar_evaluacion(id_evaluacion bigint, datos jsonb)
returns boolean
language plpgsql
set search_path = ''
as $$
begin
  update public.evaluacion_ia
  set
    estado = 'EVALUADA',
    puntos_bono = (datos ->> 'puntos_bono')::smallint,
    explicacion = datos ->> 'explicacion',
    afirmaciones = datos -> 'afirmaciones',
    modelo = datos ->> 'modelo',
    version_prompt = datos ->> 'version_prompt',
    evaluada_en = now(),
    error = null
  where id = id_evaluacion and estado = 'PENDIENTE';
  return found;
end;
$$;

-- Intento fallido: reprograma a 1 min tras el 1.º y a 5 min tras el 2.º; el 3.º deja `ERROR`
-- (final en el MVP). La calificación base no se toca (R9). Devuelve el estado resultante.
create function public.registrar_fallo_evaluacion(id_evaluacion bigint, motivo text)
returns public.estado_evaluacion
language plpgsql
set search_path = ''
as $$
declare
  resultado public.estado_evaluacion;
begin
  update public.evaluacion_ia
  set
    estado = case when intentos >= 3 then 'ERROR'::public.estado_evaluacion else estado end,
    siguiente_intento_en = now() + case when intentos <= 1 then interval '1 minute'
      else interval '5 minutes' end,
    error = left(motivo, 500)
  where id = id_evaluacion and estado = 'PENDIENTE'
  returning estado into resultado;
  return resultado;
end;
$$;

-- R8: con la clave inválida (401/403) se devuelven las reservadas sin gastar intento, y se vuelven
-- a intentar en 5 min.
create function public.liberar_evaluaciones(ids bigint[])
returns void
language sql
set search_path = ''
as $$
  update public.evaluacion_ia
  set intentos = greatest(intentos - 1, 0), siguiente_intento_en = now() + interval '5 minutes'
  where id = any(ids) and estado = 'PENDIENTE';
$$;

-- ---------------------------------------------------------------------------
-- Seguridad: RLS + permisos explícitos (R15)
-- ---------------------------------------------------------------------------

alter table public.evaluacion_ia enable row level security;
alter table public.llamada_ia enable row level security;

revoke all on table public.evaluacion_ia, public.llamada_ia from anon, authenticated;

grant select on table public.evaluacion_ia to authenticated;
grant select, insert, update, delete on table public.evaluacion_ia, public.llamada_ia to service_role;

-- Solo las de sus predicciones; las del grupo llegan en M4 (R04).
create policy "Cada usuario lee las evaluaciones de sus predicciones"
  on public.evaluacion_ia for select to authenticated
  using (
    exists (
      select 1 from public.prediccion as p
      where p.id = prediccion_id and p.usuario_id = (select auth.uid())
    )
  );

revoke execute on function
  public.llamadas_ia_hoy(timestamptz),
  public.hay_evaluaciones_por_hacer(timestamptz, integer),
  public.tomar_evaluaciones(integer),
  public.guardar_evaluacion(bigint, jsonb),
  public.registrar_fallo_evaluacion(bigint, text),
  public.liberar_evaluaciones(bigint[])
from public, anon, authenticated;

grant execute on function
  public.llamadas_ia_hoy(timestamptz),
  public.hay_evaluaciones_por_hacer(timestamptz, integer),
  public.tomar_evaluaciones(integer),
  public.guardar_evaluacion(bigint, jsonb),
  public.registrar_fallo_evaluacion(bigint, text),
  public.liberar_evaluaciones(bigint[])
to service_role;
