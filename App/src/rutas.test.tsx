// Verifica que cada ruta de 02-navigation §3 existe y abre su pantalla (T03), y el comportamiento
// del menú inferior (D76). Corre con una sesión guardada; la guardia y S01 se prueban en
// `sesion/guardia.test.tsx` (T11).
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ExpoRoot } from 'expo-router';
import { getMockContext } from 'expo-router/testing-library';

import { clienteConsultas } from './datos/clienteConsultas';
import { obtenerPartido } from './partido/datos';
import { simularSesionGuardada } from './pruebas/supabaseFalso';

jest.mock('./supabase/cliente');
// S03 ya es real (T34): por defecto muestra un partido terminado.
jest.mock('./partido/datos');
// S10 ya es real (T38): la cuenta de prueba es de usuario normal.
jest.mock('./perfil/datos');
jest.mock('./simulacion/datos');
// S02 ya es real (T26): sus lecturas se simulan con una jornada de un partido.
jest.mock('./partidos/datos', () => ({
  ...jest.requireActual<typeof import('./partidos/datos')>('./partidos/datos'),
  obtenerTorneoActual: jest.fn(async () => ({
    nombre: 'Apertura 2024',
    jornadas: [
      { id: 1, orden: 1, nombre: 'Jornada 1' },
      { id: 2, orden: 2, nombre: 'Jornada 2' },
    ],
    ordenActual: 1,
  })),
  obtenerPartidosDeJornada: jest.fn(async () => [
    {
      id: 1,
      inicio: '2024-07-13T20:00:00Z',
      estado: 'TERMINADO',
      goles_local: 1,
      goles_visitante: 0,
      local: { nombre_corto: 'Puebla', escudo_url: 'https://x.mx/l.png' },
      visitante: { nombre_corto: 'Santos', escudo_url: 'https://x.mx/v.png' },
      es_simulado: false,
      predicho: false,
    },
  ]),
}));

const PARTIDO_S02 = 'Puebla 1, Santos 0. Terminado';
// S03 se reconoce por el encabezado del partido.
const S03 = 'Puebla 1, Santos 0';

beforeEach(() => {
  simularSesionGuardada();
  clienteConsultas.clear();
  clienteConsultas.setDefaultOptions({ queries: { retry: false, gcTime: Infinity } });
});

afterEach(() => clienteConsultas.clear());

// `renderRouter` de expo-router llama a `render` de forma síncrona, pero en
// @testing-library/react-native 14 `render` es asíncrono; se monta `ExpoRoot` igual que él.
async function abrir(url: string) {
  process.env.EXPO_ROUTER_IMPORT_MODE = 'sync';
  await render(<ExpoRoot context={getMockContext('src/app')} location={url} />);
}

async function tocar(nombre: string, rol: 'button' | 'tab' = 'button') {
  await fireEvent.press(await screen.findByRole(rol, { name: nombre }));
}

// Las pantallas anteriores siguen montadas debajo de la pila: se verifica que la de arriba se cerró.
async function seCerro(id: string) {
  await waitFor(() => expect(screen.queryByText(id)).not.toBeOnTheScreen());
}

const abrioS03 = () => screen.findByRole('header', { name: S03 });

async function seCerroS03() {
  await waitFor(() => expect(screen.queryByRole('header', { name: S03 })).not.toBeOnTheScreen());
}

// Las pantallas apiladas siguen montadas (ocultas para accesibilidad): una copia de más cuenta.
function contar(id: string) {
  return screen.queryAllByText(id, { includeHiddenElements: true }).length;
}

const rutas = [
  { url: '/inicio', id: 'S11', titulo: 'Inicio' },
  { url: '/equipo', id: 'S12', titulo: 'Equipo favorito' },
  { url: '/grupos', id: 'S04', titulo: 'Grupos' },
  { url: '/grupos/nuevo', id: 'S05', titulo: 'Crear grupo' },
  { url: '/grupos/unirse', id: 'S06', titulo: 'Unirse a grupo' },
  { url: '/grupos/escanear', id: 'S07', titulo: 'Escanear QR' },
  { url: '/grupo/3', id: 'S08', titulo: 'Grupo' },
  { url: '/usuario/5', id: 'S13', titulo: 'Perfil de usuario' },
  { url: '/perfil', id: 'S09', titulo: 'Perfil' },
] as const;

describe('rutas', () => {
  it.each(rutas)('$url abre $id', async ({ url, id, titulo }) => {
    await abrir(url);

    expect(await screen.findByRole('header', { name: titulo })).toBeOnTheScreen();
    expect(screen.getByText(id)).toBeOnTheScreen();
  });

  it('/partido/7 abre S03 del partido 7', async () => {
    await abrir('/partido/7');

    expect(await abrioS03()).toBeOnTheScreen();
    expect(obtenerPartido).toHaveBeenCalledWith(7);
  });

  it('/admin/simulacion abre S10', async () => {
    await abrir('/admin/simulacion');

    expect(await screen.findByRole('header', { name: 'Simulación' })).toBeOnTheScreen();
    expect(await screen.findByText('Solo administradores.')).toBeOnTheScreen();
  });

  it('/partidos abre S02 en la jornada actual', async () => {
    await abrir('/partidos');

    expect(await screen.findByRole('header', { name: 'Jornada 1' })).toBeOnTheScreen();
  });

  it('la raíz redirige a Inicio', async () => {
    await abrir('/');

    expect(await screen.findByText('S11')).toBeOnTheScreen();
  });

  it('los parámetros de ruta llegan a la pantalla', async () => {
    await abrir('/grupo/3?vista=jornada');

    expect(await screen.findByText('grupoId: 3')).toBeOnTheScreen();
    expect(screen.getByText('vista: jornada')).toBeOnTheScreen();
  });

  it.each(['/partido/7', '/grupo/3', '/usuario/5', '/admin/simulacion'])(
    '%s se abre con el menú inferior',
    async (url) => {
      await abrir(url);

      expect(await screen.findAllByRole('tab')).toHaveLength(4);
    },
  );

  it.each(['/equipo', '/grupos/nuevo', '/grupos/unirse', '/grupos/escanear'])(
    '%s se abre sin menú inferior',
    async (url) => {
      await abrir(url);

      await screen.findByRole('header');
      expect(screen.queryAllByRole('tab')).toHaveLength(0);
    },
  );
});

describe('menú inferior', () => {
  it('cambia de pestaña', async () => {
    await abrir('/inicio');

    await tocar('Grupos', 'tab');

    expect(await screen.findByText('S04')).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Grupos' })).toBeSelected();
  });

  it('un detalle abierto desde una pestaña se queda en esa pestaña y "volver" regresa', async () => {
    await abrir('/inicio');

    await tocar('Partido 1');
    expect(await abrioS03()).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Inicio' })).toBeSelected();

    await tocar('Volver');
    await seCerroS03();
    expect(screen.getByText('S11')).toBeOnTheScreen();
  });

  it('tocar la pestaña activa desde un detalle regresa a su primera pantalla', async () => {
    await abrir('/partidos');

    await tocar(PARTIDO_S02);
    expect(await abrioS03()).toBeOnTheScreen();

    await tocar('Partidos', 'tab');
    await seCerroS03();
    expect(screen.getByRole('header', { name: 'Jornada 1' })).toBeOnTheScreen();
  });

  it('cada pestaña recuerda dónde se quedó', async () => {
    await abrir('/partidos');

    await tocar(PARTIDO_S02);
    expect(await abrioS03()).toBeOnTheScreen();

    await tocar('Grupos', 'tab');
    expect(await screen.findByText('S04')).toBeOnTheScreen();

    await tocar('Partidos', 'tab');
    expect(await abrioS03()).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Partidos' })).toBeSelected();
  });

  it('tocar varias veces el mismo enlace no apila la pantalla (D78)', async () => {
    await abrir('/inicio');

    // Toques rápidos sobre el mismo botón, antes de que la pantalla nueva lo tape.
    const enlace = await screen.findByRole('button', { name: 'Partido 1' });
    for (let i = 0; i < 3; i++) await fireEvent.press(enlace);
    expect(await abrioS03()).toBeOnTheScreen();

    await tocar('Volver');
    await seCerroS03();
    expect(screen.getByText('S11')).toBeOnTheScreen();
  });

  it('cambiar la jornada actualiza Partidos sin agregar historial (D78)', async () => {
    await abrir('/partidos');

    await tocar('Jornada siguiente');

    expect(await screen.findByRole('header', { name: 'Jornada 2' })).toBeOnTheScreen();
    expect(
      screen.queryAllByRole('button', { name: 'Jornada anterior', includeHiddenElements: true }),
    ).toHaveLength(1);
  });

  it('cambiar la vista del grupo actualiza el grupo sin agregar historial (D78)', async () => {
    await abrir('/grupos');

    await tocar('Grupo 1');
    await tocar('Vista jornada');
    await tocar('Vista jornada');
    expect(await screen.findByText('vista: jornada')).toBeOnTheScreen();
    expect(contar('S08')).toBe(1);

    await tocar('Volver');
    await seCerro('S08');
    expect(screen.getByText('S04')).toBeOnTheScreen();
  });

  it('al crear un grupo desde el modal se abre el grupo en la pestaña Grupos', async () => {
    await abrir('/inicio');

    await tocar('Grupos', 'tab');
    await tocar('Crear grupo');
    expect(await screen.findByText('S05')).toBeOnTheScreen();

    await tocar('Grupo 1 (al crear)');
    expect(await screen.findByText('S08')).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Grupos' })).toBeSelected();
  });
});
