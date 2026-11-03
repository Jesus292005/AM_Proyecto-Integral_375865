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

/** Si quiero recordatorios antes del cierre (F11a R4, `Usuario.recordatoriosActivos`). */
export async function obtenerRecordatoriosActivos(): Promise<boolean> {
  const usuarioId = await idUsuarioActual();
  const { data, error, status } = await supabase
    .from('usuario')
    .select('recordatorios_activos')
    .eq('id', usuarioId)
    .single();
  if (error) throw comoErrorDatos(error, status);
  return data.recordatorios_activos;
}

export async function guardarRecordatoriosActivos(activos: boolean): Promise<void> {
  const usuarioId = await idUsuarioActual();
  const { error, status } = await supabase
    .from('usuario')
    .update({ recordatorios_activos: activos })
    .eq('id', usuarioId);
  if (error) throw comoErrorDatos(error, status);
}
