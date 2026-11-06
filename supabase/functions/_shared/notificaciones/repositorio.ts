import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Enums } from '../tipos-db.ts';
import type { DependenciasRecordatorios, ParAviso } from './recordatorios.ts';

type Repositorio = Omit<DependenciasRecordatorios, 'enviarAExpo' | 'ahora'>;

// Acceso a la base para los recordatorios, con el cliente de la clave secreta (`service_role`):
// `notificacion_enviada` y `recordatorios_pendientes` están cerradas para los usuarios (F11a R10).
export function crearRepositorioRecordatorios(cliente: SupabaseClient<Database>): Repositorio {
  return {
    async buscarPendientes(ahora) {
      const { data, error } = await cliente.rpc('recordatorios_pendientes', {
        ahora: ahora.toISOString(),
      });
      if (error) throw new Error(`No se pudieron leer los recordatorios pendientes: ${error.message}`);
      return data;
    },

    reclamarAvisos: reclamarAvisosDe(cliente, 'RECORDATORIO'),
    borrarTokens: borrarTokensDe(cliente),
  };
}

/**
 * Escribe `notificacion_enviada` antes de enviar (F11a R6, F11b R5) y devuelve solo los pares
 * nuevos. `ignoreDuplicates`: un aviso ya escrito no vuelve a salir, ni en una ejecución simultánea.
 */
export function reclamarAvisosDe(cliente: SupabaseClient<Database>, tipo: Enums<'tipo_notificacion'>) {
  return async (pares: readonly ParAviso[]): Promise<ParAviso[]> => {
    const { data, error } = await cliente
      .from('notificacion_enviada')
      .upsert(pares.map((par) => ({ ...par, tipo })), {
        onConflict: 'usuario_id,tipo,partido_id',
        ignoreDuplicates: true,
      })
      .select('usuario_id, partido_id');
    if (error) throw new Error(`No se pudieron escribir los avisos: ${error.message}`);
    return data;
  };
}

/** Borra los tokens que Expo marcó `DeviceNotRegistered`. */
export function borrarTokensDe(cliente: SupabaseClient<Database>) {
  return async (tokens: readonly string[]): Promise<void> => {
    const { error } = await cliente.from('dispositivo').delete().in('token', [...tokens]);
    if (error) throw new Error(`No se pudieron borrar los tokens: ${error.message}`);
  };
}

/** Acceso a la base para el aviso de puntos (F11b), con el cliente de la clave secreta. */
export function crearRepositorioAvisosPuntos(cliente: SupabaseClient<Database>) {
  return {
    async buscarPendientes(ahora: Date): Promise<unknown[]> {
      const { data, error } = await cliente.rpc('avisos_puntos_pendientes', {
        ahora: ahora.toISOString(),
      });
      if (error) throw new Error(`No se pudieron leer los avisos de puntos: ${error.message}`);
      return data;
    },
    reclamarAvisos: reclamarAvisosDe(cliente, 'PUNTOS_LISTOS'),
    borrarTokens: borrarTokensDe(cliente),
  };
}
