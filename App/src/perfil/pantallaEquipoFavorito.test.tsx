// S12 (T98): elegir, cambiar y quitar el equipo favorito (F18 R1–R2, CA3) y sus estados.
// Corre la app completa con una sesión guardada; los datos del perfil se simulan.
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ExpoRoot, router } from 'expo-router';
import { getMockContext } from 'expo-router/testing-library';

import { clienteConsultas } from '../datos/clienteConsultas';
import { ErrorDatos } from '../datos/errores';
import { simularSesionGuardada } from '../pruebas/supabaseFalso';
import { equiposDePrueba, perfilDePrueba } from './__mocks__/datos';
import { guardarEquipoFavorito, obtenerEquiposTorneoActual, obtenerMiPerfil } from './datos';

jest.mock('../supabase/cliente');
jest.mock('./datos');

const perfilFalso = obtenerMiPerfil as jest.MockedFunction<typeof obtenerMiPerfil>;
const equiposFalsos = obtenerEquiposTorneoActual as jest.MockedFunction<typeof obtenerEquiposTorneoActual>;
const guardarFalso = guardarEquipoFavorito as jest.MockedFunction<typeof guardarEquipoFavorito>;

const america = equiposDePrueba[0];

beforeEach(() => {
  simularSesionGuardada();
  clienteConsultas.clear();
  clienteConsultas.setDefaultOptions({ queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } });
  perfilFalso.mockReset().mockResolvedValue(perfilDePrueba({ equipo: america ?? null }));
  equiposFalsos.mockReset().mockResolvedValue(equiposDePrueba);
  guardarFalso.mockReset().mockResolvedValue();
});

afterEach(() => clienteConsultas.clear());

/** Abre Perfil y desde ahí S12, para que "cerrar" regrese a Perfil. */
async function abrirDesdePerfil() {
  process.env.EXPO_ROUTER_IMPORT_MODE = 'sync';
  await render(<ExpoRoot context={getMockContext('src/app')} location="/perfil" />);
  await act(() => router.navigate('/equipo'));
  await screen.findByRole('header', { name: 'Equipo favorito' });
}

const equipo = (nombre: string) => screen.getByRole('radio', { name: nombre });
const cerroElModal = () =>
  waitFor(() => expect(screen.queryByRole('header', { name: 'Equipo favorito' })).not.toBeOnTheScreen());

describe('S12 Equipo favorito (F18)', () => {
  it('F18 CA3: lista los equipos con "Sin equipo favorito" al final y marca el elegido', async () => {
    await abrirDesdePerfil();

    const opciones = (await screen.findAllByRole('radio')).map((o) => o.props.accessibilityLabel);
    expect(opciones).toEqual(['América', 'Chivas', 'Pumas', 'Sin equipo favorito']);
    expect(equipo('América')).toBeChecked();
    expect(equipo('Chivas')).not.toBeChecked();
  });

  it('F18 CA3: tocar otro lo guarda y cierra el modal', async () => {
    await abrirDesdePerfil();

    await fireEvent.press(await screen.findByRole('radio', { name: 'Chivas' }));

    await waitFor(() => expect(guardarFalso).toHaveBeenCalledWith(2));
    await cerroElModal();
  });

  it('F18 CA3: "Sin equipo favorito" lo quita', async () => {
    await abrirDesdePerfil();

    await fireEvent.press(await screen.findByRole('radio', { name: 'Sin equipo favorito' }));

    await waitFor(() => expect(guardarFalso).toHaveBeenCalledWith(null));
    await cerroElModal();
  });

  it('F18 R2: tocar el que ya está elegido cierra sin guardar', async () => {
    await abrirDesdePerfil();

    await fireEvent.press(await screen.findByRole('radio', { name: 'América' }));

    await cerroElModal();
    expect(guardarFalso).not.toHaveBeenCalled();
  });

  it('F18 CA3: un error al guardar lo dice y el modal sigue abierto', async () => {
    guardarFalso.mockRejectedValue(new ErrorDatos('Network request failed', true));
    await abrirDesdePerfil();

    await fireEvent.press(await screen.findByRole('radio', { name: 'Pumas' }));

    expect(
      await screen.findByText('No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Equipo favorito' })).toBeOnTheScreen();
    expect(equipo('América')).toBeChecked();
  });
});

describe('S12 estados', () => {
  it('F18 R2: mientras no llega el perfil no pinta la lista (nada sale marcado por error)', async () => {
    perfilFalso.mockReturnValue(new Promise(() => {}));
    process.env.EXPO_ROUTER_IMPORT_MODE = 'sync';
    await render(<ExpoRoot context={getMockContext('src/app')} location="/equipo" />);

    expect(await screen.findByTestId('equipos-cargando')).toBeOnTheScreen();
    expect(screen.queryByRole('radio')).not.toBeOnTheScreen();
  });

  it('mientras carga muestra el esqueleto de la lista', async () => {
    equiposFalsos.mockReturnValue(new Promise(() => {}));
    await abrirDesdePerfil();

    expect(screen.getByTestId('equipos-cargando')).toBeOnTheScreen();
  });

  it('sin conexión: mensaje y "Reintentar" que vuelve a cargar', async () => {
    equiposFalsos.mockRejectedValueOnce(new ErrorDatos('Network request failed', true));
    await abrirDesdePerfil();

    expect(
      await screen.findByText('Sin conexión. Revisa tu internet e inténtalo de nuevo.'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('radio', { name: 'Chivas' })).toBeOnTheScreen();
  });
});
