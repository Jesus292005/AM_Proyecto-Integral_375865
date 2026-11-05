-- T50 — Calificación de puntos base (F05). La función `calificar` calcula los puntos con la tabla
-- de R05 (`_shared/calificacion/puntos.ts`) y los guarda con `registrar_calificaciones`, que en una
-- transacción garantiza que cada partido se califica una sola vez (R06, F05 R4). Sin
-- `security definer`: las funciones son de `service_role` (F05 R10).

-- ---------------------------------------------------------------------------
-- Valores de puntos (F05 R2, D52): una sola fila, se cambian sin actualizar la app
-- ---------------------------------------------------------------------------

create table public.valor_puntos (
  id boolean primary key default true check (id),
  resultado smallint not null check (resultado > 0),
  rango_goles smallint not null check (rango_goles > 0),
  marcador_exacto smallint not null,
  -- D26: el exacto vale más que el máximo de un marcador fallado (resultado + rango, D27).
  constraint valor_puntos_exacto_mayor check (marcador_exacto > resultado + rango_goles)
);

insert into public.valor_puntos (resultado, rango_goles, marcador_exacto) values (100, 150, 350);

-- ---------------------------------------------------------------------------
-- Calificación (03-data-model §2)
-- ---------------------------------------------------------------------------

create table public.calificacion (
  id bigint generated always as identity primary key,
  -- R06: una por predicción. Se borra con la predicción solo al eliminar la cuenta (F03 R6).
  prediccion_id bigint not null unique references public.prediccion (id) on delete cascade,
  puntos_resultado smallint not null check (puntos_resultado >= 0),
  puntos_rango_goles smallint not null check (puntos_rango_goles >= 0),
  puntos_marcador smallint not null check (puntos_marcador >= 0),
  -- D19: las partes nunca suman doble; el total siempre es su suma.
  puntos_base smallint generated always as (
    puntos_resultado + puntos_rango_goles + puntos_marcador
  ) stored,
  es_simulada boolean not null, -- R08
  calificada_en timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Selección (F05 R1)
-- ---------------------------------------------------------------------------

-- Terminados, con datos (D84), sin calificar y con marcador de 90 min completo; reales y simulados.
-- Los cancelados y pospuestos nunca están `TERMINADO` (R6).
create function public.partidos_por_calificar(limite integer)
returns table (
  partido_id bigint,
  goles_local smallint,
  goles_visitante smallint
)
language sql
stable
set search_path = ''
as $$
  select p.id, p.goles_local, p.goles_visitante
  from public.partido as p
  where p.estado = 'TERMINADO'
    and p.listo_para_calificar_en is not null
    and p.calificado_en is null
    and p.goles_local is not null
    and p.goles_visitante is not null
  order by p.listo_para_calificar_en, p.id
  limit limite;
$$;

-- ---------------------------------------------------------------------------
-- Registro (F05 R4, R5, R7)
-- ---------------------------------------------------------------------------

-- `calificaciones`: `[{ prediccion_id, puntos_resultado, puntos_rango_goles, puntos_marcador }]`,
-- una por cada predicción del partido. Bloquea el partido: una segunda llamada, aunque llegue en
-- paralelo, espera a la primera y responde `YA_CALIFICADO` sin cambiar nada.
create function public.registrar_calificaciones(id_partido bigint, calificaciones jsonb)
returns text
language plpgsql
set search_path = ''
as $$
declare
  fila public.partido;
  esperadas integer;
  insertadas integer;
begin
  select * into fila from public.partido where id = id_partido for update;
  if not found then
    raise exception 'PARTIDO_NO_EXISTE';
  end if;
  if fila.calificado_en is not null then
    return 'YA_CALIFICADO';
  end if;
  if fila.estado <> 'TERMINADO'
    or fila.listo_para_calificar_en is null
    or fila.goles_local is null
    or fila.goles_visitante is null then
    raise exception 'PARTIDO_NO_LISTO';
  end if;

  insert into public.calificacion (
    prediccion_id, puntos_resultado, puntos_rango_goles, puntos_marcador, es_simulada
  )
  select c.prediccion_id, c.puntos_resultado, c.puntos_rango_goles, c.puntos_marcador,
    fila.es_simulado
  from jsonb_to_recordset(calificaciones) as c (
    prediccion_id bigint,
    puntos_resultado smallint,
    puntos_rango_goles smallint,
    puntos_marcador smallint
  )
  join public.prediccion as pr on pr.id = c.prediccion_id and pr.partido_id = fila.id;
  get diagnostics insertadas = row_count;

  -- Todas las predicciones del partido, ni una más ni una menos (las ajenas al partido no entran).
  select count(*) into esperadas from public.prediccion where partido_id = fila.id;
  if insertadas <> esperadas or jsonb_array_length(calificaciones) <> esperadas then
    raise exception 'CALIFICACION_INCOMPLETA'
      using detail = format('Partido %s: %s predicciones, %s calificadas.', fila.id, esperadas,
        jsonb_array_length(calificaciones));
  end if;

  update public.partido set calificado_en = now() where id = fila.id;

  -- R7: la jornada se cierra cuando ya no le queda ningún partido por calificar (los cancelados
  -- no se califican, D44).
  update public.jornada as j
  set esta_cerrada = true
  where j.id = fila.jornada_id
    and not exists (
      select 1 from public.partido as p
      where p.jornada_id = j.id and p.calificado_en is null and p.estado <> 'CANCELADO'
    );

  return 'CALIFICADO';
end;
$$;

-- ---------------------------------------------------------------------------
-- Seguridad: RLS + permisos explícitos (F05 R10)
-- ---------------------------------------------------------------------------

alter table public.valor_puntos enable row level security;
alter table public.calificacion enable row level security;

revoke all on table public.valor_puntos, public.calificacion from anon, authenticated;

grant select on table public.valor_puntos, public.calificacion to authenticated;
grant select on table public.valor_puntos to service_role;
grant select, insert, update, delete on table public.calificacion to service_role;

create policy "Usuarios autenticados leen los valores de puntos"
  on public.valor_puntos for select to authenticated using (true);

-- Solo las de sus predicciones; las del grupo llegan en M4 (R04).
create policy "Cada usuario lee sus calificaciones"
  on public.calificacion for select to authenticated
  using (
    exists (
      select 1 from public.prediccion as p
      where p.id = prediccion_id and p.usuario_id = (select auth.uid())
    )
  );

revoke execute on function public.partidos_por_calificar(integer) from public, anon, authenticated;
revoke execute on function public.registrar_calificaciones(bigint, jsonb)
  from public, anon, authenticated;
grant execute on function public.partidos_por_calificar(integer) to service_role;
grant execute on function public.registrar_calificaciones(bigint, jsonb) to service_role;
