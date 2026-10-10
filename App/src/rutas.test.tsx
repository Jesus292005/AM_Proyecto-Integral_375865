// Verifica que cada ruta de 02-navigation §3 existe y abre su pantalla (T03), y el comportamiento
// del menú inferior (D76).
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ExpoRoot } from 'expo-router';
import { getMockContext } from 'expo-router/testing-library';

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

const rutas = [
  { url: '/login', id: 'S01', titulo: 'Inicio de sesión' },
  { url: '/inicio', id: 'S11', titulo: 'Inicio' },
  { url: '/equipo', id: 'S12', titulo: 'Equipo favorito' },
  { url: '/partidos', id: 'S02', titulo: 'Partidos' },
  { url: '/partido/7', id: 'S03', titulo: 'Partido' },
  { url: '/grupos', id: 'S04', titulo: 'Grupos' },
  { url: '/grupos/nuevo', id: 'S05', titulo: 'Crear grupo' },
  { url: '/grupos/unirse', id: 'S06', titulo: 'Unirse a grupo' },
  { url: '/grupos/escanear', id: 'S07', titulo: 'Escanear QR' },
  { url: '/grupo/3', id: 'S08', titulo: 'Grupo' },
  { url: '/usuario/5', id: 'S13', titulo: 'Perfil de usuario' },
  { url: '/perfil', id: 'S09', titulo: 'Perfil' },
  { url: '/admin/simulacion', id: 'S10', titulo: 'Simulación' },
] as const;

describe('rutas', () => {
  it.each(rutas)('$url abre $id', async ({ url, id, titulo }) => {
    await abrir(url);

    expect(await screen.findByRole('header', { name: titulo })).toBeOnTheScreen();
    expect(screen.getByText(id)).toBeOnTheScreen();
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

  it.each(['/login', '/equipo', '/grupos/nuevo', '/grupos/unirse', '/grupos/escanear'])(
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
    expect(await screen.findByText('S03')).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Inicio' })).toBeSelected();

    await tocar('Volver');
    await seCerro('S03');
    expect(screen.getByText('S11')).toBeOnTheScreen();
  });

  it('tocar la pestaña activa desde un detalle regresa a su primera pantalla', async () => {
    await abrir('/partidos');

    await tocar('Partido 1');
    expect(await screen.findByText('S03')).toBeOnTheScreen();

    await tocar('Partidos', 'tab');
    await seCerro('S03');
    expect(screen.getByText('S02')).toBeOnTheScreen();
  });

  it('cada pestaña recuerda dónde se quedó', async () => {
    await abrir('/partidos');

    await tocar('Partido 1');
    expect(await screen.findByText('S03')).toBeOnTheScreen();

    await tocar('Grupos', 'tab');
    expect(await screen.findByText('S04')).toBeOnTheScreen();

    await tocar('Partidos', 'tab');
    expect(await screen.findByText('S03')).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Partidos' })).toBeSelected();
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
