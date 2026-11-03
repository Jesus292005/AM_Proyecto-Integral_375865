// Se activa con `jest.mock('<ruta>/perfil/datos')`. Por defecto la cuenta es de usuario normal.
import type { Rol } from '../datos';

export const obtenerMiRol = jest.fn(async (): Promise<Rol> => 'USUARIO');
