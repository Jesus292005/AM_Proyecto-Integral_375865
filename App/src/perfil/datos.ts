import { z } from 'zod';

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

// F13 R6: la vista `mi_racha` siempre devuelve una fila; sus columnas pueden venir vacías en los
// tipos de la vista, así que Zod valida la forma (D54).
const esquemaRacha = z.object({
  racha_actual: z.number().int(),
  mejor_racha: z.number().int(),
  incluye_simulados: z.boolean(),
  ultima_calificacion: z.string().nullable(),
});

export type MiRacha = z.infer<typeof esquemaRacha>;

/** Mi racha de aciertos, actual y mejor (F13). */
export async function obtenerMiRacha(): Promise<MiRacha> {
  const { data, error, status } = await supabase
    .from('mi_racha')
    .select('racha_actual, mejor_racha, incluye_simulados, ultima_calificacion')
    .single();
  if (error) throw comoErrorDatos(error, status);
  const racha = esquemaRacha.safeParse(data);
  if (!racha.success) throw new Error(`Racha con forma inválida: ${z.prettifyError(racha.error)}`);
  return racha.data;
}
