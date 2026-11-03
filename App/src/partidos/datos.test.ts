import { supabase } from '../supabase/cliente';
import { ErrorDatos, obtenerPartidosDeJornada, obtenerTorneoActual } from './datos';

jest.mock('../supabase/cliente', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
    auth: {
      getSession: jest.fn(async () => ({ data: { session: { user: { id: 'usuario-1' } } } })),
    },
  },
}));

type Respuesta = { data: unknown; error: { message: string } | null; status: number };

/** Consulta falsa de supabase-js: anota los filtros y al final responde `respuesta`. */
function consulta(respuesta: Respuesta) {
  const llamadas: unknown[][] = [];
  const cadena = {
    llamadas,
    select: (...args: unknown[]) => (llamadas.push(['select', ...args]), cadena),
    eq: (...args: unknown[]) => (llamadas.push(['eq', ...args]), cadena),
    order: (...args: unknown[]) => (llamadas.push(['order', ...args]), cadena),
    maybeSingle: () => Promise.resolve(respuesta),
    then: (resolver: (r: Respuesta) => unknown) => Promise.resolve(respuesta).then(resolver),
  };
  return cadena;
}

const desde = supabase.from as unknown as jest.Mock;
const rpc = supabase.rpc as unknown as jest.Mock;

beforeEach(() => {
  desde.mockReset();
  rpc.mockReset();
});

describe('obtenerPartidosDeJornada', () => {
  it('pide los partidos de la jornada con sus equipos, por hora', async () => {
    const partidos = consulta({ data: [{ id: 1, mis_predicciones: [] }], error: null, status: 200 });
    desde.mockReturnValue(partidos);

    expect(await obtenerPartidosDeJornada(12)).toEqual([{ id: 1, predicho: false }]);
    expect(desde).toHaveBeenCalledWith('partido');
    expect(partidos.llamadas).toContainEqual(['eq', 'jornada_id', 12]);
    expect(partidos.llamadas).toContainEqual(['order', 'inicio']);
    expect(String(partidos.llamadas[0]?.[1])).toContain('local:equipo!partido_equipo_local_id_fkey');
  });

  it('F03 CA9: marca "predicho" solo con una predicción propia', async () => {
    const partidos = consulta({
      data: [
        { id: 1, mis_predicciones: [{ id: 7 }] },
        { id: 2, mis_predicciones: [] },
      ],
      error: null,
      status: 200,
    });
    desde.mockReturnValue(partidos);

    expect(await obtenerPartidosDeJornada(12)).toEqual([
      { id: 1, predicho: true },
      { id: 2, predicho: false },
    ]);
    // Solo las mías aunque en M4 el servidor entregue las de mis grupos (R04).
    expect(partidos.llamadas).toContainEqual(['eq', 'mis_predicciones.usuario_id', 'usuario-1']);
    expect(String(partidos.llamadas[0]?.[1])).toContain('mis_predicciones:prediccion(id)');
  });

  it('sin red (status 0) lanza un error de "sin conexión"', async () => {
    desde.mockReturnValue(
      consulta({ data: null, error: { message: 'TypeError: Network request failed' }, status: 0 }),
    );

    const error = await obtenerPartidosDeJornada(12).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorDatos);
    expect((error as ErrorDatos).sinConexion).toBe(true);
  });

  it('una falla del servidor no es "sin conexión"', async () => {
    desde.mockReturnValue(consulta({ data: null, error: { message: 'boom' }, status: 500 }));

    const error = await obtenerPartidosDeJornada(12).catch((e: unknown) => e);
    expect((error as ErrorDatos).sinConexion).toBe(false);
  });
});

describe('obtenerTorneoActual', () => {
  it('devuelve el torneo actual, sus jornadas en orden y la jornada actual del servidor', async () => {
    const torneo = consulta({ data: { id: 5, nombre: 'Apertura 2024' }, error: null, status: 200 });
    const jornadas = consulta({
      data: [{ id: 11, orden: 1, nombre: 'Jornada 1' }],
      error: null,
      status: 200,
    });
    desde.mockImplementation((tabla: string) => (tabla === 'torneo' ? torneo : jornadas));
    rpc.mockResolvedValue({ data: 1, error: null, status: 200 });

    expect(await obtenerTorneoActual()).toEqual({
      nombre: 'Apertura 2024',
      jornadas: [{ id: 11, orden: 1, nombre: 'Jornada 1' }],
      ordenActual: 1,
    });
    expect(torneo.llamadas).toContainEqual(['eq', 'es_actual', true]);
    expect(jornadas.llamadas).toContainEqual(['eq', 'torneo_id', 5]);
    expect(jornadas.llamadas).toContainEqual(['order', 'orden']);
    expect(rpc).toHaveBeenCalledWith('jornada_actual');
  });

  it('sin torneo actual devuelve null sin pedir jornadas', async () => {
    desde.mockReturnValue(consulta({ data: null, error: null, status: 200 }));

    expect(await obtenerTorneoActual()).toBeNull();
    expect(desde).toHaveBeenCalledTimes(1);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('si falla la jornada actual, falla todo (sin datos a medias)', async () => {
    const torneo = consulta({ data: { id: 5, nombre: 'Apertura 2024' }, error: null, status: 200 });
    desde.mockImplementation((tabla: string) =>
      tabla === 'torneo' ? torneo : consulta({ data: [], error: null, status: 200 }),
    );
    rpc.mockResolvedValue({ data: null, error: { message: 'Network request failed' }, status: 0 });

    await expect(obtenerTorneoActual()).rejects.toMatchObject({ sinConexion: true });
  });
});
