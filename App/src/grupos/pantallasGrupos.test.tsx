// T66–T67: S04, S05, S06, S08 y la sección "En tus grupos" de S03 (F07 CA9, CA10). Corre la app
// completa con una sesión guardada; las lecturas y acciones de grupos se simulan.
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ExpoRoot } from 'expo-router';
import { getMockContext } from 'expo-router/testing-library';
import { Alert, type AlertButton } from 'react-native';

import { clienteConsultas } from '../datos/clienteConsultas';
import { ErrorDatos } from '../datos/errores';
import { obtenerPartido } from '../partido/datos';
import { simularSesionGuardada } from '../pruebas/supabaseFalso';
import {
  crearGrupo,
  obtenerGrupo,
  obtenerMiembros,
  obtenerMisGrupos,
  obtenerPrediccionesDelGrupo,
  salirDeGrupo,
  unirseAGrupo,
  type Miembro,
  type PrediccionAjena,
} from './datos';
import { ErrorGrupo } from './errores';

jest.mock('../supabase/cliente');
jest.mock('./datos');
jest.mock('../partido/datos');
jest.mock('../puntos/datos');

const misGrupos = obtenerMisGrupos as jest.MockedFunction<typeof obtenerMisGrupos>;
const grupoFalso = obtenerGrupo as jest.MockedFunction<typeof obtenerGrupo>;
const miembrosFalsos = obtenerMiembros as jest.MockedFunction<typeof obtenerMiembros>;
const prediccionesFalsas = obtenerPrediccionesDelGrupo as jest.MockedFunction<
  typeof obtenerPrediccionesDelGrupo
>;
const crearFalso = crearGrupo as jest.MockedFunction<typeof crearGrupo>;
const unirseFalso = unirseAGrupo as jest.MockedFunction<typeof unirseAGrupo>;
const salirFalso = salirDeGrupo as jest.MockedFunction<typeof salirDeGrupo>;
const partidoFalso = obtenerPartido as jest.MockedFunction<typeof obtenerPartido>;

const GRUPO = 'Los del sillón';

const miembro = (extra: Partial<Miembro>): Miembro => ({
  usuario_id: 'u',
  nombre: 'Alguien',
  foto_url: null,
  rol: 'MIEMBRO',
  es_yo: false,
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
    .mockImplementation(async (id) => ({ id, nombre: GRUPO, codigo_invitacion: 'ABCDEFGH' }));
  miembrosFalsos.mockReset().mockResolvedValue([]);
  prediccionesFalsas.mockReset().mockResolvedValue([]);
  crearFalso.mockReset().mockResolvedValue(1);
  unirseFalso.mockReset().mockResolvedValue({ grupoId: 1, yaEraMiembro: false });
  salirFalso.mockReset().mockResolvedValue(undefined);
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

describe('S04 Grupos', () => {
  it('F07 CA9: sin grupos muestra el vacío con las dos acciones', async () => {
    await abrir('/grupos');

    expect(await screen.findByText('Aún no estás en ningún grupo.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Crear grupo' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Unirse con código' })).toBeOnTheScreen();
  });

  it('F07 CA9: lista mis grupos con su número de miembros', async () => {
    misGrupos.mockResolvedValue([
      { id: 2, nombre: 'Oficina', miembros: 1 },
      { id: 1, nombre: GRUPO, miembros: 4 },
    ]);
    await abrir('/grupos');

    expect(await screen.findByRole('button', { name: 'Oficina, 1 miembro' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: `${GRUPO}, 4 miembros` })).toBeOnTheScreen();
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

describe('S06 Unirse a grupo', () => {
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
  it('F07 R10: miembros con la marca Admin, yo resaltado y el código con guion', async () => {
    miembrosFalsos.mockResolvedValue([
      miembro({ usuario_id: 'a', nombre: 'Ana', rol: 'ADMIN' }),
      miembro({ usuario_id: 'b', nombre: 'Beto', es_yo: true }),
    ]);
    await abrir('/grupo/1');

    expect(await screen.findByLabelText('Ana, Admin')).toBeOnTheScreen();
    expect(screen.getByLabelText('Beto, tú')).toBeOnTheScreen();
    expect(screen.getByText('ABCD-EFGH')).toBeOnTheScreen();
    expect(screen.getByText('2 de 30 miembros')).toBeOnTheScreen();
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
    await abrir('/grupo/1');

    await tocar('Salir del grupo');

    expect(alerta).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(salirFalso).toHaveBeenCalledWith(1));
    expect(await screen.findByRole('header', { name: 'Grupos' })).toBeOnTheScreen();
  });

  it('F07 R5: si salir falla lo dice y se queda en el grupo', async () => {
    confirmarAlerta();
    salirFalso.mockRejectedValue(new ErrorDatos('boom', false));
    await abrir('/grupo/1');

    await tocar('Salir del grupo');

    expect(await screen.findByText('No pudimos sacarte del grupo. Inténtalo de nuevo.')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: GRUPO })).toBeOnTheScreen();
  });
});

describe('S03, "En tus grupos" (F07 R7)', () => {
  beforeEach(() => {
    misGrupos.mockResolvedValue([{ id: 1, nombre: GRUPO, miembros: 3 }]);
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
      local: { nombre_corto: 'Puebla', color_primario: null },
      visitante: { nombre_corto: 'Santos', color_primario: null },
    });
    await abrir('/partido/7');

    expect(await screen.findByRole('button', { name: 'Guardar predicción' })).toBeOnTheScreen();
    expect(screen.queryByText('En tus grupos')).not.toBeOnTheScreen();
    expect(prediccionesFalsas).not.toHaveBeenCalled();
  });
});
