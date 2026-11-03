import { supabase } from '../supabase/cliente';
import { ErrorDatos } from './errores';

/**
 * Id del usuario con sesión, para pedir solo lo propio aunque el servidor entregue más (en M4, las
 * predicciones de mis grupos después del cierre, R04). Lee la sesión guardada en el teléfono.
 */
export async function idUsuarioActual(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (id === undefined) throw new ErrorDatos('No hay sesión', false);
  return id;
}
