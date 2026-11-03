// Activado para todas las pruebas en `jest.setup.ts`. Por defecto el permiso no se ha preguntado,
// no hay marca "Ahora no" ni token guardado, ni notificación tocada.
import type { EstadoPermiso } from '../sistema';

export const leerPermiso = jest.fn(async (): Promise<EstadoPermiso> => 'sinPreguntar');
export const pedirPermiso = jest.fn(async (): Promise<EstadoPermiso> => 'concedido');
export const obtenerToken = jest.fn(async () => 'ExponentPushToken[prueba]');
export const abrirAjustes = jest.fn(async () => {});
export const leerAhoraNo = jest.fn(async () => false);
export const guardarAhoraNo = jest.fn(async () => {});
export const leerTokenGuardado = jest.fn(async (): Promise<string | null> => null);
export const guardarToken = jest.fn(async (_token: string) => {});
export const olvidarTokenGuardado = jest.fn(async () => {});
export const configurarPresentacion = jest.fn();
export const useDatosNotificacionTocada = jest.fn((): unknown => null);
export const olvidarNotificacionTocada = jest.fn();
