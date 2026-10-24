// Guardia de rutas y proveedor de sesión (T11): V6, CA3, CA8 y F01 §6.
import { act, render, screen, waitFor } from '@testing-library/react-native';
import { ExpoRoot } from 'expo-router';
import { getMockContext } from 'expo-router/testing-library';

import {
  emitirEventoSesion,
  sesionDePrueba,
  simularLecturaPendiente,
  simularSesionGuardada,
  simularSinConexionConSesionGuardada,
  simularSinSesion,
} from '../pruebas/supabaseFalso';

jest.mock('../supabase/cliente');

async function abrir(url: string) {
  process.env.EXPO_ROUTER_IMPORT_MODE = 'sync';
  await render(<ExpoRoot context={getMockContext('src/app')} location={url} />);
}

async function iniciarSesion() {
  await act(async () => emitirEventoSesion('SIGNED_IN', sesionDePrueba));
}

beforeEach(simularSinSesion);

describe('sin sesión', () => {
  it.each(['/', '/inicio', '/partidos', '/partido/7', '/perfil', '/admin/simulacion', '/equipo'])(
    '%s lleva a S01 (V6)',
    async (url) => {
      await abrir(url);

      expect(await screen.findByText('S01')).toBeOnTheScreen();
      expect(screen.queryAllByRole('tab')).toHaveLength(0);
    },
  );

  it('al iniciar sesión continúa a la ruta original (CA8)', async () => {
    await abrir('/partido/7');
    expect(await screen.findByText('S01')).toBeOnTheScreen();

    await iniciarSesion();

    expect(await screen.findByText('S03')).toBeOnTheScreen();
    expect(screen.getByText('partidoId: 7')).toBeOnTheScreen();
    // Entrada externa: el detalle se abre en la pestaña Inicio (D76).
    expect(screen.getByRole('tab', { name: 'Inicio' })).toBeSelected();
  });

  it('la ruta original conserva sus parámetros de consulta (CA8)', async () => {
    await abrir('/partidos?jornada=2');
    expect(await screen.findByText('S01')).toBeOnTheScreen();

    await iniciarSesion();

    expect(await screen.findByText('S02')).toBeOnTheScreen();
    expect(screen.getByText('jornada: 2')).toBeOnTheScreen();
  });

  it('al iniciar sesión desde S01 sin ruta pedida va a Inicio (F01 §5.7)', async () => {
    await abrir('/login');
    expect(await screen.findByText('S01')).toBeOnTheScreen();

    await iniciarSesion();

    expect(await screen.findByText('S11')).toBeOnTheScreen();
  });
});

describe('con sesión guardada', () => {
  beforeEach(simularSesionGuardada);

  it('entra directo a Inicio sin pasar por S01 (CA3, F01 §6.1)', async () => {
    await abrir('/');

    expect(await screen.findByText('S11')).toBeOnTheScreen();
    expect(screen.queryByText('S01')).not.toBeOnTheScreen();
  });

  it('abrir /login lleva a Inicio', async () => {
    await abrir('/login');

    expect(await screen.findByText('S11')).toBeOnTheScreen();
    expect(screen.queryByText('S01')).not.toBeOnTheScreen();
  });

  it('si la sesión termina estando dentro, va a S01 y al volver regresa a la misma ruta (F01 §6.2)', async () => {
    await abrir('/grupo/3?vista=jornada');
    expect(await screen.findByText('S08')).toBeOnTheScreen();

    await act(async () => emitirEventoSesion('SIGNED_OUT', null));
    expect(await screen.findByText('S01')).toBeOnTheScreen();
    expect(screen.queryByText('S08')).not.toBeOnTheScreen();

    await iniciarSesion();
    expect(await screen.findByText('S08')).toBeOnTheScreen();
    expect(screen.getByText('grupoId: 3')).toBeOnTheScreen();
    expect(screen.getByText('vista: jornada')).toBeOnTheScreen();
  });

  it('renovar el token no saca al usuario', async () => {
    await abrir('/perfil');
    expect(await screen.findByText('S09')).toBeOnTheScreen();

    await act(async () => emitirEventoSesion('TOKEN_REFRESHED', sesionDePrueba));

    expect(screen.getByText('S09')).toBeOnTheScreen();
  });
});

it('sin internet y con sesión guardada entra a la app (F01 §6.3)', async () => {
  simularSinConexionConSesionGuardada();

  await abrir('/');

  expect(await screen.findByText('S11')).toBeOnTheScreen();
  expect(screen.queryByText('S01')).not.toBeOnTheScreen();
});

it('mientras se lee la sesión no se muestra ninguna pantalla', async () => {
  simularLecturaPendiente();

  await abrir('/inicio');

  await waitFor(() => expect(screen.queryByText(/^S\d+$/)).not.toBeOnTheScreen());
  expect(screen.queryByText('S01')).not.toBeOnTheScreen();
  expect(screen.queryByText('S11')).not.toBeOnTheScreen();
});
