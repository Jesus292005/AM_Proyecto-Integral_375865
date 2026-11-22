// T112–T113: bloques Mi última jornada, Mejor análisis y Mis grupos de S11 (F17 R9, R11, R12; CA7).
// Corre la app completa con una sesión guardada; los datos se simulan y la navegación se espía.
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { ExpoRoot, router } from 'expo-router';
import { getMockContext } from 'expo-router/testing-library';

import { clienteConsultas } from '../datos/clienteConsultas';
import { ErrorDatos } from '../datos/errores';
import { obtenerMisGrupos, type MiGrupo } from '../grupos/datos';
import { obtenerTorneoActual } from '../partidos/datos';
import { simularSesionGuardada } from '../pruebas/supabaseFalso';
import { mejorAnalisisDePrueba, ultimaJornadaDePrueba } from './__mocks__/datos';
import { cambioDePosicion } from './BloquesResultados';
import { obtenerMejorAnalisis, obtenerMiUltimaJornada } from './datos';

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

const ultimaFalsa = obtenerMiUltimaJornada as jest.MockedFunction<typeof obtenerMiUltimaJornada>;
const analisisFalso = obtenerMejorAnalisis as jest.MockedFunction<typeof obtenerMejorAnalisis>;
const gruposFalsos = obtenerMisGrupos as jest.MockedFunction<typeof obtenerMisGrupos>;
const torneoFalso = obtenerTorneoActual as jest.MockedFunction<typeof obtenerTorneoActual>;

const grupo = (cambios: Partial<MiGrupo> = {}): MiGrupo => ({
  id: 1,
  nombre: 'Los del sillón',
  miembros: 5,
  mi_posicion: 2,
  mi_posicion_antes: 4,
  ...cambios,
});

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
  ultimaFalsa.mockReset().mockResolvedValue(null);
  analisisFalso.mockReset().mockResolvedValue(null);
  gruposFalsos.mockReset().mockResolvedValue([]);
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

describe('cambio de posición (R9)', () => {
  it('F17 R9: menor número es mejor lugar; sin posición anterior, nada', () => {
    expect(cambioDePosicion(grupo({ mi_posicion: 2, mi_posicion_antes: 4 }))).toEqual({ tipo: 'subio', lugares: 2 });
    expect(cambioDePosicion(grupo({ mi_posicion: 3, mi_posicion_antes: 1 }))).toEqual({ tipo: 'bajo', lugares: 2 });
    expect(cambioDePosicion(grupo({ mi_posicion: 1, mi_posicion_antes: 1 }))).toEqual({ tipo: 'igual', lugares: 0 });
    expect(cambioDePosicion(grupo({ mi_posicion_antes: null }))).toBeNull();
    expect(cambioDePosicion(grupo({ mi_posicion: null }))).toBeNull();
  });
});

describe('bloque Mi última jornada (R9)', () => {
  it('F17 CA7: total, base + bono, nota del mejor análisis y "En curso"; la nota abre S03', async () => {
    ultimaFalsa.mockResolvedValue(
      ultimaJornadaDePrueba({ en_curso: true, puntos_base: 450, puntos_bono: 70, puntos_total: 520, bonos_pendientes: 1 }),
    );
    await abrir();

    const bloque = await screen.findByTestId('bloque-ultima-jornada');
    expect(await within(bloque).findByText('520')).toBeOnTheScreen();
    expect(within(bloque).getByText('base 450 + bono 70')).toBeOnTheScreen();
    expect(within(bloque).getByText('En curso')).toBeOnTheScreen();
    expect(within(bloque).getByText('1 bono pendiente')).toBeOnTheScreen();
    fireEvent.press(within(bloque).getByText('Tu mejor análisis: 70/100'));
    expect(navegar).toHaveBeenCalledWith({ pathname: '/partido/[partidoId]', params: { partidoId: '5' } });
  });

  it('F17 CA7: subir, bajar e igual por grupo; sin posición anterior, nada', async () => {
    ultimaFalsa.mockResolvedValue(ultimaJornadaDePrueba());
    gruposFalsos.mockResolvedValue([
      grupo({ id: 1, nombre: 'Sube', mi_posicion: 2, mi_posicion_antes: 4 }),
      grupo({ id: 2, nombre: 'Baja', mi_posicion: 3, mi_posicion_antes: 1 }),
      grupo({ id: 3, nombre: 'Igual', mi_posicion: 1, mi_posicion_antes: 1 }),
      grupo({ id: 4, nombre: 'Nuevo', mi_posicion: 1, mi_posicion_antes: null }),
    ]);
    await abrir();

    const bloque = await screen.findByTestId('bloque-ultima-jornada');
    expect(await within(bloque).findByLabelText('Sube, vas 2.º. Subiste 2')).toBeOnTheScreen();
    expect(within(bloque).getByLabelText('Baja, vas 3.º. Bajaste 2')).toBeOnTheScreen();
    expect(within(bloque).getByLabelText('Igual, vas 1.º. Igual')).toBeOnTheScreen();
    expect(within(bloque).queryByLabelText(/^Nuevo/)).not.toBeOnTheScreen();
  });

  it('F17 CA7: sin predicciones en la jornada, lo dice y muestra igual los cambios de posición', async () => {
    ultimaFalsa.mockResolvedValue(ultimaJornadaDePrueba({ predicciones_calificadas: 0, puntos_total: 0 }));
    gruposFalsos.mockResolvedValue([grupo({ nombre: 'Baja', mi_posicion: 3, mi_posicion_antes: 1 })]);
    await abrir();

    const bloque = await screen.findByTestId('bloque-ultima-jornada');
    expect(await within(bloque).findByText('No predijiste en la Jornada 9.')).toBeOnTheScreen();
    expect(within(bloque).getByLabelText('Baja, vas 3.º. Bajaste 2')).toBeOnTheScreen();
  });

  it('F17 R9: con puntos pero sin bono evaluado, "Sin análisis evaluado"', async () => {
    ultimaFalsa.mockResolvedValue(ultimaJornadaDePrueba({ mejor_analisis_partido_id: null, mejor_analisis_bono: null }));
    await abrir();
    expect(await screen.findByText('Sin análisis evaluado')).toBeOnTheScreen();
  });

  it('F17 R9: si fallan mis grupos, solo los puntos', async () => {
    ultimaFalsa.mockResolvedValue(ultimaJornadaDePrueba());
    gruposFalsos.mockRejectedValue(new ErrorDatos('Falla', false));
    await abrir();

    const bloque = await screen.findByTestId('bloque-ultima-jornada');
    expect(await within(bloque).findByText('520')).toBeOnTheScreen();
    expect(within(bloque).queryByText('Reintentar')).not.toBeOnTheScreen();
  });
});

describe('bloque Mejor análisis (R11)', () => {
  it('F17 CA7: justificación, nota y comentario de la IA, con "Hasta ahora"; tocarlo abre S03', async () => {
    gruposFalsos.mockResolvedValue([grupo()]);
    analisisFalso.mockResolvedValue(mejorAnalisisDePrueba({ en_curso: true, es_simulada: true }));
    await abrir();

    const bloque = await screen.findByTestId('bloque-mejor-analisis');
    expect(await within(bloque).findByText('Pepe')).toBeOnTheScreen();
    expect(within(bloque).getByText('en Los del sillón')).toBeOnTheScreen();
    expect(within(bloque).getByText('82/100')).toBeOnTheScreen();
    expect(within(bloque).getByText('El América llega con 4 victorias seguidas en casa.')).toBeOnTheScreen();
    expect(within(bloque).getByText('Citó la racha en casa y acertó.')).toBeOnTheScreen();
    expect(within(bloque).getByText('Hasta ahora · Simulado')).toBeOnTheScreen();
    expect(within(bloque).getByText('Jornada 9 · América 2 - 1 Chivas')).toBeOnTheScreen();

    fireEvent.press(within(bloque).getByRole('button'));
    expect(navegar).toHaveBeenCalledWith({ pathname: '/partido/[partidoId]', params: { partidoId: '5' } });
  });

  it('F17 R11: mi propio análisis dice "Tú"', async () => {
    gruposFalsos.mockResolvedValue([grupo()]);
    analisisFalso.mockResolvedValue(mejorAnalisisDePrueba({ es_yo: true }));
    await abrir();
    const bloque = await screen.findByTestId('bloque-mejor-analisis');
    expect(await within(bloque).findByText('Tú')).toBeOnTheScreen();
  });

  it('F17 R11: el lector de pantalla lee la justificación y el comentario de la IA', async () => {
    gruposFalsos.mockResolvedValue([grupo()]);
    analisisFalso.mockResolvedValue(mejorAnalisisDePrueba({ en_curso: true }));
    await abrir();

    const tarjeta = await within(await screen.findByTestId('bloque-mejor-analisis')).findByRole('button');
    expect(tarjeta.props.accessibilityLabel).toContain('El América llega con 4 victorias seguidas en casa.');
    expect(tarjeta.props.accessibilityLabel).toContain('Comentario de la IA: Citó la racha en casa y acertó.');
    expect(tarjeta.props.accessibilityLabel).toContain('Hasta ahora');
  });

  it('F17 R11: mientras mis grupos cargan, el vacío espera con el esqueleto', async () => {
    gruposFalsos.mockImplementation(() => new Promise<never>(() => {}));
    await abrir();

    const bloque = await screen.findByTestId('bloque-mejor-analisis');
    expect(await within(bloque).findByTestId('bloque-mejor-analisis-cargando')).toBeOnTheScreen();
    expect(within(bloque).queryByText(/^Nadie de tus grupos/)).not.toBeOnTheScreen();
  });

  it('F17 CA7: sin grupos, invita a unirse', async () => {
    await abrir();
    expect(await screen.findByText('Únete a un grupo para ver el mejor análisis de la jornada.')).toBeOnTheScreen();
  });

  it('F17 CA7: nadie llegó a 50 en la jornada de referencia', async () => {
    gruposFalsos.mockResolvedValue([grupo()]);
    ultimaFalsa.mockResolvedValue(ultimaJornadaDePrueba());
    await abrir();
    expect(await screen.findByText('Nadie de tus grupos llegó a 50 en la Jornada 9.')).toBeOnTheScreen();
  });

  it('F17 CA7: sin jornada de referencia, aún no hay calificados', async () => {
    gruposFalsos.mockResolvedValue([grupo()]);
    await abrir();
    const bloque = await screen.findByTestId('bloque-mejor-analisis');
    expect(await within(bloque).findByText('Aún no hay partidos calificados en este torneo.')).toBeOnTheScreen();
  });
});

describe('bloque Mis grupos (R12)', () => {
  it('F17 CA7: nombre, miembros y posición; sin posición, "Sin puntos aún"; tocar uno abre S08', async () => {
    gruposFalsos.mockResolvedValue([
      grupo({ id: 3, nombre: 'Oficina', miembros: 4, mi_posicion: 2 }),
      grupo({ id: 4, nombre: 'Primos', miembros: 1, mi_posicion: null, mi_posicion_antes: null }),
    ]);
    await abrir();

    const bloque = await screen.findByTestId('bloque-grupos');
    expect(await within(bloque).findByText('Vas 2.º de 4')).toBeOnTheScreen();
    expect(within(bloque).getByText('1 miembro')).toBeOnTheScreen();
    expect(within(bloque).getByText('Sin puntos aún')).toBeOnTheScreen();
    fireEvent.press(within(bloque).getByLabelText('Oficina, 4 miembros, Vas 2.º de 4'));
    expect(navegar).toHaveBeenCalledWith({ pathname: '/grupo/[grupoId]', params: { grupoId: '3' } });
  });

  it('F17 CA7: sin grupos, "Crear grupo" y "Unirse"', async () => {
    await abrir();

    fireEvent.press(await screen.findByText('Crear grupo'));
    expect(navegar).toHaveBeenCalledWith('/grupos/nuevo');
    fireEvent.press(screen.getByText('Unirse'));
    expect(navegar).toHaveBeenCalledWith('/grupos/unirse');
  });
});
