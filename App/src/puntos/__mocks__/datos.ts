// Se activa con `jest.mock('<ruta>/puntos/datos')`. Por defecto no hay puntos (ningún partido
// predicho); cada prueba puede cambiar las respuestas.
import type { PuntosPrediccion } from '../datos';

export const obtenerMisPuntos = jest.fn(
  async (_partidoIds: number[]): Promise<Map<number, PuntosPrediccion>> => new Map(),
);
export const obtenerMisPuntosDePartido = jest.fn(
  async (_partidoId: number): Promise<PuntosPrediccion | null> => null,
);
