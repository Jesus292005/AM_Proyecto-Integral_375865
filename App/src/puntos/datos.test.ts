import { ErrorDatos } from '../datos/errores';
import { supabase } from '../supabase/cliente';
import { obtenerMisPuntos, obtenerMisPuntosDePartido, type PuntosPrediccion } from './datos';

jest.mock('../supabase/cliente', () => ({ supabase: { from: jest.fn() } }));

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
    in: anotar('in'),
    maybeSingle: () => Promise.resolve(respuesta),
    then: (resolver: (r: Respuesta) => unknown) => Promise.resolve(respuesta).then(resolver),
  };
  return cadena;
}

const desde = supabase.from as unknown as jest.Mock;

const fila: PuntosPrediccion = {
  partido_id: 7,
  estado_prediccion: 'ACERTADA',
  estado_bono: 'EVALUADA',
  puntos_resultado: 0,
  puntos_rango_goles: 0,
  puntos_marcador: 350,
  puntos_base: 350,
  puntos_bono: 60,
  puntos_total: 410,
  explicacion: 'Leíste bien los tiros.',
  afirmaciones: [{ texto: 'Puebla tira más', veredicto: 'ACERTADA', motivo: '17 contra 10.', evidencia: ['S2'] }],
};

describe('F10: lectura de mis puntos', () => {
  it('F10 R2: lee la vista mis_puntos de los partidos pedidos, por partido', async () => {
    const c = consulta({ data: [fila], error: null, status: 200 });
    desde.mockReturnValue(c);

    const puntos = await obtenerMisPuntos([7, 8]);

    expect(desde).toHaveBeenCalledWith('mis_puntos');
    expect(c.llamadas).toContainEqual(['in', 'partido_id', [7, 8]]);
    expect(puntos.get(7)).toEqual(fila);
    expect(puntos.has(8)).toBe(false);
  });

  it('F10 R2: sin partidos predichos no consulta', async () => {
    desde.mockClear();
    expect((await obtenerMisPuntos([])).size).toBe(0);
    expect(desde).not.toHaveBeenCalled();
  });

  it('F10 R2: un estado o una afirmación con forma inválida se rechaza (Zod, D54)', async () => {
    desde.mockReturnValue(
      consulta({ data: [{ ...fila, estado_prediccion: 'PERFECTA' }], error: null, status: 200 }),
    );
    await expect(obtenerMisPuntos([7])).rejects.toThrow('Puntos con forma inválida');

    desde.mockReturnValue(
      consulta({ data: { ...fila, afirmaciones: [{ texto: 'x' }] }, error: null, status: 200 }),
    );
    await expect(obtenerMisPuntosDePartido(7)).rejects.toThrow('Puntos con forma inválida');
  });

  it('F10 R2: sin predicción en el partido devuelve null; sin red, un ErrorDatos sin conexión', async () => {
    desde.mockReturnValue(consulta({ data: null, error: null, status: 200 }));
    expect(await obtenerMisPuntosDePartido(7)).toBeNull();

    desde.mockReturnValue(consulta({ data: null, error: { message: 'Failed to fetch' }, status: 0 }));
    const error = await obtenerMisPuntosDePartido(7).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorDatos);
    expect((error as ErrorDatos).sinConexion).toBe(true);
  });
});
