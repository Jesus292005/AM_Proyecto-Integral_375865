// T102: barra superior (F25 R1–R5, CA1, CA2). Corre la app completa con una sesión guardada; los
// datos se simulan.
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { ExpoRoot, router } from 'expo-router';
import { getMockContext } from 'expo-router/testing-library';

import { clienteConsultas } from '../datos/clienteConsultas';
import { simularSesionGuardada } from '../pruebas/supabaseFalso';
import { cartaDePrueba, equiposDePrueba, perfilDePrueba } from './__mocks__/datos';
import { obtenerMiCarta, obtenerMiPerfil, obtenerMiRacha } from './datos';

jest.mock('../supabase/cliente');
jest.mock('./datos');
jest.mock('../grupos/datos');
jest.mock('../partido/datos');
jest.mock('../puntos/datos');
jest.mock('../partidos/datos', () => ({
  ...jest.requireActual<typeof import('../partidos/datos')>('../partidos/datos'),
  obtenerTorneoActual: jest.fn(async () => ({
    nombre: 'Apertura 2026',
    jornadas: [{ id: 1, orden: 1, nombre: 'Jornada 1' }],
    ordenActual: 1,
  })),
  obtenerPartidosDeJornada: jest.fn(async () => []),
}));

const perfilFalso = obtenerMiPerfil as jest.MockedFunction<typeof obtenerMiPerfil>;
const cartaFalsa = obtenerMiCarta as jest.MockedFunction<typeof obtenerMiCarta>;
const rachaFalsa = obtenerMiRacha as jest.MockedFunction<typeof obtenerMiRacha>;

const chivas = equiposDePrueba[1] ?? null;

beforeEach(() => {
  simularSesionGuardada();
  clienteConsultas.clear();
  clienteConsultas.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } });
  perfilFalso.mockReset().mockResolvedValue(perfilDePrueba({ nombre: 'Chucho', equipo: chivas }));
  cartaFalsa
    .mockReset()
    .mockResolvedValue(cartaDePrueba({ calificadas: 9, media: 84, nivel: 'ORO', precision: 90 }));
  rachaFalsa.mockReset().mockResolvedValue({
    racha_actual: 3,
    mejor_racha: 5,
    incluye_simulados: false,
    ultima_calificacion: '2026-11-20T03:00:00Z',
  });
});

afterEach(() => clienteConsultas.clear());

async function abrir(url: string) {
  process.env.EXPO_ROUTER_IMPORT_MODE = 'sync';
  await render(<ExpoRoot context={getMockContext('src/app')} location={url} />);
}

const ETIQUETA = 'Tu perfil: Chucho, racha 3, media 84, Oro, Chivas';

describe('barra superior (F25)', () => {
  it.each(['/inicio', '/partidos', '/grupos', '/perfil'])(
    'F25 CA1: %s lleva la barra con nombre, racha, media con su nivel y escudo',
    async (url) => {
      await abrir(url);

      const barra = await screen.findByLabelText(ETIQUETA);
      expect(barra.props.testID).toBe('barra-superior');
      expect(within(barra).getByText('Chucho')).toBeOnTheScreen();
      expect(within(barra).getByTestId('barra-racha')).toBeOnTheScreen();
      expect(within(barra).getByText('3')).toBeOnTheScreen();
      expect(within(barra).getByTestId('barra-media')).toBeOnTheScreen();
      expect(within(barra).getByText('84')).toBeOnTheScreen();
      expect(within(barra).getByText('Oro')).toBeOnTheScreen();
      expect(within(barra).getByTestId('escudo-imagen')).toBeOnTheScreen();
    },
  );

  it.each(['/partido/7', '/grupo/3'])('F25 CA1: %s (un detalle) no lleva barra', async (url) => {
    await abrir(url);

    await screen.findByRole('header');
    expect(screen.queryAllByTestId('barra-superior')).toHaveLength(0);
  });

  it('F25 CA1: sin equipo no hay escudo; sin carta, la media es "—"', async () => {
    perfilFalso.mockResolvedValue(perfilDePrueba({ nombre: 'Chucho', equipo: null }));
    cartaFalsa.mockResolvedValue(cartaDePrueba({ calificadas: 2 }));
    await abrir('/inicio');

    const barra = await screen.findByLabelText('Tu perfil: Chucho, racha 3, sin media');
    expect(within(barra).queryByTestId('escudo-imagen')).not.toBeOnTheScreen();
    expect(within(barra).getByTestId('barra-sin-media')).toBeOnTheScreen();
    expect(within(barra).getByText('—')).toBeOnTheScreen();
  });

  it('F25 CA2: tocarla desde Partidos abre Perfil una sola vez, con navigate y no push (D78)', async () => {
    const navegar = jest.spyOn(router, 'navigate');
    const apilar = jest.spyOn(router, 'push');
    await abrir('/partidos');

    await fireEvent.press(await screen.findByRole('button', { name: ETIQUETA }));
    expect(navegar).toHaveBeenCalledWith('/perfil');
    expect(apilar).not.toHaveBeenCalled();
    navegar.mockRestore();
    apilar.mockRestore();

    expect(await screen.findByRole('header', { name: 'Perfil' })).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Perfil' })).toBeSelected();
    expect(screen.queryAllByRole('header', { name: 'Perfil', includeHiddenElements: true })).toHaveLength(1);
  });

  it('estados: mientras carga el perfil, círculo, nombre y dos pastillas vacías', async () => {
    perfilFalso.mockReturnValue(new Promise(() => {}));
    await abrir('/inicio');

    expect(await screen.findByTestId('barra-cargando')).toBeOnTheScreen();
    expect(screen.getAllByTestId('barra-pastilla-cargando')).toHaveLength(2);
  });

  it('estados: con el perfil listo y la carta pendiente, la media espera (no sale "—")', async () => {
    cartaFalsa.mockReturnValue(new Promise(() => {}));
    await abrir('/inicio');

    const barra = await screen.findByLabelText('Tu perfil: Chucho, racha 3, Chivas');
    expect(within(barra).getByTestId('barra-pastilla-cargando')).toBeOnTheScreen();
    expect(within(barra).queryByTestId('barra-sin-media')).not.toBeOnTheScreen();
  });

  it('F25 CA2: en Perfil la barra no es un botón (ya estás ahí)', async () => {
    await abrir('/perfil');

    const barra = await screen.findByLabelText(ETIQUETA);
    expect(barra.props.accessibilityRole).toBeUndefined();
    expect(screen.queryByRole('button', { name: ETIQUETA })).not.toBeOnTheScreen();
  });
});
