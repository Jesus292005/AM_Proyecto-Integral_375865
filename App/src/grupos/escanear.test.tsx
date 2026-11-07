// T72–T73: S07 escáner de QR, S06 al volver con el código y el QR de S08 (F12 CA1–CA5). Corre la
// app completa con una sesión guardada; la cámara (`__mocks__/camara`) y los grupos se simulan.
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ExpoRoot } from 'expo-router';
import { getMockContext } from 'expo-router/testing-library';

import { clienteConsultas } from '../datos/clienteConsultas';
import { simularSesionGuardada } from '../pruebas/supabaseFalso';
import { obtenerMisGrupos, unirseAGrupo } from './datos';
import { ErrorGrupo } from './errores';

jest.mock('../supabase/cliente');
jest.mock('./datos');
// El QR de S08 se reduce a su contenido, para leerlo en la prueba (CA5).
jest.mock('react-native-qrcode-svg', () => {
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return function QRFalso({ value }: { value: string }) {
    return <Text testID="contenido-qr">{value}</Text>;
  };
});

// `./camara` lo simula `jest.setup.ts` con `__mocks__/camara` (que agrega las funciones `simular…`).
const camara = jest.requireMock<typeof import('./__mocks__/camara')>('./camara');
const { abrirAjustesCamara, pedirPermisoCamara, simularErrorCamara, simularLectura } = camara;
const permisoFalso = camara.usePermisoCamara;
const unirseFalso = unirseAGrupo as jest.MockedFunction<typeof unirseAGrupo>;
const misGrupos = obtenerMisGrupos as jest.MockedFunction<typeof obtenerMisGrupos>;

const GRUPO = 'Los del sillón';

beforeEach(() => {
  simularSesionGuardada();
  clienteConsultas.clear();
  clienteConsultas.setDefaultOptions({
    queries: { retry: false, gcTime: Infinity },
    mutations: { retry: false },
  });
  permisoFalso.mockReset().mockReturnValue({ estado: 'concedido', pedir: pedirPermisoCamara, abrirAjustes: abrirAjustesCamara });
  pedirPermisoCamara.mockReset();
  abrirAjustesCamara.mockReset();
  unirseFalso.mockReset().mockResolvedValue({ grupoId: 1, yaEraMiembro: false });
  misGrupos.mockReset().mockResolvedValue([]);
});

afterEach(() => clienteConsultas.clear());

async function abrir(url: string) {
  process.env.EXPO_ROUTER_IMPORT_MODE = 'sync';
  await render(<ExpoRoot context={getMockContext('src/app')} location={url} />);
}

async function tocar(nombre: string) {
  await fireEvent.press(await screen.findByRole('button', { name: nombre }));
}

/** De S06 a S07 con el permiso concedido. */
async function abrirEscaner() {
  await abrir('/grupos/unirse');
  await tocar('Escanear QR');
  expect(await screen.findByRole('header', { name: 'Escanear QR' })).toBeOnTheScreen();
  await screen.findByTestId('lector-qr');
}

describe('S07 lectura', () => {
  it.each(['ABCD-EFGH', 'abcdefgh', ' ABCD EFGH '])(
    'F12 CA1, CA4: "%s" leído 3 veces regresa una sola vez a S06 y se une una vez',
    async (contenido) => {
      await abrirEscaner();

      await act(async () => {
        simularLectura(contenido);
        simularLectura(contenido);
        simularLectura(contenido);
      });

      expect(await screen.findByRole('header', { name: GRUPO })).toBeOnTheScreen();
      expect(unirseFalso).toHaveBeenCalledTimes(1);
      expect(unirseFalso.mock.calls[0]?.[0]).toBe('ABCDEFGH');
      expect(screen.getByRole('tab', { name: 'Grupos' })).toBeSelected();
    },
  );

  it.each([
    ['una URL', 'https://example.com/invitacion'],
    ['un texto cualquiera', 'Hola'],
    ['9 caracteres', 'ABCDEFGHJ'],
    ['una O', 'ABCDEFGO'],
    ['un 1', 'ABCDEFG1'],
  ])('F12 CA2: un QR con %s avisa, no navega ni llama al servidor', async (_caso, contenido) => {
    await abrirEscaner();

    await act(async () => simularLectura(contenido));

    expect(
      await screen.findByText('Este QR no es una invitación de Campeón de Sillón.'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Escanear QR' })).toBeOnTheScreen();
    expect(unirseFalso).not.toHaveBeenCalled();
  });

  it('F12 R5: después de un QR ajeno, uno válido sí se usa', async () => {
    await abrirEscaner();

    await act(async () => simularLectura('https://example.com'));
    await act(async () => simularLectura('ABCD-EFGH'));

    expect(await screen.findByRole('header', { name: GRUPO })).toBeOnTheScreen();
    expect(unirseFalso).toHaveBeenCalledTimes(1);
  });

  it('F12 Estados: si la cámara no abre, lo dice y ofrece escribir el código', async () => {
    await abrirEscaner();

    await act(async () => simularErrorCamara());
    expect(await screen.findByText('No se pudo abrir la cámara.')).toBeOnTheScreen();
    await tocar('Escribir el código');

    expect(await screen.findByRole('header', { name: 'Unirse a grupo' })).toBeOnTheScreen();
  });
});

describe('S07 permiso de cámara (F12 R6)', () => {
  it('F12 CA3: con permiso concedido se ve la cámara', async () => {
    await abrir('/grupos/escanear');

    expect(await screen.findByTestId('lector-qr')).toBeOnTheScreen();
  });

  it('F12 CA3: negado con nueva oportunidad ofrece permitir y escribir el código', async () => {
    permisoFalso.mockReturnValue({ estado: 'negado', pedir: pedirPermisoCamara, abrirAjustes: abrirAjustesCamara });
    await abrir('/grupos/unirse');
    await tocar('Escanear QR');

    expect(
      await screen.findByText('Necesitamos la cámara para leer el QR. También puedes escribir el código.'),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('lector-qr')).not.toBeOnTheScreen();
    await tocar('Permitir cámara');
    expect(pedirPermisoCamara).toHaveBeenCalledTimes(1);

    await tocar('Escribir el código');
    expect(await screen.findByRole('header', { name: 'Unirse a grupo' })).toBeOnTheScreen();
  });

  it('F12 CA3: negado sin nueva oportunidad ofrece abrir los ajustes', async () => {
    permisoFalso.mockReturnValue({ estado: 'bloqueado', pedir: pedirPermisoCamara, abrirAjustes: abrirAjustesCamara });
    await abrir('/grupos/escanear');

    await tocar('Abrir ajustes');

    expect(abrirAjustesCamara).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Permitir cámara' })).not.toBeOnTheScreen();
  });

  it('F12 Estados: mientras se revisa el permiso no hay cámara ni botones', async () => {
    permisoFalso.mockReturnValue({ estado: 'revisando', pedir: pedirPermisoCamara, abrirAjustes: abrirAjustesCamara });
    await abrir('/grupos/escanear');

    expect(await screen.findByRole('header', { name: 'Escanear QR' })).toBeOnTheScreen();
    expect(screen.queryByTestId('lector-qr')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Escribir el código' })).not.toBeOnTheScreen();
  });
});

describe('S06 desde el QR', () => {
  it('F12 CA4: si la unión falla, sigue el flujo de F07 con el código en el campo y se puede reescanear', async () => {
    unirseFalso.mockRejectedValueOnce(new ErrorGrupo('CODIGO_NO_EXISTE'));
    await abrirEscaner();

    await act(async () => simularLectura('ABCD-EFGH'));
    expect(await screen.findByText('No encontramos un grupo con ese código.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Código del grupo')).toHaveDisplayValue('ABCD-EFGH');

    await tocar('Escanear QR');
    await screen.findByTestId('lector-qr');
    await act(async () => simularLectura('ABCD-EFGH'));

    expect(await screen.findByRole('header', { name: GRUPO })).toBeOnTheScreen();
    expect(unirseFalso).toHaveBeenCalledTimes(2);
  });

  it('F12 CA4 (D37): un enlace externo con código y lectura solo llena el campo, no se une', async () => {
    await abrir('/grupos/unirse?codigo=ABCD-EFGH&lectura=1&desdeQr=1');

    expect(await screen.findByLabelText('Código del grupo')).toHaveDisplayValue('ABCD-EFGH');
    await waitFor(() => expect(unirseFalso).not.toHaveBeenCalled());
    expect(screen.getByRole('header', { name: 'Unirse a grupo' })).toBeOnTheScreen();
  });

  it('F12 CA4: sin lectura de S07 solo llena el campo', async () => {
    await abrir('/grupos/unirse?codigo=ABCD-EFGH');

    expect(await screen.findByLabelText('Código del grupo')).toHaveDisplayValue('ABCD-EFGH');
    await waitFor(() => expect(unirseFalso).not.toHaveBeenCalled());
  });
});

describe('S08 QR', () => {
  it('F12 CA5: el QR contiene exactamente el código canónico del grupo', async () => {
    await abrir('/grupo/1');

    expect(await screen.findByTestId('contenido-qr')).toHaveTextContent('ABCD-EFGH', { exact: true });
    expect(screen.getByLabelText('Código QR del grupo')).toBeOnTheScreen();
  });
});
