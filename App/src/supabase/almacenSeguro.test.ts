import { almacenSeguro, MAX_BYTES_TROZO, partirEnTrozos } from './almacenSeguro';

const mockGuardado = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (clave: string) => mockGuardado.get(clave) ?? null),
  setItemAsync: jest.fn(async (clave: string, valor: string) => {
    mockGuardado.set(clave, valor);
  }),
  deleteItemAsync: jest.fn(async (clave: string) => {
    mockGuardado.delete(clave);
  }),
}));

const bytes = (texto: string) => new TextEncoder().encode(texto).length;
const CLAVE = 'sb-proyecto-auth-token';

beforeEach(() => mockGuardado.clear());

describe('partirEnTrozos', () => {
  it('ningún trozo pasa del máximo de bytes y al unirlos se recupera el texto', () => {
    const texto = 'a'.repeat(5000);
    const trozos = partirEnTrozos(texto);

    expect(trozos).toHaveLength(3);
    expect(trozos.every((t) => bytes(t) <= MAX_BYTES_TROZO)).toBe(true);
    expect(trozos.join('')).toBe(texto);
  });

  it('cuenta bytes en UTF-8, no caracteres (acentos y emojis)', () => {
    const texto = 'Jesús Pérez ⚽ 🏆 '.repeat(300);
    const trozos = partirEnTrozos(texto, 100);

    expect(trozos.every((t) => bytes(t) <= 100)).toBe(true);
    expect(trozos.join('')).toBe(texto);
  });

  it('no corta un emoji (par sustituto) entre dos trozos', () => {
    const trozos = partirEnTrozos('ab🏆', 4);

    expect(trozos).toEqual(['ab', '🏆']);
  });

  it('un texto vacío es un solo trozo vacío', () => {
    expect(partirEnTrozos('')).toEqual(['']);
  });
});

describe('almacenSeguro', () => {
  const sesionGrande = JSON.stringify({ token: 'x'.repeat(3500), nombre: 'Jesús' });

  it('guarda en trozos y lee el valor completo', async () => {
    await almacenSeguro.setItem(CLAVE, sesionGrande);

    expect(mockGuardado.get(`${CLAVE}.n`)).toBe('2');
    expect([...mockGuardado.values()].every((v) => bytes(v) <= MAX_BYTES_TROZO)).toBe(true);
    expect(await almacenSeguro.getItem(CLAVE)).toBe(sesionGrande);
  });

  it('sin valor guardado devuelve null', async () => {
    expect(await almacenSeguro.getItem(CLAVE)).toBeNull();
  });

  it('al guardar un valor más corto borra los trozos que sobran', async () => {
    await almacenSeguro.setItem(CLAVE, sesionGrande);
    await almacenSeguro.setItem(CLAVE, 'corto');

    expect(await almacenSeguro.getItem(CLAVE)).toBe('corto');
    expect([...mockGuardado.keys()].sort()).toEqual([`${CLAVE}.0`, `${CLAVE}.n`]);
  });

  it('borrar elimina todos los trozos', async () => {
    await almacenSeguro.setItem(CLAVE, sesionGrande);
    await almacenSeguro.removeItem(CLAVE);

    expect(mockGuardado.size).toBe(0);
    expect(await almacenSeguro.getItem(CLAVE)).toBeNull();
  });

  it('si falta un trozo se trata como sin valor', async () => {
    await almacenSeguro.setItem(CLAVE, sesionGrande);
    mockGuardado.delete(`${CLAVE}.1`);

    expect(await almacenSeguro.getItem(CLAVE)).toBeNull();
  });

  it('las operaciones simultáneas se aplican en orden y no mezclan trozos', async () => {
    await Promise.all([
      almacenSeguro.setItem(CLAVE, sesionGrande),
      almacenSeguro.removeItem(CLAVE),
      almacenSeguro.setItem(CLAVE, 'final'),
    ]);

    expect(await almacenSeguro.getItem(CLAVE)).toBe('final');
    expect(mockGuardado.size).toBe(2);
  });
});
