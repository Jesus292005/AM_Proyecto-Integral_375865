-- T26 — Jornada actual para S02 (F02 Q4, B3). Se calcula en el servidor (D52): la app solo muestra.
-- Jornada actual = la del próximo partido por jugar (no cancelado, con inicio a partir de `ahora`)
-- del torneo actual; si el torneo ya terminó, la última jornada. null si no hay torneo actual.
-- Devuelve el `orden` de la jornada, que es lo que usa la ruta `/partidos?jornada=`.

create function public.jornada_actual(ahora timestamptz default now())
returns smallint
language sql
stable
set search_path = ''
as $$
  with actual as (
    select id from public.torneo where es_actual order by id limit 1
  )
  select coalesce(
    (
      select jornada.orden
      from public.partido as partido
      join public.jornada as jornada on jornada.id = partido.jornada_id
      where partido.torneo_id = (select id from actual)
        and partido.estado <> 'CANCELADO'
        and partido.inicio >= ahora
      order by partido.inicio, jornada.orden
      limit 1
    ),
    (select max(jornada.orden) from public.jornada where torneo_id = (select id from actual))
  );
$$;

-- Lee con los permisos de quien llama: `authenticated` ya puede leer torneo, jornada y partido.
revoke execute on function public.jornada_actual(timestamptz) from public, anon;
grant execute on function public.jornada_actual(timestamptz) to authenticated, service_role;
