// T109–T111: S11 Inicio (F17 R1–R2, R5, R7; CA5, CA6). Corre la app completa con una sesión
// guardada; los datos se simulan y la navegación se espía.
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { ExpoRoot, router } from 'expo-router';
import { getMockContext } from 'expo-router/testing-library';

import { clienteConsultas } from '../datos/clienteConsultas';
import { ErrorDatos } from '../datos/errores';
import { obtenerMisGrupos } from '../grupos/datos';
import { obtenerTorneoActual } from '../partidos/datos';
import { equiposDePrueba, perfilDePrueba } from '../perfil/__mocks__/datos';
import { obtenerMiPerfil } from '../perfil/datos';
import { simularSesionGuardada } from '../pruebas/supabaseFalso';
import { mejorAnalisisDePrueba, pendienteDePrueba, proximoDePrueba } from './__mocks__/datos';
import { obtenerMejorAnalisis, obtenerMiUltimaJornada, obtenerPendientes, obtenerProximoPartidoEquipo } from './datos';

jest.mock('../supabase/cliente');
jest.mock('./datos');
jest.mock('../perfil/datos');
jest.mock('../grupos/datos');
jest.mock('../partido/datos');
jest.mock('../puntos/datos');
jest.mock('../partidos/datos', () => ({
  ...jest.requireActual<typeof import('../partidos/datos')>('../partidos/datos'),
  obtenerTorneoActual: jest.fn(),
  obtenerPartidosDeJornada: jest.fn(async () => []),
}));

const pendientesFalsos = obtenerPendientes as jest.MockedFunction<typeof obtenerPendientes>;
const proximoFalso = obtenerProximoPartidoEquipo as jest.MockedFunction<typeof obtenerProximoPartidoEquipo>;
const ultimaFalsa = obtenerMiUltimaJornada as jest.MockedFunction<typeof obtenerMiUltimaJornada>;
const analisisFalso = obtenerMejorAnalisis as jest.MockedFunction<typeof obtenerMejorAnalisis>;
const gruposFalsos = obtenerMisGrupos as jest.MockedFunction<typeof obtenerMisGrupos>;
const perfilFalso = obtenerMiPerfil as jest.MockedFunction<typeof obtenerMiPerfil>;
const torneoFalso = obtenerTorneoActual as jest.MockedFunction<typeof obtenerTorneoActual>;

const chivas = equiposDePrueba[1] ?? null;
const enHoras = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();

let navegar: jest.SpyInstance;

beforeEach(() => {
  simularSesionGuardada();
  clienteConsultas.clear();
  clienteConsultas.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } });
  torneoFalso.mockReset().mockResolvedValue({
    nombre: 'Apertura 2026',
    jornadas: [{ id: 10, orden: 10, nombre: 'Jornada 10' }],
    ordenActual: 10,
  });
  pendientesFalsos.mockReset().mockResolvedValue([]);
  proximoFalso.mockReset().mockResolvedValue(null);
  ultimaFalsa.mockReset().mockResolvedValue(null);
  analisisFalso.mockReset().mockResolvedValue(null);
  gruposFalsos.mockReset().mockResolvedValue([]);
  perfilFalso.mockReset().mockResolvedValue(perfilDePrueba());
  navegar = jest.spyOn(router, 'navigate').mockImplementation(() => {});
});

afterEach(() => {
  navegar.mockRestore();
  clienteConsultas.clear();
});

async function abrir() {
  process.env.EXPO_ROUTER_IMPORT_MODE = 'sync';
  await render(<ExpoRoot context={getMockContext('src/app')} location="/inicio" />);
  await screen.findByRole('header', { name: 'Inicio' });
}

const BLOQUES = ['bloque-pendientes', 'bloque-equipo', 'bloque-ultima-jornada', 'bloque-mejor-analisis', 'bloque-grupos'];

describe('estructura (R1, R2)', () => {
  it('F17 CA5: la barra y los 5 bloques, en orden', async () => {
    await abrir();

    expect(screen.getByTestId('barra-superior')).toBeOnTheScreen();
    const bloques = screen.getAllByTestId(/^bloque-(pendientes|equipo|ultima-jornada|mejor-analisis|grupos)$/);
    expect(bloques.map((b) => b.props.testID)).toEqual(BLOQUES);
    expect(screen.getByText('Pendientes de predecir')).toBeOnTheScreen();
    expect(screen.getByText('Mis grupos')).toBeOnTheScreen();
  });

  it('F17 CA5: un bloque con error muestra su mensaje y "Reintentar"; los demás se pintan', async () => {
    pendientesFalsos.mockRejectedValue(new ErrorDatos('Falla', false));
    await abrir();

    const bloque = await screen.findByTestId('bloque-pendientes-error');
    expect(within(bloque).getByText('No se pudo cargar.')).toBeOnTheScreen();
    expect(await screen.findByText('Elige tu equipo favorito para seguir sus partidos aquí.')).toBeOnTheScreen();
    expect(screen.getByText('Aún no hay partidos calificados en este torneo.')).toBeOnTheScreen();
    expect(screen.getByText('Compite con tus amigos en un grupo.')).toBeOnTheScreen();

    pendientesFalsos.mockResolvedValue([]);
    fireEvent.press(within(bloque).getByText('Reintentar'));
    expect(await screen.findByText('Ya predijiste todo lo que está abierto.')).toBeOnTheScreen();
  });

  it('F17 CA5: cada bloque espera con su esqueleto', async () => {
    const nunca = () => new Promise<never>(() => {});
    pendientesFalsos.mockImplementation(nunca);
    proximoFalso.mockImplementation(nunca);
    ultimaFalsa.mockImplementation(nunca);
    analisisFalso.mockImplementation(nunca);
    gruposFalsos.mockImplementation(nunca);
    await abrir();

    for (const id of BLOQUES) expect(screen.getByTestId(`${id}-cargando`)).toBeOnTheScreen();
  });

  it('F17 R1: sin conexión, el aviso sale una sola vez arriba', async () => {
    pendientesFalsos.mockRejectedValue(new ErrorDatos('Network request failed', true));
    gruposFalsos.mockRejectedValue(new ErrorDatos('Network request failed', true));
    await abrir();

    expect(await screen.findAllByText('Sin conexión. Revisa tu internet e inténtalo de nuevo.')).toHaveLength(1);
    expect(await screen.findAllByText('Sin conexión.')).toHaveLength(2); // pendientes y grupos
  });

  it('F17 R1: si fallan mis grupos, el mejor análisis se pinta igual', async () => {
    gruposFalsos.mockRejectedValue(new ErrorDatos('Falla', false));
    analisisFalso.mockResolvedValue(mejorAnalisisDePrueba({ nombre: 'Pepe', puntos_bono: 82 }));
    await abrir();

    const bloque = await screen.findByTestId('bloque-mejor-analisis');
    expect(await within(bloque).findByText('Pepe')).toBeOnTheScreen();
    expect(await screen.findByTestId('bloque-grupos-error')).toBeOnTheScreen();
  });

  it('F17 R2: al deslizar hacia abajo se vuelven a pedir los bloques', async () => {
    await abrir();
    await screen.findByText('Ya predijiste todo lo que está abierto.');
    const antes = [pendientesFalsos, proximoFalso, ultimaFalsa, analisisFalso, gruposFalsos].map((f) => f.mock.calls.length);

    const desplazable = screen.getByTestId('inicio-desplazable');
    await act(async () => {
      await desplazable.props.refreshControl.props.onRefresh();
    });

    const despues = [pendientesFalsos, proximoFalso, ultimaFalsa, analisisFalso, gruposFalsos].map((f) => f.mock.calls.length);
    despues.forEach((n, i) => expect(n).toBeGreaterThan(antes[i] ?? 0));
  });

  it('F17 R2: al volver a la pestaña se vuelven a pedir los bloques', async () => {
    await abrir();
    await screen.findByText('Ya predijiste todo lo que está abierto.');
    const antes = pendientesFalsos.mock.calls.length;
    const gruposAntes = gruposFalsos.mock.calls.length;

    fireEvent.press(screen.getByRole('tab', { name: 'Partidos' }));
    fireEvent.press(await screen.findByRole('tab', { name: 'Inicio' }));

    await waitFor(() => expect(pendientesFalsos.mock.calls.length).toBeGreaterThan(antes));
    expect(gruposFalsos.mock.calls.length).toBeGreaterThan(gruposAntes);
  });

  it('F17 R1: sin torneo actual, los bloques 1–4 lo dicen y Mis grupos se pinta', async () => {
    torneoFalso.mockResolvedValue(null);
    await abrir();

    expect(await screen.findAllByText('No hay un torneo en curso.')).toHaveLength(4);
    expect(screen.getByText('Compite con tus amigos en un grupo.')).toBeOnTheScreen();
  });
});

describe('bloque Pendientes (R5)', () => {
  it('F17 CA6: cuántos faltan, el contador del primer cierre y 3 filas; tocar una abre S03', async () => {
    pendientesFalsos.mockResolvedValue(
      [1, 2, 3, 4].map((i) =>
        pendienteDePrueba({
          id: i,
          cierre_predicciones: enHoras(i + 1),
          inicio: enHoras(i + 1),
          jornada: { id: 9 + i, orden: 9 + i, nombre: `Jornada ${9 + i}` },
        }),
      ),
    );
    await abrir();

    expect(await screen.findByText('4 sin predecir')).toBeOnTheScreen();
    expect(screen.getByLabelText(/^El próximo cierra en 01:\d\d:\d\d$/)).toBeOnTheScreen();
    const filas = screen.getAllByLabelText(/^América contra Chivas/);
    expect(filas).toHaveLength(3);

    fireEvent.press(filas[0]!);
    expect(navegar).toHaveBeenCalledWith({ pathname: '/partido/[partidoId]', params: { partidoId: '1' } });
  });

  it('F17 CA6: "Ver los n" abre S02 en la jornada del cuarto', async () => {
    pendientesFalsos.mockResolvedValue(
      [1, 2, 3, 4].map((i) =>
        pendienteDePrueba({ id: i, cierre_predicciones: enHoras(i), jornada: { id: 20 + i, orden: 9 + i, nombre: 'J' } }),
      ),
    );
    await abrir();

    fireEvent.press(await screen.findByText('Ver los 4'));
    expect(navegar).toHaveBeenCalledWith({ pathname: '/partidos', params: { jornada: '13' } });
  });

  it('F17 R5: con 3 o menos no hay "Ver los n"; con más de 24 h se ve el día del cierre', async () => {
    pendientesFalsos.mockResolvedValue([pendienteDePrueba({ cierre_predicciones: enHoras(30) })]);
    await abrir();

    expect(await screen.findByText('1 sin predecir')).toBeOnTheScreen();
    expect(screen.getByText(/^El próximo cierra el /)).toBeOnTheScreen();
    expect(screen.queryByText(/^Ver los/)).not.toBeOnTheScreen();
  });

  it('F17 CA6: sin pendientes, el mensaje y "Ver partidos"', async () => {
    await abrir();

    expect(await screen.findByText('Ya predijiste todo lo que está abierto.')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Ver partidos'));
    expect(navegar).toHaveBeenCalledWith('/partidos');
  });

  it('F17 CA6: cuando el contador llega a 0, el bloque se vuelve a pedir', async () => {
    pendientesFalsos.mockResolvedValue([pendienteDePrueba({ cierre_predicciones: new Date(Date.now() + 1500).toISOString() })]);
    await abrir();

    await screen.findByText('1 sin predecir');
    const antes = pendientesFalsos.mock.calls.length;
    pendientesFalsos.mockResolvedValue([]);
    expect(await screen.findByText('Ya predijiste todo lo que está abierto.', {}, { timeout: 4000 })).toBeOnTheScreen();
    expect(pendientesFalsos.mock.calls.length).toBeGreaterThan(antes);
  });
});

describe('bloque Tu equipo (R7)', () => {
  it('F17 CA6: sin equipo, la invitación lleva a S12', async () => {
    await abrir();

    fireEvent.press(await screen.findByText('Elegir equipo'));
    expect(navegar).toHaveBeenCalledWith('/equipo');
  });

  it('F17 CA6: con equipo y sin más partidos, lo dice', async () => {
    perfilFalso.mockResolvedValue(perfilDePrueba({ equipo: chivas }));
    await abrir();

    expect(await screen.findByText('Chivas no tiene más partidos en este torneo.')).toBeOnTheScreen();
  });

  it('F17 CA6: con partido abierto, "Predecir" abre S03; si ya predije, "Ver tu predicción"', async () => {
    perfilFalso.mockResolvedValue(perfilDePrueba({ equipo: chivas }));
    proximoFalso.mockResolvedValue(proximoDePrueba({ cierre_predicciones: enHoras(48), inicio: enHoras(48) }));
    await abrir();

    const bloque = await screen.findByTestId('bloque-equipo');
    fireEvent.press(await within(bloque).findByText('Predecir'));
    expect(navegar).toHaveBeenCalledWith({ pathname: '/partido/[partidoId]', params: { partidoId: '8' } });
    expect(within(bloque).getByText(/^Jornada 10 · /)).toBeOnTheScreen();
    expect(within(bloque).getByText(/^Cierra el /)).toBeOnTheScreen();
  });

  it('F17 R7: ya predicho, "Ver tu predicción"', async () => {
    perfilFalso.mockResolvedValue(perfilDePrueba({ equipo: chivas }));
    proximoFalso.mockResolvedValue(proximoDePrueba({ cierre_predicciones: enHoras(2), tengo_prediccion: true }));
    await abrir();

    expect(await screen.findByText('Ver tu predicción')).toBeOnTheScreen();
    expect(screen.queryByText('Predecir')).not.toBeOnTheScreen();
  });

  it('F17 R7: en juego, "En juego" y "Ver partido"', async () => {
    perfilFalso.mockResolvedValue(perfilDePrueba({ equipo: chivas }));
    proximoFalso.mockResolvedValue(
      proximoDePrueba({ estado: 'EN_JUEGO', cierre_predicciones: enHoras(-0.2), inicio: enHoras(-0.2) }),
    );
    await abrir();

    expect(await screen.findByText('En juego')).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Ver partido'));
    expect(navegar).toHaveBeenCalledWith({ pathname: '/partido/[partidoId]', params: { partidoId: '8' } });
  });
});
