-- Reacciones también a los análisis propios (F26 R13 v1.1, D114). Pedido de Jesús en el guion de
-- M8: las reacciones no dan puntos, insignias ni racha (P4), así que reaccionar a lo propio no
-- regala nada. Misma función sin el error `PROPIO`; los permisos no cambian.

create or replace function public.reaccionar(id_grupo bigint, id_prediccion bigint, tipo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  yo uuid := auth.uid();
  autor uuid;
begin
  if yo is null then
    raise exception 'SIN_SESION';
  end if;
  if not exists (
    select 1 from public.miembro_grupo as m where m.grupo_id = id_grupo and m.usuario_id = yo
  ) then
    raise exception 'NO_MIEMBRO';
  end if;
  if tipo is not null and not (tipo = any (enum_range(null::public.tipo_reaccion)::text[])) then
    raise exception 'TIPO_INVALIDO';
  end if;

  -- Debe estar en el muro de ese grupo (las mismas condiciones de `muro_jornada`).
  select pr.usuario_id into autor
  from public.prediccion as pr
  join public.partido as p on p.id = pr.partido_id
  join public.miembro_grupo as m on m.usuario_id = pr.usuario_id and m.grupo_id = id_grupo
  where pr.id = id_prediccion
    and p.cierre_predicciones <= now()
    and p.estado <> 'CANCELADO'
    and nullif(btrim(pr.justificacion), '') is not null;
  if autor is null then
    raise exception 'ANALISIS_NO_DISPONIBLE';
  end if;

  if tipo is null then
    delete from public.reaccion as r
    where r.grupo_id = id_grupo and r.prediccion_id = id_prediccion and r.usuario_id = yo;
  else
    insert into public.reaccion as r (grupo_id, prediccion_id, usuario_id, tipo)
    values (id_grupo, id_prediccion, yo, tipo::public.tipo_reaccion)
    on conflict (grupo_id, prediccion_id, usuario_id)
    do update set tipo = excluded.tipo, creada_en = now();
  end if;
end;
$$;
