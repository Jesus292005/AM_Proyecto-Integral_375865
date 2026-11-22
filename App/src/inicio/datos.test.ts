// T109: lecturas de S11 (F17 R4, R6, R8, R10) con Zod (D54).
import { supabase } from '../supabase/cliente';
import {
  obtenerMejorAnalisis,
  obtenerMiUltimaJornada,
  obtenerPendientes,
  obtenerProximoPartidoEquipo,
} from './datos';

jest.mock('../supabase/cliente', () => ({
  supabase: { from: jest.fn(), rpc: jest.fn() },
}));

const desde = supabase.from as unknown as jest.Mock;
const rpc = supabase.rpc as unknown as jest.Mock;

function consulta(respuesta: { data: unknown; error: unknown; status: number }) {
  const llamadas: unknown[][] = [];
  const cadena = {
    llamadas,
    select: (...a: unknown[]) => (llamadas.push(['select', ...a]), cadena),
    order: (...a: unknown[]) => (llamadas.push(['order', ...a]), cadena),
    maybeSingle: async () => respuesta,
    then: (resolver: (r: typeof respuesta) => unknown) => Promise.resolve(respuesta).then(resolver),
  };
  return cadena;
}

const equiposPlanos = {
  local_nombre_corto: 'América',
  local_escudo_url: 'https://x.mx/1.png',
  local_color_primario: '#FFD100',
  local_color_texto: '#0B2341',
  visitante_nombre_corto: 'Chivas',
  visitante_escudo_url: 'https://x.mx/2.png',
  visitante_color_primario: null,
  visitante_color_texto: null,
};
const equipos = {
  local: { nombre_corto: 'América', escudo_url: 'https://x.mx/1.png', color_primario: '#FFD100', color_texto: '#0B2341' },
  visitante: { nombre_corto: 'Chivas', escudo_url: 'https://x.mx/2.png', color_primario: null, color_texto: null },
};
const partido = {
  id: 7,
  jornada_id: 10,
  jornada_orden: 10,
  jornada_nombre: 'Jornada 10',
  inicio: '2026-11-28T03:00:00Z',
  cierre_predicciones: '2026-11-28T03:00:00Z',
  estado: 'PROGRAMADO',
};

beforeEach(() => {
  desde.mockReset();
  rpc.mockReset();
});

describe('pendientes (R4)', () => {
  it('F17 R4: lee mis_pendientes ordenados por cierre y arma los equipos', async () => {
    const c = consulta({ data: [{ ...partido, es_simulado: true, ...equiposPlanos }], error: null, status: 200 });
    desde.mockReturnValue(c);

    expect(await obtenerPendientes()).toEqual([
      {
        id: 7,
        jornada: { id: 10, orden: 10, nombre: 'Jornada 10' },
        inicio: partido.inicio,
        cierre_predicciones: partido.cierre_predicciones,
        estado: 'PROGRAMADO',
        es_simulado: true,
        ...equipos,
      },
    ]);
    expect(desde).toHaveBeenCalledWith('mis_pendientes');
    expect(c.llamadas[1]).toEqual(['order', 'cierre_predicciones']);
  });

  it('una fila con forma inválida es un error, no un dato (D54)', async () => {
    desde.mockReturnValue(consulta({ data: [{ ...partido, es_simulado: null, ...equiposPlanos }], error: null, status: 200 }));
    await expect(obtenerPendientes()).rejects.toThrow('forma inválida');
  });

  it('sin red, el error lo dice (05-ui §6)', async () => {
    desde.mockReturnValue(consulta({ data: null, error: { message: 'Network request failed' }, status: 0 }));
    await expect(obtenerPendientes()).rejects.toMatchObject({ sinConexion: true });
  });
});

describe('tu equipo (R6)', () => {
  it('F17 R6: lee proximo_partido_equipo', async () => {
    desde.mockReturnValue(consulta({ data: { ...partido, tengo_prediccion: true, ...equiposPlanos }, error: null, status: 200 }));

    expect(await obtenerProximoPartidoEquipo()).toMatchObject({ id: 7, tengo_prediccion: true, ...equipos });
    expect(desde).toHaveBeenCalledWith('proximo_partido_equipo');
  });

  it('F17 R6: sin equipo o sin más partidos, null', async () => {
    desde.mockReturnValue(consulta({ data: null, error: null, status: 200 }));
    expect(await obtenerProximoPartidoEquipo()).toBeNull();
  });
});

describe('mi última jornada (R8)', () => {
  const fila = {
    jornada_id: 9,
    jornada_orden: 9,
    jornada_nombre: 'Jornada 9',
    en_curso: true,
    predicciones_calificadas: 2,
    puntos_base: 500,
    puntos_bono: 60,
    puntos_total: 560,
    bonos_pendientes: 1,
    mejor_analisis_partido_id: 5,
    mejor_analisis_bono: 60,
    incluye_simulados: false,
  };

  it('F17 R8: lee mi_ultima_jornada', async () => {
    desde.mockReturnValue(consulta({ data: fila, error: null, status: 200 }));
    expect(await obtenerMiUltimaJornada()).toEqual(fila);
    expect(desde).toHaveBeenCalledWith('mi_ultima_jornada');
  });

  it('F17 R8: sin partidos calificados, null', async () => {
    desde.mockReturnValue(consulta({ data: null, error: null, status: 200 }));
    expect(await obtenerMiUltimaJornada()).toBeNull();
  });
});

describe('mejor análisis (R10)', () => {
  const fila = {
    partido_id: 5,
    goles_local: 2,
    goles_visitante: 1,
    usuario_id: 'usuario-2',
    nombre: 'Pepe',
    foto_url: null,
    es_yo: false,
    justificacion: 'Viene de 4 victorias.',
    puntos_bono: 82,
    explicacion: 'Bien citado.',
    grupo_id: 1,
    grupo_nombre: 'Amigos',
    jornada_id: 9,
    jornada_nombre: 'Jornada 9',
    en_curso: true,
    es_simulada: false,
    ...equiposPlanos,
  };

  it('F17 R10: una sola llamada a mejor_analisis_jornada', async () => {
    rpc.mockResolvedValue({ data: [fila], error: null, status: 200 });

    expect(await obtenerMejorAnalisis()).toMatchObject({ nombre: 'Pepe', puntos_bono: 82, en_curso: true, ...equipos });
    expect(rpc).toHaveBeenCalledWith('mejor_analisis_jornada');
  });

  it('F17 R10: sin filas, null', async () => {
    rpc.mockResolvedValue({ data: [], error: null, status: 200 });
    expect(await obtenerMejorAnalisis()).toBeNull();
  });

  it('más de una fila es un error de forma (D54)', async () => {
    rpc.mockResolvedValue({ data: [fila, fila], error: null, status: 200 });
    await expect(obtenerMejorAnalisis()).rejects.toThrow('forma inválida');
  });
});
