import { ErrorDatos } from '../datos/errores';
import { supabase } from '../supabase/cliente';
import {
  crearSimulado,
  iniciarSimulado,
  obtenerOrigenes,
  obtenerSimuladosEnCurso,
  obtenerSimuladosTerminados,
  terminarSimulado,
} from './datos';
import { ErrorSimulacion } from './errores';

jest.mock('../supabase/cliente', () => ({ supabase: { from: jest.fn(), rpc: jest.fn() } }));

type Respuesta = { data: unknown; error: { message: string } | null; status: number };

/** Consulta falsa de supabase-js: anota cada llamada y al final responde `respuesta`. */
function consulta(respuesta: Respuesta) {
  const llamadas: unknown[][] = [];
  const anotar =
    (nombre: string) =>
    (...args: unknown[]) => (llamadas.push([nombre, ...args]), cadena);
  const cadena = {
    llamadas,
    select: anotar('select'),
    eq: anotar('eq'),
    neq: anotar('neq'),
    not: anotar('not'),
    order: anotar('order'),
    limit: anotar('limit'),
    then: (resolver: (r: Respuesta) => unknown) => Promise.resolve(respuesta).then(resolver),
  };
  return cadena;
}

const desde = supabase.from as unknown as jest.Mock;
const rpc = supabase.rpc as unknown as jest.Mock;
const ok = { data: [], error: null, status: 200 };

beforeEach(() => {
  desde.mockReset();
  rpc.mockReset();
});

describe('lecturas de S10', () => {
  it('"En curso": simulados sin terminar', async () => {
    const c = consulta(ok);
    desde.mockReturnValue(c);
    await obtenerSimuladosEnCurso();
    expect(c.llamadas).toContainEqual(['eq', 'es_simulado', true]);
    expect(c.llamadas).toContainEqual(['neq', 'estado', 'TERMINADO']);
  });

  it('terminados: los últimos 5', async () => {
    const c = consulta(ok);
    desde.mockReturnValue(c);
    await obtenerSimuladosTerminados();
    expect(c.llamadas).toContainEqual(['eq', 'estado', 'TERMINADO']);
    expect(c.llamadas).toContainEqual(['limit', 5]);
  });

  it('F09 R2: orígenes reales, terminados y con datos listos', async () => {
    const c = consulta(ok);
    desde.mockReturnValue(c);
    await obtenerOrigenes();
    expect(c.llamadas).toContainEqual(['eq', 'es_simulado', false]);
    expect(c.llamadas).toContainEqual(['eq', 'estado', 'TERMINADO']);
    expect(c.llamadas).toContainEqual(['not', 'listo_para_calificar_en', 'is', null]);
  });
});

describe('acciones de S10', () => {
  it('llaman a las funciones del servidor (F09 R9)', async () => {
    rpc.mockResolvedValue({ data: 7, error: null, status: 200 });

    expect(await crearSimulado(3, 10)).toBe(7);
    await iniciarSimulado(7);
    await terminarSimulado(7);

    expect(rpc.mock.calls).toEqual([
      ['simulacion_crear', { origen: 3, minutos: 10 }],
      ['simulacion_iniciar', { partido: 7 }],
      ['simulacion_terminar', { partido: 7 }],
    ]);
  });

  it('distinguen los errores del servidor de una falla de red', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'SOLO_ADMIN' }, status: 400 });
    await expect(iniciarSimulado(7)).rejects.toEqual(new ErrorSimulacion('SOLO_ADMIN'));

    rpc.mockResolvedValue({ data: null, error: { message: 'Network request failed' }, status: 0 });
    const error = await terminarSimulado(7).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorDatos);
    expect((error as ErrorDatos).sinConexion).toBe(true);
  });
});
