// S10 y su acceso desde S09 (T38): F09 CA7, acciones y estados de pantalla.
// Corre la app completa con una sesión guardada; las lecturas y acciones se simulan.
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ExpoRoot } from 'expo-router';
import { getMockContext } from 'expo-router/testing-library';
import { Alert, type AlertButton } from 'react-native';

import { clienteConsultas } from '../datos/clienteConsultas';
import { ErrorDatos } from '../datos/errores';
import { obtenerMiRol } from '../perfil/datos';
import { simularSesionGuardada } from '../pruebas/supabaseFalso';
import {
  crearSimulado,
  iniciarSimulado,
  obtenerOrigenes,
  obtenerSimuladosEnCurso,
  obtenerSimuladosTerminados,
  terminarSimulado,
  type PartidoDeSimulacion,
} from './datos';
import { ErrorSimulacion } from './errores';

jest.mock('../supabase/cliente');
jest.mock('../perfil/datos');
jest.mock('./datos');

const rolFalso = obtenerMiRol as jest.MockedFunction<typeof obtenerMiRol>;
const enCursoFalso = obtenerSimuladosEnCurso as jest.MockedFunction<typeof obtenerSimuladosEnCurso>;
const terminadosFalsos = obtenerSimuladosTerminados as jest.MockedFunction<
  typeof obtenerSimuladosTerminados
>;
const origenesFalsos = obtenerOrigenes as jest.MockedFunction<typeof obtenerOrigenes>;
const crearFalso = crearSimulado as jest.MockedFunction<typeof crearSimulado>;
const iniciarFalso = iniciarSimulado as jest.MockedFunction<typeof iniciarSimulado>;
const terminarFalso = terminarSimulado as jest.MockedFunction<typeof terminarSimulado>;

function partido(
  id: number,
  local: string,
  visitante: string,
  extra: Partial<PartidoDeSimulacion> = {},
): PartidoDeSimulacion {
  const cierre = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  return {
    id,
    inicio: cierre,
    cierre_predicciones: cierre,
    estado: 'PROGRAMADO',
    goles_local: null,
    goles_visitante: null,
    local: { nombre_corto: local },
    visitante: { nombre_corto: visitante },
    ...extra,
  };
}

const origen = partido(11, 'Puebla', 'Santos', {
  inicio: '2024-07-13T20:00:00Z',
  estado: 'TERMINADO',
  goles_local: 2,
  goles_visitante: 1,
});

beforeEach(() => {
  simularSesionGuardada();
  clienteConsultas.clear();
  clienteConsultas.setDefaultOptions({
    queries: { retry: false, gcTime: Infinity },
    mutations: { retry: false },
  });
  rolFalso.mockReset().mockResolvedValue('ADMIN');
  enCursoFalso.mockReset().mockResolvedValue([partido(21, 'América', 'Chivas')]);
  terminadosFalsos.mockReset().mockResolvedValue([]);
  origenesFalsos.mockReset().mockResolvedValue([origen]);
  crearFalso.mockReset().mockResolvedValue(22);
  iniciarFalso.mockReset().mockResolvedValue();
  terminarFalso.mockReset().mockResolvedValue();
});

afterEach(() => {
  clienteConsultas.clear();
  jest.restoreAllMocks();
});

async function abrir(url = '/admin/simulacion') {
  process.env.EXPO_ROUTER_IMPORT_MODE = 'sync';
  await render(<ExpoRoot context={getMockContext('src/app')} location={url} />);
}

const boton = (nombre: string) => screen.getByRole('button', { name: nombre });

describe('acceso (F09 R1)', () => {
  it('F09 CA7: S09 muestra el acceso a S10 a un administrador', async () => {
    await abrir('/perfil');

    await fireEvent.press(await screen.findByRole('button', { name: 'Simulación' }));

    expect(await screen.findByText('América vs Chivas')).toBeOnTheScreen();
  });

  it('F09 CA7: S09 no muestra el acceso a S10 a un usuario', async () => {
    rolFalso.mockResolvedValue('USUARIO');
    await abrir('/perfil');

    await screen.findByRole('button', { name: 'Equipo favorito' });
    await waitFor(() => expect(rolFalso).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: 'Simulación' })).not.toBeOnTheScreen();
  });

  it('F09 CA7: S10 abierta por un usuario muestra "Solo administradores" sin pedir datos', async () => {
    rolFalso.mockResolvedValue('USUARIO');
    await abrir();

    expect(await screen.findByText('Solo administradores.')).toBeOnTheScreen();
    // El botón de la spec; el encabezado tiene además su propio "← Volver".
    expect(screen.getAllByRole('button', { name: 'Volver' }).length).toBeGreaterThan(0);
    expect(enCursoFalso).not.toHaveBeenCalled();
    expect(origenesFalsos).not.toHaveBeenCalled();
  });
});

describe('S10 (administrador)', () => {
  it('lista los simulados en curso con su cierre y los últimos terminados', async () => {
    terminadosFalsos.mockResolvedValue([
      partido(20, 'Tigres', 'Monterrey', { estado: 'TERMINADO', goles_local: 3, goles_visitante: 0 }),
    ]);
    await abrir();

    expect(await screen.findByText('América vs Chivas')).toBeOnTheScreen();
    expect(screen.getByText(/^Por jugar · Cierra en 00:(09|10):\d\d$/)).toBeOnTheScreen();
    expect(await screen.findByText('Tigres 3 - 0 Monterrey')).toBeOnTheScreen();
  });

  it('crea un simulado con el origen y los minutos elegidos (30 por defecto)', async () => {
    await abrir();

    const crear = await screen.findByRole('button', { name: 'Crear' });
    expect(crear).toBeDisabled();
    await fireEvent.press(await screen.findByRole('radio', { name: /^Puebla 2 - 1 Santos/ }));
    await fireEvent.press(boton('Crear'));
    await waitFor(() => expect(crearFalso).toHaveBeenCalledWith(11, 30));

    await fireEvent.press(screen.getByRole('radio', { name: /^Puebla 2 - 1 Santos/ }));
    await fireEvent.press(screen.getByRole('tab', { name: '10 min' }));
    await fireEvent.press(boton('Crear'));
    await waitFor(() => expect(crearFalso).toHaveBeenLastCalledWith(11, 10));
    // Al crear, recarga "En curso" para mostrar el nuevo.
    await waitFor(() => expect(enCursoFalso.mock.calls.length).toBeGreaterThan(1));
  });

  it('"Iniciar ahora" llama al servidor con ese partido', async () => {
    await abrir();

    await fireEvent.press(await screen.findByRole('button', { name: 'Iniciar ahora América vs Chivas' }));

    await waitFor(() => expect(iniciarFalso).toHaveBeenCalledWith(21));
  });

  it('"Terminar" pide confirmación y muestra el error del servidor en su fila', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, botones?: AlertButton[]) =>
      botones?.find((b) => b.text === 'Terminar')?.onPress?.(),
    );
    terminarFalso.mockRejectedValue(new ErrorSimulacion('AUN_NO_CIERRA'));
    await abrir();

    await fireEvent.press(await screen.findByRole('button', { name: 'Terminar América vs Chivas' }));

    expect(Alert.alert).toHaveBeenCalled();
    expect(terminarFalso).toHaveBeenCalledWith(21);
    expect(await screen.findByText('Todavía no cierra; usa Iniciar ahora.')).toBeOnTheScreen();
  });

  it('un partido en juego ya no ofrece "Iniciar ahora"', async () => {
    enCursoFalso.mockResolvedValue([partido(21, 'América', 'Chivas', { estado: 'EN_JUEGO' })]);
    await abrir();

    expect(await screen.findByText('En juego · Predicciones cerradas')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Iniciar ahora/ })).not.toBeOnTheScreen();
    expect(boton('Terminar América vs Chivas')).toBeOnTheScreen();
  });
});

describe('estados de pantalla', () => {
  it('"En curso" vacío y sin orígenes', async () => {
    enCursoFalso.mockResolvedValue([]);
    origenesFalsos.mockResolvedValue([]);
    await abrir();

    expect(await screen.findByText('No hay partidos simulados en curso.')).toBeOnTheScreen();
    expect(
      await screen.findByText(
        'No hay partidos terminados con datos. Fuerza P4 de algunos partidos de 2024 (D85).',
      ),
    ).toBeOnTheScreen();
  });

  it('cargando: esqueleto mientras se lee el rol', async () => {
    rolFalso.mockImplementation(() => new Promise(() => {}));
    await abrir();

    expect(await screen.findByTestId('simulacion-cargando')).toBeOnTheScreen();
  });

  it('sin conexión: mensaje y "Reintentar" en la sección', async () => {
    enCursoFalso.mockRejectedValueOnce(new ErrorDatos('Network request failed', true));
    await abrir();

    expect(
      await screen.findByText('Sin conexión. Revisa tu internet e inténtalo de nuevo.'),
    ).toBeOnTheScreen();
    await fireEvent.press(boton('Reintentar'));

    expect(await screen.findByText('América vs Chivas')).toBeOnTheScreen();
  });

  it('si fallan los terminados: mensaje y "Reintentar"', async () => {
    terminadosFalsos.mockRejectedValueOnce(new ErrorDatos('boom', false));
    terminadosFalsos.mockResolvedValue([
      partido(20, 'Tigres', 'Monterrey', { estado: 'TERMINADO', goles_local: 3, goles_visitante: 0 }),
    ]);
    await abrir();

    expect(
      await screen.findByText('No pudimos cargar la simulación. Inténtalo de nuevo.'),
    ).toBeOnTheScreen();
    await fireEvent.press(boton('Reintentar'));

    expect(await screen.findByText('Tigres 3 - 0 Monterrey')).toBeOnTheScreen();
  });

  it('una acción sin conexión muestra el mensaje en su fila', async () => {
    iniciarFalso.mockRejectedValue(new ErrorDatos('Network request failed', true));
    await abrir();

    await fireEvent.press(await screen.findByRole('button', { name: 'Iniciar ahora América vs Chivas' }));

    expect(
      await screen.findByText('Sin conexión. Revisa tu internet e inténtalo de nuevo.'),
    ).toBeOnTheScreen();
  });
});
