-- T59 — Aviso de puntos listos (F11b): qué avisos están listos (R1, R2) y la tarea cada minuto
-- (R7). El envío lo hace la función `avisos-puntos` con lo de F11a (R5). Dice los puntos de cada
-- usuario: solo la ejecuta `service_role` (R8).

-- Un renglón por (usuario, partido) listo para avisar, con los tokens del usuario. Listo = tiene
-- calificación y no tiene justificación, o su bono ya está EVALUADA o ERROR, o pasaron 20 min desde
-- la calificación (el bono sigue pendiente). Solo partidos calificados en las últimas 24 h. No mira
-- `recordatoriosActivos` (decisión 3, D94).
create function public.avisos_puntos_pendientes(ahora timestamptz)
returns table (
  usuario_id uuid,
  partido_id bigint,
  local text,
  visitante text,
  goles_local smallint,
  goles_visitante smallint,
  es_simulado boolean,
  puntos_base integer,
  estado_bono text,
  puntos_bono smallint,
  tokens text[]
)
language sql
stable
set search_path = ''
as $$
  select
    pr.usuario_id,
    p.id,
    l.nombre_corto,
    v.nombre_corto,
    p.goles_local,
    p.goles_visitante,
    p.es_simulado,
    c.puntos_base::integer,
    case
      when pr.justificacion is null then 'SIN_JUSTIFICACION'
      when e.id is null then 'PENDIENTE'
      else e.estado::text
    end,
    case when e.estado = 'EVALUADA' then e.puntos_bono end,
    (select array_agg(d.token order by d.id) from public.dispositivo d where d.usuario_id = pr.usuario_id)
  from public.calificacion as c
  join public.prediccion as pr on pr.id = c.prediccion_id
  join public.partido as p on p.id = pr.partido_id
  join public.equipo as l on l.id = p.equipo_local_id
  join public.equipo as v on v.id = p.equipo_visitante_id
  left join public.evaluacion_ia as e on e.prediccion_id = pr.id
  where p.calificado_en > ahora - interval '24 hours'
    and p.calificado_en <= ahora
    and (
      pr.justificacion is null
      or e.estado in ('EVALUADA', 'ERROR')
      or p.calificado_en <= ahora - interval '20 minutes'
    )
    and exists (select 1 from public.dispositivo d where d.usuario_id = pr.usuario_id)
    and not exists (
      select 1 from public.notificacion_enviada n
      where n.usuario_id = pr.usuario_id and n.tipo = 'PUNTOS_LISTOS' and n.partido_id = p.id
    )
  order by p.calificado_en, p.id, pr.usuario_id;
$$;

revoke execute on function public.avisos_puntos_pendientes(timestamptz)
  from public, anon, authenticated;
grant execute on function public.avisos_puntos_pendientes(timestamptz) to service_role;

-- R7: cada minuto, solo si hay avisos listos (patrón de D85). Mismos secretos de Vault (D83).
select cron.schedule(
  'avisos-puntos',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'url_proyecto')
      || '/functions/v1/avisos-puntos',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'clave_secreta')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  )
  where exists (select 1 from public.avisos_puntos_pendientes(now()));
  $$
);
