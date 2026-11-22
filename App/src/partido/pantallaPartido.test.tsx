// S03 (T34): formulario de predicción (F03 CA7, CA8), quitar, cierre y estados de pantalla.
// Corre la app completa con una sesión guardada; las lecturas y escrituras se simulan.
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { ExpoRoot } from 'expo-router';
import { getMockContext } from 'expo-router/testing-library';
import { NotificationFeedbackType, notificationAsync } from 'expo-haptics';
import { Alert, type AlertButton, StyleSheet } from 'react-native';

import { clienteConsultas } from '../datos/clienteConsultas';
import { ErrorDatos } from '../datos/errores';
import { simularSesionGuardada } from '../pruebas/supabaseFalso';
import {
  ErrorPrediccionesCerradas,
  guardarPrediccion,
  obtenerMiPrediccion,
  obtenerPartido,
  quitarPrediccion,
  type PartidoDetalle,
} from './datos';
import { guardarAhoraNo, leerAhoraNo, leerPermiso, pedirPermiso } from '../notificaciones/sistema';
import { formatearHora } from '../formato/fechas';
import { obtenerMisPuntosDePartido } from '../puntos/datos';
import { temaGrafito } from '../tema/tokens';
import type { Prediccion } from './eleccion';

jest.mock('../supabase/cliente');
jest.mock('./datos');
jest.mock('../grupos/datos');
jest.mock('../puntos/datos');
// F24 CA5: simulacro de `expo-haptics` para saber qué vibración se pidió.
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(async () => {}),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));
const vibracion = notificationAsync as jest.MockedFunction<typeof notificationAsync>;

const puntosFalsos = obtenerMisPuntosDePartido as jest.MockedFunction<typeof obtenerMisPuntosDePartido>;

const partidoFalso = obtenerPartido as jest.MockedFunction<typeof obtenerPartido>;
const prediccionFalsa = obtenerMiPrediccion as jest.MockedFunction<typeof obtenerMiPrediccion>;
const guardarFalso = guardarPrediccion as jest.MockedFunction<typeof guardarPrediccion>;
const quitarFalso = quitarPrediccion as jest.MockedFunction<typeof quitarPrediccion>;

const HORA_MS = 60 * 60 * 1000;

function partido(extra: Partial<PartidoDetalle> = {}): PartidoDetalle {
  const cierre = new Date(Date.now() + 2 * HORA_MS).toISOString();
  return {
    id: 5,
    inicio: cierre,
    cierre_predicciones: cierre,
    estado: 'PROGRAMADO',
    es_simulado: false,
    goles_local: null,
    goles_visitante: null,
    local: { nombre_corto: 'América', escudo_url: 'https://x.mx/l.png', color_primario: '#FFD700', color_texto: '#0B2341' },
    visitante: { nombre_corto: 'Chivas', escudo_url: 'https://x.mx/v.png', color_primario: null, color_texto: null },
    ...extra,
  };
}

const guardada = (extra: Partial<Prediccion> = {}): Prediccion => ({
  resultado: null,
  rango_goles: null,
  marcador_local: null,
  marcador_visitante: null,
  justificacion: null,
  actualizada_en: '2026-11-02T18:00:00Z',
  ...extra,
});

beforeEach(() => {
  simularSesionGuardada();
  clienteConsultas.clear();
  clienteConsultas.setDefaultOptions({
    queries: { retry: false, gcTime: Infinity },
    mutations: { retry: false },
  });
  partidoFalso.mockReset().mockImplementation(async () => partido());
  prediccionFalsa.mockReset().mockResolvedValue(null);
  guardarFalso.mockReset().mockImplementation(async (_id, eleccion) => ({
    ...eleccion,
    actualizada_en: '2026-11-02T18:30:00Z',
  }));
  quitarFalso.mockReset().mockResolvedValue();
  puntosFalsos.mockReset().mockResolvedValue(null);
  vibracion.mockClear();
});

afterEach(() => {
  clienteConsultas.clear();
  jest.restoreAllMocks();
});

async function abrir(url = '/partido/5') {
  process.env.EXPO_ROUTER_IMPORT_MODE = 'sync';
  await render(<ExpoRoot context={getMockContext('src/app')} location={url} />);
}

const opcion = (nombre: string) => screen.getByRole('radio', { name: nombre });
const campo = () => screen.getByLabelText('Tu análisis');
const boton = (nombre: string) => screen.getByRole('button', { name: nombre });
const tocar = (elemento: Parameters<typeof fireEvent.press>[0]) => fireEvent.press(elemento);

async function abrirFormulario() {
  await abrir();
  await screen.findByRole('header', { name: 'América contra Chivas' });
}

/** Con una predicción guardada S03 abre en la boleta (F24 R3): "Editar" abre el formulario. */
async function abrirEdicion() {
  await abrirFormulario();
  await tocar(boton('Editar predicción'));
}

describe('encabezado (F22)', () => {
  it('F22 CA4: escudo del local a la izquierda del nombre y del visitante a la derecha, con su franja', async () => {
    await abrirFormulario();
    const { colores } = temaGrafito;

    // Posición dentro de la fila del escudo y del hijo que contiene al nombre.
    const posiciones = (lado: 'local' | 'visitante', nombre: string) => {
      const hijos = screen.getByTestId(`encabezado-${lado}`).children;
      const posicion = (busca: (hijo: Exclude<(typeof hijos)[number], string>) => boolean) =>
        hijos.findIndex((hijo) => typeof hijo !== 'string' && busca(hijo));
      return {
        escudo: posicion((hijo) => hijo.props.testID === 'escudo-imagen'),
        nombre: posicion((hijo) => within(hijo).queryByText(nombre) !== null),
      };
    };
    // Local: escudo a la izquierda del nombre; visitante: a la derecha (R5).
    const local = posiciones('local', 'América');
    const visitante = posiciones('visitante', 'Chivas');
    expect(local.escudo).toBeGreaterThanOrEqual(0);
    expect(local.escudo).toBeLessThan(local.nombre);
    expect(visitante.nombre).toBeGreaterThanOrEqual(0);
    expect(visitante.escudo).toBeGreaterThan(visitante.nombre);
    const franja = (lado: string) =>
      StyleSheet.flatten(screen.getByTestId(`franja-${lado}`).props.style).backgroundColor;
    expect(franja('local')).toBe('#FFD700');
    // Chivas en el simulacro no tiene colores: franja neutra (D70).
    expect(franja('visitante')).toBe(colores.textoTenue);
  });
});

describe('formulario (F03 CA7)', () => {
  it('F03 CA7: "Guardar" está deshabilitado sin una elección válida', async () => {
    await abrirFormulario();

    expect(boton('Guardar predicción')).toBeDisabled();
    await tocar(opcion('Empate'));
    expect(boton('Guardar predicción')).toBeEnabled();
    // Tocar la elegida la quita: el grupo se puede dejar sin elegir.
    await tocar(opcion('Empate'));
    expect(opcion('Empate')).not.toBeChecked();
    expect(boton('Guardar predicción')).toBeDisabled();
  });

  it('F03 CA7: guarda solo la pestaña activa (marcador)', async () => {
    await abrirFormulario();

    await tocar(opcion('América'));
    await tocar(opcion('2'));
    await tocar(screen.getByRole('tab', { name: 'Marcador exacto' }));
    await tocar(boton('Un gol más para América'));
    await tocar(boton('Un gol más para América'));
    await tocar(boton('Un gol más para Chivas'));
    await tocar(boton('Guardar predicción'));

    await waitFor(() =>
      expect(guardarFalso).toHaveBeenCalledWith(5, {
        resultado: null,
        rango_goles: null,
        marcador_local: 2,
        marcador_visitante: 1,
        justificacion: null,
      }),
    );
  });

  it('F03 CA7: guarda solo la pestaña activa (resultado y goles)', async () => {
    prediccionFalsa.mockResolvedValue(guardada({ marcador_local: 1, marcador_visitante: 1 }));
    await abrirEdicion();

    // Abre en la pestaña de lo guardado.
    expect(screen.getByRole('tab', { name: 'Marcador exacto' })).toBeSelected();
    await tocar(screen.getByRole('tab', { name: 'Resultado y goles' }));
    await tocar(opcion('4 o más'));
    await tocar(boton('Actualizar'));

    await waitFor(() =>
      expect(guardarFalso).toHaveBeenCalledWith(5, {
        resultado: null,
        rango_goles: 'G4_MAS',
        marcador_local: null,
        marcador_visitante: null,
        justificacion: null,
      }),
    );
  });

  it('F03 CA7: sin cambios respecto a lo guardado, "Actualizar" está deshabilitado', async () => {
    prediccionFalsa.mockResolvedValue(guardada({ resultado: 'VISITANTE', rango_goles: 'G3' }));
    await abrirEdicion();

    expect(opcion('Chivas')).toBeChecked();
    expect(opcion('3')).toBeChecked();
    expect(boton('Actualizar')).toBeDisabled();
    await tocar(opcion('3'));
    expect(boton('Actualizar')).toBeEnabled();
  });

  it('F03 CA7: el selector de marcador va de 0 a 10', async () => {
    await abrirFormulario();
    await tocar(screen.getByRole('tab', { name: 'Marcador exacto' }));

    expect(boton('Un gol menos para América')).toBeDisabled();
    for (let i = 0; i < 10; i++) await tocar(boton('Un gol más para América'));

    expect(screen.getByLabelText('América: 10')).toBeOnTheScreen();
    expect(boton('Un gol más para América')).toBeDisabled();
    expect(boton('Un gol menos para América')).toBeEnabled();
  });
});

describe('boleta (F24)', () => {
  const boleta = () => screen.queryByTestId('boleta-prediccion');

  it('F24 CA1: guardar un marcador cierra el formulario y muestra la boleta con su hora', async () => {
    await abrirFormulario();

    await tocar(screen.getByRole('tab', { name: 'Marcador exacto' }));
    await tocar(boton('Un gol más para América'));
    await tocar(boton('Un gol más para América'));
    await tocar(boton('Un gol más para Chivas'));
    await fireEvent.changeText(campo(), 'América llega mejor.');
    await tocar(boton('Guardar predicción'));

    expect(await screen.findByText('América 2 – 1 Chivas')).toBeOnTheScreen();
    expect(screen.getByText('América llega mejor.')).toBeOnTheScreen();
    expect(
      screen.getByText(`Guardada · ${formatearHora(new Date('2026-11-02T18:30:00Z'))}`),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('radio')).not.toBeOnTheScreen();
    expect(boton('Editar predicción')).toBeOnTheScreen();
  });

  it('F24 CA1: con resultado y rango la boleta dice "Gana América · 2 goles" y "Sin análisis"', async () => {
    await abrirFormulario();

    await tocar(opcion('América'));
    await tocar(opcion('2'));
    await tocar(boton('Guardar predicción'));

    expect(await screen.findByText('Gana América · 2 goles')).toBeOnTheScreen();
    expect(screen.getByText('Sin análisis')).toBeOnTheScreen();
  });

  it('F24 CA2: un partido ya predicho y abierto abre en la boleta', async () => {
    prediccionFalsa.mockResolvedValue(guardada({ resultado: 'EMPATE', rango_goles: 'G0_1' }));
    await abrirFormulario();

    expect(boleta()).toBeOnTheScreen();
    expect(screen.getByText('Empate · 0–1 goles')).toBeOnTheScreen();
    expect(screen.queryByRole('radio')).not.toBeOnTheScreen();
  });

  it('F24 CA2: un partido sin predicción abre en el formulario', async () => {
    await abrirFormulario();

    expect(boleta()).not.toBeOnTheScreen();
    expect(boton('Guardar predicción')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeOnTheScreen();
  });

  it('F24 CA3: "Editar" abre el formulario con lo guardado y "Cancelar" vuelve sin cambios', async () => {
    prediccionFalsa.mockResolvedValue(guardada({ resultado: 'LOCAL' }));
    await abrirEdicion();

    expect(opcion('América')).toBeChecked();
    await tocar(opcion('Empate'));
    await tocar(boton('Cancelar'));

    expect(await screen.findByText('Gana América')).toBeOnTheScreen();
    expect(guardarFalso).not.toHaveBeenCalled();
    // Lo no guardado se descartó: al volver a editar está lo guardado.
    await tocar(boton('Editar predicción'));
    expect(opcion('América')).toBeChecked();
  });

  it('F24 CA3: "Actualizar" vuelve a la boleta con lo nuevo', async () => {
    prediccionFalsa.mockResolvedValue(guardada({ resultado: 'LOCAL' }));
    await abrirEdicion();

    await tocar(opcion('Empate'));
    await tocar(boton('Actualizar'));

    const nueva = await screen.findByTestId('boleta-prediccion');
    expect(within(nueva).getByText('Empate')).toBeOnTheScreen();
    expect(screen.queryByRole('radio')).not.toBeOnTheScreen();
  });
});

describe('boleta cerrada y vibración (F24)', () => {
  it('F24 CA4: cerrado, la boleta no tiene "Editar"', async () => {
    partidoFalso.mockImplementation(async () => partido({ estado: 'EN_JUEGO' }));
    prediccionFalsa.mockResolvedValue(guardada({ resultado: 'LOCAL', justificacion: 'Juega en casa.' }));
    await abrir();

    expect(await screen.findByTestId('boleta-prediccion')).toBeOnTheScreen();
    expect(screen.getByText('Gana América')).toBeOnTheScreen();
    expect(screen.getByText('Predicciones cerradas')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Editar predicción' })).not.toBeOnTheScreen();
  });

  it('F24 CA4: si cierra durante la edición, descarta lo no guardado y muestra la boleta', async () => {
    const cierre = new Date(Date.now() + 1500).toISOString();
    partidoFalso.mockImplementation(async () => partido({ inicio: cierre, cierre_predicciones: cierre }));
    prediccionFalsa.mockResolvedValue(guardada({ resultado: 'LOCAL' }));
    await abrirEdicion();
    await tocar(opcion('Empate'));

    expect(
      await screen.findByText('Se cerraron las predicciones.', {}, { timeout: 4000 }),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('boleta-prediccion')).toBeOnTheScreen();
    expect(screen.getByText('Gana América')).toBeOnTheScreen();
    expect(screen.queryByRole('radio')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Editar predicción' })).not.toBeOnTheScreen();
    expect(guardarFalso).not.toHaveBeenCalled();
  });

  it('F24 CA5: al guardar pide la vibración de éxito', async () => {
    await abrirFormulario();

    await tocar(opcion('Empate'));
    await tocar(boton('Guardar predicción'));

    await screen.findByTestId('boleta-prediccion');
    expect(vibracion).toHaveBeenCalledTimes(1);
    expect(vibracion).toHaveBeenCalledWith(NotificationFeedbackType.Success);
  });

  it('F24 CA5: si falla el guardado pide la vibración de error', async () => {
    guardarFalso.mockRejectedValue(new ErrorDatos('Network request failed', true));
    await abrirFormulario();

    await tocar(opcion('Empate'));
    await tocar(boton('Guardar predicción'));

    expect(
      await screen.findByText('No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.'),
    ).toBeOnTheScreen();
    expect(vibracion).toHaveBeenCalledTimes(1);
    expect(vibracion).toHaveBeenCalledWith(NotificationFeedbackType.Error);
  });
});

describe('errores al guardar (F03 CA8)', () => {
  it('F03 CA8: ante PREDICCIONES_CERRADAS pasa a cerrado con su mensaje y lo último guardado', async () => {
    prediccionFalsa.mockResolvedValue(guardada({ resultado: 'LOCAL' }));
    guardarFalso.mockRejectedValue(new ErrorPrediccionesCerradas());
    await abrirEdicion();

    await tocar(opcion('Empate'));
    await tocar(boton('Actualizar'));

    expect(await screen.findByText('El partido ya cerró; tu cambio no se guardó.')).toBeOnTheScreen();
    expect(screen.getByText('Predicciones cerradas')).toBeOnTheScreen();
    expect(screen.getByText('Gana América')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Actualizar' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('radio')).not.toBeOnTheScreen();
  });

  it('F03 CA8: ante un error de red conserva lo capturado', async () => {
    guardarFalso.mockRejectedValue(new ErrorDatos('Network request failed', true));
    await abrirFormulario();

    await tocar(opcion('Chivas'));
    await tocar(opcion('0–1'));
    await tocar(boton('Guardar predicción'));

    expect(
      await screen.findByText('No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.'),
    ).toBeOnTheScreen();
    expect(opcion('Chivas')).toBeChecked();
    expect(opcion('0–1')).toBeChecked();
    expect(boton('Guardar predicción')).toBeEnabled();
  });
});

describe('quitar (decisión 1, D90)', () => {
  it('F24 CA3: pide confirmación, quita y deja el formulario vacío', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_titulo, _mensaje, botones?: AlertButton[]) =>
      botones?.find((b) => b.text === 'Quitar')?.onPress?.(),
    );
    prediccionFalsa.mockResolvedValue(guardada({ resultado: 'LOCAL' }));
    await abrirEdicion();

    await tocar(boton('Quitar predicción'));

    await waitFor(() => expect(quitarFalso).toHaveBeenCalledWith(5));
    expect(await screen.findByRole('button', { name: 'Guardar predicción' })).toBeDisabled();
    expect(opcion('América')).not.toBeChecked();
    expect(screen.queryByRole('button', { name: 'Quitar predicción' })).not.toBeOnTheScreen();
  });

  it('cancelar no quita nada', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    prediccionFalsa.mockResolvedValue(guardada({ resultado: 'LOCAL' }));
    await abrirEdicion();

    await tocar(boton('Quitar predicción'));

    expect(Alert.alert).toHaveBeenCalled();
    expect(quitarFalso).not.toHaveBeenCalled();
    expect(opcion('América')).toBeChecked();
  });
});

describe('cierre (F03 R8, Flujo 6)', () => {
  it('con menos de 24 h muestra el contador "Cierra en"', async () => {
    await abrirFormulario();

    expect(screen.getByText('Cierra en')).toBeOnTheScreen();
    expect(screen.getByText(/^0[12]:\d\d:\d\d$/)).toBeOnTheScreen();
  });

  it('con más de 24 h muestra la fecha del cierre', async () => {
    const cierre = new Date(Date.now() + 3 * 24 * HORA_MS).toISOString();
    partidoFalso.mockImplementation(async () => partido({ inicio: cierre, cierre_predicciones: cierre }));
    await abrirFormulario();

    expect(screen.getByText(/^Cierra el /)).toBeOnTheScreen();
    expect(screen.queryByText('Cierra en')).not.toBeOnTheScreen();
  });

  it('si el cierre llega con la pantalla abierta, bloquea el formulario y avisa', async () => {
    const cierre = new Date(Date.now() + 1500).toISOString();
    partidoFalso.mockImplementation(async () => partido({ inicio: cierre, cierre_predicciones: cierre }));
    await abrirFormulario();
    await tocar(opcion('Empate'));

    expect(
      await screen.findByText('Se cerraron las predicciones.', {}, { timeout: 4000 }),
    ).toBeOnTheScreen();
    expect(screen.getByText('No predijiste este partido.')).toBeOnTheScreen();
    expect(screen.queryByRole('radio')).not.toBeOnTheScreen();
  });

  it('cerrado: muestra mi predicción en solo lectura', async () => {
    partidoFalso.mockImplementation(async () => partido({ estado: 'EN_JUEGO' }));
    prediccionFalsa.mockResolvedValue(guardada({ marcador_local: 3, marcador_visitante: 0 }));
    await abrir();

    expect(await screen.findByText('Predicciones cerradas')).toBeOnTheScreen();
    expect(screen.getByText('América 3 – 0 Chivas')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Guardar|Actualizar|Quitar/ })).not.toBeOnTheScreen();
  });

  it('terminado: muestra el marcador en el encabezado y "No predijiste este partido"', async () => {
    partidoFalso.mockImplementation(async () =>
      partido({ estado: 'TERMINADO', goles_local: 2, goles_visitante: 2 }),
    );
    await abrir();

    expect(await screen.findByRole('header', { name: 'América 2, Chivas 2' })).toBeOnTheScreen();
    expect(screen.getByText('No predijiste este partido.')).toBeOnTheScreen();
    expect(puntosFalsos).not.toHaveBeenCalled();
  });

  it('F10 CA4: terminado con predicción muestra mis puntos debajo de la predicción', async () => {
    partidoFalso.mockImplementation(async () =>
      partido({ estado: 'TERMINADO', goles_local: 2, goles_visitante: 2 }),
    );
    prediccionFalsa.mockResolvedValue(guardada({ marcador_local: 2, marcador_visitante: 2 }));
    puntosFalsos.mockResolvedValue({
      partido_id: 5,
      estado_prediccion: 'ACERTADA',
      estado_bono: 'SIN_JUSTIFICACION',
      puntos_resultado: 0,
      puntos_rango_goles: 0,
      puntos_marcador: 350,
      puntos_base: 350,
      puntos_bono: null,
      puntos_total: 350,
      explicacion: null,
      afirmaciones: null,
    });
    await abrir();

    expect(await screen.findByLabelText('Marcador exacto: acertada, 350 puntos')).toBeOnTheScreen();
    expect(screen.getByText('Tus puntos')).toBeOnTheScreen();
    expect(puntosFalsos).toHaveBeenCalledWith(5);
  });

  it('F10 estados: si fallan solo los puntos, el partido se ve y se puede reintentar', async () => {
    partidoFalso.mockImplementation(async () =>
      partido({ estado: 'TERMINADO', goles_local: 1, goles_visitante: 0 }),
    );
    prediccionFalsa.mockResolvedValue(guardada({ resultado: 'LOCAL' }));
    puntosFalsos.mockRejectedValue(new ErrorDatos('sin red', true));
    await abrir();

    expect(await screen.findByText('No se pudieron cargar tus puntos.')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'América 1, Chivas 0' })).toBeOnTheScreen();
    puntosFalsos.mockResolvedValue(null);
    await tocar(boton('Reintentar'));
    await waitFor(() => expect(puntosFalsos).toHaveBeenCalledTimes(2));
  });
});

describe('justificación (F04)', () => {

  it('F04 CA5: el campo muestra el contador y no deja escribir más de 500 caracteres', async () => {
    await abrirFormulario();

    expect(screen.getByText('0/500')).toBeOnTheScreen();
    expect(campo().props.maxLength).toBe(500);
    await fireEvent.changeText(campo(), 'Gana el local');
    expect(screen.getByText('13/500')).toBeOnTheScreen();
    await fireEvent.changeText(campo(), 'a'.repeat(500));
    expect(screen.getByText('500/500')).toBeOnTheScreen();
  });

  it('F04 CA6: viaja con la predicción en una sola escritura, ya recortada', async () => {
    await abrirFormulario();

    await tocar(opcion('Empate'));
    await fireEvent.changeText(campo(), '  Los dos llegan cansados.  ');
    await tocar(boton('Guardar predicción'));

    await waitFor(() => expect(guardarFalso).toHaveBeenCalledTimes(1));
    expect(guardarFalso).toHaveBeenCalledWith(5, {
      resultado: 'EMPATE',
      rango_goles: null,
      marcador_local: null,
      marcador_visitante: null,
      justificacion: 'Los dos llegan cansados.',
    });
  });

  it('F04 CA6: cambiar solo la justificación habilita "Actualizar"', async () => {
    prediccionFalsa.mockResolvedValue(guardada({ resultado: 'LOCAL', justificacion: 'Juega en casa.' }));
    await abrirEdicion();

    expect(campo().props.value).toBe('Juega en casa.');
    expect(boton('Actualizar')).toBeDisabled();
    await fireEvent.changeText(campo(), 'Juega en casa y con su gente.');
    expect(boton('Actualizar')).toBeEnabled();
    // Solo espacios de más no es un cambio: el servidor los recorta.
    await fireEvent.changeText(campo(), 'Juega en casa.  ');
    expect(boton('Actualizar')).toBeDisabled();
  });

  it('F04 R2: sin elegir una predicción no se guarda solo la justificación', async () => {
    await abrirFormulario();

    await fireEvent.changeText(campo(), 'Va a ser un partidazo.');

    expect(boton('Guardar predicción')).toBeDisabled();
  });

  it('F04 R5: muestra el texto de ayuda sin puntos', async () => {
    await abrirFormulario();

    expect(
      screen.getByText('Opcional. Si tu análisis se parece a lo que pase, ganas bono aunque falles.'),
    ).toBeOnTheScreen();
  });

  it('error al guardar: se conserva el texto escrito', async () => {
    guardarFalso.mockRejectedValue(new ErrorDatos('Network request failed', true));
    await abrirFormulario();

    await tocar(opcion('América'));
    await fireEvent.changeText(campo(), 'Mi análisis');
    await tocar(boton('Guardar predicción'));

    expect(
      await screen.findByText('No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.'),
    ).toBeOnTheScreen();
    expect(campo().props.value).toBe('Mi análisis');
  });

  it('cerrado: la justificación se ve en solo lectura', async () => {
    partidoFalso.mockImplementation(async () => partido({ estado: 'EN_JUEGO' }));
    prediccionFalsa.mockResolvedValue(guardada({ resultado: 'LOCAL', justificacion: 'Juega en casa.' }));
    await abrir();

    expect(await screen.findByText('Juega en casa.')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Tu análisis')).not.toBeOnTheScreen();
  });

  it('F24 R1: cerrado sin justificación, la boleta dice "Sin análisis"', async () => {
    partidoFalso.mockImplementation(async () => partido({ estado: 'EN_JUEGO' }));
    prediccionFalsa.mockResolvedValue(guardada({ resultado: 'LOCAL' }));
    await abrir();

    expect(await screen.findByText('Gana América')).toBeOnTheScreen();
    expect(screen.getByText('Sin análisis')).toBeOnTheScreen();
  });
});

describe('permiso de notificaciones (F11a R1)', () => {
  const PREGUNTA = '¿Te avisamos 1 h antes de que cierren los partidos que no has predicho?';

  beforeEach(() => {
    (leerPermiso as jest.Mock).mockResolvedValue('sinPreguntar');
    (leerAhoraNo as jest.Mock).mockResolvedValue(false);
    (pedirPermiso as jest.Mock).mockClear();
    (guardarAhoraNo as jest.Mock).mockClear();
  });

  async function guardarPrediccion() {
    await abrirFormulario();
    expect(screen.queryByText(PREGUNTA)).not.toBeOnTheScreen();
    await tocar(opcion('Empate'));
    await tocar(boton('Guardar predicción'));
  }

  it('F11a CA5: tras guardar, explica y "Sí, avísame" pide el permiso del sistema', async () => {
    await guardarPrediccion();

    expect(await screen.findByText(PREGUNTA)).toBeOnTheScreen();
    await tocar(boton('Sí, avísame'));

    expect(pedirPermiso).toHaveBeenCalled();
    expect(screen.queryByText(PREGUNTA)).not.toBeOnTheScreen();
  });

  it('F11a CA5: "Ahora no" guarda la marca y no pide el permiso', async () => {
    await guardarPrediccion();

    await tocar(await screen.findByRole('button', { name: 'Ahora no' }));

    expect(guardarAhoraNo).toHaveBeenCalled();
    expect(pedirPermiso).not.toHaveBeenCalled();
    expect(screen.queryByText(PREGUNTA)).not.toBeOnTheScreen();
  });

  it('F11a CA5: con "Ahora no" guardado no pregunta', async () => {
    (leerAhoraNo as jest.Mock).mockClear().mockResolvedValue(true);
    await guardarPrediccion();
    // Espera a que la app termine de decidir antes de comprobar que no preguntó.
    await waitFor(() => expect(leerAhoraNo).toHaveBeenCalled());
    await act(async () => {});
    expect(screen.queryByText(PREGUNTA)).not.toBeOnTheScreen();
  });

  it('F11a CA5: con el permiso ya concedido no pregunta', async () => {
    (leerPermiso as jest.Mock).mockClear().mockResolvedValue('concedido');
    await guardarPrediccion();
    // Una vez al abrir (registro del teléfono) y otra al decidir si pregunta.
    await waitFor(() => expect((leerPermiso as jest.Mock).mock.calls.length).toBeGreaterThan(1));
    await act(async () => {});
    expect(screen.queryByText(PREGUNTA)).not.toBeOnTheScreen();
  });
});

describe('simulados (F09)', () => {
  it('F09 CA8: S03 muestra "Simulado" solo en un partido simulado', async () => {
    partidoFalso.mockImplementation(async () => partido({ es_simulado: true }));
    await abrirFormulario();
    expect(screen.getByText('Simulado')).toBeOnTheScreen();
  });

  it('F09 CA8: S03 no muestra "Simulado" en un partido real', async () => {
    await abrirFormulario();
    expect(screen.queryByText('Simulado')).not.toBeOnTheScreen();
  });
});

describe('estados de pantalla', () => {
  it('cargando: esqueleto', async () => {
    partidoFalso.mockImplementation(() => new Promise(() => {}));
    await abrir();

    expect(await screen.findByTestId('partido-cargando')).toBeOnTheScreen();
  });

  it('sin conexión y sin datos: mensaje y "Reintentar" que vuelve a cargar', async () => {
    partidoFalso.mockRejectedValueOnce(new ErrorDatos('Network request failed', true));
    await abrir();

    expect(
      await screen.findByText('Sin conexión. Revisa tu internet e inténtalo de nuevo.'),
    ).toBeOnTheScreen();
    await tocar(boton('Reintentar'));

    expect(await screen.findByRole('header', { name: 'América contra Chivas' })).toBeOnTheScreen();
  });

  it('error del servidor: mensaje de error', async () => {
    prediccionFalsa.mockRejectedValue(new ErrorDatos('boom', false));
    await abrir();

    expect(await screen.findByText('No pudimos cargar el partido. Inténtalo de nuevo.')).toBeOnTheScreen();
  });

  it('partido no encontrado: mensaje e "Ir a Partidos"', async () => {
    partidoFalso.mockResolvedValue(null);
    await abrir('/partido/99');

    expect(await screen.findByText('Este partido no existe.')).toBeOnTheScreen();
    expect(boton('Ir a Partidos')).toBeOnTheScreen();
  });

  it('un id que no es número: partido no encontrado sin consultar', async () => {
    await abrir('/partido/abc');

    expect(await screen.findByText('Este partido no existe.')).toBeOnTheScreen();
    expect(partidoFalso).not.toHaveBeenCalled();
  });
});
