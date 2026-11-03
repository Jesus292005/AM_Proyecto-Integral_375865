-- T41 — Notificaciones (F11a): dispositivos, avisos enviados y selección de recordatorios.
-- El registro va por una función que asigna el token a quien lo registra (R3); los avisos
-- enviados y la selección de pendientes (que dice quién no ha predicho) solo los usa el servidor
-- con la clave secreta (R10).

-- ---------------------------------------------------------------------------
-- Tablas (03-data-model §2: Dispositivo, NotificacionEnviada)
-- ---------------------------------------------------------------------------

create table public.dispositivo (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.usuario (id) on delete cascade,
  -- Token de push de Expo. Un token pertenece a un solo usuario (R3).
  token text not null unique check (token ~ '^Expo(nent)?PushToken\[.+\]$'),
  actualizado_en timestamptz not null default now()
);

create index dispositivo_usuario_idx on public.dispositivo (usuario_id);

create type public.tipo_notificacion as enum ('RECORDATORIO', 'PUNTOS_LISTOS');

-- Evita mandar el mismo aviso dos veces (R6): se escribe antes de enviar.
create table public.notificacion_enviada (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.usuario (id) on delete cascade,
  tipo public.tipo_notificacion not null,
  partido_id bigint not null references public.partido (id),
  enviada_en timestamptz not null default now(),
  constraint notificacion_enviada_unica unique (usuario_id, tipo, partido_id)
);

-- ---------------------------------------------------------------------------
-- Registro del dispositivo (R2, R3)
-- ---------------------------------------------------------------------------

-- `security definer`: un token que ya era de otra cuenta pasa a quien lo registra, aunque esa
-- fila no sea suya (RLS no lo permitiría). Solo toca el token recibido.
create function public.registrar_dispositivo(token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  id_usuario uuid := auth.uid();
begin
  if id_usuario is null then
    raise exception 'SIN_SESION';
  end if;

  insert into public.dispositivo (usuario_id, token)
  values (id_usuario, registrar_dispositivo.token)
  on conflict on constraint dispositivo_token_key do update
    set usuario_id = excluded.usuario_id, actualizado_en = now();
end;
$$;

-- ---------------------------------------------------------------------------
-- Selección de recordatorios (R5)
-- ---------------------------------------------------------------------------

-- Un renglón por (usuario, partido) que cierra en (ahora, ahora + 60 min], con los tokens del
-- usuario. La función `recordatorios` agrupa por usuario (decisión 4, D90).
create function public.recordatorios_pendientes(ahora timestamptz)
returns table (
  usuario_id uuid,
  partido_id bigint,
  cierre_predicciones timestamptz,
  jornada_orden smallint,
  local text,
  visitante text,
  tokens text[]
)
language sql
stable
set search_path = ''
as $$
  select
    u.id,
    p.id,
    p.cierre_predicciones,
    j.orden,
    l.nombre_corto,
    v.nombre_corto,
    (select array_agg(d.token order by d.id) from public.dispositivo d where d.usuario_id = u.id)
  from public.partido as p
  join public.jornada as j on j.id = p.jornada_id
  join public.equipo as l on l.id = p.equipo_local_id
  join public.equipo as v on v.id = p.equipo_visitante_id
  cross join public.usuario as u
  where p.estado in ('PROGRAMADO', 'POSPUESTO')
    and p.cierre_predicciones > ahora
    and p.cierre_predicciones <= ahora + interval '60 minutes'
    and u.recordatorios_activos
    and exists (select 1 from public.dispositivo d where d.usuario_id = u.id)
    and not exists (
      select 1 from public.prediccion pr where pr.usuario_id = u.id and pr.partido_id = p.id
    )
    and not exists (
      select 1 from public.notificacion_enviada n
      where n.usuario_id = u.id and n.tipo = 'RECORDATORIO' and n.partido_id = p.id
    )
  order by u.id, p.cierre_predicciones, p.id;
$$;

-- ---------------------------------------------------------------------------
-- Seguridad: RLS + permisos explícitos (R10)
-- ---------------------------------------------------------------------------

alter table public.dispositivo enable row level security;
alter table public.notificacion_enviada enable row level security;

revoke all on table public.dispositivo, public.notificacion_enviada from anon, authenticated;

-- El usuario lee y borra solo sus dispositivos (cerrar sesión, R3); registra con la función.
grant select, delete on table public.dispositivo to authenticated;
grant select, insert, update, delete on table public.dispositivo to service_role;
grant select, insert, update, delete on table public.notificacion_enviada to service_role;

create policy "Cada usuario lee sus dispositivos"
  on public.dispositivo for select to authenticated
  using (usuario_id = (select auth.uid()));

create policy "Cada usuario borra sus dispositivos"
  on public.dispositivo for delete to authenticated
  using (usuario_id = (select auth.uid()));

revoke execute on function public.registrar_dispositivo(text) from public, anon, service_role;
grant execute on function public.registrar_dispositivo(text) to authenticated;

revoke execute on function public.recordatorios_pendientes(timestamptz)
  from public, anon, authenticated;
grant execute on function public.recordatorios_pendientes(timestamptz) to service_role;
