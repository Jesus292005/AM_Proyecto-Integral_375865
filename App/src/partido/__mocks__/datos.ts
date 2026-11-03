// Se activa con `jest.mock('<ruta>/partido/datos')`. Por defecto S03 muestra un partido terminado
// (Puebla 1, Santos 0) sin predicción; cada prueba puede cambiar las respuestas.
import type { EleccionPrediccion, Prediccion } from '../eleccion';
import type { PartidoDetalle } from '../datos';

export class ErrorPrediccionesCerradas extends Error {
  constructor() {
    super('PREDICCIONES_CERRADAS');
    this.name = 'ErrorPrediccionesCerradas';
  }
}

export const partidoTerminado = (id: number): PartidoDetalle => ({
  id,
  inicio: '2024-07-13T20:00:00Z',
  cierre_predicciones: '2024-07-13T20:00:00Z',
  estado: 'TERMINADO',
  es_simulado: false,
  goles_local: 1,
  goles_visitante: 0,
  local: { nombre_corto: 'Puebla', color_primario: '#1D3F8F' },
  visitante: { nombre_corto: 'Santos', color_primario: null },
});

export const obtenerPartido = jest.fn(async (id: number): Promise<PartidoDetalle | null> =>
  partidoTerminado(id),
);
export const obtenerMiPrediccion = jest.fn(
  async (_partidoId: number): Promise<Prediccion | null> => null,
);
export const guardarPrediccion = jest.fn(
  async (_partidoId: number, eleccion: EleccionPrediccion): Promise<Prediccion> => ({
    ...eleccion,
    actualizada_en: new Date().toISOString(),
  }),
);
export const quitarPrediccion = jest.fn(async (_partidoId: number): Promise<void> => {});
