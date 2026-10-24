// Pantalla S01 (T12): estados de F01 §11 y casos de error de §10 (CA5, CA6).
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ExpoRoot } from 'expo-router';
import { getMockContext } from 'expo-router/testing-library';

import {
  GoogleSignin,
  reiniciarGoogle,
  simularErrorGoogle,
  simularSelectorAbierto,
  simularSelectorCancelado,
  simularSinServiciosGoogle,
  tokenGoogleDePrueba,
} from '../pruebas/googleFalso';
import {
  simularSinConexionAlValidarToken,
  simularSinSesion,
  simularTokenAceptado,
  simularTokenRechazado,
  supabaseFalso,
} from '../pruebas/supabaseFalso';

jest.mock('../supabase/cliente');

const CONTINUAR = 'Continuar con Google';
const SIN_CONEXION = 'Sin conexión. Revisa tu internet e inténtalo de nuevo.';
const ERROR = 'No pudimos iniciar sesión. Inténtalo de nuevo.';

let consolaError: jest.SpyInstance;

beforeAll(() => {
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ??= 'cliente-web-de-prueba';
});

beforeEach(() => {
  simularSinSesion();
  simularTokenAceptado();
  reiniciarGoogle();
  consolaError = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => consolaError.mockRestore());

async function abrirS01() {
  process.env.EXPO_ROUTER_IMPORT_MODE = 'sync';
  await render(<ExpoRoot context={getMockContext('src/app')} location="/login" />);
  await screen.findByRole('button', { name: CONTINUAR });
}

async function tocar(nombre: string) {
  await act(async () => {
    await fireEvent.press(screen.getByRole('button', { name: nombre }));
  });
}

it('muestra el nombre de la app y "Continuar con Google" (inicial)', async () => {
  await abrirS01();

  expect(screen.getByRole('header', { name: 'Campeón de Sillón' })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: CONTINUAR })).toBeEnabled();
  expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
});

it('al elegir una cuenta inicia sesión y va a Inicio (F01 §5)', async () => {
  await abrirS01();

  await tocar(CONTINUAR);

  expect(await screen.findByText('S11')).toBeOnTheScreen();
  expect(supabaseFalso.auth.signInWithIdToken).toHaveBeenCalledWith({
    provider: 'google',
    token: tokenGoogleDePrueba,
  });
});

it('mientras el selector está abierto el botón carga y no acepta más toques', async () => {
  simularSelectorAbierto();
  await abrirS01();

  await tocar(CONTINUAR);
  await tocar(CONTINUAR);
  await tocar(CONTINUAR);

  const boton = screen.getByRole('button', { name: CONTINUAR });
  expect(boton).toBeDisabled();
  expect(boton).toBeBusy();
  expect(GoogleSignin.signIn).toHaveBeenCalledTimes(1);
});

it('cerrar el selector deja S01 como estaba, sin error (CA5)', async () => {
  simularSelectorCancelado();
  await abrirS01();

  await tocar(CONTINUAR);

  expect(screen.getByRole('button', { name: CONTINUAR })).toBeEnabled();
  expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
  expect(consolaError).not.toHaveBeenCalled();
});

it('sin internet muestra el mensaje y Reintentar funciona al volver la conexión (CA6)', async () => {
  simularErrorGoogle('7');
  await abrirS01();

  await tocar(CONTINUAR);

  expect(screen.getByRole('alert')).toHaveTextContent(SIN_CONEXION);
  expect(screen.queryByRole('button', { name: CONTINUAR })).not.toBeOnTheScreen();

  reiniciarGoogle();
  await tocar('Reintentar');

  expect(await screen.findByText('S11')).toBeOnTheScreen();
});

it('sin internet al validar en Supabase también muestra "sin conexión" (CA6)', async () => {
  simularSinConexionAlValidarToken();
  await abrirS01();

  await tocar(CONTINUAR);

  expect(screen.getByRole('alert')).toHaveTextContent(SIN_CONEXION);
});

it('sin servicios de Google Play lo indica', async () => {
  simularSinServiciosGoogle();
  await abrirS01();

  await tocar(CONTINUAR);

  expect(screen.getByRole('alert')).toHaveTextContent(
    'Necesitas instalar o actualizar los servicios de Google Play para iniciar sesión.',
  );
  expect(screen.getByRole('button', { name: 'Reintentar' })).toBeOnTheScreen();
});

it('si Supabase rechaza el token muestra el error, lo registra y permite reintentar', async () => {
  simularTokenRechazado();
  await abrirS01();

  await tocar(CONTINUAR);

  expect(screen.getByRole('alert')).toHaveTextContent(ERROR);
  expect(consolaError).toHaveBeenCalledTimes(1);

  simularTokenAceptado();
  await tocar('Reintentar');

  expect(await screen.findByText('S11')).toBeOnTheScreen();
});

it('cancelar después de un error regresa al estado inicial (CA5)', async () => {
  simularErrorGoogle('7');
  await abrirS01();
  await tocar(CONTINUAR);
  expect(screen.getByRole('alert')).toBeOnTheScreen();

  simularSelectorCancelado();
  await tocar('Reintentar');

  expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
  expect(screen.getByRole('button', { name: CONTINUAR })).toBeEnabled();
});
