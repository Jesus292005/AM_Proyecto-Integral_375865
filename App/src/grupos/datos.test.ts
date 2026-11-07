import { ErrorDatos } from '../datos/errores';
import { supabase } from '../supabase/cliente';
import {
  crearGrupo,
  obtenerMisGrupos,
  obtenerRanking,
  obtenerPrediccionesDelGrupo,
  salirDeGrupo,
  unirseAGrupo,
} from './datos';
import { ErrorGrupo } from './errores';

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
    order: anotar('order'),
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

describe('lecturas', () => {
  it('F07 R9: mis grupos, del más reciente al que me uní', async () => {
    const fila = { id: 1, nombre: 'Amigos', miembros: 3, mi_posicion: 2 };
    const c = consulta({ data: [fila], error: null, status: 200 });
    desde.mockReturnValue(c);

    expect(await obtenerMisGrupos()).toEqual([fila]);
    expect(desde).toHaveBeenCalledWith('mis_grupos');
    expect(c.llamadas).toContainEqual(['order', 'unido_en', { ascending: false }]);
  });

  it('una fila con forma inválida es un error, no un dato (D54)', async () => {
    desde.mockReturnValue(consulta({ data: [{ id: 1, nombre: null, miembros: 3, mi_posicion: null }], error: null, status: 200 }));

    await expect(obtenerMisGrupos()).rejects.toThrow('forma inválida');
  });

  it('F08 CA9: el ranking es una sola llamada al servidor, del torneo o de una jornada', async () => {
    const fila = {
      posicion: 1,
      usuario_id: 'a',
      nombre: 'Ana',
      foto_url: null,
      puntos_total: 500,
      puntos_base: 450,
      puntos_bono: 50,
      marcadores_exactos: 1,
      es_yo: true,
      incluye_simulados: true,
      ultima_calificacion: '2026-11-07T18:00:00Z',
    };
    rpc.mockResolvedValue({ data: [fila], error: null, status: 200 });

    expect(await obtenerRanking(4, null)).toEqual({ filas: [fila], incluyeSimulados: true });
    await obtenerRanking(4, 9);

    expect(rpc.mock.calls).toEqual([
      ['ranking_grupo', { id_grupo: 4 }],
      ['ranking_grupo', { id_grupo: 4, id_jornada: 9 }],
    ]);
    expect(desde).not.toHaveBeenCalled();
  });

  it.each(['NO_MIEMBRO', 'JORNADA_INVALIDA', 'SIN_TORNEO_ACTUAL'] as const)(
    'F08 R6: el error %s del ranking se distingue de una falla',
    async (codigo) => {
      rpc.mockResolvedValue({ data: null, error: { message: codigo }, status: 400 });

      const error = await obtenerRanking(4, null).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ErrorGrupo);
      expect((error as ErrorGrupo).codigo).toBe(codigo);
    },
  );

  it('F07 R7: predicciones del grupo de un partido (las RLS filtran, R04)', async () => {
    const c = consulta({ data: [], error: null, status: 200 });
    desde.mockReturnValue(c);

    await obtenerPrediccionesDelGrupo(9);
    expect(desde).toHaveBeenCalledWith('predicciones_grupo');
    expect(c.llamadas).toContainEqual(['eq', 'partido_id', 9]);
  });

  it('sin red, el error se marca como sin conexión', async () => {
    desde.mockReturnValue(consulta({ data: null, error: { message: 'Network request failed' }, status: 0 }));

    const error = await obtenerMisGrupos().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorDatos);
    expect((error as ErrorDatos).sinConexion).toBe(true);
  });
});

describe('acciones', () => {
  it('llaman a las funciones del servidor (F07 R12)', async () => {
    rpc
      .mockResolvedValueOnce({ data: 7, error: null, status: 200 })
      .mockResolvedValueOnce({ data: [{ grupo_id: 7, ya_era_miembro: true }], error: null, status: 200 })
      .mockResolvedValueOnce({ data: null, error: null, status: 204 });

    expect(await crearGrupo('Amigos')).toBe(7);
    expect(await unirseAGrupo('ABCDEFGH')).toEqual({ grupoId: 7, yaEraMiembro: true });
    await salirDeGrupo(7);

    expect(rpc.mock.calls).toEqual([
      ['crear_grupo', { nombre: 'Amigos' }],
      ['unirse_grupo', { codigo: 'ABCDEFGH' }],
      ['salir_grupo', { id_grupo: 7 }],
    ]);
  });

  it.each(['NOMBRE_INVALIDO', 'LIMITE_GRUPOS', 'CODIGO_NO_EXISTE', 'GRUPO_LLENO', 'NO_MIEMBRO'] as const)(
    'F07 R4: el error %s del servidor se distingue de una falla',
    async (codigo) => {
      rpc.mockResolvedValue({ data: null, error: { message: codigo }, status: 400 });

      const error = await unirseAGrupo('ABCDEFGH').catch((e: unknown) => e);
      expect(error).toBeInstanceOf(ErrorGrupo);
      expect((error as ErrorGrupo).codigo).toBe(codigo);
    },
  );

  it('una falla desconocida queda como error de datos', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' }, status: 500 });

    await expect(crearGrupo('Amigos')).rejects.toBeInstanceOf(ErrorDatos);
  });
});
