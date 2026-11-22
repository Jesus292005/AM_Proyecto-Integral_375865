// T100: sección "Tu carta" de S09 (F20 R3, R7, R8, CA3) y su lectura (R5).
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { ExpoRoot } from 'expo-router';
import { getMockContext } from 'expo-router/testing-library';
import { StyleSheet } from 'react-native';

import { clienteConsultas } from '../datos/clienteConsultas';
import { ErrorDatos } from '../datos/errores';
import { simularSesionGuardada } from '../pruebas/supabaseFalso';
import { temaGrafito } from '../tema/tokens';
import { cartaDePrueba, equiposDePrueba, perfilDePrueba } from './__mocks__/datos';
import { obtenerMiCarta, obtenerMiPerfil } from './datos';

jest.mock('../supabase/cliente');
jest.mock('./datos');
jest.mock('../grupos/datos');

const cartaFalsa = obtenerMiCarta as jest.MockedFunction<typeof obtenerMiCarta>;
const perfilFalso = obtenerMiPerfil as jest.MockedFunction<typeof obtenerMiPerfil>;

const oro = cartaDePrueba({
  calificadas: 12,
  precision: 89,
  punteria: 67,
  analisis: 81,
  constancia: 99,
  media: 84,
  nivel: 'ORO',
});

beforeEach(() => {
  simularSesionGuardada();
  clienteConsultas.clear();
  clienteConsultas.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } });
  cartaFalsa.mockReset().mockResolvedValue(oro);
  perfilFalso
    .mockReset()
    .mockResolvedValue(perfilDePrueba({ nombre: 'Chucho', equipo: equiposDePrueba[0] ?? null }));
});

afterEach(() => clienteConsultas.clear());

async function abrirPerfil() {
  process.env.EXPO_ROUTER_IMPORT_MODE = 'sync';
  await render(<ExpoRoot context={getMockContext('src/app')} location="/perfil" />);
}

describe('Tu carta (F20)', () => {
  it('F20 CA3: muestra media, nivel en texto, nombre, escudo y los 4 atributos sobre el metal', async () => {
    await abrirPerfil();

    const carta = await screen.findByTestId('carta');
    expect(screen.getByTestId('carta-media').props.accessibilityLabel).toBe('Tu carta: media 84, nivel Oro');
    expect(within(carta).getByText('84')).toBeOnTheScreen();
    expect(within(carta).getByText('Oro')).toBeOnTheScreen();
    expect(within(carta).getByText('Chucho')).toBeOnTheScreen();
    expect(within(carta).getByTestId('escudo-imagen')).toBeOnTheScreen();
    expect(within(carta).getByTestId('degradado-metal')).toBeOnTheScreen();
    for (const [nombre, valor] of [
      ['Precisión', 89],
      ['Puntería', 67],
      ['Análisis', 81],
      ['Constancia', 99],
    ] as const) {
      expect(screen.getByRole('button', { name: `${nombre}: ${valor}` })).toBeOnTheScreen();
    }
    // El texto sobre el metal usa su color "texto encima" (05-ui §2).
    expect(StyleSheet.flatten(within(carta).getByText('84').props.style).color).toBe(
      temaGrafito.metales.oro.texto,
    );
  });

  it('F20 R7: un nombre largo sin espacios va en un renglón y se reduce para caber', async () => {
    perfilFalso.mockResolvedValue(perfilDePrueba({ nombre: 'Masturbinho' }));
    await abrirPerfil();

    const nombre = await screen.findByTestId('carta-nombre');
    expect(nombre.props.numberOfLines).toBe(1);
    expect(nombre.props.adjustsFontSizeToFit).toBe(true);
    expect(screen.getByTestId('perfil-nombre').props.numberOfLines).toBe(1);
  });

  it('F20 R7: un nombre con espacios puede usar dos renglones', async () => {
    perfilFalso.mockResolvedValue(perfilDePrueba({ nombre: 'El Chucho' }));
    await abrirPerfil();

    expect((await screen.findByTestId('carta-nombre')).props.numberOfLines).toBe(2);
  });

  it('F20 CA3: sin evaluaciones, ANA sale como "—"', async () => {
    cartaFalsa.mockResolvedValue({ ...oro, analisis: null, nivel: 'PLATA', media: 70 });
    await abrirPerfil();

    expect(await screen.findByRole('button', { name: 'Análisis: sin dato' })).toBeOnTheScreen();
    expect(within(screen.getByTestId('carta')).getByText('—')).toBeOnTheScreen();
    expect(within(screen.getByTestId('carta')).getByText('Plata')).toBeOnTheScreen();
  });

  it('F20 CA3: bloqueada dice cuántas faltan, sin metal ni media', async () => {
    cartaFalsa.mockResolvedValue(cartaDePrueba({ calificadas: 3 }));
    await abrirPerfil();

    const carta = await screen.findByTestId('carta-bloqueada');
    expect(within(carta).getByText('Te faltan 2 predicciones calificadas para tu carta.')).toBeOnTheScreen();
    expect(within(carta).queryByTestId('degradado-metal')).not.toBeOnTheScreen();
    expect(within(carta).getByText('—')).toBeOnTheScreen();
  });

  it('F20 CA3: con una sola faltante lo dice en singular', async () => {
    cartaFalsa.mockResolvedValue(cartaDePrueba({ calificadas: 4 }));
    await abrirPerfil();

    expect(await screen.findByText('Te falta 1 predicción calificada para tu carta.')).toBeOnTheScreen();
  });

  it('F20 CA3: "Incluye partidos simulados" solo si aplica', async () => {
    cartaFalsa.mockResolvedValue({ ...oro, incluye_simulados: true });
    await abrirPerfil();

    expect(await screen.findByText('Incluye partidos simulados')).toBeOnTheScreen();
  });

  it('F20 R8: tocar un atributo muestra su nombre y cómo se calcula', async () => {
    await abrirPerfil();

    await fireEvent.press(await screen.findByRole('button', { name: 'Constancia: 99' }));

    expect(
      screen.getByText('Constancia: Tu mejor racha de predicciones con puntos, hasta 10.'),
    ).toBeOnTheScreen();
  });

  it('estados: un error de la carta se reintenta sin romper el perfil', async () => {
    cartaFalsa.mockRejectedValueOnce(new ErrorDatos('boom', false));
    await abrirPerfil();

    expect(await screen.findByText('No pudimos cargar tu carta.')).toBeOnTheScreen();
    expect(screen.getByText('Racha')).toBeOnTheScreen();
    await fireEvent.press(screen.getAllByRole('button', { name: 'Reintentar' })[0]!);

    expect(await screen.findByTestId('carta')).toBeOnTheScreen();
  });

  it('estados: mientras carga, el esqueleto con forma de carta', async () => {
    cartaFalsa.mockReturnValue(new Promise(() => {}));
    await abrirPerfil();

    expect(await screen.findByTestId('carta-cargando')).toBeOnTheScreen();
  });
});
