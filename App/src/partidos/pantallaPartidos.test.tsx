// S02 (T26): estados de B6, agrupación por día (CA9), selector de jornada (CA10) y navegación.
// Corre la app completa con una sesión guardada; las lecturas de Supabase se simulan.
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ExpoRoot } from 'expo-router';
import { getMockContext } from 'expo-router/testing-library';

import { clienteConsultas } from '../datos/clienteConsultas';
import { formatearDia, formatearHora } from '../formato/fechas';
import { simularSesionGuardada } from '../pruebas/supabaseFalso';
import {
  ErrorDatos,
  obtenerPartidosDeJornada,
  obtenerTorneoActual,
  type PartidoDeLista,
  type TorneoActual,
} from './datos';

jest.mock('../supabase/cliente');
jest.mock('./datos', () => ({
  ...jest.requireActual<typeof import('./datos')>('./datos'),
  obtenerTorneoActual: jest.fn(),
  obtenerPartidosDeJornada: jest.fn(),
}));

const torneoFalso = obtenerTorneoActual as jest.MockedFunction<typeof obtenerTorneoActual>;
const partidosFalsos = obtenerPartidosDeJornada as jest.MockedFunction<
  typeof obtenerPartidosDeJornada
>;

const apertura: TorneoActual = {
  nombre: 'Apertura 2024',
  jornadas: [
    { id: 11, orden: 1, nombre: 'Jornada 1' },
    { id: 12, orden: 2, nombre: 'Jornada 2' },
    { id: 21, orden: 21, nombre: 'Liguilla · Final' },
  ],
  ordenActual: 2,
};

function partido(
  id: number,
  inicio: string,
  local: string,
  visitante: string,
  extra: Partial<PartidoDeLista> = {},
): PartidoDeLista {
  return {
    id,
    inicio,
    estado: 'PROGRAMADO',
    goles_local: null,
    goles_visitante: null,
    local: { nombre_corto: local, escudo_url: `https://x.mx/${local}.png` },
    visitante: { nombre_corto: visitante, escudo_url: `https://x.mx/${visitante}.png` },
    ...extra,
  };
}

// A las 20:00 UTC: mismo día en cualquier zona de México, para que la prueba no dependa de la PC.
const SABADO = '2024-07-13T20:00:00Z';
const SABADO_TARDE = '2024-07-13T23:00:00Z';
const DOMINGO = '2024-07-14T20:00:00Z';

const jornada2 = [
  partido(103, DOMINGO, 'Chivas', 'América'),
  // En juego la API ya trae goles: no se muestran (B-R3).
  partido(102, SABADO_TARDE, 'Tigres', 'Monterrey', {
    estado: 'EN_JUEGO',
    goles_local: 1,
    goles_visitante: 1,
  }),
  partido(101, SABADO, 'Puebla', 'Querétaro', {
    estado: 'TERMINADO',
    goles_local: 2,
    goles_visitante: 1,
  }),
];

beforeEach(() => {
  simularSesionGuardada();
  clienteConsultas.clear();
  // Sin reintentos ni temporizador de limpieza (gcTime de 5 min), que dejaría a Jest esperando.
  clienteConsultas.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } });
  torneoFalso.mockReset().mockResolvedValue(apertura);
  partidosFalsos.mockReset().mockImplementation(async (id) => (id === 12 ? jornada2 : []));
});

afterEach(() => clienteConsultas.clear());

async function abrir(url: string) {
  process.env.EXPO_ROUTER_IMPORT_MODE = 'sync';
  await render(<ExpoRoot context={getMockContext('src/app')} location={url} />);
}

const fila = (nombre: string | RegExp) => screen.findByRole('button', { name: nombre });

describe('S02 con datos', () => {
  it('abre en la jornada actual que decide el servidor', async () => {
    await abrir('/partidos');

    expect(await screen.findByRole('header', { name: 'Jornada 2' })).toBeOnTheScreen();
    expect(screen.getByText('Apertura 2024')).toBeOnTheScreen();
    expect(partidosFalsos).toHaveBeenCalledWith(12);
  });

  it('agrupa por día y ordena por hora (CA9)', async () => {
    await abrir('/partidos');
    await fila(/Chivas/);

    expect(screen.getByText(formatearDia(new Date(SABADO)))).toBeOnTheScreen();
    expect(screen.getByText(formatearDia(new Date(DOMINGO)))).toBeOnTheScreen();
    const orden = screen
      .getAllByRole('button')
      .map((b) => b.props.accessibilityLabel as string)
      .filter((nombre) => /Puebla|Tigres|Chivas/.test(nombre ?? ''));
    expect(orden.map((n) => n.split(' ')[0])).toEqual(['Puebla', 'Tigres', 'Chivas']);
  });

  it('muestra marcador solo al terminar; en juego y por jugar, la hora (Q5, B-R3)', async () => {
    await abrir('/partidos');

    expect(await fila('Puebla 2, Querétaro 1. Terminado')).toBeOnTheScreen();
    expect(screen.getByText('2 - 1')).toBeOnTheScreen();
    const horaTigres = formatearHora(new Date(SABADO_TARDE));
    expect(screen.getByRole('button', { name: `Tigres contra Monterrey, ${horaTigres}. En juego` }))
      .toBeOnTheScreen();
    expect(screen.getByText('En juego')).toBeOnTheScreen();
    expect(screen.queryByText('1 - 1')).not.toBeOnTheScreen();
    expect(screen.getByText('Por jugar')).toBeOnTheScreen();
  });

  it('abre la jornada de la ruta; una inválida abre la actual', async () => {
    await abrir('/partidos?jornada=21');
    expect(await screen.findByRole('header', { name: 'Liguilla · Final' })).toBeOnTheScreen();
    expect(partidosFalsos).toHaveBeenCalledWith(21);
  });

  it('una jornada de ruta que no existe abre la actual', async () => {
    await abrir('/partidos?jornada=99');
    expect(await screen.findByRole('header', { name: 'Jornada 2' })).toBeOnTheScreen();
  });

  it('tocar un partido abre su detalle (S03)', async () => {
    await abrir('/partidos');

    await fireEvent.press(await fila(/Chivas/));

    expect(await screen.findByText('partidoId: 103')).toBeOnTheScreen();
  });
});

describe('S02 selector de jornada (CA10)', () => {
  it('va a la anterior y a la siguiente; en los extremos la flecha se deshabilita', async () => {
    await abrir('/partidos');
    await screen.findByRole('header', { name: 'Jornada 2' });

    await fireEvent.press(screen.getByRole('button', { name: 'Jornada anterior' }));
    expect(await screen.findByRole('header', { name: 'Jornada 1' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Jornada anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Jornada siguiente' })).toBeEnabled();

    await fireEvent.press(screen.getByRole('button', { name: 'Jornada siguiente' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Jornada siguiente' }));
    expect(await screen.findByRole('header', { name: 'Liguilla · Final' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Jornada siguiente' })).toBeDisabled();
  });

  it('cambiar de jornada no agrega historial (D78)', async () => {
    await abrir('/partidos');
    await screen.findByRole('header', { name: 'Jornada 2' });

    await fireEvent.press(screen.getByRole('button', { name: 'Jornada anterior' }));
    await screen.findByRole('header', { name: 'Jornada 1' });

    // Una sola pantalla S02 montada (las apiladas siguen en el árbol, ocultas).
    expect(
      screen.queryAllByRole('button', { name: 'Jornada siguiente', includeHiddenElements: true }),
    ).toHaveLength(1);
  });
});

describe('S02 estados (B6, CA11)', () => {
  it('mientras carga muestra esqueletos', async () => {
    torneoFalso.mockReturnValue(new Promise(() => {}));
    await abrir('/partidos');

    expect(await screen.findByTestId('partidos-cargando')).toBeOnTheScreen();
  });

  it('una jornada sin partidos lo dice', async () => {
    partidosFalsos.mockResolvedValue([]);
    await abrir('/partidos');

    expect(await screen.findByText('No hay partidos en esta jornada.')).toBeOnTheScreen();
  });

  it('sin torneo actual no hay partidos que mostrar', async () => {
    torneoFalso.mockResolvedValue(null);
    await abrir('/partidos');

    expect(await screen.findByText('No hay partidos en esta jornada.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Jornada anterior' })).not.toBeOnTheScreen();
  });

  it('sin conexión y sin datos: mensaje y "Reintentar" que vuelve a cargar', async () => {
    partidosFalsos.mockRejectedValueOnce(new ErrorDatos('Network request failed', true));
    await abrir('/partidos');

    expect(
      await screen.findByText('Sin conexión. Revisa tu internet e inténtalo de nuevo.'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await fila(/Chivas/)).toBeOnTheScreen();
  });

  it('una falla del servidor sin datos muestra el error con "Reintentar"', async () => {
    torneoFalso.mockRejectedValue(new ErrorDatos('boom', false));
    await abrir('/partidos');

    expect(
      await screen.findByText('No pudimos cargar los partidos. Inténtalo de nuevo.'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeOnTheScreen();
  });

  it('sin conexión con datos previos: los sigue mostrando con el aviso y su hora', async () => {
    await abrir('/partidos');
    await fila(/Chivas/);

    partidosFalsos.mockRejectedValue(new ErrorDatos('Network request failed', true));
    const lista = screen.getByTestId('lista-partidos');
    await act(async () => {
      await lista.props.refreshControl.props.onRefresh();
    });

    expect(await screen.findByText(/^Sin conexión · datos de /)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /Chivas/ })).toBeOnTheScreen();
  });

  it('deslizar hacia abajo vuelve a pedir los datos', async () => {
    await abrir('/partidos');
    await fila(/Chivas/);
    const llamadas = partidosFalsos.mock.calls.length;

    await act(async () => {
      await screen.getByTestId('lista-partidos').props.refreshControl.props.onRefresh();
    });

    await waitFor(() => expect(partidosFalsos.mock.calls.length).toBe(llamadas + 1));
    expect(torneoFalso).toHaveBeenCalledTimes(2);
  });
});
