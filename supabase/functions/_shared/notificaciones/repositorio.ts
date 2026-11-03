import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../tipos-db.ts';
import type { DependenciasRecordatorios } from './recordatorios.ts';

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

    // `ignoreDuplicates`: un aviso ya escrito no vuelve a salir, ni en una ejecución simultánea.
    async reclamarAvisos(pares) {
      const { data, error } = await cliente
        .from('notificacion_enviada')
        .upsert(pares.map((par) => ({ ...par, tipo: 'RECORDATORIO' as const })), {
          onConflict: 'usuario_id,tipo,partido_id',
          ignoreDuplicates: true,
        })
        .select('usuario_id, partido_id');
      if (error) throw new Error(`No se pudieron escribir los avisos: ${error.message}`);
      return data;
    },

    async borrarTokens(tokens) {
      const { error } = await cliente.from('dispositivo').delete().in('token', [...tokens]);
      if (error) throw new Error(`No se pudieron borrar los tokens: ${error.message}`);
    },
  };
}
