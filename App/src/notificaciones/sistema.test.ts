// F11b R6: los canales de Android. `sistema.ts` está simulado para todas las pruebas
// (`jest.setup.ts`); aquí se prueba el real con `expo-notifications` simulado.
import * as Notifications from 'expo-notifications';

jest.unmock('./sistema');
jest.mock('expo-notifications', () => ({
  setNotificationChannelAsync: jest.fn(async () => null),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: 'ExponentPushToken[prueba]' })),
  AndroidImportance: { HIGH: 4 },
  PermissionStatus: { UNDETERMINED: 'undetermined' },
}));

const { CANALES, obtenerToken } = jest.requireActual<typeof import('./sistema')>('./sistema');

describe('canales de notificaciones', () => {
  it('F11b CA5: crea el canal "Puntos de partidos" junto al de recordatorios antes de pedir el token', async () => {
    const token = await obtenerToken();

    expect(token).toBe('ExponentPushToken[prueba]');
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('recordatorios', {
      name: 'Recordatorios de partidos',
      importance: 4,
    });
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('puntos', {
      name: 'Puntos de partidos',
      importance: 4,
    });
    expect(CANALES.map((c) => c.id)).toEqual(['recordatorios', 'puntos']);
  });
});
