import { ErrorDatos } from '../datos/errores';
import { supabase } from '../supabase/cliente';
import {
  ErrorPrediccionesCerradas,
  guardarPrediccion,
  obtenerMiPrediccion,
  obtenerPartido,
  quitarPrediccion,
} from './datos';

jest.mock('../supabase/cliente', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getSession: jest.fn(async () => ({ data: { session: { user: { id: 'usuario-1' } } } })),
    },
  },
}));

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
    upsert: anotar('upsert'),
    delete: anotar('delete'),
    maybeSingle: () => Promise.resolve(respuesta),
    single: () => Promise.resolve(respuesta),
    then: (resolver: (r: Respuesta) => unknown) => Promise.resolve(respuesta).then(resolver),
  };
  return cadena;
}

const desde = supabase.from as unknown as jest.Mock;
const eleccion = {
  resultado: 'LOCAL',
  rango_goles: null,
  marcador_local: null,
  marcador_visitante: null,
  justificacion: null,
} as const;

beforeEach(() => desde.mockReset());

describe('lecturas de S03', () => {
  it('pide el partido con sus equipos y colores', async () => {
    const partido = consulta({ data: { id: 5 }, error: null, status: 200 });
    desde.mockReturnValue(partido);

    expect(await obtenerPartido(5)).toEqual({ id: 5 });
    expect(desde).toHaveBeenCalledWith('partido');
    expect(partido.llamadas).toContainEqual(['eq', 'id', 5]);
    expect(String(partido.llamadas[0]?.[1])).toContain('cierre_predicciones');
    expect(String(partido.llamadas[0]?.[1])).toContain('color_primario');
  });

  it('un partido que no existe es null', async () => {
    desde.mockReturnValue(consulta({ data: null, error: null, status: 200 }));
    expect(await obtenerPartido(99)).toBeNull();
  });

  it('pide mi predicción del partido', async () => {
    const prediccion = consulta({ data: null, error: null, status: 200 });
    desde.mockReturnValue(prediccion);

    expect(await obtenerMiPrediccion(5)).toBeNull();
    expect(desde).toHaveBeenCalledWith('prediccion');
    expect(prediccion.llamadas).toContainEqual(['eq', 'partido_id', 5]);
    // Solo la mía aunque en M4 el servidor entregue las de mis grupos (R04).
    expect(prediccion.llamadas).toContainEqual(['eq', 'usuario_id', 'usuario-1']);
  });

  it('sin sesión falla sin consultar', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({ data: { session: null } });

    await expect(obtenerMiPrediccion(5)).rejects.toBeInstanceOf(ErrorDatos);
    expect(desde).not.toHaveBeenCalled();
  });

  it('sin red lanza un error de "sin conexión"', async () => {
    desde.mockReturnValue(consulta({ data: null, error: { message: 'Network request failed' }, status: 0 }));
    await expect(obtenerPartido(5)).rejects.toMatchObject({ sinConexion: true });
  });
});

describe('guardarPrediccion', () => {
  it('F03 R4: crea o reemplaza la del par (usuario, partido) sin mandar el usuario', async () => {
    const escritura = consulta({ data: { ...eleccion, actualizada_en: 'x' }, error: null, status: 201 });
    desde.mockReturnValue(escritura);

    await guardarPrediccion(5, eleccion);

    expect(escritura.llamadas[0]).toEqual([
      'upsert',
      { partido_id: 5, ...eleccion },
      { onConflict: 'usuario_id,partido_id' },
    ]);
  });

  it('F03 CA8: distingue el cierre del servidor de una falla', async () => {
    desde.mockReturnValue(consulta({ data: null, error: { message: 'PREDICCIONES_CERRADAS' }, status: 400 }));
    await expect(guardarPrediccion(5, eleccion)).rejects.toBeInstanceOf(ErrorPrediccionesCerradas);

    desde.mockReturnValue(consulta({ data: null, error: { message: 'Network request failed' }, status: 0 }));
    const error = await guardarPrediccion(5, eleccion).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorDatos);
    expect((error as ErrorDatos).sinConexion).toBe(true);
  });
});

describe('quitarPrediccion', () => {
  it('borra mi predicción del partido', async () => {
    const borrado = consulta({ data: null, error: null, status: 204 });
    desde.mockReturnValue(borrado);

    await quitarPrediccion(5);

    expect(borrado.llamadas).toEqual([['delete'], ['eq', 'partido_id', 5]]);
  });

  it('después del cierre lanza el error de cerrado', async () => {
    desde.mockReturnValue(consulta({ data: null, error: { message: 'PREDICCIONES_CERRADAS' }, status: 400 }));
    await expect(quitarPrediccion(5)).rejects.toBeInstanceOf(ErrorPrediccionesCerradas);
  });
});
