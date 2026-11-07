-- T65 — R04 y P-26 (F07 R6, R7, R8; decisión 1 de D97).
-- R04: la predicción ajena (con su justificación) se lee solo si comparto al menos un grupo con su
-- autor y ya llegó su `cierre_predicciones`. Escribir sigue siendo solo sobre las propias (F03 R6).
-- P-26: `usuario_publico` pasa a `security_invoker`; `usuario` se lee por columnas (nadie lee
-- `correo` ni `google_id` por la API) y solo la fila propia y las de quienes comparten grupo.

-- ---------------------------------------------------------------------------
-- R04 (F07 R6)
-- ---------------------------------------------------------------------------

-- Se suma a "Cada usuario lee sus predicciones" (las políticas de lectura se combinan con OR).
-- `partido` lo leen todos los usuarios autenticados (F02), así que la subconsulta no depende de
-- otra política.
create policy "Quien comparte grupo lee la predicción desde el cierre"
  on public.prediccion for select to authenticated
  using (
    usuario_id <> (select auth.uid())
    and public.comparte_grupo(usuario_id)
    and exists (
      select 1 from public.partido as p
      where p.id = partido_id and p.cierre_predicciones <= now()
    )
  );

-- ---------------------------------------------------------------------------
-- P-26 (F07 R8, decisión 1 de D97)
-- ---------------------------------------------------------------------------

-- Lectura por columnas: sin `correo` ni `google_id` (la app no los usa; el servidor usa
-- `service_role`). La fila propia sigue legible con su política de F01.
revoke select on table public.usuario from authenticated;
-- Sin `creado_en`: de otros solo nombre, foto y equipo (F01 V3), más `rol` y
-- `recordatorios_activos`, que la app lee de la fila propia (decisión 1 de D97).
grant select (id, nombre, foto_url, equipo_favorito_id, rol, recordatorios_activos)
  on table public.usuario to authenticated;

create policy "Quien comparte grupo lee el registro"
  on public.usuario for select to authenticated
  using (public.comparte_grupo(id));

-- Ya no corre con los permisos de su dueño: aplica las RLS de `usuario` (mi fila y las de mis
-- compañeros de grupo). Mismas 4 columnas.
alter view public.usuario_publico set (security_invoker = true);

-- ---------------------------------------------------------------------------
-- S03, "En tus grupos" (F07 R7)
-- ---------------------------------------------------------------------------

-- Predicciones ajenas de un partido con el nombre y la foto de su autor. Las RLS de `prediccion`
-- (R04) y de `usuario` deciden qué filas salen; cada persona sale una vez (R01).
create view public.predicciones_grupo
with (security_invoker = true)
as
select
  pr.partido_id,
  pr.usuario_id,
  u.nombre,
  u.foto_url,
  pr.resultado,
  pr.rango_goles,
  pr.marcador_local,
  pr.marcador_visitante,
  pr.justificacion
from public.prediccion as pr
join public.usuario_publico as u on u.id = pr.usuario_id
where pr.usuario_id <> (select auth.uid());

revoke all on table public.predicciones_grupo from anon, authenticated;
grant select on table public.predicciones_grupo to authenticated;
