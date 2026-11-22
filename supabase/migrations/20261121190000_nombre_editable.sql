-- T91 — Nombre visible editable (F28 R4–R6, decisión 1 de D108).
-- El usuario puede cambiar su `nombre`; un disparador lo normaliza y valida y marca
-- `nombre_editado`. Desde entonces la copia desde Google (F01 Q1) actualiza solo la foto.

alter table public.usuario add column nombre_editado boolean not null default false;

-- ---------------------------------------------------------------------------
-- R4–R5: normalizar y validar el nombre que escribe el usuario
-- ---------------------------------------------------------------------------

-- Solo cuando el cambio viene de la API (`authenticated`). La copia desde Google corre con los
-- permisos de su dueño y no pasa por aquí, así que los nombres largos de Google siguen valiendo.
create function public.validar_nombre_propio()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' or new.nombre is not distinct from old.nombre then
    return new;
  end if;

  -- Los espacios (también tabuladores y saltos de línea) repetidos juntos y los de los extremos
  -- fuera.
  new.nombre := btrim(regexp_replace(coalesce(new.nombre, ''), '\s+', ' ', 'g'));
  if char_length(new.nombre) not between 3 and 20
    or new.nombre !~ '^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ ._-]+$'
    or new.nombre !~ '[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ]'
  then
    raise exception 'NOMBRE_INVALIDO';
  end if;

  new.nombre_editado := true;
  return new;
end;
$$;

create trigger antes_de_cambiar_nombre
  before update of nombre on public.usuario
  for each row execute function public.validar_nombre_propio();

revoke execute on function public.validar_nombre_propio() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- F01 Q1 (cambia con la decisión 1): un nombre editado ya no se sobrescribe
-- ---------------------------------------------------------------------------

create or replace function public.actualizar_usuario_desde_google()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  datos jsonb := new.raw_user_meta_data;
begin
  update public.usuario
  set
    nombre = case
      when nombre_editado then nombre
      else coalesce(nullif(datos ->> 'full_name', ''), nullif(datos ->> 'name', ''), nombre)
    end,
    foto_url = coalesce(datos ->> 'avatar_url', datos ->> 'picture')
  where id = new.id;
  return new;
end;
$$;

revoke execute on function public.actualizar_usuario_desde_google() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- R6: permiso (nivel 3, D108). Se suma a `recordatorios_activos` y `equipo_favorito_id`; la
-- política "Cada usuario modifica su propio registro" limita a la fila propia. `nombre_editado`
-- y `rol` siguen sin permiso de escritura.
-- ---------------------------------------------------------------------------

grant update (nombre) on table public.usuario to authenticated;
