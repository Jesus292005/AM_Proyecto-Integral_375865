// S09 (T99) y S14: perfil nuevo (F28 R1–R3, CA3, CA4). Corre la app completa con una sesión
// guardada; los datos del perfil se simulan.
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ExpoRoot, router } from 'expo-router';
import { getMockContext } from 'expo-router/testing-library';

import { clienteConsultas } from '../datos/clienteConsultas';
import { ErrorDatos } from '../datos/errores';
import { simularSesionGuardada } from '../pruebas/supabaseFalso';
import { equiposDePrueba, perfilDePrueba } from './__mocks__/datos';
import { cambiarMiNombre, ErrorNombreInvalido, obtenerMiPerfil, obtenerMiRol } from './datos';

jest.mock('../supabase/cliente');
jest.mock('./datos');

const perfilFalso = obtenerMiPerfil as jest.MockedFunction<typeof obtenerMiPerfil>;
const rolFalso = obtenerMiRol as jest.MockedFunction<typeof obtenerMiRol>;
const nombreFalso = cambiarMiNombre as jest.MockedFunction<typeof cambiarMiNombre>;

beforeEach(() => {
  simularSesionGuardada();
  clienteConsultas.clear();
  clienteConsultas.setDefaultOptions({
    queries: { retry: false, gcTime: Infinity },
    mutations: { retry: false },
  });
  perfilFalso.mockReset().mockResolvedValue(perfilDePrueba({ nombre: 'Chucho' }));
  rolFalso.mockReset().mockResolvedValue('USUARIO');
  nombreFalso.mockReset().mockImplementation(async (nombre) => nombre);
});

afterEach(() => clienteConsultas.clear());

async function abrir(url = '/perfil') {
  process.env.EXPO_ROUTER_IMPORT_MODE = 'sync';
  await render(<ExpoRoot context={getMockContext('src/app')} location={url} />);
}

const boton = (nombre: string | RegExp) => screen.getByRole('button', { name: nombre });

describe('S09 Perfil (F28)', () => {
  it('F28 CA3: foto (o inicial), nombre, "Elige tu equipo" y las secciones en orden', async () => {
    await abrir();

    expect((await screen.findAllByText('Chucho'))[0]).toBeOnTheScreen();
    expect(screen.getAllByTestId('foto-usuario-inicial')[0]).toBeOnTheScreen();
    expect(screen.getByRole('link', { name: 'Elige tu equipo' })).toBeOnTheScreen();

    // Orden de R2: encabezado · Tu carta (con el nombre en la carta) · Racha · Ajustes (con el
    // nombre como valor de "Nombre") · Cerrar sesión. La Vitrina llega en T101.
    await screen.findByTestId('carta-bloqueada');
    const textos = screen
      .getAllByText(/^(Chucho|Tu carta|Racha|Ajustes|Cerrar sesión)$/)
      .map((t) => t.props.children);
    expect(textos).toEqual(['Chucho', 'Tu carta', 'Chucho', 'Racha', 'Ajustes', 'Chucho', 'Cerrar sesión']);
    expect(screen.queryByRole('button', { name: 'Simulación' })).not.toBeOnTheScreen();
  });

  it('F28 CA3: con equipo favorito muestra su escudo y su nombre; con foto, la foto', async () => {
    perfilFalso.mockResolvedValue(
      perfilDePrueba({
        nombre: 'Chucho',
        foto_url: 'https://example.com/f.png',
        equipo: equiposDePrueba[1] ?? null,
      }),
    );
    await abrir();

    expect((await screen.findAllByTestId('foto-usuario'))[0]).toBeOnTheScreen();
    expect(screen.getAllByText('Chivas').length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: 'Elige tu equipo' })).not.toBeOnTheScreen();
    expect(boton('Equipo favorito: Chivas')).toBeOnTheScreen();
  });

  it('F28 CA3: "Simulación" solo con ADMIN', async () => {
    perfilFalso.mockResolvedValue(perfilDePrueba({ nombre: 'Chucho', rol: 'ADMIN' }));
    await abrir();

    expect(await screen.findByRole('button', { name: 'Simulación' })).toBeOnTheScreen();
  });

  it('F28 R2: "Elige tu equipo" abre S12 y "Nombre" abre S14', async () => {
    await abrir();

    await fireEvent.press(await screen.findByRole('link', { name: 'Elige tu equipo' }));
    expect(await screen.findByRole('header', { name: 'Equipo favorito' })).toBeOnTheScreen();
    await act(() => router.back());

    await fireEvent.press(await screen.findByRole('button', { name: 'Nombre: Chucho' }));
    expect(await screen.findByRole('header', { name: 'Cambiar nombre' })).toBeOnTheScreen();
  });

  it('estados: un error del perfil se puede reintentar sin romper las otras secciones', async () => {
    perfilFalso.mockRejectedValueOnce(new ErrorDatos('Network request failed', true));
    await abrir();

    // El encabezado y la carta (que usa el perfil) muestran el error, cada uno con su reintento.
    expect(
      (await screen.findAllByText('Sin conexión. Revisa tu internet e inténtalo de nuevo.'))[0],
    ).toBeOnTheScreen();
    expect(screen.getByText('Racha')).toBeOnTheScreen();
    await fireEvent.press(screen.getAllByRole('button', { name: 'Reintentar' })[0]!);

    expect((await screen.findAllByText('Chucho'))[0]).toBeOnTheScreen();
  });
});

describe('S14 Cambiar nombre (F28 R3–R4)', () => {
  async function abrirS14() {
    await abrir();
    await fireEvent.press(await screen.findByRole('button', { name: 'Nombre: Chucho' }));
    await screen.findByRole('header', { name: 'Cambiar nombre' });
  }
  const campo = () => screen.getByLabelText('Tu nombre');

  it('F28 CA4: "Guardar" está deshabilitado sin cambios y con un nombre inválido', async () => {
    await abrirS14();

    expect(campo().props.value).toBe('Chucho');
    expect(boton('Guardar')).toBeDisabled();
    await fireEvent.changeText(campo(), 'Ch');
    expect(boton('Guardar')).toBeDisabled();
    expect(screen.getByText('Usa de 3 a 20 letras o números.')).toBeOnTheScreen();
    await fireEvent.changeText(campo(), '  Chucho  ');
    expect(boton('Guardar')).toBeDisabled();
  });

  it('F28 CA4: guarda el nombre normalizado y regresa a Perfil con el nombre nuevo', async () => {
    await abrirS14();

    await fireEvent.changeText(campo(), '  El   Chucho ');
    // Lo que devolverá el servidor al volver a pedir el perfil.
    perfilFalso.mockResolvedValue(perfilDePrueba({ nombre: 'El Chucho' }));
    await fireEvent.press(boton('Guardar'));

    await waitFor(() => expect(nombreFalso).toHaveBeenCalledWith('El Chucho'));
    await waitFor(() =>
      expect(screen.queryByRole('header', { name: 'Cambiar nombre' })).not.toBeOnTheScreen(),
    );
    expect((await screen.findAllByText('El Chucho'))[0]).toBeOnTheScreen();
  });

  it('F28 CA4: el error del servidor se ve bajo el campo y no cierra', async () => {
    nombreFalso.mockRejectedValue(new ErrorNombreInvalido());
    await abrirS14();

    await fireEvent.changeText(campo(), 'Nuevo nombre');
    await fireEvent.press(boton('Guardar'));

    expect(await screen.findByText('Usa de 3 a 20 letras o números.')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Cambiar nombre' })).toBeOnTheScreen();
  });

  it('F28 CA4: sin conexión al guardar lo dice', async () => {
    nombreFalso.mockRejectedValue(new ErrorDatos('Network request failed', true));
    await abrirS14();

    await fireEvent.changeText(campo(), 'Nuevo nombre');
    await fireEvent.press(boton('Guardar'));

    expect(
      await screen.findByText('Sin conexión. Revisa tu internet e inténtalo de nuevo.'),
    ).toBeOnTheScreen();
  });
});
