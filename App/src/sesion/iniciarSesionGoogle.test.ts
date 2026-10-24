// Flujo de inicio de sesión con Google (T12): F01 §5 y casos de error de §10.
import {
  GoogleSignin,
  reiniciarGoogle,
  simularCuentaSinToken,
  simularErrorGoogle,
  simularSelectorCancelado,
  simularSinServiciosGoogle,
  statusCodes,
  tokenGoogleDePrueba,
} from '../pruebas/googleFalso';
import {
  simularSinConexionAlValidarToken,
  simularTokenAceptado,
  simularTokenRechazado,
  supabaseFalso,
} from '../pruebas/supabaseFalso';
import { iniciarSesionGoogle } from './iniciarSesionGoogle';

jest.mock('../supabase/cliente');

const signInWithIdToken = supabaseFalso.auth.signInWithIdToken;
let consolaError: jest.SpyInstance;

beforeAll(() => {
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??= 'cliente-web-de-prueba';
});

beforeEach(() => {
  reiniciarGoogle();
  simularTokenAceptado();
  consolaError = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => consolaError.mockRestore());

it('envía a Supabase solo el token de Google (F01 §5.4, V1)', async () => {
  expect(await iniciarSesionGoogle()).toEqual({ tipo: 'exito' });

  expect(signInWithIdToken).toHaveBeenCalledTimes(1);
  expect(signInWithIdToken).toHaveBeenCalledWith({ provider: 'google', token: tokenGoogleDePrueba });
  expect(GoogleSignin.hasPlayServices).toHaveBeenCalledWith({ showPlayServicesUpdateDialog: true });
});

it('configura Google con el ID del cliente web una sola vez', async () => {
  // Módulos nuevos: la configuración no quedó hecha por otra prueba.
  let iniciar = iniciarSesionGoogle;
  let google = GoogleSignin;
  jest.isolateModules(() => {
    iniciar = jest.requireActual<typeof import('./iniciarSesionGoogle')>('./iniciarSesionGoogle')
      .iniciarSesionGoogle;
    google = jest.requireActual<typeof import('../pruebas/googleFalso')>('../pruebas/googleFalso')
      .GoogleSignin;
  });

  await iniciar();
  await iniciar();

  expect(google.configure).toHaveBeenCalledTimes(1);
  expect(google.configure).toHaveBeenCalledWith({ webClientId: expect.any(String) });
});

it('cerrar el selector no es un error y no llama a Supabase (CA5)', async () => {
  simularSelectorCancelado();

  expect(await iniciarSesionGoogle()).toEqual({ tipo: 'cancelado' });
  expect(signInWithIdToken).not.toHaveBeenCalled();
  expect(consolaError).not.toHaveBeenCalled();
});

it('la cancelación como error de Google también cuenta como cancelada', async () => {
  simularErrorGoogle(statusCodes.SIGN_IN_CANCELLED);

  expect(await iniciarSesionGoogle()).toEqual({ tipo: 'cancelado' });
});

it('sin servicios de Google Play no abre el selector', async () => {
  simularSinServiciosGoogle();

  expect(await iniciarSesionGoogle()).toEqual({ tipo: 'sinServiciosGoogle' });
  expect(GoogleSignin.signIn).not.toHaveBeenCalled();
  expect(signInWithIdToken).not.toHaveBeenCalled();
});

it('error de red de Google = sin conexión (CA6)', async () => {
  simularErrorGoogle('7');

  expect(await iniciarSesionGoogle()).toEqual({ tipo: 'sinConexion' });
  expect(signInWithIdToken).not.toHaveBeenCalled();
});

it('sin internet al validar el token en Supabase = sin conexión (CA6)', async () => {
  simularSinConexionAlValidarToken();

  expect(await iniciarSesionGoogle()).toEqual({ tipo: 'sinConexion' });
});

it('Supabase rechaza el token: error y queda registrado', async () => {
  simularTokenRechazado();

  expect(await iniciarSesionGoogle()).toEqual({ tipo: 'error' });
  expect(consolaError).toHaveBeenCalledTimes(1);
});

it('otro error de Google (p. ej. SHA-1 que no coincide): error y queda registrado', async () => {
  simularErrorGoogle('10');

  expect(await iniciarSesionGoogle()).toEqual({ tipo: 'error' });
  expect(signInWithIdToken).not.toHaveBeenCalled();
  expect(consolaError).toHaveBeenCalledTimes(1);
});

it('Google sin token de identidad: error y queda registrado', async () => {
  simularCuentaSinToken();

  expect(await iniciarSesionGoogle()).toEqual({ tipo: 'error' });
  expect(signInWithIdToken).not.toHaveBeenCalled();
  expect(consolaError).toHaveBeenCalledTimes(1);
});
