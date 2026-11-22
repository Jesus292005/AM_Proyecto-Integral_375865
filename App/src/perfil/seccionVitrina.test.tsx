// T101: Vitrina de S09 (F14 R2, R6, R7, CA4) y su lectura (R8).
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { ExpoRoot } from 'expo-router';
import { getMockContext } from 'expo-router/testing-library';
import { Animated } from 'react-native';

import { clienteConsultas } from '../datos/clienteConsultas';
import { ErrorDatos } from '../datos/errores';
import { formatearDia } from '../formato/fechas';
import { simularSesionGuardada } from '../pruebas/supabaseFalso';
import { temaGrafito } from '../tema/tokens';
import { vitrinaDePrueba } from './__mocks__/datos';
import { marcarInsigniasVistas, obtenerMisInsignias } from './datos';

jest.mock('../supabase/cliente');
jest.mock('./datos');
jest.mock('../grupos/datos');

const vitrinaFalsa = obtenerMisInsignias as jest.MockedFunction<typeof obtenerMisInsignias>;
const marcarFalso = marcarInsigniasVistas as jest.MockedFunction<typeof marcarInsigniasVistas>;

const GANADA_EN = '2026-11-20T03:00:00Z';

beforeEach(() => {
  simularSesionGuardada();
  clienteConsultas.clear();
  clienteConsultas.setDefaultOptions({
    queries: { retry: false, gcTime: Infinity },
    mutations: { retry: false },
  });
  vitrinaFalsa.mockReset().mockResolvedValue(vitrinaDePrueba());
  marcarFalso.mockReset().mockResolvedValue();
});

afterEach(() => clienteConsultas.clear());

async function abrirPerfil() {
  process.env.EXPO_ROUTER_IMPORT_MODE = 'sync';
  await render(<ExpoRoot context={getMockContext('src/app')} location="/perfil" />);
}

const insignia = (nombre: string | RegExp) => screen.getByRole('button', { name: nombre });

/** Animaciones celebratorias pedidas (05-ui §8: `celebracionMs` hacia 1); la navegación usa otras. */
const celebraciones = (espia: jest.SpyInstance) =>
  espia.mock.calls.filter(([, config]) => config?.duration === temaGrafito.medidas.celebracionMs && config?.toValue === 1).length;

describe('Vitrina (F14)', () => {
  it('F14 CA4: sin insignias, todo el catálogo bloqueado y el texto de inicio', async () => {
    await abrirPerfil();

    expect(await screen.findByText('Tu primera insignia llega con tu primer acierto.')).toBeOnTheScreen();
    expect(screen.getAllByRole('button', { name: /, bloqueada$/ })).toHaveLength(7);
    expect(screen.getAllByTestId('medalla-bloqueada')).toHaveLength(7);
  });

  it('F14 CA4: las ganadas llevan su metal y "×n" si se repiten; las demás, bloqueadas', async () => {
    vitrinaFalsa.mockResolvedValue(
      vitrinaDePrueba({
        PRIMER_ACIERTO: { veces: 1, ultima_en: GANADA_EN },
        TOP_JORNADA: { veces: 3, ultima_en: GANADA_EN },
      }),
    );
    await abrirPerfil();

    expect(await screen.findByRole('button', { name: 'Primer acierto, ganada' })).toBeOnTheScreen();
    const top = insignia('Top de la jornada, ganada 3 veces');
    expect(within(top).getByText('×3')).toBeOnTheScreen();
    expect(within(top).getByTestId('degradado-metal')).toBeOnTheScreen();
    expect(screen.getAllByTestId('medalla')).toHaveLength(2);
    expect(screen.getAllByTestId('medalla-bloqueada')).toHaveLength(5);
    expect(screen.queryByText('Tu primera insignia llega con tu primer acierto.')).not.toBeOnTheScreen();
  });

  it('F14 CA4: tocar una muestra cómo se gana y, si la tienes, cuándo, dónde y si fue simulada', async () => {
    vitrinaFalsa.mockResolvedValue(
      vitrinaDePrueba({
        TOP_JORNADA: {
          veces: 2,
          ultima_en: GANADA_EN,
          ultimo_grupo: 'Los compas',
          ultima_jornada: 'Jornada 17',
          ultima_simulada: true,
        },
      }),
    );
    await abrirPerfil();

    await fireEvent.press(await screen.findByRole('button', { name: 'Analista, bloqueada' }));
    expect(screen.getByText('Analista: Cómo ganar Analista.')).toBeOnTheScreen();

    await fireEvent.press(insignia('Top de la jornada, ganada 2 veces'));
    expect(
      screen.getByText(
        `Top de la jornada: Cómo ganar Top de la jornada. La última vez: ${formatearDia(new Date(GANADA_EN))} · Los compas · Jornada 17 · Simulada.`,
      ),
    ).toBeOnTheScreen();
  });

  it('F14 CA4: solo las nuevas se animan, y después se marcan vistas una sola vez', async () => {
    vitrinaFalsa
      .mockResolvedValueOnce(
        vitrinaDePrueba({
          PRIMER_ACIERTO: { veces: 1, nueva: true, ultima_en: GANADA_EN },
          ANALISTA: { veces: 1, nueva: false, ultima_en: GANADA_EN },
        }),
      )
      .mockResolvedValue(
        vitrinaDePrueba({
          PRIMER_ACIERTO: { veces: 1, nueva: false, ultima_en: GANADA_EN },
          ANALISTA: { veces: 1, nueva: false, ultima_en: GANADA_EN },
        }),
      );
    const animacion = jest.spyOn(Animated, 'timing');
    await abrirPerfil();

    // Una sola animación de 400 ms (la de la nueva; la otra ganada no se anima).
    await waitFor(() => expect(celebraciones(animacion)).toBe(1));
    await waitFor(() => expect(marcarFalso).toHaveBeenCalledTimes(1));
    // Después de marcarlas, la Vitrina se vuelve a pedir y ya no hay nuevas: no se marca otra vez.
    await waitFor(() => expect(vitrinaFalsa).toHaveBeenCalledTimes(2));
    expect(marcarFalso).toHaveBeenCalledTimes(1);
    expect(celebraciones(animacion)).toBe(1);
    animacion.mockRestore();
  });

  it('F14 CA4: una que llega nueva al volver a la pestaña también se anima antes de marcarse', async () => {
    const sinNuevas = vitrinaDePrueba({ PRIMER_ACIERTO: { veces: 1, ultima_en: GANADA_EN } });
    vitrinaFalsa
      .mockResolvedValueOnce(vitrinaDePrueba())
      .mockResolvedValueOnce(
        vitrinaDePrueba({ PRIMER_ACIERTO: { veces: 1, nueva: true, ultima_en: GANADA_EN } }),
      )
      .mockResolvedValue(sinNuevas);
    const animacion = jest.spyOn(Animated, 'timing');
    await abrirPerfil();
    await screen.findByText('Tu primera insignia llega con tu primer acierto.');
    expect(celebraciones(animacion)).toBe(0);

    // Sale a Grupos y vuelve: la Vitrina se pide de nuevo y ahora trae una nueva.
    await fireEvent.press(screen.getByRole('tab', { name: 'Grupos' }));
    await fireEvent.press(screen.getByRole('tab', { name: 'Perfil' }));

    await waitFor(() => expect(celebraciones(animacion)).toBe(1));
    await waitFor(() => expect(marcarFalso).toHaveBeenCalledTimes(1));
    animacion.mockRestore();
  });

  it('F14 R2: un ícono que la app no conoce se dibuja como trofeo', async () => {
    vitrinaFalsa.mockResolvedValue(
      vitrinaDePrueba({ ANALISTA: { veces: 1, icono: 'cohete', ultima_en: GANADA_EN } }),
    );
    await abrirPerfil();

    const analista = await screen.findByRole('button', { name: 'Analista, ganada' });
    expect(within(analista).getByTestId('icono-trofeo')).toBeOnTheScreen();
  });

  it('estados: un error de la Vitrina se reintenta sin romper el perfil', async () => {
    vitrinaFalsa.mockRejectedValueOnce(new ErrorDatos('Network request failed', true));
    await abrirPerfil();

    expect(await screen.findByText('Sin conexión. Revisa tu internet e inténtalo de nuevo.')).toBeOnTheScreen();
    expect(screen.getByText('Racha')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Tu primera insignia llega con tu primer acierto.')).toBeOnTheScreen();
  });

  it('estados: mientras carga, el esqueleto de la rejilla', async () => {
    vitrinaFalsa.mockReturnValue(new Promise(() => {}));
    await abrirPerfil();

    expect(await screen.findByTestId('vitrina-cargando')).toBeOnTheScreen();
  });
});
