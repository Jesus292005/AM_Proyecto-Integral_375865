// T125–T128: S08 con pestañas Ranking / Jornada / Miembros, el analista, el muro con reacciones,
// quién falta e invitar (F26 CA9, CA10). Corre la app completa con una sesión guardada; las
// lecturas y acciones del servidor se simulan.
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ExpoRoot, router } from 'expo-router';
import { getMockContext } from 'expo-router/testing-library';
import { Share } from 'react-native';

import { clienteConsultas } from '../datos/clienteConsultas';
import { ErrorDatos } from '../datos/errores';
import { obtenerPartidosDeJornada, obtenerTorneoActual, type PartidoDeLista } from '../partidos/datos';
import { simularSesionGuardada } from '../pruebas/supabaseFalso';
import {
  obtenerFaltan,
  obtenerFiguraDeJornada,
  obtenerMuro,
  obtenerRanking,
  obtenerRoles,
  reaccionar,
  type AnalisisDelMuro,
  type FiguraDeJornada,
  type FilaRanking,
} from './datos';
import { aplicarReaccion } from './MuroJornada';
import { pestanaDeRuta } from './PantallaGrupo';

jest.mock('../supabase/cliente');
jest.mock('./datos');
jest.mock('../inicio/datos');
jest.mock('../partido/datos');
jest.mock('../puntos/datos');
jest.mock('../partidos/datos', () => ({
  ...jest.requireActual<typeof import('../partidos/datos')>('../partidos/datos'),
  obtenerTorneoActual: jest.fn(),
  obtenerPartidosDeJornada: jest.fn(),
}));

const rankingFalso = obtenerRanking as jest.MockedFunction<typeof obtenerRanking>;
const muroFalso = obtenerMuro as jest.MockedFunction<typeof obtenerMuro>;
const reaccionarFalso = reaccionar as jest.MockedFunction<typeof reaccionar>;
const faltanFalso = obtenerFaltan as jest.MockedFunction<typeof obtenerFaltan>;
const rolesFalsos = obtenerRoles as jest.MockedFunction<typeof obtenerRoles>;
const figuraFalsa = obtenerFiguraDeJornada as jest.MockedFunction<typeof obtenerFiguraDeJornada>;
const torneoFalso = obtenerTorneoActual as jest.MockedFunction<typeof obtenerTorneoActual>;
const partidosFalsos = obtenerPartidosDeJornada as jest.MockedFunction<typeof obtenerPartidosDeJornada>;

const enUnDia = new Date(Date.now() + 86_400_000).toISOString();
const haceUnDia = new Date(Date.now() - 86_400_000).toISOString();
const local = { nombre_corto: 'Puebla', escudo_url: 'https://x.mx/l.png', color_primario: null, color_texto: null };
const visitante = { nombre_corto: 'Santos', escudo_url: 'https://x.mx/v.png', color_primario: null, color_texto: null };

const partidoDeJornada = (cierre: string): PartidoDeLista => ({
  id: 1,
  inicio: cierre,
  cierre_predicciones: cierre,
  estado: 'PROGRAMADO',
  goles_local: null,
  goles_visitante: null,
  local,
  visitante,
  es_simulado: false,
  predicho: false,
});

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

const analisis = (extra: Partial<AnalisisDelMuro> & { id: number }): AnalisisDelMuro => ({
  prediccionId: extra.id,
  partido: { id: 1, inicio: haceUnDia, estado: 'TERMINADO', goles_local: 2, goles_visitante: 1, local, visitante },
  autor: { usuario_id: 'b', nombre: 'Beto', foto_url: null, es_yo: false },
  prediccion: { resultado: null, rango_goles: null, marcador_local: 2, marcador_visitante: 0 },
  justificacion: 'Puebla presiona arriba.',
  evaluacion: { estado: 'EVALUADA', puntos_bono: 80, explicacion: 'Acertó la presión.' },
  esSimulada: false,
  reacciones: { BIEN_VISTO: 0, BUEN_ANALISIS: 0, LA_CLAVO: 0, ME_RIO: 0 },
  miReaccion: null,
  ...extra,
});

const figura = (extra: Partial<FiguraDeJornada> = {}): FiguraDeJornada => ({
  usuario_id: 'a',
  nombre: 'Ana',
  foto_url: null,
  es_yo: false,
  puntos_total: 360,
  puntos_base: 350,
  puntos_bono: 10,
  lideres: 1,
  jornada_nombre: 'Jornada 2',
  en_curso: false,
  incluye_simulados: false,
  analisis: {
    partido_id: 1,
    goles_local: 2,
    goles_visitante: 1,
    local,
    visitante,
    justificacion: 'Puebla gana por la banda.',
    bono: 10,
    explicacion: 'Poco verificable.',
  },
  ...extra,
});

let navegar: jest.SpyInstance;

beforeEach(() => {
  simularSesionGuardada();
  clienteConsultas.clear();
  clienteConsultas.setDefaultOptions({ queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } });
  rankingFalso.mockReset().mockResolvedValue({ filas: [], incluyeSimulados: false });
  muroFalso.mockReset().mockResolvedValue([]);
  reaccionarFalso.mockReset().mockResolvedValue(undefined);
  faltanFalso.mockReset().mockResolvedValue({ porMiembro: new Map(), abiertos: 0, jornada: 'Jornada 2' });
  rolesFalsos.mockReset().mockResolvedValue([]);
  figuraFalsa.mockReset().mockResolvedValue(null);
  torneoFalso.mockReset().mockResolvedValue({
    nombre: 'Apertura 2026',
    jornadas: [
      { id: 11, orden: 1, nombre: 'Jornada 1' },
      { id: 12, orden: 2, nombre: 'Jornada 2' },
    ],
    ordenActual: 2,
  });
  partidosFalsos.mockReset().mockResolvedValue([partidoDeJornada(haceUnDia)]);
  navegar = jest.spyOn(router, 'navigate').mockImplementation(() => {});
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

describe('S08 pestañas (F26 R7)', () => {
  it('F26 CA9: `pestana?` elige la pestaña y la ruta vieja `vista=jornada` abre Jornada', () => {
    expect(pestanaDeRuta(undefined, undefined)).toBe('ranking');
    expect(pestanaDeRuta('miembros', undefined)).toBe('miembros');
    expect(pestanaDeRuta(undefined, 'jornada')).toBe('jornada');
    expect(pestanaDeRuta('ranking', 'jornada')).toBe('ranking');
    expect(pestanaDeRuta('otra', 'torneo')).toBe('ranking');
  });

  it('F26 CA9: cambiar de pestaña usa setParams y no agrega historial (D78)', async () => {
    const parametros = jest.spyOn(router, 'setParams');
    await abrir('/grupo/1');

    await fireEvent.press(await screen.findByRole('tab', { name: 'Miembros' }));
    expect(parametros).toHaveBeenCalledWith({ pestana: 'miembros' });
    expect(await screen.findByRole('tab', { name: 'Miembros' })).toBeSelected();
    expect(screen.queryAllByRole('header', { name: 'Los del sillón', includeHiddenElements: true })).toHaveLength(1);
  });

  it('F26 CA9: `?vista=jornada` abre la pestaña Jornada', async () => {
    await abrir('/grupo/1?vista=jornada');

    expect(await screen.findByRole('tab', { name: 'Jornada' })).toBeSelected();
    expect(await screen.findByRole('header', { name: 'Jornada 2' })).toBeOnTheScreen();
  });

  it('F26 R7: el encabezado lleva el ícono del grupo y el número de miembros', async () => {
    await abrir('/grupo/1');

    expect(await screen.findByLabelText('Grupo Los del sillón')).toBeOnTheScreen();
    expect(screen.getByText('2 de 30 miembros')).toBeOnTheScreen();
  });
});

describe('S08 Jornada (F26 R9–R12)', () => {
  it('F26 CA9: figura, ranking de la jornada y muro agrupado por partido con sus notas', async () => {
    figuraFalsa.mockResolvedValue(figura());
    rankingFalso.mockResolvedValue({
      filas: [fila({ usuario_id: 'a', nombre: 'Ana', puntos_total: 190, ultima_calificacion: haceUnDia })],
      incluyeSimulados: false,
    });
    muroFalso.mockResolvedValue([
      analisis({ id: 1 }),
      analisis({
        id: 2,
        autor: { usuario_id: 'c', nombre: 'Caro', foto_url: null, es_yo: false },
        evaluacion: { estado: 'PENDIENTE', puntos_bono: null, explicacion: null },
      }),
      analisis({
        id: 3,
        partido: { id: 2, inicio: haceUnDia, estado: 'EN_JUEGO', goles_local: 0, goles_visitante: 0, local, visitante },
        autor: { usuario_id: 'd', nombre: 'Dani', foto_url: null, es_yo: false },
        evaluacion: { estado: 'ERROR', puntos_bono: null, explicacion: null },
      }),
    ]);
    await abrir('/grupo/1?pestana=jornada');

    expect(await screen.findByText('Figura de la jornada')).toBeOnTheScreen();
    expect(await screen.findByLabelText('360 puntos en la jornada: base 350 y bono 10')).toBeOnTheScreen();
    expect(screen.getByText('base 350 + bono 10')).toBeOnTheScreen();
    expect(screen.getByText('10/100')).toBeOnTheScreen();
    expect(screen.getByText('Puebla gana por la banda.')).toBeOnTheScreen();
    expect(screen.getByText('Ranking de la jornada')).toBeOnTheScreen();
    expect(await screen.findByLabelText('1.º, Ana, 190 puntos')).toBeOnTheScreen();
    await waitFor(() => expect(rankingFalso).toHaveBeenCalledWith(1, 12));
    expect(figuraFalsa).toHaveBeenCalledWith(1, 12);
    expect(muroFalso).toHaveBeenCalledWith(1, 12);

    expect(await screen.findByRole('button', { name: 'Puebla 2 - 1 Santos. Ver el partido' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Puebla 0 - 0 Santos · En juego. Ver el partido' })).toBeOnTheScreen();
    expect(screen.getAllByTestId('analisis-del-muro')).toHaveLength(3);
    expect(screen.getByText('80/100')).toBeOnTheScreen();
    expect(screen.getByText('Nota pendiente')).toBeOnTheScreen();
    expect(screen.getByText('Sin nota')).toBeOnTheScreen();
    expect(screen.getAllByText('Marcador exacto: Puebla 2 - 0 Santos').length).toBeGreaterThan(0);

    // El comentario de la IA se despliega.
    expect(screen.queryByText('Acertó la presión.')).not.toBeOnTheScreen();
    await tocar('Comentario de la IA');
    expect(screen.getByText('Acertó la presión.')).toBeOnTheScreen();
  });

  it('F26 R12: tocar el autor abre S13 y el partido abre S03, con navigate', async () => {
    muroFalso.mockResolvedValue([analisis({ id: 1 })]);
    await abrir('/grupo/1?pestana=jornada');

    await tocar('Ver el perfil de Beto');
    expect(navegar).toHaveBeenCalledWith({ pathname: '/usuario/[usuarioId]', params: { usuarioId: 'b' } });
    await tocar('Puebla 2 - 1 Santos. Ver el partido');
    expect(navegar).toHaveBeenCalledWith({ pathname: '/partido/[partidoId]', params: { partidoId: '1' } });
  });

  it('F26 CA9: antes del cierre el muro dice que los análisis se revelan al cierre', async () => {
    partidosFalsos.mockResolvedValue([partidoDeJornada(enUnDia)]);
    await abrir('/grupo/1?pestana=jornada');

    expect(await screen.findByText('Los análisis se revelan cuando cierra cada partido.')).toBeOnTheScreen();
  });

  it('F26 CA9: vacíos del muro y de la figura', async () => {
    await abrir('/grupo/1?pestana=jornada');

    expect(await screen.findByText('Nadie del grupo escribió un análisis en la Jornada 2.')).toBeOnTheScreen();
    expect(await screen.findByText('Aún no hay puntos en la Jornada 2.')).toBeOnTheScreen();
  });

  it('F26 CA9: la figura dice si hay empate, si sigue en curso y no muestra análisis si no tiene', async () => {
    figuraFalsa.mockResolvedValue(figura({ lideres: 3, en_curso: true, es_yo: true, analisis: null }));
    await abrir('/grupo/1?pestana=jornada');

    expect(await screen.findByText('Empatado en el 1.º con 2 más · Hasta ahora')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ver el perfil de Tú' })).toBeOnTheScreen();
    expect(screen.queryByText(/Su mejor análisis/)).not.toBeOnTheScreen();
  });

  it('F26 CA9: tocar a la figura abre S13 y su análisis abre S03', async () => {
    figuraFalsa.mockResolvedValue(figura());
    await abrir('/grupo/1?pestana=jornada');

    await tocar('Ver el perfil de Ana');
    expect(navegar).toHaveBeenCalledWith({ pathname: '/usuario/[usuarioId]', params: { usuarioId: 'a' } });
    await fireEvent.press(await screen.findByRole('button', { name: /^Su mejor análisis: 10 de 100/ }));
    expect(navegar).toHaveBeenCalledWith({ pathname: '/partido/[partidoId]', params: { partidoId: '1' } });
  });

  it('F26 CA9: una parte con error no rompe las otras y se puede reintentar', async () => {
    muroFalso.mockRejectedValueOnce(new ErrorDatos('boom', false));
    figuraFalsa.mockResolvedValue(figura());
    await abrir('/grupo/1?pestana=jornada');

    expect(await screen.findByText('No pudimos cargar los análisis. Inténtalo de nuevo.')).toBeOnTheScreen();
    expect(await screen.findByLabelText('360 puntos en la jornada: base 350 y bono 10')).toBeOnTheScreen();
    await tocar('Reintentar');
    expect(await screen.findByText('Nadie del grupo escribió un análisis en la Jornada 2.')).toBeOnTheScreen();
  });

  it('F26 CA9: cambiar de jornada usa setParams y pide las tres partes de esa jornada', async () => {
    await abrir('/grupo/1?pestana=jornada');
    await tocar('Jornada anterior');

    expect(await screen.findByRole('header', { name: 'Jornada 1' })).toBeOnTheScreen();
    await waitFor(() => expect(muroFalso).toHaveBeenLastCalledWith(1, 11));
    expect(figuraFalsa).toHaveBeenLastCalledWith(1, 11);
    expect(rankingFalso).toHaveBeenLastCalledWith(1, 11);
  });
});

describe('Reacciones (F26 R13, R14)', () => {
  it('F26 R14: aplicar una reacción pone, cambia y quita la mía', () => {
    const [base] = [analisis({ id: 1, reacciones: { BIEN_VISTO: 2, BUEN_ANALISIS: 0, LA_CLAVO: 0, ME_RIO: 1 } })];
    const puesta = aplicarReaccion([base], 1, 'BIEN_VISTO');
    expect(puesta[0]).toMatchObject({ miReaccion: 'BIEN_VISTO', reacciones: { BIEN_VISTO: 3, ME_RIO: 1 } });
    const cambiada = aplicarReaccion(puesta, 1, 'ME_RIO');
    expect(cambiada[0]).toMatchObject({ miReaccion: 'ME_RIO', reacciones: { BIEN_VISTO: 2, ME_RIO: 2 } });
    const quitada = aplicarReaccion(cambiada, 1, null);
    expect(quitada[0]).toMatchObject({ miReaccion: null, reacciones: { BIEN_VISTO: 2, ME_RIO: 1 } });
    expect(aplicarReaccion([base], 9, 'LA_CLAVO')).toEqual([base]);
  });

  it('F26 CA10: tocar una reacción llama una vez a reaccionar y la marca al instante; tocarla otra vez la quita', async () => {
    let muro = [analisis({ id: 5 })];
    muroFalso.mockImplementation(async () => muro);
    reaccionarFalso.mockImplementation(async (_g, prediccionId, tipo) => {
      muro = aplicarReaccion(muro, prediccionId, tipo);
    });
    await abrir('/grupo/1?pestana=jornada');

    await tocar('Bien visto, 0');
    expect(reaccionarFalso).toHaveBeenCalledTimes(1);
    expect(reaccionarFalso).toHaveBeenCalledWith(1, 5, 'BIEN_VISTO');
    expect(await screen.findByRole('button', { name: 'Bien visto, 1' })).toBeSelected();

    await tocar('Bien visto, 1');
    expect(reaccionarFalso).toHaveBeenLastCalledWith(1, 5, null);
    expect(await screen.findByRole('button', { name: 'Bien visto, 0' })).not.toBeSelected();
  });

  it('F26 CA10: se marca antes de que conteste el servidor y, si falla, vuelve como estaba y lo dice', async () => {
    muroFalso.mockResolvedValue([analisis({ id: 5 })]);
    let rechazar: (error: Error) => void = () => {};
    reaccionarFalso.mockImplementation(
      () =>
        new Promise<void>((_resolver, rechazo) => {
          rechazar = rechazo;
        }),
    );
    await abrir('/grupo/1?pestana=jornada');

    await tocar('La clavó, 0');
    // El servidor aún no contesta: la marca y el +1 ya se ven (actualización al instante).
    expect(await screen.findByRole('button', { name: 'La clavó, 1' })).toBeSelected();
    expect(reaccionarFalso).toHaveBeenCalledTimes(1);

    rechazar(new ErrorDatos('boom', false));
    expect(await screen.findByText('No se pudo guardar tu reacción.')).toBeOnTheScreen();
    expect(await screen.findByRole('button', { name: 'La clavó, 0' })).not.toBeSelected();
  });

  it('F26 CA10 (v1.1, D114): también se reacciona a mi análisis', async () => {
    muroFalso.mockResolvedValue([
      analisis({
        id: 5,
        autor: { usuario_id: 'yo', nombre: 'Jesús', foto_url: null, es_yo: true },
        reacciones: { BIEN_VISTO: 3, BUEN_ANALISIS: 0, LA_CLAVO: 0, ME_RIO: 0 },
      }),
    ]);
    await abrir('/grupo/1?pestana=jornada');

    expect(await screen.findByText('Tú')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Bien visto, 3' })).toBeEnabled();
    await fireEvent.press(screen.getByRole('button', { name: 'Bien visto, 3' }));
    expect(reaccionarFalso).toHaveBeenCalledWith(1, 5, 'BIEN_VISTO');
  });
});

describe('S08 Miembros (F26 R15–R17)', () => {
  beforeEach(() => {
    rankingFalso.mockResolvedValue({
      filas: [
        fila({ usuario_id: 'a', posicion: 1, nombre: 'Ana', puntos_total: 300 }),
        fila({ usuario_id: 'b', posicion: 2, nombre: 'Beto', es_yo: true }),
      ],
      incluyeSimulados: false,
    });
    rolesFalsos.mockResolvedValue([
      { usuario_id: 'a', rol: 'ADMIN' },
      { usuario_id: 'b', rol: 'MIEMBRO' },
    ]);
  });

  it('F26 CA10: posición, "Admin", "Al día" / "Le faltan n" y cuántos partidos hay abiertos', async () => {
    faltanFalso.mockResolvedValue({ porMiembro: new Map([['a', 0], ['b', 2]]), abiertos: 3, jornada: 'Jornada 2' });
    await abrir('/grupo/1?pestana=miembros');

    expect(await screen.findByRole('button', { name: '1.º, Ana, Admin, Al día' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '2.º, Beto, tú, Le faltan 2' })).toBeOnTheScreen();
    expect(screen.getByText('3 partidos abiertos en la Jornada 2')).toBeOnTheScreen();
    expect(screen.getByText('Al día')).toBeOnTheScreen();
    expect(screen.getByText('Le faltan 2')).toBeOnTheScreen();
  });

  it('F26 CA10: sin partidos abiertos no hay columna de quién falta', async () => {
    await abrir('/grupo/1?pestana=miembros');

    expect(await screen.findByText('No hay partidos abiertos en la Jornada 2')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '1.º, Ana, Admin' })).toBeOnTheScreen();
    expect(screen.queryByText('Al día')).not.toBeOnTheScreen();
  });

  it('F26 CA10: tocar un miembro abre S13 con navigate (también mi fila)', async () => {
    await abrir('/grupo/1?pestana=miembros');

    await tocar('1.º, Ana, Admin');
    expect(navegar).toHaveBeenCalledWith({ pathname: '/usuario/[usuarioId]', params: { usuarioId: 'a' } });
    await tocar('2.º, Beto, tú');
    expect(navegar).toHaveBeenCalledWith({ pathname: '/usuario/[usuarioId]', params: { usuarioId: 'b' } });
  });

  it('F26 R16: si falla quién falta, las filas siguen y se puede reintentar', async () => {
    faltanFalso.mockRejectedValueOnce(new ErrorDatos('boom', false));
    await abrir('/grupo/1?pestana=miembros');

    expect(await screen.findByText('No se pudo cargar quién falta.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: '1.º, Ana, Admin' })).toBeOnTheScreen();
    await tocar('Reintentar');
    expect(await screen.findByText('No hay partidos abiertos en la Jornada 2')).toBeOnTheScreen();
  });

  it('F26 CA10: "Compartir invitación" abre la hoja con el texto de R17 y el código canónico', async () => {
    const compartir = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
    await abrir('/grupo/1?pestana=miembros');

    expect(await screen.findByText('ABCD-EFGH')).toBeOnTheScreen();
    await tocar('Compartir invitación');
    expect(compartir).toHaveBeenCalledWith({
      message:
        'Únete a mi grupo «Los del sillón» en Campeón de Sillón. En la app ve a Grupos, toca + › Unirse a un grupo y escribe el código ABCD-EFGH.',
    });
    expect(screen.queryByText('No se pudo abrir la hoja para compartir.')).not.toBeOnTheScreen();
  });

  it('F26 R17: si la hoja no se puede abrir, lo dice', async () => {
    jest.spyOn(Share, 'share').mockRejectedValue(new Error('sin hoja'));
    await abrir('/grupo/1?pestana=miembros');

    await tocar('Compartir invitación');
    expect(await screen.findByText('No se pudo abrir la hoja para compartir.')).toBeOnTheScreen();
    expect(screen.getByTestId('qr-invitacion')).toBeOnTheScreen();
  });
});
