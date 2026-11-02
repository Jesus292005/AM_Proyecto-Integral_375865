import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../tipos-db.ts';
import { type DependenciasCarga, esquemaResumenCarga } from './carga-inicial.ts';

type Repositorio = Omit<DependenciasCarga, 'consultarApi' | 'ahora'>;

// Acceso a la base para la sincronización, con el cliente de la clave secreta (`service_role`):
// `sincronizacion` está cerrada para los usuarios y solo `service_role` guarda la carga.
export function crearRepositorioSincronizacion(cliente: SupabaseClient<Database>): Repositorio {
  return {
    async contarConsultasDelDia(desde) {
      const { data, error } = await cliente
        .from('sincronizacion')
        .select('consultas_usadas')
        .gte('inicio', desde.toISOString());
      if (error) throw new Error(`No se pudieron contar las consultas del día: ${error.message}`);
      return data.reduce((total, registro) => total + registro.consultas_usadas, 0);
    },

    async iniciarRegistro(tipo) {
      const { data, error } = await cliente
        .from('sincronizacion')
        .insert({ tipo })
        .select('id')
        .single();
      if (error) throw new Error(`No se pudo crear el registro de sincronización: ${error.message}`);
      return data.id;
    },

    async anotarConsultas(idRegistro, consultas) {
      const { error } = await cliente
        .from('sincronizacion')
        .update({ consultas_usadas: consultas })
        .eq('id', idRegistro);
      if (error) throw new Error(`No se pudieron anotar las consultas: ${error.message}`);
    },

    async terminarRegistro(idRegistro, { estado, error: mensaje }) {
      const { error } = await cliente
        .from('sincronizacion')
        .update({ estado, error: mensaje, fin: new Date().toISOString() })
        .eq('id', idRegistro);
      if (error) throw new Error(`No se pudo cerrar el registro de sincronización: ${error.message}`);
    },

    async guardarCarga(carga) {
      const { data, error } = await cliente.rpc('guardar_carga_inicial', { carga });
      if (error) throw new Error(`No se pudo guardar la carga: ${error.message}`);
      return esquemaResumenCarga.parse(data);
    },
  };
}
