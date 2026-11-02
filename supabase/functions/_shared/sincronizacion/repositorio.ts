import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../tipos-db.ts';
import { type DependenciasFinales, esquemaResumenDatos } from './datos-partido.ts';
import { type DependenciasActualizacion, esquemaResumenCarga } from './sincronizacion-torneo.ts';

type Repositorio = Omit<DependenciasActualizacion & DependenciasFinales, 'consultarApi' | 'ahora'>;

// Acceso a la base para la sincronización, con el cliente de la clave secreta (`service_role`):
// `sincronizacion` está cerrada para los usuarios y solo `service_role` ejecuta las funciones que
// guardan.
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

    async buscarTorneoActual(proveedorIdLiga) {
      const { data, error } = await cliente
        .from('torneo')
        .select('nombre, temporada_proveedor, prefijo_rondas, liga!inner(proveedor_id)')
        .eq('es_actual', true)
        .eq('liga.proveedor_id', proveedorIdLiga)
        .maybeSingle();
      if (error) throw new Error(`No se pudo leer el torneo actual: ${error.message}`);
      if (data === null) return null;
      const { nombre, temporada_proveedor, prefijo_rondas } = data;
      return { nombre, temporada_proveedor, prefijo_rondas };
    },

    async guardarCarga(carga) {
      const { data, error } = await cliente.rpc('guardar_carga_inicial', { carga });
      if (error) throw new Error(`No se pudo guardar la carga: ${error.message}`);
      return esquemaResumenCarga.parse(data);
    },

    async buscarPendientesDeFinal(ahora) {
      const { data, error } = await cliente.rpc('partidos_pendientes_de_final', {
        ahora: ahora.toISOString(),
      });
      if (error) throw new Error(`No se pudieron leer los partidos pendientes: ${error.message}`);
      return data;
    },

    async actualizarEstados(datos) {
      const { data, error } = await cliente.rpc('actualizar_estados_partidos', { datos });
      if (error) throw new Error(`No se pudieron actualizar los estados: ${error.message}`);
      return data;
    },

    async guardarDatosPartido(datos) {
      const { data, error } = await cliente.rpc('guardar_datos_partido', { datos });
      if (error) throw new Error(`No se pudieron guardar los datos del partido: ${error.message}`);
      return esquemaResumenDatos.parse(data);
    },
  };
}
