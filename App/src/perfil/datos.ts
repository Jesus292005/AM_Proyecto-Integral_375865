import { comoErrorDatos } from '../datos/errores';
import { idUsuarioActual } from '../datos/sesionActual';
import { supabase } from '../supabase/cliente';
import type { Database } from '../supabase/tipos-db';

export type Rol = Database['public']['Enums']['rol_usuario'];

/** Mi rol (F01 V3: cada usuario lee su propio registro). */
export async function obtenerMiRol(): Promise<Rol> {
  const usuarioId = await idUsuarioActual();
  const { data, error, status } = await supabase
    .from('usuario')
    .select('rol')
    .eq('id', usuarioId)
    .single();
  if (error) throw comoErrorDatos(error, status);
  return data.rol;
}
