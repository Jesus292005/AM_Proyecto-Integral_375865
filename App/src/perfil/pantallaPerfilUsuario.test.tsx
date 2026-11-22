// T129: S13 Perfil de otro usuario (F19 CA4, CA5). Corre la app completa con una sesión guardada;
// las lecturas del servidor se simulan.
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { ExpoRoot } from 'expo-router';
import { getMockContext } from 'expo-router/testing-library';

import { clienteConsultas } from '../datos/clienteConsultas';
import { ErrorDatos } from '../datos/errores';
import { obtenerRanking } from '../grupos/datos';
import { simularSesionGuardada } from '../pruebas/supabaseFalso';
import { marcarInsigniasVistas, type InsigniaDeVitrina } from './datos';
import {
  ErrorPerfilNoEncontrado,
  obtenerInsigniasDe,
  obtenerPerfilDe,
  type PerfilDeUsuario,
} from './datosUsuario';
import { perfilDeUsuarioDePrueba } from './__mocks__/datosUsuario';

jest.mock('../supabase/cliente');
jest.mock('./datos');
jest.mock('./datosUsuario');
jest.mock('../grupos/datos');
jest.mock('../inicio/datos');

const perfilFalso = obtenerPerfilDe as jest.MockedFunction<typeof obtenerPerfilDe>;
const insigniasFalsas = obtenerInsigniasDe as jest.MockedFunction<typeof obtenerInsigniasDe>;
const rankingFalso = obtenerRanking as jest.MockedFunction<typeof obtenerRanking>;
const marcarFalso = marcarInsigniasVistas as jest.MockedFunction<typeof marcarInsigniasVistas>;

const insignia = (extra: Partial<InsigniaDeVitrina>): InsigniaDeVitrina => ({
  codigo: 'TOP_JORNADA',
  nombre: 'Top de la jornada',
  descripcion: 'Queda 1.º del ranking de una jornada en un grupo de 3 o más.',
  nivel: 'ORO',
  icono: 'trofeo',
  repetible: true,
  orden: 6,
  veces: 0,
  nueva: false,
  ultima_en: null,
  ultima_simulada: null,
  ultimo_grupo: null,
  ultima_jornada: null,
  ...extra,
});

const conCarta = (extra: Partial<PerfilDeUsuario> = {}) =>
  perfilDeUsuarioDePrueba({
    equipo: { nombre_corto: 'Pumas', escudo_url: 'https://x.mx/3.png', color_primario: null, color_texto: null },
    racha: { racha_actual: 3, mejor_racha: 5, incluye_simulados: false, ultima_calificacion: '2026-11-20T20:00:00Z' },
    carta: {
      calificadas: 8,
      precision: 77,
      punteria: 60,
      analisis: 82,
      constancia: 70,
      media: 72,
      nivel: 'PLATA',
      incluye_simulados: false,
    },
    ...extra,
  });

beforeEach(() => {
  simularSesionGuardada();
  clienteConsultas.clear();
  clienteConsultas.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } });
  perfilFalso.mockReset().mockResolvedValue(perfilDeUsuarioDePrueba());
  insigniasFalsas.mockReset().mockResolvedValue([]);
  marcarFalso.mockClear();
});

afterEach(() => {
  clienteConsultas.clear();
  jest.restoreAllMocks();
});

async function abrir(url: string) {
  process.env.EXPO_ROUTER_IMPORT_MODE = 'sync';
  await render(<ExpoRoot context={getMockContext('src/app')} location={url} />);
}

describe('S13 Perfil de otro usuario (F19)', () => {
  it('F19 CA4: encabezado con equipo, carta, racha y Vitrina, sin Ajustes ni barra superior', async () => {
    perfilFalso.mockResolvedValue(conCarta());
    insigniasFalsas.mockResolvedValue([insignia({ veces: 2, ultima_en: '2026-11-20T20:00:00Z' })]);
    await abrir('/usuario/00000000-0000-0000-0000-0000000000a5');

    expect(await screen.findByRole('header', { name: 'Ana' })).toBeOnTheScreen();
    expect(perfilFalso).toHaveBeenCalledWith('00000000-0000-0000-0000-0000000000a5');
    expect(screen.getByText('Pumas')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Carta de Ana: media 72, nivel Plata' })).toBeOnTheScreen();
    expect(screen.getByLabelText('Racha actual: 3 aciertos seguidos')).toBeOnTheScreen();
    expect(screen.getByLabelText('Mejor racha: 5 aciertos seguidos')).toBeOnTheScreen();
    expect(screen.getByText('Cuenta sus predicciones con puntos, una tras otra. Un partido sin predecir no la rompe.')).toBeOnTheScreen();
    expect(await screen.findByRole('button', { name: 'Top de la jornada, ganada 2 veces' })).toBeOnTheScreen();

    // Solo lectura (R2): sin Ajustes, sin "Cerrar sesión" y sin la barra superior de F25.
    expect(screen.queryByText('Ajustes')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).not.toBeOnTheScreen();
    expect(screen.queryByText('Elige tu equipo')).not.toBeOnTheScreen();
    expect(screen.queryByTestId('barra-superior')).not.toBeOnTheScreen();
    expect(screen.queryByText('Así te ven en tus grupos.')).not.toBeOnTheScreen();
  });

  it('F19 CA4: sin equipo, carta bloqueada y sin racha, en tercera persona', async () => {
    perfilFalso.mockResolvedValue(perfilDeUsuarioDePrueba({ carta: { ...perfilDeUsuarioDePrueba().carta, calificadas: 3 } }));
    await abrir('/usuario/00000000-0000-0000-0000-0000000000a5');

    expect(await screen.findByText('Sin equipo favorito')).toBeOnTheScreen();
    expect(screen.getByText('Le faltan 2 predicciones calificadas para su carta.')).toBeOnTheScreen();
    expect(screen.getByText('Su racha empieza con su primer acierto.')).toBeOnTheScreen();
    expect(await screen.findByText('Su primera insignia llega con su primer acierto.')).toBeOnTheScreen();
  });

  it('F19 CA4: el detalle de una insignia dice cuántas veces la ganó, sin grupo ni jornada', async () => {
    insigniasFalsas.mockResolvedValue([insignia({ veces: 2, ultima_en: '2026-11-20T20:00:00Z', ultima_simulada: true })]);
    await abrir('/usuario/00000000-0000-0000-0000-0000000000a5');

    await fireEvent.press(await screen.findByRole('button', { name: 'Top de la jornada, ganada 2 veces' }));
    const detalle = await screen.findByTestId('detalle-insignia');
    expect(within(detalle).getByText('La ganó 2 veces')).toBeOnTheScreen();
    expect(within(detalle).getByText('Con un partido simulado')).toBeOnTheScreen();
    expect(within(detalle).queryByText(/Grupo|Jornada \d/)).not.toBeOnTheScreen();
  });

  it('F19 CA4: no anima ni marca como vistas las insignias de otro', async () => {
    insigniasFalsas.mockResolvedValue([insignia({ veces: 1, nueva: false })]);
    await abrir('/usuario/00000000-0000-0000-0000-0000000000a5');

    expect(await screen.findByTestId('insignia-TOP_JORNADA')).toBeOnTheScreen();
    expect(screen.queryByTestId(/^insignia-nueva-/)).not.toBeOnTheScreen();
    expect(marcarFalso).not.toHaveBeenCalled();
  });

  it('F19 CA4, R8: con mi propio id dice "Así te ven en tus grupos."', async () => {
    perfilFalso.mockResolvedValue(conCarta({ nombre: 'Jesús', esYo: true }));
    await abrir('/usuario/00000000-0000-0000-0000-0000000000f1');

    expect(await screen.findByText('Así te ven en tus grupos.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tu carta: media 72, nivel Plata' })).toBeOnTheScreen();
  });

  it('F19 CA5: NO_ENCONTRADO muestra que solo se ven los de compañeros de grupo y ofrece volver', async () => {
    perfilFalso.mockRejectedValue(new ErrorPerfilNoEncontrado());
    await abrir('/usuario/00000000-0000-0000-0000-0000000000a9');

    expect(
      await screen.findByText('No puedes ver este perfil: solo se ven los de tus compañeros de grupo.'),
    ).toBeOnTheScreen();
    // Un solo "Volver": el del encabezado o, sin historial, el del estado.
    expect(screen.getAllByRole('button', { name: 'Volver' })).toHaveLength(1);
  });

  it('F19 CA5: un id inválido no llama al servidor y dice lo mismo', async () => {
    await abrir('/usuario/no-es-un-id!');

    expect(
      await screen.findByText('No puedes ver este perfil: solo se ven los de tus compañeros de grupo.'),
    ).toBeOnTheScreen();
    expect(perfilFalso).not.toHaveBeenCalled();
  });

  it('F19 CA5: un error de red ofrece reintentar; la Vitrina falla por su lado', async () => {
    perfilFalso.mockRejectedValueOnce(new ErrorDatos('Network request failed', true));
    insigniasFalsas.mockRejectedValue(new ErrorDatos('boom', false));
    await abrir('/usuario/00000000-0000-0000-0000-0000000000a5');

    expect(await screen.findByText('Sin conexión. Revisa tu internet e inténtalo de nuevo.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('header', { name: 'Ana' })).toBeOnTheScreen();
    expect(await screen.findByText('No pudimos cargar su Vitrina.')).toBeOnTheScreen();
  });

  it('F19 CA5: tocar a un miembro en S08 abre S13 con el menú visible (D76)', async () => {
    rankingFalso.mockResolvedValue({
      filas: [
        {
          posicion: 1,
          usuario_id: '00000000-0000-0000-0000-0000000000a5',
          nombre: 'Ana',
          foto_url: null,
          puntos_total: 10,
          puntos_base: 10,
          puntos_bono: 0,
          marcadores_exactos: 0,
          es_yo: false,
          incluye_simulados: false,
          ultima_calificacion: null,
        },
      ],
      incluyeSimulados: false,
    });
    await abrir('/grupo/1?pestana=miembros');

    await fireEvent.press(await screen.findByRole('button', { name: '1.º, Ana' }));
    expect(await screen.findByRole('header', { name: 'Ana' })).toBeOnTheScreen();
    expect(perfilFalso).toHaveBeenCalledWith('00000000-0000-0000-0000-0000000000a5');
    expect(screen.getByRole('tab', { name: 'Grupos' })).toBeOnTheScreen();
  });
});
