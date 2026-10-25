// Cerrar sesión desde S09 (T13): F01 §7 y CA4.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ExpoRoot } from 'expo-router';
import { getMockContext } from 'expo-router/testing-library';
import { Alert, type AlertButton } from 'react-native';

import { clienteConsultas } from '../datos/clienteConsultas';
import { GoogleSignin, reiniciarGoogle } from '../pruebas/googleFalso';
import {
  emitirEventoSesion,
  sesionDePrueba,
  simularCierreAceptado,
  simularCierreFallido,
  simularCierreSinAvisarAlServidor,
  simularCierreSinConexion,
  simularSesionGuardada,
  simularSinSesion,
  supabaseFalso,
} from '../pruebas/supabaseFalso';

jest.mock('../supabase/cliente');

// S01 se reconoce por su botón principal.
const S01 = 'Continuar con Google';
const CERRAR = 'Cerrar sesión';
const SIN_CONEXION = 'Sin conexión. Revisa tu internet e inténtalo de nuevo.';
const ERROR = 'No pudimos cerrar sesión. Inténtalo de nuevo.';

let consolaError: jest.SpyInstance;
let aviso: jest.SpyInstance;

beforeAll(() => {
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??= 'cliente-web-de-prueba';
});

beforeEach(() => {
  simularSesionGuardada();
  simularCierreAceptado();
  reiniciarGoogle();
  clienteConsultas.clear();
  consolaError = jest.spyOn(console, 'error').mockImplementation(() => {});
  aviso = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  consolaError.mockRestore();
  aviso.mockRestore();
});

async function abrir(url: string) {
  process.env.EXPO_ROUTER_IMPORT_MODE = 'sync';
  await render(<ExpoRoot context={getMockContext('src/app')} location={url} />);
}

async function abrirPerfil() {
  await abrir('/perfil');
  await screen.findByRole('button', { name: CERRAR });
}

/** Botones del último aviso de confirmación. */
function botonesAviso(): AlertButton[] {
  const llamada = aviso.mock.calls.at(-1) as [string, string | undefined, AlertButton[]] | undefined;
  if (llamada === undefined) throw new Error('No se mostró el aviso de confirmación.');
  return llamada[2];
}

async function elegirEnAviso(texto: string) {
  const boton = botonesAviso().find((b) => b.text === texto);
  if (boton?.onPress === undefined) throw new Error(`El aviso no tiene el botón "${texto}".`);
  const onPress = boton.onPress;
  await act(async () => {
    onPress();
  });
}

async function cerrarSesion() {
  await fireEvent.press(screen.getByRole('button', { name: CERRAR }));
  await elegirEnAviso(CERRAR);
}

async function iniciarSesion() {
  await act(async () => emitirEventoSesion('SIGNED_IN', sesionDePrueba));
}

it('S09 tiene "Cerrar sesión" y pide confirmación antes de cerrar', async () => {
  await abrirPerfil();

  await fireEvent.press(screen.getByRole('button', { name: CERRAR }));

  expect(aviso).toHaveBeenCalledWith('¿Cerrar sesión?', undefined, expect.any(Array), {
    cancelable: true,
  });
  expect(botonesAviso().map((b) => b.text)).toEqual(['Cancelar', CERRAR]);
  expect(supabaseFalso.auth.signOut).not.toHaveBeenCalled();
});

it('"Cancelar" deja al usuario en S09 con la sesión abierta', async () => {
  await abrirPerfil();

  await fireEvent.press(screen.getByRole('button', { name: CERRAR }));
  const cancelar = botonesAviso().find((b) => b.text === 'Cancelar');

  // El botón de cancelar del aviso nativo solo lo cierra.
  expect(cancelar?.style).toBe('cancel');
  expect(cancelar?.onPress).toBeUndefined();
  expect(supabaseFalso.auth.signOut).not.toHaveBeenCalled();
  expect(screen.getByText('S09')).toBeOnTheScreen();
});

it('al confirmar cierra la sesión de este teléfono en Supabase y en Google, y va a S01 (CA4)', async () => {
  await abrirPerfil();

  await cerrarSesion();

  expect(supabaseFalso.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  expect(GoogleSignin.signOut).toHaveBeenCalledTimes(1);
  expect(await screen.findByText(S01)).toBeOnTheScreen();
  expect(screen.queryByText('S09')).not.toBeOnTheScreen();
  expect(screen.queryAllByRole('tab')).toHaveLength(0);
});

it('vacía la caché de datos del usuario anterior (CA4)', async () => {
  clienteConsultas.setQueryData(['dato-de-prueba'], 'del usuario anterior');
  await abrirPerfil();

  await cerrarSesion();

  await screen.findByText(S01);
  expect(clienteConsultas.getQueryData(['dato-de-prueba'])).toBeUndefined();
  expect(clienteConsultas.getQueryCache().getAll()).toHaveLength(0);
});

it('el siguiente inicio de sesión va a Inicio, no a Perfil', async () => {
  await abrirPerfil();
  await cerrarSesion();
  await screen.findByText(S01);

  await iniciarSesion();

  expect(await screen.findByText('S11')).toBeOnTheScreen();
  expect(screen.queryByText('S09')).not.toBeOnTheScreen();
});

it('olvida la ruta pedida antes de iniciar sesión (CA8) al cerrar sesión', async () => {
  simularSinSesion();
  await abrir('/partido/7');
  await screen.findByText(S01);
  await iniciarSesion();
  await screen.findByText('S03');

  await fireEvent.press(screen.getByRole('tab', { name: 'Perfil' }));
  await screen.findByRole('button', { name: CERRAR });
  await cerrarSesion();
  await screen.findByText(S01);
  await iniciarSesion();

  expect(await screen.findByText('S11')).toBeOnTheScreen();
  expect(screen.queryByText('S03')).not.toBeOnTheScreen();
});

it('si la sesión termina sola (no por cerrar sesión) se sigue conservando la ruta (F01 §6.2)', async () => {
  await abrirPerfil();

  await act(async () => emitirEventoSesion('SIGNED_OUT', null));
  await screen.findByText(S01);
  await iniciarSesion();

  expect(await screen.findByText('S09')).toBeOnTheScreen();
});

it('sin internet para avisar al servidor, la sesión se borra del teléfono y va a S01', async () => {
  simularCierreSinAvisarAlServidor();
  await abrirPerfil();

  await cerrarSesion();

  expect(await screen.findByText(S01)).toBeOnTheScreen();
  expect(GoogleSignin.signOut).toHaveBeenCalledTimes(1);
});

it('si Google no cierra su sesión, igual se cierra la de la app', async () => {
  GoogleSignin.signOut.mockRejectedValueOnce(new Error('Google no respondió'));
  await abrirPerfil();

  await cerrarSesion();

  expect(await screen.findByText(S01)).toBeOnTheScreen();
  expect(consolaError).toHaveBeenCalled();
});

describe('cuando Supabase conserva la sesión', () => {
  it('sin internet y con el token vencido: sigue en S09 con el mensaje de sin conexión', async () => {
    simularCierreSinConexion();
    clienteConsultas.setQueryData(['dato-de-prueba'], 'sigue siendo suyo');
    await abrirPerfil();

    await cerrarSesion();

    expect(await screen.findByText(SIN_CONEXION)).toBeOnTheScreen();
    expect(screen.getByText('S09')).toBeOnTheScreen();
    expect(screen.queryByText(S01)).not.toBeOnTheScreen();
    expect(GoogleSignin.signOut).not.toHaveBeenCalled();
    expect(clienteConsultas.getQueryData(['dato-de-prueba'])).toBe('sigue siendo suyo');
    expect(screen.getByRole('button', { name: CERRAR })).toBeEnabled();
  });

  it('otro error: sigue en S09 con el mensaje de error y lo registra', async () => {
    simularCierreFallido();
    await abrirPerfil();

    await cerrarSesion();

    expect(await screen.findByText(ERROR)).toBeOnTheScreen();
    expect(screen.getByText('S09')).toBeOnTheScreen();
    expect(consolaError).toHaveBeenCalled();
  });

  it('el mismo botón reintenta y, con conexión, cierra la sesión', async () => {
    simularCierreSinConexion();
    await abrirPerfil();
    await cerrarSesion();
    await screen.findByText(SIN_CONEXION);

    simularCierreAceptado();
    await cerrarSesion();

    expect(await screen.findByText(S01)).toBeOnTheScreen();
  });
});

it('mientras se cierra la sesión, el botón queda cargando y no se cierra dos veces', async () => {
  let terminar: () => void = () => {};
  supabaseFalso.auth.signOut.mockImplementationOnce(
    () =>
      new Promise((resolver) => {
        terminar = () => {
          emitirEventoSesion('SIGNED_OUT', null);
          resolver({ error: null });
        };
      }),
  );
  await abrirPerfil();

  await cerrarSesion();
  // Una segunda confirmación que llega antes de que el botón se deshabilite.
  await elegirEnAviso(CERRAR);

  expect(screen.getByRole('button', { name: CERRAR })).toBeDisabled();
  expect(screen.getByTestId('boton-cargando')).toBeOnTheScreen();
  expect(supabaseFalso.auth.signOut).toHaveBeenCalledTimes(1);

  await act(async () => terminar());
  expect(await screen.findByText(S01)).toBeOnTheScreen();
});
