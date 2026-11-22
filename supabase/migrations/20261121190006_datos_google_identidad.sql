-- T91 (D109) — F01 Q1 copia nombre y foto desde la identidad de Google, no desde los metadatos.
-- `auth.users.raw_user_meta_data` lo puede cambiar el propio usuario con `auth.updateUser`, así
-- que copiar de ahí dejaba poner cualquier nombre (sin la validación de F28 R4) o cualquier foto.
-- `auth.identities.identity_data` solo lo escribe Supabase al iniciar sesión con Google.

drop trigger al_actualizar_datos_google on auth.users;

-- Mismas reglas que antes (F01 Q1 y F28 R5): la foto siempre; el nombre solo si el usuario no
-- lo cambió; si Google no manda nombre, se conserva.
create or replace function public.actualizar_usuario_desde_google()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  datos jsonb := new.identity_data;
begin
  update public.usuario
  set
    nombre = case
      when nombre_editado then nombre
      else coalesce(nullif(datos ->> 'full_name', ''), nullif(datos ->> 'name', ''), nombre)
    end,
    foto_url = coalesce(datos ->> 'avatar_url', datos ->> 'picture')
  where id = new.user_id;
  return new;
end;
$$;

create trigger al_actualizar_identidad_google
  after update of identity_data on auth.identities
  for each row
  when (new.provider = 'google' and old.identity_data is distinct from new.identity_data)
  execute function public.actualizar_usuario_desde_google();

revoke execute on function public.actualizar_usuario_desde_google() from public, anon, authenticated;
