import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Linking } from 'react-native';

// Lo que F11a necesita del teléfono: permiso, canal, token de push, notificación tocada, ajustes
// del sistema y dos marcas guardadas. Todo lo resuelve `expo-notifications` en Android y en iOS
// (R9, D53). Es el único archivo que lo usa: las pruebas lo simulan con `__mocks__/sistema`
// (activado para todas en `jest.setup.ts`).

export type EstadoPermiso = 'concedido' | 'negado' | 'sinPreguntar';

// R9.
const CANAL = { id: 'recordatorios', nombre: 'Recordatorios de partidos' } as const;
const CLAVE_AHORA_NO = 'notificaciones.ahora_no';
const CLAVE_TOKEN = 'notificaciones.token';

function comoEstado(permiso: Notifications.NotificationPermissionsStatus): EstadoPermiso {
  if (permiso.granted) return 'concedido';
  return permiso.status === Notifications.PermissionStatus.UNDETERMINED ? 'sinPreguntar' : 'negado';
}

export async function leerPermiso(): Promise<EstadoPermiso> {
  return comoEstado(await Notifications.getPermissionsAsync());
}

export async function pedirPermiso(): Promise<EstadoPermiso> {
  return comoEstado(await Notifications.requestPermissionsAsync());
}

/** Crea el canal (Android 8+; en iOS no hace nada) y devuelve el token de push de Expo (R2). */
export async function obtenerToken(): Promise<string> {
  await Notifications.setNotificationChannelAsync(CANAL.id, {
    name: CANAL.nombre,
    importance: Notifications.AndroidImportance.HIGH,
  });
  const projectId = Constants.easConfig?.projectId;
  const { data } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : {});
  return data;
}

/** Con la app abierta también se muestran (banner y lista), sin sonido ni globo. */
export function configurarPresentacion(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Los datos de la última notificación tocada (app abierta, en segundo plano o cerrada), o null.
 * `undefined` mientras el sistema no responde.
 */
export function useDatosNotificacionTocada(): unknown {
  const respuesta = Notifications.useLastNotificationResponse();
  if (respuesta === undefined) return undefined;
  if (respuesta === null || respuesta.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
    return null;
  }
  return respuesta.notification.request.content.data;
}

/** Para no volver a navegar a la misma notificación si la app se monta otra vez. */
export function olvidarNotificacionTocada(): void {
  Notifications.clearLastNotificationResponse();
}

export function abrirAjustes(): Promise<void> {
  return Linking.openSettings();
}

/** "Ahora no" en este teléfono: la app no vuelve a preguntar sola (R1). */
export async function leerAhoraNo(): Promise<boolean> {
  return (await SecureStore.getItemAsync(CLAVE_AHORA_NO)) === '1';
}

export function guardarAhoraNo(): Promise<void> {
  return SecureStore.setItemAsync(CLAVE_AHORA_NO, '1');
}

/** Último token registrado desde este teléfono, para borrarlo al cerrar sesión (R3). */
export function leerTokenGuardado(): Promise<string | null> {
  return SecureStore.getItemAsync(CLAVE_TOKEN);
}

export function guardarToken(token: string): Promise<void> {
  return SecureStore.setItemAsync(CLAVE_TOKEN, token);
}

export function olvidarTokenGuardado(): Promise<void> {
  return SecureStore.deleteItemAsync(CLAVE_TOKEN);
}
