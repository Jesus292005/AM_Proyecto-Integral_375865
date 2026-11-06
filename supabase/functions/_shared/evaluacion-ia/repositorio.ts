import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../tipos-db.ts';
import { armarDatosPartidoIA } from './datos.ts';
import type { DependenciasEvaluar } from './evaluar.ts';

type Repositorio = Omit<DependenciasEvaluar, 'ahora' | 'llamarIA'>;

// Acceso a la base para la evaluación, con el cliente de la clave secreta (`service_role`): las
// funciones, la escritura de `evaluacion_ia` y `llamada_ia` están cerradas para los usuarios (R15).
export function crearRepositorioEvaluacion(cliente: SupabaseClient<Database>): Repositorio {
  return {
    async llamadasHoy(ahora) {
      const { data, error } = await cliente.rpc('llamadas_ia_hoy', { ahora: ahora.toISOString() });
      if (error) throw new Error(`No se pudieron contar las llamadas del día: ${error.message}`);
      return data;
    },

    async tomar(limite) {
      const { data, error } = await cliente.rpc('tomar_evaluaciones', { limite });
      if (error) throw new Error(`No se pudieron tomar las evaluaciones: ${error.message}`);
      return data;
    },

    async leerPrediccion(prediccionId) {
      const { data, error } = await cliente
        .from('prediccion')
        .select('id, resultado, rango_goles, marcador_local, marcador_visitante, justificacion')
        .eq('id', prediccionId)
        .single();
      if (error) throw new Error(`No se pudo leer la predicción ${prediccionId}: ${error.message}`);
      return data;
    },

    async leerDatosPartido(partidoId) {
      // Una sola cadena: supabase-js deduce el tipo de la fila a partir de ella.
      const columnas =
        'equipo_local_id, equipo_visitante_id, goles_local, goles_visitante, goles_local_medio_tiempo, goles_visitante_medio_tiempo, local:equipo!partido_equipo_local_id_fkey(nombre_corto), visitante:equipo!partido_equipo_visitante_id_fkey(nombre_corto), jornada(nombre), torneo(nombre)';
      const [partido, estadisticas, eventos] = await Promise.all([
        cliente.from('partido').select(columnas).eq('id', partidoId).single(),
        cliente.from('estadistica_partido').select('equipo_id, tipo, valor').eq('partido_id', partidoId),
        cliente
          .from('evento_partido')
          .select('equipo_id, minuto, minuto_agregado, tipo, detalle')
          .eq('partido_id', partidoId),
      ]);
      for (const { error } of [partido, estadisticas, eventos]) {
        if (error) throw new Error(`No se pudieron leer los datos del partido ${partidoId}: ${error.message}`);
      }
      const fila = partido.data;
      if (fila === null) throw new Error(`No existe el partido ${partidoId}.`);
      return armarDatosPartidoIA(
        {
          ...fila,
          local: fila.local.nombre_corto,
          visitante: fila.visitante.nombre_corto,
          jornada: fila.jornada.nombre,
          torneo: fila.torneo.nombre,
        },
        estadisticas.data ?? [],
        eventos.data ?? [],
      );
    },

    async registrarLlamada(registro) {
      const { error } = await cliente.from('llamada_ia').insert(registro);
      if (error) throw new Error(`No se pudo registrar la llamada: ${error.message}`);
    },

    async guardar(evaluacionId, evaluacion) {
      const { data, error } = await cliente.rpc('guardar_evaluacion', {
        id_evaluacion: evaluacionId,
        datos: evaluacion,
      });
      if (error) throw new Error(`No se pudo guardar la evaluación: ${error.message}`);
      return data;
    },

    async registrarFallo(evaluacionId, motivo) {
      const { data, error } = await cliente.rpc('registrar_fallo_evaluacion', {
        id_evaluacion: evaluacionId,
        motivo,
      });
      if (error) throw new Error(`No se pudo registrar el fallo: ${error.message}`);
      return data;
    },

    async liberar(evaluacionIds) {
      const { error } = await cliente.rpc('liberar_evaluaciones', { ids: evaluacionIds });
      if (error) throw new Error(`No se pudieron liberar las evaluaciones: ${error.message}`);
    },
  };
}
