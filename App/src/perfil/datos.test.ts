import { supabase } from '../supabase/cliente';
import { obtenerMiRol } from './datos';

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
