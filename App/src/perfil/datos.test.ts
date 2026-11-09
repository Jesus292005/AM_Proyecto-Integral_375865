import { supabase } from '../supabase/cliente';
import { obtenerMiRacha, obtenerMiRol } from './datos';

jest.mock('../supabase/cliente', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getSession: jest.fn(async () => ({ data: { session: { user: { id: 'usuario-1' } } } })),
    },
  },
}));

const desde = supabase.from as unknown as jest.Mock;

it('lee el rol de mi propio registro', async () => {
  const llamadas: unknown[][] = [];
  const cadena = {
    select: (...a: unknown[]) => (llamadas.push(['select', ...a]), cadena),
    eq: (...a: unknown[]) => (llamadas.push(['eq', ...a]), cadena),
    single: async () => ({ data: { rol: 'ADMIN' }, error: null, status: 200 }),
  };
  desde.mockReturnValue(cadena);

  expect(await obtenerMiRol()).toBe('ADMIN');
  expect(desde).toHaveBeenCalledWith('usuario');
  expect(llamadas).toContainEqual(['eq', 'id', 'usuario-1']);
});

describe('mi racha (F13 R6)', () => {
  function respuesta(data: unknown) {
    const cadena = {
      select: () => cadena,
      single: async () => ({ data, error: null, status: 200 }),
    };
    return cadena;
  }

  it('F13 CA6: lee la fila de mi_racha', async () => {
    const fila = { racha_actual: 3, mejor_racha: 4, incluye_simulados: true, ultima_calificacion: null };
    desde.mockReturnValue(respuesta(fila));

    expect(await obtenerMiRacha()).toEqual(fila);
    expect(desde).toHaveBeenCalledWith('mi_racha');
  });

  it('una fila con forma inválida es un error, no un dato (D54)', async () => {
    desde.mockReturnValue(respuesta({ racha_actual: null, mejor_racha: 0, incluye_simulados: false, ultima_calificacion: null }));

    await expect(obtenerMiRacha()).rejects.toThrow('forma inválida');
  });
});
