// T66–T67: S04, S05, S06, S08 y la sección "En tus grupos" de S03 (F07 CA9, CA10). Corre la app
// completa con una sesión guardada; las lecturas y acciones de grupos se simulan.
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { ExpoRoot, router } from 'expo-router';
import { getMockContext } from 'expo-router/testing-library';
import { Alert, type AlertButton } from 'react-native';

import { clienteConsultas } from '../datos/clienteConsultas';
import { ErrorDatos } from '../datos/errores';
import { obtenerPartido } from '../partido/datos';
import { obtenerPartidosDeJornada, obtenerTorneoActual, type PartidoDeLista } from '../partidos/datos';
import { coloresGrafito, temaGrafito } from '../tema/tokens';
import { simularSesionGuardada } from '../pruebas/supabaseFalso';
import {
  crearGrupo,
  editarGrupo,
  obtenerGrupo,
  obtenerMisGrupos,
  obtenerRanking,
  obtenerPrediccionesDelGrupo,
  salirDeGrupo,
  unirseAGrupo,
  type FilaRanking,
  type MiGrupo,
  type PrediccionAjena,
} from './datos';
import { ErrorGrupo } from './errores';

jest.mock('../supabase/cliente');
jest.mock('./datos');
jest.mock('../partido/datos');
jest.mock('../puntos/datos');
// La vista "Jornada" de S08 usa las jornadas del torneo actual (las de S02).
jest.mock('../partidos/datos', () => ({
  ...jest.requireActual<typeof import('../partidos/datos')>('../partidos/datos'),
  obtenerTorneoActual: jest.fn(),
  obtenerPartidosDeJornada: jest.fn(),
}));

const misGrupos = obtenerMisGrupos as jest.MockedFunction<typeof obtenerMisGrupos>;
const grupoFalso = obtenerGrupo as jest.MockedFunction<typeof obtenerGrupo>;
const rankingFalso = obtenerRanking as jest.MockedFunction<typeof obtenerRanking>;
const torneoFalso = obtenerTorneoActual as jest.MockedFunction<typeof obtenerTorneoActual>;
const partidosFalsos = obtenerPartidosDeJornada as jest.MockedFunction<typeof obtenerPartidosDeJornada>;

const partidoDeJornada: PartidoDeLista = {
  id: 1,
  inicio: '2026-11-20T20:00:00Z',
  cierre_predicciones: '2026-11-20T20:00:00Z',
  estado: 'PROGRAMADO',
  goles_local: null,
  goles_visitante: null,
  local: { nombre_corto: 'Puebla', escudo_url: 'https://x.mx/l.png', color_primario: null, color_texto: null },
  visitante: { nombre_corto: 'Santos', escudo_url: 'https://x.mx/v.png', color_primario: null, color_texto: null },
  es_simulado: false,
  predicho: false,
};
const prediccionesFalsas = obtenerPrediccionesDelGrupo as jest.MockedFunction<
  typeof obtenerPrediccionesDelGrupo
>;
const crearFalso = crearGrupo as jest.MockedFunction<typeof crearGrupo>;
const unirseFalso = unirseAGrupo as jest.MockedFunction<typeof unirseAGrupo>;
const salirFalso = salirDeGrupo as jest.MockedFunction<typeof salirDeGrupo>;
const editarFalso = editarGrupo as jest.MockedFunction<typeof editarGrupo>;
const partidoFalso = obtenerPartido as jest.MockedFunction<typeof obtenerPartido>;

const GRUPO = 'Los del sillón';

const fila = (extra: Partial<FilaRanking>): FilaRanking => ({
  posicion: 1,
  usuario_id: 'u',
  nombre: 'Alguien',
  foto_url: null,
  puntos_total: 0,
  puntos_base: 0,
  puntos_bono: 0,
  marcadores_exactos: 0,
  es_yo: false,
  incluye_simulados: false,
  ultima_calificacion: null,
  ...extra,
});

const ajena = (extra: Partial<PrediccionAjena>): PrediccionAjena => ({
  usuario_id: 'u',
  nombre: 'Alguien',
  foto_url: null,
  resultado: null,
  rango_goles: null,
  marcador_local: null,
  marcador_visitante: null,
  justificacion: null,
  ...extra,
});

beforeEach(() => {
  simularSesionGuardada();
  clienteConsultas.clear();
  clienteConsultas.setDefaultOptions({
    queries: { retry: false, gcTime: Infinity },
    mutations: { retry: false },
  });
  misGrupos.mockReset().mockResolvedValue([]);
  grupoFalso
    .mockReset()
    .mockImplementation(async (id) => ({ id, nombre: GRUPO, codigo_invitacion: 'ABCDEFGH', color: 'AZUL', rol: 'MIEMBRO', miembros: 2 }));
  rankingFalso.mockReset().mockResolvedValue({ filas: [], incluyeSimulados: false });
  torneoFalso.mockReset().mockResolvedValue({
    nombre: 'Apertura 2026',
    jornadas: [
      { id: 11, orden: 1, nombre: 'Jornada 1' },
      { id: 12, orden: 2, nombre: 'Jornada 2' },
    ],
    ordenActual: 2,
  });
  partidosFalsos.mockReset().mockResolvedValue([partidoDeJornada]);
  prediccionesFalsas.mockReset().mockResolvedValue([]);
  crearFalso.mockReset().mockResolvedValue(1);
  unirseFalso.mockReset().mockResolvedValue({ grupoId: 1, yaEraMiembro: false });
  salirFalso.mockReset().mockResolvedValue(undefined);
  editarFalso.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  clienteConsultas.clear();
  jest.restoreAllMocks();
});

async function abrir(url: string) {
  process.env.EXPO_ROUTER_IMPORT_MODE = 'sync';
  await render(<ExpoRoot context={getMockContext('src/app')} location={url} />);
}

async function tocar(nombre: string) {
  await fireEvent.press(await screen.findByRole('button', { name: nombre }));
}

async function escribir(etiqueta: string, texto: string) {
  await fireEvent.changeText(await screen.findByLabelText(etiqueta), texto);
}

/** Confirma el `Alert` de salir tocando su botón "Salir". */
function confirmarAlerta() {
  const alerta = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, botones?: AlertButton[]) => {
    botones?.find((b) => b.text === 'Salir')?.onPress?.();
  });
  return alerta;
}

const miGrupo = (extra: Partial<MiGrupo>): MiGrupo => ({
  id: 1,
  nombre: GRUPO,
  miembros: 4,
  mi_posicion: 2,
  mi_posicion_antes: null,
  color: 'AZUL',
  lider_nombre: 'Ana',
  lider_es_yo: false,
  lideres: 1,
  ...extra,
});

describe('S04 Grupos', () => {
  it('F07 CA9, F26 R4: sin grupos muestra el vacío con las dos acciones', async () => {
    await abrir('/grupos');

    expect(await screen.findByText('Aún no estás en ningún grupo.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Crear grupo' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Unirse a un grupo' })).toBeOnTheScreen();
  });

  it('F26 CA7: tarjetas con ícono (color e inicial), miembros, posición y las 4 formas del líder', async () => {
    misGrupos.mockResolvedValue([
      miGrupo({ id: 1, nombre: 'oficina', color: 'ROJO', miembros: 1, lider_nombre: 'Ana' }),
      miGrupo({ id: 2, nombre: 'Primos', color: 'VERDE', mi_posicion: 1, lider_nombre: 'Yo', lider_es_yo: true }),
      miGrupo({ id: 3, nombre: '7 de copas', color: 'CAFE', mi_posicion: 1, lideres: 2 }),
      miGrupo({ id: 4, nombre: 'Nuevos', mi_posicion: 1, lider_nombre: null, lider_es_yo: null, lideres: null }),
    ]);
    await abrir('/grupos');

    expect(await screen.findByRole('button', { name: 'oficina, 1 miembro · Vas 2.º, Líder: Ana' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Primos, 4 miembros · Vas 1.º, Vas líder' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '7 de copas, 4 miembros · Vas 1.º, Empate en el 1.º' })).toBeOnTheScreen();
    // Sin puntos nadie es líder y "Vas 1.º" no dice nada: "Sin puntos aún".
    expect(screen.getByRole('button', { name: 'Nuevos, 4 miembros · Sin puntos aún' })).toBeOnTheScreen();

    const icono = screen.getByTestId('icono-grupo-ROJO');
    expect(icono).toHaveStyle({ backgroundColor: temaGrafito.paletaGrupo.ROJO.fondo });
    expect(within(icono).getByText('O')).toBeOnTheScreen();
    expect(within(screen.getByTestId('icono-grupo-CAFE')).getByText('7')).toBeOnTheScreen();
  });

  it('F26 CA7: tocar una tarjeta abre S08 con navigate', async () => {
    misGrupos.mockResolvedValue([miGrupo({ id: 3 })]);
    await abrir('/grupos');
    const navegar = jest.spyOn(router, 'navigate');

    await fireEvent.press(await screen.findByRole('button', { name: `${GRUPO}, 4 miembros · Vas 2.º, Líder: Ana` }));
    expect(navegar).toHaveBeenCalledWith({ pathname: '/grupo/[grupoId]', params: { grupoId: '3' } });
  });

  it.each([
    ['Crear grupo', '/grupos/nuevo'],
    ['Unirse a un grupo', '/grupos/unirse'],
  ])('F26 CA7: el "+" abre la hoja y "%s" navega a %s con navigate', async (opcion, ruta) => {
    misGrupos.mockResolvedValue([miGrupo({})]);
    await abrir('/grupos');
    const navegar = jest.spyOn(router, 'navigate');

    await tocar('Crear o unirse a un grupo');
    const hoja = await screen.findByTestId('hoja-grupos');
    expect(within(hoja).getByText('Con el código o escaneando el QR del grupo.')).toBeOnTheScreen();
    await fireEvent.press(within(hoja).getByRole('button', { name: opcion }));

    expect(navegar).toHaveBeenCalledWith(ruta);
    await waitFor(() => expect(screen.queryByTestId('hoja-grupos')).not.toBeOnTheScreen());
  });

  it('F07 CA9: un error al cargar ofrece reintentar', async () => {
    misGrupos.mockRejectedValueOnce(new ErrorDatos('Network request failed', true));
    await abrir('/grupos');

    expect(
      await screen.findByText('Sin conexión. Revisa tu internet e inténtalo de nuevo.'),
    ).toBeOnTheScreen();
    await tocar('Reintentar');
    expect(await screen.findByText('Aún no estás en ningún grupo.')).toBeOnTheScreen();
  });
});

describe('S15 Editar grupo (F26 R6)', () => {
  const comoAdmin = () =>
    grupoFalso.mockImplementation(async (id) => ({
      id,
      nombre: GRUPO,
      codigo_invitacion: 'ABCDEFGH',
      color: 'AZUL',
      rol: 'ADMIN',
      miembros: 2,
    }));

  it('F26 CA8: un MIEMBRO no ve "Editar" en S08', async () => {
    await abrir('/grupo/1');
    expect(await screen.findByRole('header', { name: GRUPO })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Editar grupo' })).not.toBeOnTheScreen();
  });

  it('F26 CA8: el ADMIN ve "Editar" en S08 y abre S15', async () => {
    comoAdmin();
    await abrir('/grupo/1');
    await tocar('Editar grupo');
    expect(await screen.findByRole('header', { name: 'Editar grupo' })).toBeOnTheScreen();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });

  it('F26 CA8: sin cambios "Guardar" está deshabilitado; el color elegido lleva check y se guarda', async () => {
    comoAdmin();
    await abrir('/grupos/editar/1');

    const guardar = await screen.findByRole('button', { name: 'Guardar' });
    expect(guardar).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Azul' })).toBeSelected();
    expect(within(screen.getByRole('radio', { name: 'Azul' })).getByTestId('icono-check')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('radio', { name: 'Rojo' }));
    expect(screen.getByRole('radio', { name: 'Rojo' })).toBeSelected();
    expect(screen.getByRole('radio', { name: 'Azul' })).not.toBeSelected();
    expect(screen.getByTestId('icono-grupo-ROJO')).toBeOnTheScreen();

    await escribir('Nombre del grupo', '  Los Compas  ');
    await tocar('Guardar');
    expect(editarFalso).toHaveBeenCalledWith(1, 'Los Compas', 'ROJO');
    // Se cierra el modal y queda S08.
    await waitFor(() => expect(screen.queryByRole('header', { name: 'Editar grupo' })).not.toBeOnTheScreen());
  });

  it('F26 CA8: un nombre inválido deshabilita "Guardar" y lo dice bajo el campo', async () => {
    comoAdmin();
    await abrir('/grupos/editar/1');

    await escribir('Nombre del grupo', 'ab');
    expect(await screen.findByText('Escribe un nombre de 3 a 30 caracteres.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });

  it.each([
    ['NO_ADMIN', new ErrorGrupo('NO_ADMIN'), 'Solo el administrador puede editar el grupo.'],
    ['NOMBRE_INVALIDO', new ErrorGrupo('NOMBRE_INVALIDO'), 'Escribe un nombre de 3 a 30 caracteres.'],
    ['COLOR_INVALIDO', new ErrorGrupo('COLOR_INVALIDO'), 'Elige un color de la paleta.'],
    ['NO_MIEMBRO', new ErrorGrupo('NO_MIEMBRO'), 'No perteneces a este grupo.'],
    ['sin conexión', new ErrorDatos('Network request failed', true), 'Sin conexión. Revisa tu internet e inténtalo de nuevo.'],
    ['una falla', new Error('boom'), 'No se pudo guardar. Inténtalo de nuevo.'],
  ])('F26 CA8: con %s del servidor muestra su texto y conserva lo escrito', async (_caso, error, texto) => {
    comoAdmin();
    editarFalso.mockRejectedValueOnce(error);
    await abrir('/grupos/editar/1');

    await escribir('Nombre del grupo', 'Otro nombre');
    await tocar('Guardar');
    expect(await screen.findByText(texto)).toBeOnTheScreen();
    expect(screen.getByDisplayValue('Otro nombre')).toBeOnTheScreen();
  });

  it('F26 R6: un MIEMBRO que abre S15 ve que solo el administrador puede editar', async () => {
    await abrir('/grupos/editar/1');

    expect(await screen.findByText('Solo el administrador puede editar el grupo.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeOnTheScreen();
  });
});

describe('S05 Crear grupo', () => {
  it.each(['ab', '     '])('F07 CA9: "%s" se rechaza sin llamar al servidor', async (nombre) => {
    await abrir('/grupos/nuevo');

    await escribir('Nombre del grupo', nombre);
    await tocar('Crear grupo');

    if (nombre.trim() === '') {
      expect(screen.getByRole('button', { name: 'Crear grupo' })).toBeDisabled();
    } else {
      expect(await screen.findByText('Escribe un nombre de 3 a 30 caracteres.')).toBeOnTheScreen();
    }
    expect(crearFalso).not.toHaveBeenCalled();
  });

  it('F07 CA9: envía el nombre recortado', async () => {
    await abrir('/grupos/nuevo');

    await escribir('Nombre del grupo', '  Amigos  ');
    await tocar('Crear grupo');

    await waitFor(() => expect(crearFalso).toHaveBeenCalledTimes(1));
    expect(crearFalso.mock.calls[0]?.[0]).toBe('Amigos');
  });

  it('F07 CA9: con el límite de grupos muestra su texto y conserva lo escrito', async () => {
    crearFalso.mockRejectedValue(new ErrorGrupo('LIMITE_GRUPOS'));
    await abrir('/grupos/nuevo');

    await escribir('Nombre del grupo', 'Amigos');
    await tocar('Crear grupo');

    expect(
      await screen.findByText('Ya estás en 10 grupos; sal de uno para crear otro.'),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Nombre del grupo')).toHaveDisplayValue('Amigos');
  });

  it('F07 CA9: sin conexión lo dice y conserva lo escrito', async () => {
    crearFalso.mockRejectedValue(new ErrorDatos('Network request failed', true));
    await abrir('/grupos/nuevo');

    await escribir('Nombre del grupo', 'Amigos');
    await tocar('Crear grupo');

    expect(
      await screen.findByText('Sin conexión. Revisa tu internet e inténtalo de nuevo.'),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Nombre del grupo')).toHaveDisplayValue('Amigos');
  });
});

describe('S06 Unirse a un grupo', () => {
  it('F07 CA9: un código mal escrito se rechaza sin llamar al servidor', async () => {
    await abrir('/grupos/unirse');

    await escribir('Código del grupo', 'ABCD-EFGO');
    await tocar('Unirse');

    expect(
      await screen.findByText('El código tiene 8 letras y números, como ABCD-EFGH.'),
    ).toBeOnTheScreen();
    expect(unirseFalso).not.toHaveBeenCalled();
  });

  it('F07 CA9: el código se escribe en mayúsculas y se envía canónico', async () => {
    await abrir('/grupos/unirse');

    await escribir('Código del grupo', 'abcd-efgh');
    expect(screen.getByLabelText('Código del grupo')).toHaveDisplayValue('ABCD-EFGH');
    await tocar('Unirse');

    await waitFor(() => expect(unirseFalso).toHaveBeenCalledTimes(1));
    expect(unirseFalso.mock.calls[0]?.[0]).toBe('ABCDEFGH');
  });

  it.each([
    ['CODIGO_NO_EXISTE', 'No encontramos un grupo con ese código.'],
    ['GRUPO_LLENO', 'Ese grupo ya tiene 30 miembros.'],
    ['LIMITE_GRUPOS', 'Ya estás en 10 grupos; sal de uno para unirte a otro.'],
  ] as const)('F07 CA9: %s muestra su texto y conserva lo escrito', async (codigo, texto) => {
    unirseFalso.mockRejectedValue(new ErrorGrupo(codigo));
    await abrir('/grupos/unirse');

    await escribir('Código del grupo', 'ABCD-EFGH');
    await tocar('Unirse');

    expect(await screen.findByText(texto)).toBeOnTheScreen();
    expect(screen.getByLabelText('Código del grupo')).toHaveDisplayValue('ABCD-EFGH');
  });

  it('F07 R4: si ya era miembro abre el grupo con el aviso', async () => {
    unirseFalso.mockResolvedValue({ grupoId: 3, yaEraMiembro: true });
    await abrir('/grupos/unirse');

    await escribir('Código del grupo', 'ABCDEFGH');
    await tocar('Unirse');

    expect(await screen.findByRole('header', { name: GRUPO })).toBeOnTheScreen();
    expect(screen.getByText('Ya eras miembro de este grupo.')).toBeOnTheScreen();
    expect(grupoFalso).toHaveBeenCalledWith(3);
  });

  it('con `codigo` en la ruta el campo aparece lleno (F12)', async () => {
    await abrir('/grupos/unirse?codigo=abcd-efgh');

    expect(await screen.findByLabelText('Código del grupo')).toHaveDisplayValue('ABCD-EFGH');
    expect(unirseFalso).not.toHaveBeenCalled();
  });

  it('"Escanear QR" abre S07', async () => {
    await abrir('/grupos/unirse');

    await tocar('Escanear QR');

    expect(await screen.findByRole('header', { name: 'Escanear QR' })).toBeOnTheScreen();
  });
});

describe('S08 Grupo', () => {
  it('F08 CA9: ranking del torneo en una sola llamada, con mi fila resaltada y el código', async () => {
    rankingFalso.mockResolvedValue({
      filas: [
        fila({ usuario_id: 'a', posicion: 1, nombre: 'Ana', puntos_total: 500 }),
        fila({ usuario_id: 'b', posicion: 2, nombre: 'Beto', puntos_total: 300, es_yo: true }),
      ],
      incluyeSimulados: false,
    });
    await abrir('/grupo/1');

    expect(await screen.findByLabelText('1.º, Ana, 500 puntos')).toBeOnTheScreen();
    expect(screen.getByLabelText('2.º, Beto, tú, 300 puntos')).toHaveStyle({
      backgroundColor: coloresGrafito.superficie2,
    });
    expect(screen.getByLabelText('1.º, Ana, 500 puntos')).toHaveStyle({ backgroundColor: 'transparent' });
    expect(screen.getByRole('tab', { name: 'Ranking' })).toBeSelected();
    expect(screen.queryByRole('tab', { name: 'Torneo' })).not.toBeOnTheScreen();
    expect(screen.getByText('Base + bono de la IA. Desempate: marcadores exactos y bono.')).toBeOnTheScreen();
    expect(screen.queryByText('Incluye partidos simulados')).not.toBeOnTheScreen();
    expect(screen.getByText('2 de 30 miembros')).toBeOnTheScreen();
    expect(rankingFalso).toHaveBeenCalledTimes(1);
    expect(rankingFalso).toHaveBeenCalledWith(1, null);
  });

  it('F08 CA9: la nota de simulados aparece solo con incluye_simulados', async () => {
    rankingFalso.mockResolvedValue({
      filas: [fila({ usuario_id: 'a', puntos_total: 100, incluye_simulados: true })],
      incluyeSimulados: true,
    });
    await abrir('/grupo/1');

    expect(await screen.findByText('Incluye partidos simulados')).toBeOnTheScreen();
  });

  it('F08 CA9: sin puntos aún, los miembros con 0 y el aviso', async () => {
    rankingFalso.mockResolvedValue({
      filas: [fila({ usuario_id: 'a', nombre: 'Ana' }), fila({ usuario_id: 'b', nombre: 'Beto' })],
      incluyeSimulados: false,
    });
    await abrir('/grupo/1');

    expect(await screen.findByText('Aún no hay partidos calificados en este torneo.')).toBeOnTheScreen();
    expect(screen.getByLabelText('1.º, Ana, 0 puntos')).toBeOnTheScreen();
  });

  it('F08 CA9: la vista Jornada abre la actual y cambiar de jornada no agrega historial (D78)', async () => {
    await abrir('/grupo/1');
    await fireEvent.press(await screen.findByRole('tab', { name: 'Jornada' }));

    expect(await screen.findByRole('header', { name: 'Jornada 2' })).toBeOnTheScreen();
    await waitFor(() => expect(rankingFalso).toHaveBeenLastCalledWith(1, 12));
    expect(screen.getByText('Aún no hay partidos calificados en esta jornada.')).toBeOnTheScreen();

    await tocar('Jornada anterior');
    expect(await screen.findByRole('header', { name: 'Jornada 1' })).toBeOnTheScreen();
    await waitFor(() => expect(rankingFalso).toHaveBeenLastCalledWith(1, 11));
    expect(screen.queryAllByRole('header', { name: GRUPO, includeHiddenElements: true })).toHaveLength(1);

    await fireEvent.press(screen.getByRole('tab', { name: 'Ranking' }));
    await waitFor(() => expect(rankingFalso).toHaveBeenLastCalledWith(1, null));
    expect(screen.queryAllByRole('header', { name: GRUPO, includeHiddenElements: true })).toHaveLength(1);
  });

  it('F08 Estados: una jornada sin partidos lo dice con el selector activo', async () => {
    partidosFalsos.mockResolvedValue([]);
    await abrir('/grupo/1?vista=jornada');

    expect(await screen.findByText('Esta jornada no tiene partidos.')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Jornada 2' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Jornada anterior' })).toBeEnabled();
  });

  it('F08 Estados: un torneo sin jornadas no se queda cargando', async () => {
    torneoFalso.mockResolvedValue({ nombre: 'Apertura 2026', jornadas: [], ordenActual: null });
    await abrir('/grupo/1?vista=jornada');

    expect(await screen.findByText('Esta jornada no tiene partidos.')).toBeOnTheScreen();
    expect(screen.queryByTestId('ranking-cargando')).not.toBeOnTheScreen();
  });

  it('F08 CA9: `?vista=jornada&jornada=1` abre esa jornada', async () => {
    await abrir('/grupo/1?vista=jornada&jornada=1');

    expect(await screen.findByRole('header', { name: 'Jornada 1' })).toBeOnTheScreen();
    await waitFor(() => expect(rankingFalso).toHaveBeenCalledWith(1, 11));
  });

  it('F08 Estados: sin torneo actual lo dice', async () => {
    rankingFalso.mockRejectedValue(new ErrorGrupo('SIN_TORNEO_ACTUAL'));
    await abrir('/grupo/1');

    expect(await screen.findByText('No hay un torneo en curso.')).toBeOnTheScreen();
  });

  it('F08 CA9: un error de red ofrece reintentar', async () => {
    rankingFalso.mockRejectedValueOnce(new ErrorDatos('Network request failed', true));
    await abrir('/grupo/1');

    expect(await screen.findByText('Sin conexión. Revisa tu internet e inténtalo de nuevo.')).toBeOnTheScreen();
    await tocar('Reintentar');
    expect(await screen.findByText('Aún no hay partidos calificados en este torneo.')).toBeOnTheScreen();
  });

  it('F08 CA6: si el ranking responde NO_MIEMBRO, la pantalla lo dice', async () => {
    rankingFalso.mockRejectedValue(new ErrorGrupo('NO_MIEMBRO'));
    await abrir('/grupo/1');

    expect(await screen.findByText('No perteneces a este grupo.')).toBeOnTheScreen();
  });

  it('F07 CA9: si no soy miembro lo dice y ofrece ir a Grupos', async () => {
    grupoFalso.mockResolvedValue(null);
    await abrir('/grupo/9');

    expect(await screen.findByText('No perteneces a este grupo.')).toBeOnTheScreen();
    await tocar('Ir a Grupos');
    expect(await screen.findByRole('header', { name: 'Grupos' })).toBeOnTheScreen();
  });

  it('F07 R5: salir pide confirmación y regresa a Grupos', async () => {
    const alerta = confirmarAlerta();
    await abrir('/grupo/1?pestana=miembros');

    await tocar('Salir del grupo');

    expect(alerta).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(salirFalso).toHaveBeenCalledWith(1));
    expect(await screen.findByRole('header', { name: 'Grupos' })).toBeOnTheScreen();
  });

  it('F07 R5: si salir falla lo dice y se queda en el grupo', async () => {
    confirmarAlerta();
    salirFalso.mockRejectedValue(new ErrorDatos('boom', false));
    await abrir('/grupo/1?pestana=miembros');

    await tocar('Salir del grupo');

    expect(await screen.findByText('No pudimos sacarte del grupo. Inténtalo de nuevo.')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: GRUPO })).toBeOnTheScreen();
  });
});

describe('S03, "En tus grupos" (F07 R7)', () => {
  beforeEach(() => {
    misGrupos.mockResolvedValue([{ id: 1, nombre: GRUPO, miembros: 3, mi_posicion: 1, mi_posicion_antes: null, color: 'AZUL', lider_nombre: null, lider_es_yo: null, lideres: null }]);
  });

  it('F07 CA10: cerrado, una fila por persona con su predicción y su análisis', async () => {
    prediccionesFalsas.mockResolvedValue([
      ajena({ usuario_id: 'a', nombre: 'Ana', marcador_local: 2, marcador_visitante: 1, justificacion: 'Puebla presiona.' }),
      ajena({ usuario_id: 'b', nombre: 'Beto', resultado: 'EMPATE', rango_goles: 'G2' }),
    ]);
    await abrir('/partido/7');

    expect(await screen.findByText('En tus grupos')).toBeOnTheScreen();
    expect(await screen.findAllByTestId('prediccion-del-grupo')).toHaveLength(2);
    expect(screen.getByText('Marcador exacto: Puebla 2 - 1 Santos')).toBeOnTheScreen();
    expect(screen.getByText('Puebla presiona.')).toBeOnTheScreen();
    expect(screen.getByText('Resultado: Empate')).toBeOnTheScreen();
    expect(screen.getByText('Goles en total: 2')).toBeOnTheScreen();
    expect(prediccionesFalsas).toHaveBeenCalledWith(7);
  });

  it('F07 CA10: si nadie más predijo, lo dice', async () => {
    await abrir('/partido/7');

    expect(await screen.findByText('Nadie de tus grupos predijo este partido.')).toBeOnTheScreen();
  });

  it('F07 CA10: sin grupos, la sección no se muestra', async () => {
    misGrupos.mockResolvedValue([]);
    await abrir('/partido/7');

    expect(await screen.findByRole('header', { name: 'Puebla 1, Santos 0' })).toBeOnTheScreen();
    expect(screen.queryByText('En tus grupos')).not.toBeOnTheScreen();
    expect(prediccionesFalsas).not.toHaveBeenCalled();
  });

  it('F07 CA10: antes del cierre, la sección no se muestra ni se pide', async () => {
    const cierre = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    partidoFalso.mockResolvedValueOnce({
      id: 7,
      inicio: cierre,
      cierre_predicciones: cierre,
      estado: 'PROGRAMADO',
      es_simulado: false,
      goles_local: null,
      goles_visitante: null,
      local: { nombre_corto: 'Puebla', escudo_url: 'https://x.mx/l.png', color_primario: null, color_texto: null },
      visitante: { nombre_corto: 'Santos', escudo_url: 'https://x.mx/v.png', color_primario: null, color_texto: null },
    });
    await abrir('/partido/7');

    expect(await screen.findByRole('button', { name: 'Guardar predicción' })).toBeOnTheScreen();
    expect(screen.queryByText('En tus grupos')).not.toBeOnTheScreen();
    expect(prediccionesFalsas).not.toHaveBeenCalled();
  });
});
