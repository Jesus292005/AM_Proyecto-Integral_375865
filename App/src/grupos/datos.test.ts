import { ErrorDatos } from '../datos/errores';
import { supabase } from '../supabase/cliente';
import {
  crearGrupo,
  editarGrupo,
  obtenerFaltan,
  obtenerFiguraDeJornada,
  obtenerGrupo,
  obtenerMuro,
  obtenerRoles,
  reaccionar,
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
    maybeSingle: anotar('maybeSingle'),
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
    const fila = {
      id: 1,
      nombre: 'Amigos',
      miembros: 3,
      mi_posicion: 2,
      mi_posicion_antes: null,
      color: 'AZUL',
      lider_nombre: 'Ana',
      lider_es_yo: false,
      lideres: 1,
    };
    const c = consulta({ data: [fila], error: null, status: 200 });
    desde.mockReturnValue(c);

    expect(await obtenerMisGrupos()).toEqual([fila]);
    expect(desde).toHaveBeenCalledWith('mis_grupos');
    expect(c.llamadas).toContainEqual(['order', 'unido_en', { ascending: false }]);
  });

  it('una fila con forma inválida es un error, no un dato (D54)', async () => {
    desde.mockReturnValue(consulta({ data: [{ id: 1, nombre: null, miembros: 3, mi_posicion: null, mi_posicion_antes: null }], error: null, status: 200 }));

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

describe('grupo para S08 y S15 (F26 R6, R7)', () => {
  it('junta el código de `grupo` con nombre, color resuelto y mi rol de `mis_grupos`', async () => {
    const codigo = consulta({ data: { codigo_invitacion: 'ABCDEFGH' }, error: null, status: 200 });
    const mio = consulta({ data: { id: 4, nombre: 'Primos', color: 'ROSA', rol: 'ADMIN', miembros: 3 }, error: null, status: 200 });
    desde.mockImplementation((tabla: string) => (tabla === 'grupo' ? codigo : mio));

    expect(await obtenerGrupo(4)).toEqual({
      id: 4,
      nombre: 'Primos',
      color: 'ROSA',
      rol: 'ADMIN',
      miembros: 3,
      codigo_invitacion: 'ABCDEFGH',
    });
    expect(mio.llamadas).toContainEqual(['eq', 'id', 4]);
  });

  it('F07: si no soy miembro (sin fila en alguna de las dos), devuelve null', async () => {
    desde.mockImplementation((tabla: string) =>
      consulta({ data: tabla === 'grupo' ? null : { id: 4, nombre: 'P', color: 'ROSA', rol: 'ADMIN' }, error: null, status: 200 }),
    );

    expect(await obtenerGrupo(4)).toBeNull();
  });

  it('un color que no es de la paleta es un error, no un dato (D54)', async () => {
    desde.mockImplementation((tabla: string) =>
      consulta({
        data: tabla === 'grupo' ? { codigo_invitacion: 'ABCDEFGH' } : { id: 4, nombre: 'P', color: 'NARANJA', rol: 'ADMIN' },
        error: null,
        status: 200,
      }),
    );

    await expect(obtenerGrupo(4)).rejects.toThrow('forma inválida');
  });

  it('F26 R6: editar llama a editar_grupo y distingue NO_ADMIN de una falla', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null, status: 204 });
    await editarGrupo(4, 'Primos', 'ROSA');
    expect(rpc).toHaveBeenCalledWith('editar_grupo', { id_grupo: 4, nombre: 'Primos', color: 'ROSA' });

    rpc.mockResolvedValueOnce({ data: null, error: { message: 'NO_ADMIN' }, status: 400 });
    const error = await editarGrupo(4, 'Primos', 'ROSA').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorGrupo);
    expect((error as ErrorGrupo).codigo).toBe('NO_ADMIN');
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

describe('S08 (F26 R11, R13, R15, R16)', () => {
  const filaMuro = {
    prediccion_id: 5,
    partido_id: 9,
    inicio: '2026-11-20T20:00:00Z',
    estado: 'TERMINADO',
    goles_local: 2,
    goles_visitante: 1,
    local_nombre_corto: 'Puebla',
    local_escudo_url: 'https://x.mx/l.png',
    local_color_primario: null,
    local_color_texto: null,
    visitante_nombre_corto: 'Santos',
    visitante_escudo_url: 'https://x.mx/v.png',
    visitante_color_primario: '#00FF00',
    visitante_color_texto: '#000000',
    usuario_id: 'b',
    nombre: 'Beto',
    foto_url: null,
    es_yo: false,
    resultado: null,
    rango_goles: null,
    marcador_local: 2,
    marcador_visitante: 0,
    justificacion: 'Presión arriba.',
    estado_evaluacion: 'EVALUADA',
    puntos_bono: 80,
    explicacion: 'Acertó.',
    es_simulada: true,
    reacciones_bien_visto: 1,
    reacciones_buen_analisis: 2,
    reacciones_la_clavo: 3,
    reacciones_me_rio: 4,
    mi_reaccion: 'LA_CLAVO',
  };

  it('F26 CA9: el muro es una llamada a muro_jornada y arma partido, autor, evaluación y reacciones', async () => {
    rpc.mockResolvedValue({ data: [filaMuro], error: null, status: 200 });

    const [a] = await obtenerMuro(1, 12);
    expect(rpc).toHaveBeenCalledWith('muro_jornada', { id_grupo: 1, id_jornada: 12 });
    expect(a).toEqual({
      prediccionId: 5,
      partido: {
        id: 9,
        inicio: '2026-11-20T20:00:00Z',
        estado: 'TERMINADO',
        goles_local: 2,
        goles_visitante: 1,
        local: { nombre_corto: 'Puebla', escudo_url: 'https://x.mx/l.png', color_primario: null, color_texto: null },
        visitante: { nombre_corto: 'Santos', escudo_url: 'https://x.mx/v.png', color_primario: '#00FF00', color_texto: '#000000' },
      },
      autor: { usuario_id: 'b', nombre: 'Beto', foto_url: null, es_yo: false },
      prediccion: { resultado: null, rango_goles: null, marcador_local: 2, marcador_visitante: 0 },
      justificacion: 'Presión arriba.',
      evaluacion: { estado: 'EVALUADA', puntos_bono: 80, explicacion: 'Acertó.' },
      esSimulada: true,
      reacciones: { BIEN_VISTO: 1, BUEN_ANALISIS: 2, LA_CLAVO: 3, ME_RIO: 4 },
      miReaccion: 'LA_CLAVO',
    });
  });

  it('una reacción desconocida en el muro es un error, no un dato (D54)', async () => {
    rpc.mockResolvedValue({ data: [{ ...filaMuro, mi_reaccion: 'FUEGO' }], error: null, status: 200 });

    await expect(obtenerMuro(1, 12)).rejects.toThrow('forma inválida');
  });

  it('F26 CA10: reaccionar pone con el tipo y quita con vacío; PROPIO se distingue de una falla', async () => {
    rpc.mockResolvedValue({ data: null, error: null, status: 204 });
    await reaccionar(1, 5, 'BIEN_VISTO');
    await reaccionar(1, 5, null);
    expect(rpc.mock.calls).toEqual([
      ['reaccionar', { id_grupo: 1, id_prediccion: 5, tipo: 'BIEN_VISTO' }],
      ['reaccionar', { id_grupo: 1, id_prediccion: 5, tipo: null }],
    ]);

    rpc.mockResolvedValue({ data: null, error: { message: 'NO_MIEMBRO' }, status: 400 });
    await expect(reaccionar(1, 5, 'BIEN_VISTO')).rejects.toBeInstanceOf(ErrorGrupo);
  });

  it('F26 CA10: quién falta da cuántos por miembro, los abiertos y la jornada', async () => {
    rpc.mockResolvedValue({
      data: [
        { usuario_id: 'a', faltan: 0, abiertos: 3, jornada_id: 12, jornada_nombre: 'Jornada 2' },
        { usuario_id: 'b', faltan: 2, abiertos: 3, jornada_id: 12, jornada_nombre: 'Jornada 2' },
      ],
      error: null,
      status: 200,
    });

    const faltan = await obtenerFaltan(1);
    expect(rpc).toHaveBeenCalledWith('faltan_por_predecir', { id_grupo: 1 });
    expect(faltan.abiertos).toBe(3);
    expect(faltan.jornada).toBe('Jornada 2');
    expect([...faltan.porMiembro]).toEqual([
      ['a', 0],
      ['b', 2],
    ]);
  });

  it('F26 R16: los roles salen de miembros_grupo del grupo', async () => {
    const c = consulta({ data: [{ usuario_id: 'a', rol: 'ADMIN' }], error: null, status: 200 });
    desde.mockReturnValue(c);

    expect(await obtenerRoles(4)).toEqual([{ usuario_id: 'a', rol: 'ADMIN' }]);
    expect(desde).toHaveBeenCalledWith('miembros_grupo');
    expect(c.llamadas).toContainEqual(['eq', 'grupo_id', 4]);
  });
});

describe('figura de la jornada (F26 R10 v1.2, D115)', () => {
  const partido = {
    partido_id: 9,
    estado: 'TERMINADO',
    goles_local: 2,
    goles_visitante: 1,
    local: { nombre_corto: 'Puebla', escudo_url: 'https://x.mx/l.png', color_primario: null, color_texto: null },
    visitante: { nombre_corto: 'Santos', escudo_url: 'https://x.mx/v.png', color_primario: null, color_texto: null },
    resultado: null,
    rango_goles: 'G3',
    marcador_local: null,
    marcador_visitante: null,
    puntos_resultado: 0,
    puntos_rango_goles: 150,
    puntos_marcador: 0,
    puntos_base: 150,
    justificacion: 'Habrá goles.',
    estado_evaluacion: 'EVALUADA',
    bono: 0,
    explicacion: 'No se verificó.',
    es_simulada: false,
  };
  const filaFigura = {
    usuario_id: 'a',
    nombre: 'Ana',
    foto_url: null,
    es_yo: false,
    puntos_total: 150,
    puntos_base: 150,
    puntos_bono: 0,
    lideres: 1,
    jornada_nombre: 'Jornada 2',
    en_curso: true,
    incluye_simulados: false,
    partidos: [partido],
  };

  it('F26 CA9: una llamada a figura_jornada con el 1.º y sus partidos con puntos por parte', async () => {
    rpc.mockResolvedValue({ data: [filaFigura], error: null, status: 200 });

    expect(await obtenerFiguraDeJornada(1, 12)).toEqual(filaFigura);
    expect(rpc).toHaveBeenCalledWith('figura_jornada', { id_grupo: 1, id_jornada: 12 });
  });

  it('F26 R10 (v1.2): sin filas, null; un partido con forma inválida es un error (D54)', async () => {
    rpc.mockResolvedValueOnce({ data: [], error: null, status: 200 });
    expect(await obtenerFiguraDeJornada(1, 12)).toBeNull();
    rpc.mockResolvedValueOnce({
      data: [{ ...filaFigura, partidos: [{ ...partido, estado: 'RARO' }] }],
      error: null,
      status: 200,
    });
    await expect(obtenerFiguraDeJornada(1, 12)).rejects.toThrow('forma inválida');
  });
});
