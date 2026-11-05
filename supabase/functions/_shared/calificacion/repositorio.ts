import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import type { Database } from '../tipos-db.ts';
import type { DependenciasCalificar } from './calificar.ts';

// Acceso a la base para la calificación, con el cliente de la clave secreta (`service_role`): las
// dos funciones y la escritura de `calificacion` están cerradas para los usuarios (F05 R10).

const esquemaDesenlace = z.enum(['CALIFICADO', 'YA_CALIFICADO']);

export function crearRepositorioCalificacion(
  cliente: SupabaseClient<Database>,
): DependenciasCalificar {
  return {
    async buscarPartidos(limite) {
      const { data, error } = await cliente.rpc('partidos_por_calificar', { limite });
      if (error) throw new Error(`No se pudieron leer los partidos por calificar: ${error.message}`);
      return data;
    },

    async leerValores() {
      const { data, error } = await cliente
        .from('valor_puntos')
        .select('resultado, rango_goles, marcador_exacto')
        .single();
      if (error) throw new Error(`No se pudieron leer los valores de puntos: ${error.message}`);
      return data;
    },

    async leerPredicciones(partidoId) {
      const { data, error } = await cliente
        .from('prediccion')
        .select('id, resultado, rango_goles, marcador_local, marcador_visitante')
        .eq('partido_id', partidoId);
      if (error) throw new Error(`No se pudieron leer las predicciones: ${error.message}`);
      return data;
    },

    async registrar(partidoId, calificaciones) {
      const { data, error } = await cliente.rpc('registrar_calificaciones', {
        id_partido: partidoId,
        calificaciones,
      });
      if (error) throw new Error(error.message);
      return esquemaDesenlace.parse(data);
    },
  };
}
