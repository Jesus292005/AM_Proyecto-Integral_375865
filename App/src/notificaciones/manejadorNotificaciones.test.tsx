// Tocar una notificación (F11a R8, CA7). Corre la app completa con una sesión guardada.
import { render, screen, waitFor } from '@testing-library/react-native';
import { ExpoRoot } from 'expo-router';
import { getMockContext } from 'expo-router/testing-library';

import { clienteConsultas } from '../datos/clienteConsultas';
import { obtenerPartido } from '../partido/datos';
import { simularSesionGuardada } from '../pruebas/supabaseFalso';
import { rutaDeNotificacion } from './rutaNotificacion';
import { olvidarNotificacionTocada, useDatosNotificacionTocada } from './sistema';

jest.mock('../supabase/cliente');
jest.mock('../partido/datos');
jest.mock('../grupos/datos');

const datosTocados = useDatosNotificacionTocada as jest.MockedFunction<
  typeof useDatosNotificacionTocada
>;

beforeEach(() => {
  simularSesionGuardada();
  clienteConsultas.clear();
  clienteConsultas.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } });
  datosTocados.mockReset().mockReturnValue(null);
});

afterEach(() => clienteConsultas.clear());

async function abrir(url = '/inicio') {
  process.env.EXPO_ROUTER_IMPORT_MODE = 'sync';
  await render(<ExpoRoot context={getMockContext('src/app')} location={url} />);
}

describe('rutaDeNotificacion', () => {
  it('F11a CA7: acepta las dos rutas de los recordatorios', () => {
    expect(rutaDeNotificacion({ ruta: '/partido/7' })).toBe('/partido/7');
    expect(rutaDeNotificacion({ ruta: '/partidos?jornada=17' })).toBe('/partidos?jornada=17');
  });

  it('F11a CA7: rechaza datos inválidos', () => {
    for (const datos of [
      null,
      {},
      { ruta: 7 },
      { ruta: '/perfil' },
      { ruta: 'https://ejemplo.com' },
      { ruta: '/partido/7/../../admin' },
    ]) {
      expect(rutaDeNotificacion(datos)).toBeNull();
    }
  });
});

describe('al tocar una notificación', () => {
  // F11b R5 reutiliza esta misma navegación: su aviso trae `/partido/:id`.
  it('F11a CA7, F11b CA5: con una ruta válida (como el aviso de puntos) navega a S03', async () => {
    datosTocados.mockReturnValue({ ruta: '/partido/7' });
    await abrir();

    expect(await screen.findByRole('header', { name: 'Puebla 1, Santos 0' })).toBeOnTheScreen();
    expect(obtenerPartido).toHaveBeenCalledWith(7);
    expect(olvidarNotificacionTocada).toHaveBeenCalled();
  });

  it('F11a CA7: con datos inválidos se ignora', async () => {
    datosTocados.mockReturnValue({ ruta: '/admin/simulacion' });
    await abrir();

    expect(await screen.findByText('S11')).toBeOnTheScreen();
    await waitFor(() => expect(olvidarNotificacionTocada).toHaveBeenCalled());
    expect(screen.queryByRole('header', { name: 'Simulación' })).not.toBeOnTheScreen();
  });
});
