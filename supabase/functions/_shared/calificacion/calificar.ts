import { calificarPrediccion, type PrediccionACalificar, type ValoresPuntos } from './puntos.ts';

// F05: califica los partidos listos (R1). Por partido: lee sus predicciones, calcula con la tabla
// de R05 y lo guarda todo de una vez con `registrar_calificaciones`, que garantiza una sola
// calificación aunque otra ejecución corra en paralelo (R4).

export const PARTIDOS_POR_EJECUCION = 10;

export type PartidoPorCalificar = {
  partido_id: number;
  goles_local: number;
  goles_visitante: number;
};

export type CalificacionNueva = {
  prediccion_id: number;
  puntos_resultado: number;
  puntos_rango_goles: number;
  puntos_marcador: number;
};

export type DesenlaceRegistro = 'CALIFICADO' | 'YA_CALIFICADO';

export type DependenciasCalificar = {
  buscarPartidos: (limite: number) => Promise<PartidoPorCalificar[]>;
  leerValores: () => Promise<ValoresPuntos>;
  leerPredicciones: (partidoId: number) => Promise<PrediccionACalificar[]>;
  registrar: (partidoId: number, calificaciones: CalificacionNueva[]) => Promise<DesenlaceRegistro>;
};

export type ResumenCalificar = {
  partidos: number;
  yaCalificados: number;
  predicciones: number;
  errores: string[];
};

export function calificacionesDe(
  partido: PartidoPorCalificar,
  predicciones: readonly PrediccionACalificar[],
  valores: ValoresPuntos,
): CalificacionNueva[] {
  const real = { local: partido.goles_local, visitante: partido.goles_visitante };
  return predicciones.map((prediccion) => {
    const { puntos_resultado, puntos_rango_goles, puntos_marcador } = calificarPrediccion(
      prediccion,
      real,
      valores,
    );
    return { prediccion_id: prediccion.id, puntos_resultado, puntos_rango_goles, puntos_marcador };
  });
}

/** Un partido con error no detiene a los demás; queda sin calificar y se reintenta (R9). */
export async function ejecutarCalificacion(
  dependencias: DependenciasCalificar,
): Promise<ResumenCalificar> {
  const resumen: ResumenCalificar = { partidos: 0, yaCalificados: 0, predicciones: 0, errores: [] };

  const partidos = await dependencias.buscarPartidos(PARTIDOS_POR_EJECUCION);
  if (partidos.length === 0) return resumen;
  const valores = await dependencias.leerValores();

  for (const partido of partidos) {
    try {
      const predicciones = await dependencias.leerPredicciones(partido.partido_id);
      const calificaciones = calificacionesDe(partido, predicciones, valores);
      const desenlace = await dependencias.registrar(partido.partido_id, calificaciones);
      if (desenlace === 'YA_CALIFICADO') {
        resumen.yaCalificados += 1;
        continue;
      }
      resumen.partidos += 1;
      resumen.predicciones += calificaciones.length;
    } catch (error) {
      const motivo = error instanceof Error ? error.message : String(error);
      resumen.errores.push(`Partido ${partido.partido_id}: ${motivo}`);
    }
  }
  return resumen;
}
