-- T33 — Predicción (03-data-model §2, F03, F04 R1).
-- Una por par (usuario, partido) (R01); se crea, edita o quita solo antes del cierre (F03 R1).
-- La tabla nace completa, con `justificacion` (F03 R7), para que F04 no toque SQL.

-- ---------------------------------------------------------------------------
-- Tipos y tabla
-- ---------------------------------------------------------------------------

create type public.resultado_prediccion as enum ('LOCAL', 'EMPATE', 'VISITANTE');
-- D48: 0–1, 2, 3, 4 o más goles en total.
create type public.rango_goles as enum ('G0_1', 'G2', 'G3', 'G4_MAS');

create table public.prediccion (
  id bigint generated always as identity primary key,
  -- F03 R4: lo pone el servidor; la app no tiene permiso sobre la columna.
  usuario_id uuid not null default auth.uid() references public.usuario (id) on delete cascade,
  partido_id bigint not null references public.partido (id),
  resultado public.resultado_prediccion,
  rango_goles public.rango_goles,
  marcador_local smallint check (marcador_local between 0 and 10), -- D72
  marcador_visitante smallint check (marcador_visitante between 0 and 10),
  -- F04 R1: ya recortada por el disparador; vacía se guarda como null.
  justificacion text check (char_length(justificacion) between 1 and 500),
  creada_en timestamptz not null default now(),
  actualizada_en timestamptz not null default now(),
  constraint prediccion_una_por_partido unique (usuario_id, partido_id),
  constraint prediccion_marcador_completo check (
    (marcador_local is null) = (marcador_visitante is null)
  ),
  -- R02: marcador exacto, o resultado y/o rango (D19, D48).
  constraint prediccion_forma check (
    case
      when marcador_local is not null then resultado is null and rango_goles is null
      else resultado is not null or rango_goles is not null
    end
  )
);

-- F05 califica por partido.
create index prediccion_partido_idx on public.prediccion (partido_id);

-- ---------------------------------------------------------------------------
-- Cierre (F03 R1, R4) y recorte de la justificación (F04 R1)
-- ---------------------------------------------------------------------------

-- Abierto = hora del servidor antes de `cierre_predicciones` y partido sin empezar (D21, D82).
-- Error identificable `PREDICCIONES_CERRADAS` para que la app lo distinga de una falla (F03 R6).
create function public.validar_prediccion()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  fila public.prediccion := case when tg_op = 'DELETE' then old else new end;
  abierto boolean;
begin
  -- Borrado en cascada al eliminar la cuenta (su `usuario` ya no existe): no pasa por la regla
  -- de cierre (F03 R6).
  if tg_op = 'DELETE' and not exists (select 1 from public.usuario where id = old.usuario_id) then
    return old;
  end if;

  if tg_op = 'UPDATE'
    and (new.usuario_id <> old.usuario_id or new.partido_id <> old.partido_id) then
    raise exception 'PREDICCION_INMUTABLE'
      using detail = 'No se cambia el usuario ni el partido de una predicción (F03 R4).';
  end if;

  select p.cierre_predicciones > now() and p.estado in ('PROGRAMADO', 'POSPUESTO')
  into abierto
  from public.partido p
  where p.id = fila.partido_id;

  if not coalesce(abierto, false) then
    raise exception 'PREDICCIONES_CERRADAS'
      using detail = 'El partido ya cerró sus predicciones (F03 R1).';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  new.justificacion := nullif(regexp_replace(new.justificacion, '^\s+|\s+$', '', 'g'), '');
  if tg_op = 'UPDATE' then
    new.creada_en := old.creada_en;
    new.actualizada_en := now();
  end if;
  return new;
end;
$$;

create trigger al_cambiar_prediccion
  before insert or update or delete on public.prediccion
  for each row execute function public.validar_prediccion();

revoke execute on function public.validar_prediccion() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Seguridad: RLS + permisos explícitos (F03 R5, R6)
-- ---------------------------------------------------------------------------

alter table public.prediccion enable row level security;

revoke all on table public.prediccion from anon, authenticated;

grant select, delete on table public.prediccion to authenticated;
-- Sin `usuario_id` ni fechas: los pone el servidor (R4). `partido_id` va en `update` porque el
-- `upsert` lo repite; el disparador impide cambiarlo.
grant insert (partido_id, resultado, rango_goles, marcador_local, marcador_visitante, justificacion)
  on table public.prediccion to authenticated;
grant update (partido_id, resultado, rango_goles, marcador_local, marcador_visitante, justificacion)
  on table public.prediccion to authenticated;

-- F05 y F06 (calificación y evaluación).
grant select, insert, update, delete on table public.prediccion to service_role;

-- R5: solo las propias, también para el administrador. Las de otros llegan con los grupos (M4, R04).
create policy "Cada usuario lee sus predicciones"
  on public.prediccion for select to authenticated
  using (usuario_id = (select auth.uid()));

create policy "Cada usuario crea sus predicciones"
  on public.prediccion for insert to authenticated
  with check (usuario_id = (select auth.uid()));

create policy "Cada usuario modifica sus predicciones"
  on public.prediccion for update to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

create policy "Cada usuario quita sus predicciones"
  on public.prediccion for delete to authenticated
  using (usuario_id = (select auth.uid()));
