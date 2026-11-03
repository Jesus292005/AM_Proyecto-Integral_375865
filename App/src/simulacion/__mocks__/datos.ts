// Se activa con `jest.mock('<ruta>/simulacion/datos')`. Por defecto no hay simulados ni orígenes.
import type { PartidoDeSimulacion } from '../datos';

export const obtenerSimuladosEnCurso = jest.fn(async (): Promise<PartidoDeSimulacion[]> => []);
export const obtenerSimuladosTerminados = jest.fn(async (): Promise<PartidoDeSimulacion[]> => []);
export const obtenerOrigenes = jest.fn(async (): Promise<PartidoDeSimulacion[]> => []);
export const crearSimulado = jest.fn(async (_origen: number, _minutos: number) => 1);
export const iniciarSimulado = jest.fn(async (_partido: number): Promise<void> => {});
export const terminarSimulado = jest.fn(async (_partido: number): Promise<void> => {});
