// Google Sign-In falso para pruebas: controla qué pasa al abrir el selector de cuentas.
// Lo usan todas las pruebas por `__mocks__/@react-native-google-signin/google-signin.ts`.
import type { NativeModuleError, SignInResponse } from '@react-native-google-signin/google-signin';

export const statusCodes = Object.freeze({
  SIGN_IN_CANCELLED: '12501',
  IN_PROGRESS: 'ASYNC_OP_IN_PROGRESS',
  PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  SIGN_IN_REQUIRED: '4',
  NULL_PRESENTER: 'NULL_PRESENTER',
});

export const tokenGoogleDePrueba = 'token-google-de-prueba';

function cuentaElegida(idToken: string | null): SignInResponse {
  return {
    type: 'success',
    data: {
      user: {
        id: '1234567890',
        name: 'Usuario de Prueba',
        email: 'prueba@example.com',
        photo: null,
        familyName: null,
        givenName: null,
      },
      scopes: [],
      idToken,
      serverAuthCode: null,
    },
  };
}

function errorConCodigo(code: string): NativeModuleError {
  return Object.assign(new Error(`Error de Google ${code}`), { code });
}

export function isErrorWithCode(error: unknown): error is NativeModuleError {
  return error instanceof Error && 'code' in error;
}

export const GoogleSignin = {
  configure: jest.fn(),
  hasPlayServices: jest.fn(async () => true),
  signIn: jest.fn(async (): Promise<SignInResponse> => cuentaElegida(tokenGoogleDePrueba)),
  signOut: jest.fn(async () => null),
};

/** Estado inicial: hay servicios de Google Play y el usuario elige una cuenta. */
export function reiniciarGoogle() {
  GoogleSignin.configure.mockClear();
  GoogleSignin.hasPlayServices.mockReset().mockResolvedValue(true);
  GoogleSignin.signIn.mockReset().mockResolvedValue(cuentaElegida(tokenGoogleDePrueba));
  GoogleSignin.signOut.mockClear();
}

export function simularCuentaSinToken() {
  GoogleSignin.signIn.mockResolvedValue(cuentaElegida(null));
}

/** El usuario cierra el selector sin elegir cuenta. */
export function simularSelectorCancelado() {
  GoogleSignin.signIn.mockResolvedValue({ type: 'cancelled', data: null });
}

export function simularErrorGoogle(code: string) {
  GoogleSignin.signIn.mockRejectedValue(errorConCodigo(code));
}

export function simularSinServiciosGoogle() {
  GoogleSignin.hasPlayServices.mockRejectedValue(
    errorConCodigo(statusCodes.PLAY_SERVICES_NOT_AVAILABLE),
  );
}

/** El selector queda abierto: el intento sigue en curso. */
export function simularSelectorAbierto() {
  GoogleSignin.signIn.mockReturnValue(new Promise(() => {}));
}
