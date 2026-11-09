// Se activa con `jest.mock('<ruta>/perfil/datos')`. Por defecto la cuenta es de usuario normal y
// tiene los recordatorios activos y sin racha.
import type { MiRacha, Rol } from '../datos';

export const obtenerMiRol = jest.fn(async (): Promise<Rol> => 'USUARIO');
export const obtenerRecordatoriosActivos = jest.fn(async () => true);
export const guardarRecordatoriosActivos = jest.fn(async (_activos: boolean) => {});
export const obtenerMiRacha = jest.fn(
  async (): Promise<MiRacha> => ({
    racha_actual: 0,
    mejor_racha: 0,
    incluye_simulados: false,
    ultima_calificacion: null,
  }),
);
