// Ajuste "Recordatorios" de S09 (F11a R4) y su estado de permiso.
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ExpoRoot } from 'expo-router';
import { getMockContext } from 'expo-router/testing-library';

import { clienteConsultas } from '../datos/clienteConsultas';
import { ErrorDatos } from '../datos/errores';
import { abrirAjustes, leerPermiso, pedirPermiso } from '../notificaciones/sistema';
import { simularSesionGuardada } from '../pruebas/supabaseFalso';
import { guardarRecordatoriosActivos, obtenerRecordatoriosActivos } from './datos';

jest.mock('../supabase/cliente');
jest.mock('./datos');

const permiso = leerPermiso as jest.MockedFunction<typeof leerPermiso>;
const activos = obtenerRecordatoriosActivos as jest.MockedFunction<
  typeof obtenerRecordatoriosActivos
>;
const guardar = guardarRecordatoriosActivos as jest.MockedFunction<
  typeof guardarRecordatoriosActivos
>;

beforeEach(() => {
  jest.clearAllMocks();
  simularSesionGuardada();
  clienteConsultas.clear();
  clienteConsultas.setDefaultOptions({
    queries: { retry: false, gcTime: Infinity },
    mutations: { retry: false },
  });
  permiso.mockResolvedValue('concedido');
  activos.mockResolvedValue(true);
  guardar.mockResolvedValue();
});

afterEach(() => clienteConsultas.clear());

async function abrirPerfil() {
  process.env.EXPO_ROUTER_IMPORT_MODE = 'sync';
  await render(<ExpoRoot context={getMockContext('src/app')} location="/perfil" />);
  return screen.findByLabelText('Recordatorios');
}

it('F11a R4: apagar el ajuste lo guarda en el servidor', async () => {
  const interruptor = await abrirPerfil();
  expect(interruptor.props.value).toBe(true);

  await fireEvent(interruptor, 'valueChange', false);

  await waitFor(() => expect(guardar).toHaveBeenCalledWith(false));
  expect(screen.getByLabelText('Recordatorios').props.value).toBe(false);
});

it('F11a R4: si no se pudo guardar, el ajuste vuelve a su valor con el mensaje', async () => {
  guardar.mockRejectedValue(new ErrorDatos('Network request failed', true));
  const interruptor = await abrirPerfil();

  await fireEvent(interruptor, 'valueChange', false);

  expect(await screen.findByText('No se pudo guardar.')).toBeOnTheScreen();
  expect(screen.getByLabelText('Recordatorios').props.value).toBe(true);
});

it('F11a CA9: con el permiso negado, el ajuste se deshabilita y ofrece "Abrir ajustes"', async () => {
  permiso.mockResolvedValue('negado');
  const interruptor = await abrirPerfil();

  expect(interruptor.props.disabled).toBe(true);
  expect(screen.getByText('Las notificaciones están desactivadas para la app.')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Abrir ajustes' }));
  expect(abrirAjustes).toHaveBeenCalled();
});

it('F11a R1: encenderlo sin haber preguntado pide el permiso del sistema', async () => {
  permiso.mockResolvedValue('sinPreguntar');
  activos.mockResolvedValue(false);
  const interruptor = await abrirPerfil();

  await fireEvent(interruptor, 'valueChange', true);

  await waitFor(() => expect(pedirPermiso).toHaveBeenCalled());
  await waitFor(() => expect(guardar).toHaveBeenCalledWith(true));
});

it('F11a R1: encendido de fábrica sin permiso del sistema ofrece "Activar notificaciones"', async () => {
  permiso.mockResolvedValue('sinPreguntar');
  await abrirPerfil();

  expect(screen.getByText('Para recibirlos, permite las notificaciones.')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Activar notificaciones' }));

  await waitFor(() => expect(pedirPermiso).toHaveBeenCalled());
});

it('sin conexión al cargar el ajuste lo dice y deja reintentar', async () => {
  activos.mockRejectedValueOnce(new ErrorDatos('Network request failed', true));
  process.env.EXPO_ROUTER_IMPORT_MODE = 'sync';
  await render(<ExpoRoot context={getMockContext('src/app')} location="/perfil" />);

  expect(
    await screen.findByText('Sin conexión. Revisa tu internet e inténtalo de nuevo.'),
  ).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
  expect(await screen.findByLabelText('Recordatorios')).toBeOnTheScreen();
});
