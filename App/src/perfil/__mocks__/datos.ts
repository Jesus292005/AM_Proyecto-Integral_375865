// Se activa con `jest.mock('<ruta>/perfil/datos')`. Por defecto la cuenta es de usuario normal y
// tiene los recordatorios activos.
import type { Rol } from '../datos';

export const obtenerMiRol = jest.fn(async (): Promise<Rol> => 'USUARIO');
export const obtenerRecordatoriosActivos = jest.fn(async () => true);
export const guardarRecordatoriosActivos = jest.fn(async (_activos: boolean) => {});
