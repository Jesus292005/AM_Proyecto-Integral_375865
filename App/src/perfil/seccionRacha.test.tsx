// T78: sección "Racha" de S09 (F13 CA6) y su lectura (R6).
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ExpoRoot } from 'expo-router';
import { getMockContext } from 'expo-router/testing-library';

import { clienteConsultas } from '../datos/clienteConsultas';
import { ErrorDatos } from '../datos/errores';
import { simularSesionGuardada } from '../pruebas/supabaseFalso';
import { obtenerMiRacha, type MiRacha } from './datos';

jest.mock('../supabase/cliente');
jest.mock('./datos');
jest.mock('../grupos/datos');

const rachaFalsa = obtenerMiRacha as jest.MockedFunction<typeof obtenerMiRacha>;

const racha = (extra: Partial<MiRacha>): MiRacha => ({
  racha_actual: 0,
  mejor_racha: 0,
  incluye_simulados: false,
  ultima_calificacion: '2026-11-07T18:00:00Z',
  ...extra,
});

beforeEach(() => {
  simularSesionGuardada();
  clienteConsultas.clear();
  clienteConsultas.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } });
  rachaFalsa.mockReset().mockResolvedValue(racha({ racha_actual: 3, mejor_racha: 4 }));
});

afterEach(() => clienteConsultas.clear());

async function abrirPerfil() {
  process.env.EXPO_ROUTER_IMPORT_MODE = 'sync';
  await render(<ExpoRoot context={getMockContext('src/app')} location="/perfil" />);
}

it('F13 CA6: muestra la racha actual y la mejor', async () => {
  await abrirPerfil();

  expect(await screen.findByLabelText('Racha actual: 3 aciertos seguidos')).toBeOnTheScreen();
  expect(screen.getByLabelText('Mejor racha: 4 aciertos seguidos')).toBeOnTheScreen();
  expect(
    screen.getByText('Cuenta tus predicciones con puntos, una tras otra. Un partido sin predecir no la rompe.'),
  ).toBeOnTheScreen();
  expect(screen.queryByText('Incluye partidos simulados')).not.toBeOnTheScreen();
});

it('F13 CA6: la nota de simulados aparece solo cuando aplica', async () => {
  rachaFalsa.mockResolvedValue(racha({ racha_actual: 1, mejor_racha: 1, incluye_simulados: true }));
  await abrirPerfil();

  expect(await screen.findByLabelText('Racha actual: 1 acierto seguido')).toBeOnTheScreen();
  expect(screen.getByText('Incluye partidos simulados')).toBeOnTheScreen();
});

it('F13 CA6: sin calificaciones muestra el texto de inicio', async () => {
  rachaFalsa.mockResolvedValue(racha({ ultima_calificacion: null }));
  await abrirPerfil();

  expect(await screen.findByText('Tu racha empieza con tu primer acierto.')).toBeOnTheScreen();
  expect(screen.queryByLabelText(/Racha actual/)).not.toBeOnTheScreen();
});

it('F13 CA6: con calificaciones pero sin aciertos muestra 0 y 0', async () => {
  rachaFalsa.mockResolvedValue(racha({}));
  await abrirPerfil();

  expect(await screen.findByLabelText('Racha actual: 0 aciertos seguidos')).toBeOnTheScreen();
  expect(screen.getByLabelText('Mejor racha: 0 aciertos seguidos')).toBeOnTheScreen();
});

it('F13 R7: al volver a la pestaña Perfil la racha se pide de nuevo', async () => {
  await abrirPerfil();
  expect(await screen.findByLabelText('Racha actual: 3 aciertos seguidos')).toBeOnTheScreen();
  expect(rachaFalsa).toHaveBeenCalledTimes(1);

  rachaFalsa.mockResolvedValue(racha({ racha_actual: 4, mejor_racha: 4 }));
  await fireEvent.press(screen.getByRole('tab', { name: 'Grupos' }));
  await fireEvent.press(await screen.findByRole('tab', { name: 'Perfil' }));

  expect(await screen.findByLabelText('Racha actual: 4 aciertos seguidos')).toBeOnTheScreen();
  expect(rachaFalsa).toHaveBeenCalledTimes(2);
});

it('F13 CA6: un error del servidor dice que no se pudo cargar y ofrece reintentar', async () => {
  rachaFalsa.mockRejectedValueOnce(new ErrorDatos('boom', false));
  await abrirPerfil();

  expect(await screen.findByText('No pudimos cargar tu racha.')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Reintentar' })).toBeOnTheScreen();
});

it('F13 CA6: un error ofrece reintentar y el resto de S09 sigue usable', async () => {
  rachaFalsa.mockRejectedValueOnce(new ErrorDatos('Network request failed', true));
  await abrirPerfil();

  expect(await screen.findByText('Sin conexión. Revisa tu internet e inténtalo de nuevo.')).toBeOnTheScreen();
  expect(await screen.findByLabelText('Recordatorios')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

  expect(await screen.findByLabelText('Racha actual: 3 aciertos seguidos')).toBeOnTheScreen();
});
