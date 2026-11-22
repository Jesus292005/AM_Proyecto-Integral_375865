// S02 (T26, T86): estados de B6, agrupación por día (CA9), tira de jornadas (F23) y navegación.
// Corre la app completa con una sesión guardada; las lecturas de Supabase se simulan.
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { ExpoRoot } from 'expo-router';
import { getMockContext } from 'expo-router/testing-library';

import { clienteConsultas } from '../datos/clienteConsultas';
import { formatearDia, formatearHora } from '../formato/fechas';
import { obtenerPartido } from '../partido/datos';
import { obtenerMisPuntos } from '../puntos/datos';
import { simularSesionGuardada } from '../pruebas/supabaseFalso';
import {
  ErrorDatos,
  obtenerPartidosDeJornada,
  obtenerTorneoActual,
  type PartidoDeLista,
  type TorneoActual,
} from './datos';
import { etiquetaJornada } from './TiraJornadas';

jest.mock('../supabase/cliente');
jest.mock('../partido/datos');
jest.mock('../puntos/datos');
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

function equipoDeLista(nombre: string) {
  return {
    nombre_corto: nombre,
    escudo_url: `https://x.mx/${nombre}.png`,
    color_primario: null,
    color_texto: null,
  };
}

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
    cierre_predicciones: inicio,
    estado: 'PROGRAMADO',
    goles_local: null,
    goles_visitante: null,
    local: equipoDeLista(local),
    visitante: equipoDeLista(visitante),
    es_simulado: false,
    predicho: false,
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

  it('F03 CA9: muestra "Predicho" solo en los partidos con predicción propia', async () => {
    partidosFalsos.mockImplementation(async () => [
      partido(201, SABADO, 'Puebla', 'Querétaro', { predicho: true }),
      partido(202, DOMINGO, 'Chivas', 'América'),
    ]);
    await abrir('/partidos');

    const horaPuebla = formatearHora(new Date(SABADO));
    expect(
      await fila(`Puebla contra Querétaro, ${horaPuebla}. Por jugar. Predicho`),
    ).toBeOnTheScreen();
    expect(screen.getAllByText('Predicho')).toHaveLength(1);
    expect(screen.getAllByTestId('icono-check')).toHaveLength(1);
    expect(await fila(/^Chivas contra América, .*\. Por jugar$/)).toBeOnTheScreen();
  });

  it('F10 CA3: pide mis puntos solo de los predichos y muestra el total en su tarjeta', async () => {
    const puntosFalsos = obtenerMisPuntos as jest.MockedFunction<typeof obtenerMisPuntos>;
    puntosFalsos.mockResolvedValue(
      new Map([
        [
          201,
          {
            partido_id: 201,
            estado_prediccion: 'PARCIAL' as const,
            estado_bono: 'PENDIENTE' as const,
            puntos_resultado: 100,
            puntos_rango_goles: 0,
            puntos_marcador: 0,
            puntos_base: 100,
            puntos_bono: null,
            puntos_total: 100,
            explicacion: null,
            afirmaciones: null,
          },
        ],
      ]),
    );
    partidosFalsos.mockImplementation(async () => [
      partido(201, SABADO, 'Puebla', 'Querétaro', {
        predicho: true,
        estado: 'TERMINADO',
        goles_local: 2,
        goles_visitante: 1,
      }),
      partido(202, DOMINGO, 'Chivas', 'América'),
    ]);
    await abrir('/partidos');

    expect(
      await fila('Puebla 2, Querétaro 1. Terminado. Parcial, 100 puntos, bono pendiente'),
    ).toBeOnTheScreen();
    expect(screen.getByText('+100')).toBeOnTheScreen();
    expect(puntosFalsos).toHaveBeenCalledWith([201]);
    puntosFalsos.mockReset().mockResolvedValue(new Map());
  });

  it('F09 CA8: muestra "Simulado" solo en los partidos simulados', async () => {
    partidosFalsos.mockImplementation(async () => [
      partido(301, SABADO, 'Puebla', 'Querétaro', { es_simulado: true }),
      partido(302, DOMINGO, 'Chivas', 'América'),
    ]);
    await abrir('/partidos');

    expect(await fila(/^Puebla contra Querétaro, .*\. Por jugar\. Simulado$/)).toBeOnTheScreen();
    expect(screen.getAllByText('Simulado')).toHaveLength(1);
    expect(await fila(/^Chivas contra América, .*\. Por jugar$/)).toBeOnTheScreen();
  });

  it('tocar un partido abre su detalle (S03)', async () => {
    await abrir('/partidos');

    await fireEvent.press(await fila(/Chivas/));

    expect(await screen.findByRole('header', { name: 'Puebla 1, Santos 0' })).toBeOnTheScreen();
    expect(obtenerPartido).toHaveBeenCalledWith(103);
  });
});

describe('S02 tira de jornadas (F23)', () => {
  const jornada = (nombre: string) => screen.getByRole('tab', { name: nombre });

  it('F23 CA1: muestra todas las jornadas con su etiqueta y marca la elegida y la actual', async () => {
    await abrir('/partidos');
    await screen.findByRole('header', { name: 'Jornada 2' });

    const tira = screen.getByTestId('tira-jornadas');
    expect(within(tira).getAllByRole('tab')).toHaveLength(3);
    expect(within(jornada('Jornada 1')).getByText('J1')).toBeOnTheScreen();
    expect(within(jornada('Liguilla · Final')).getByText('Final')).toBeOnTheScreen();
    // La actual (J2) es también la elegida al abrir; lleva el punto y lo dice en su nombre.
    expect(jornada('Jornada 2, jornada actual')).toBeSelected();
    expect(within(jornada('Jornada 2, jornada actual')).getByTestId('jornada-actual')).toBeTruthy();
    expect(jornada('Jornada 1')).not.toBeSelected();
  });

  it('F23 CA1: tocar una jornada abre sus partidos; la actual conserva su punto', async () => {
    await abrir('/partidos');
    await screen.findByRole('header', { name: 'Jornada 2' });

    await fireEvent.press(jornada('Liguilla · Final'));

    expect(await screen.findByRole('header', { name: 'Liguilla · Final' })).toBeOnTheScreen();
    expect(partidosFalsos).toHaveBeenLastCalledWith(21);
    expect(jornada('Liguilla · Final')).toBeSelected();
    expect(jornada('Jornada 2, jornada actual')).not.toBeSelected();
    expect(within(jornada('Jornada 2, jornada actual')).getByTestId('jornada-actual')).toBeTruthy();
  });

  it('F23 CA1: cambiar de jornada no agrega historial (D78)', async () => {
    await abrir('/partidos');
    await screen.findByRole('header', { name: 'Jornada 2' });

    await fireEvent.press(jornada('Jornada 1'));
    await screen.findByRole('header', { name: 'Jornada 1' });

    // Una sola pantalla S02 montada (las apiladas siguen en el árbol, ocultas).
    expect(screen.queryAllByTestId('tira-jornadas', { includeHiddenElements: true })).toHaveLength(1);
  });

  it('F23 CA1: un torneo con una sola jornada muestra la tira igual', async () => {
    torneoFalso.mockResolvedValue({
      ...apertura,
      jornadas: [{ id: 12, orden: 2, nombre: 'Jornada 2' }],
    });
    await abrir('/partidos');

    await screen.findByRole('header', { name: 'Jornada 2' });
    expect(within(screen.getByTestId('tira-jornadas')).getAllByRole('tab')).toHaveLength(1);
  });
});

describe('S02 filtro "Sin predecir" (F23)', () => {
  const EN_UNA_HORA = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const HACE_UNA_HORA = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const abiertoEn = (fecha: string) => ({ inicio: fecha, cierre_predicciones: fecha });

  // J2: dos pendientes (uno pospuesto, que sigue abierto por F03 R1) y cuatro que no lo son.
  const jornadaConPendientes = [
    partido(201, EN_UNA_HORA, 'Puebla', 'Santos', abiertoEn(EN_UNA_HORA)),
    partido(202, EN_UNA_HORA, 'Chivas', 'Atlas', { ...abiertoEn(EN_UNA_HORA), predicho: true }),
    partido(203, HACE_UNA_HORA, 'León', 'Toluca', abiertoEn(HACE_UNA_HORA)),
    partido(204, HACE_UNA_HORA, 'Tigres', 'Pumas', {
      ...abiertoEn(HACE_UNA_HORA),
      estado: 'TERMINADO',
      goles_local: 1,
      goles_visitante: 0,
    }),
    partido(205, EN_UNA_HORA, 'Necaxa', 'Pachuca', { ...abiertoEn(EN_UNA_HORA), estado: 'POSPUESTO' }),
    // En juego con el cierre aún en el futuro: no es "por jugar" (F03 R1).
    partido(206, EN_UNA_HORA, 'Mazatlán', 'Querétaro', { ...abiertoEn(EN_UNA_HORA), estado: 'EN_JUEGO' }),
  ];
  // J1: un pendiente. Final: todo predicho.
  const jornada1 = [partido(111, EN_UNA_HORA, 'Juárez', 'Tijuana', abiertoEn(EN_UNA_HORA))];
  const finalPredicha = [
    partido(211, EN_UNA_HORA, 'América', 'Cruz Azul', { ...abiertoEn(EN_UNA_HORA), predicho: true }),
  ];

  beforeEach(() => {
    partidosFalsos.mockImplementation(async (id) =>
      id === 12 ? jornadaConPendientes : id === 11 ? jornada1 : finalPredicha,
    );
  });

  const filtro = () => screen.getByRole('checkbox', { name: 'Sin predecir' });
  const equipos = () =>
    screen.getAllByRole('button', { name: / contra / }).map((f) => f.props.accessibilityLabel);

  it('F23 CA2: solo deja los partidos por jugar, abiertos y sin mi predicción', async () => {
    await abrir('/partidos');
    await fila(/Puebla/);
    expect(await fila(/Tigres 1, Pumas 0/)).toBeOnTheScreen();
    expect(equipos()).toHaveLength(5);

    await fireEvent.press(filtro());

    expect(filtro()).toBeChecked();
    await waitFor(() => expect(equipos()).toHaveLength(2));
    expect(equipos().join(' | ')).toMatch(/Puebla contra Santos.*Necaxa contra Pachuca/);
    // Fuera: predicho (Chivas), cerrado (León), en juego (Mazatlán) y terminado (Tigres).
    expect(screen.queryByRole('button', { name: /Tigres/ })).not.toBeOnTheScreen();
  });

  it('F23 CA2: sin pendientes lo dice y "Ver todos" apaga el filtro', async () => {
    await abrir('/partidos?jornada=21');
    await fila(/América/);

    await fireEvent.press(filtro());

    expect(
      await screen.findByText('Ya predijiste todo lo que se puede en esta jornada.'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Ver todos' }));
    expect(filtro()).not.toBeChecked();
    expect(await fila(/América/)).toBeOnTheScreen();
  });

  it('F23 CA3: el filtro sigue activo al cambiar de jornada', async () => {
    await abrir('/partidos');
    await fila(/Puebla/);
    await fireEvent.press(filtro());

    await fireEvent.press(screen.getByRole('tab', { name: 'Jornada 1' }));

    expect(await screen.findByRole('header', { name: 'Jornada 1' })).toBeOnTheScreen();
    expect(filtro()).toBeChecked();
    expect(await fila(/Juárez/)).toBeOnTheScreen();
  });

  it('F23 R4: abrir un partido no lo apaga; salir de la pestaña sí', async () => {
    await abrir('/partidos');
    await fila(/Puebla/);
    await fireEvent.press(filtro());
    await fireEvent.press(await fila(/Puebla/));
    await screen.findByRole('header', { name: 'Puebla 1, Santos 0' });
    await fireEvent.press(screen.getByRole('button', { name: 'Volver' }));
    await screen.findByRole('header', { name: 'Jornada 2' });
    expect(filtro()).toBeChecked();

    await fireEvent.press(screen.getByRole('tab', { name: 'Grupos' }));
    await screen.findByRole('header', { name: 'Grupos' });
    await fireEvent.press(screen.getByRole('tab', { name: 'Partidos' }));

    await waitFor(() => expect(filtro()).not.toBeChecked());
  });
});

describe('etiquetaJornada (F23 R1)', () => {
  it.each([
    ['Jornada 1', 'J1'],
    ['Jornada 17', 'J17'],
    ['Liguilla · Play-in', 'Play-in'],
    ['Liguilla · Cuartos', 'Cuartos'],
    ['Liguilla · Semifinales', 'Semis'],
    ['Liguilla · Final', 'Final'],
  ])('F23 CA1: "%s" se muestra como "%s"', (nombre, etiqueta) => {
    expect(etiquetaJornada(nombre)).toBe(etiqueta);
  });
});

describe('S02 estados (B6, CA11)', () => {
  it('mientras carga muestra esqueletos', async () => {
    torneoFalso.mockReturnValue(new Promise(() => {}));
    await abrir('/partidos');

    expect(await screen.findByTestId('partidos-cargando')).toBeOnTheScreen();
    expect(screen.getByTestId('tira-cargando')).toBeOnTheScreen();
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
    expect(screen.queryByTestId('tira-jornadas')).not.toBeOnTheScreen();
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
