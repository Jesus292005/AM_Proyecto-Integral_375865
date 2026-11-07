// T72 y fix del guion: el permiso de cámara real (F12 R6) con `expo-camera` simulado; el resto de
// las pruebas usa `__mocks__/camara`.
import { act, renderHook } from '@testing-library/react-native';
import { useCameraPermissions } from 'expo-camera';
import { AppState, Linking, type AppStateStatus } from 'react-native';

import type { usePermisoCamara as UsePermisoCamara } from './camara';

jest.unmock('./camara');
jest.mock('expo-camera', () => ({ CameraView: () => null, useCameraPermissions: jest.fn() }));

const { usePermisoCamara } = jest.requireActual<{ usePermisoCamara: typeof UsePermisoCamara }>('./camara');
const hookFalso = useCameraPermissions as jest.MockedFunction<typeof useCameraPermissions>;

type Permiso = { granted: boolean; status: 'granted' | 'denied' | 'undetermined'; canAskAgain: boolean };

const CONCEDIDO: Permiso = { granted: true, status: 'granted', canAskAgain: true };
const NEGADO: Permiso = { granted: false, status: 'denied', canAskAgain: true };
const BLOQUEADO: Permiso = { granted: false, status: 'denied', canAskAgain: false };

const pedir = jest.fn();
const leer = jest.fn();
let alCambiarApp: ((estado: AppStateStatus) => void) | undefined;
const quitarOyente = jest.fn();

function conPermiso(permiso: Permiso | null) {
  hookFalso.mockReturnValue([
    permiso === null ? null : { ...permiso, expires: 'never' },
    pedir,
    leer,
  ] as unknown as ReturnType<typeof useCameraPermissions>);
}

async function volverALaApp() {
  await act(async () => alCambiarApp?.('background'));
  await act(async () => alCambiarApp?.('active'));
}

beforeEach(() => {
  pedir.mockReset().mockResolvedValue(undefined);
  leer.mockReset().mockResolvedValue(undefined);
  quitarOyente.mockReset();
  alCambiarApp = undefined;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_tipo, oyente) => {
    alCambiarApp = oyente as (estado: AppStateStatus) => void;
    return { remove: quitarOyente };
  });
  jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
});

afterEach(() => jest.restoreAllMocks());

describe('usePermisoCamara (F12 R6)', () => {
  it.each([
    ['nunca preguntado', { granted: false, status: 'undetermined', canAskAgain: true } as Permiso],
    ['quitado al cerrar ("Solo esta vez")', NEGADO],
    ['negado sin poder volver a preguntar', BLOQUEADO],
  ])('F12 CA3: sin permiso (%s), al entrar a S07 se pide una vez', async (_caso, permiso) => {
    conPermiso(permiso);

    const { rerender } = await renderHook(() => usePermisoCamara());
    await rerender({});

    expect(pedir).toHaveBeenCalledTimes(1);
  });

  it('F12 CA3: con permiso concedido no se pide', async () => {
    conPermiso(CONCEDIDO);

    const { result } = await renderHook(() => usePermisoCamara());

    expect(result.current.estado).toBe('concedido');
    expect(pedir).not.toHaveBeenCalled();
  });

  it.each([
    [CONCEDIDO, 'concedido'],
    [NEGADO, 'negado'],
    [BLOQUEADO, 'bloqueado'],
    [null, 'revisando'],
  ] as const)('F12 CA3: el permiso %o se muestra como %s', async (permiso, estado) => {
    conPermiso(permiso);

    const { result } = await renderHook(() => usePermisoCamara());

    expect(result.current.estado).toBe(estado);
  });

  it('F12 CA7: al volver de Ajustes (p. ej. con "Preguntar siempre") se vuelve a pedir', async () => {
    conPermiso(BLOQUEADO);
    const { result } = await renderHook(() => usePermisoCamara());
    pedir.mockClear();

    await act(async () => result.current.abrirAjustes());
    expect(Linking.openSettings).toHaveBeenCalled();
    await volverALaApp();

    expect(pedir).toHaveBeenCalledTimes(1);
  });

  it('F12 R6: al volver a la app sin pasar por Ajustes solo se revisa (sin repetir el diálogo)', async () => {
    conPermiso(NEGADO);
    await renderHook(() => usePermisoCamara());
    pedir.mockClear();

    await volverALaApp();
    await volverALaApp();

    expect(pedir).not.toHaveBeenCalled();
    expect(leer).toHaveBeenCalledTimes(2);
  });

  it('al salir de S07 deja de escuchar a la app', async () => {
    conPermiso(CONCEDIDO);
    const { unmount } = await renderHook(() => usePermisoCamara());

    await unmount();

    expect(quitarOyente).toHaveBeenCalled();
  });
});
