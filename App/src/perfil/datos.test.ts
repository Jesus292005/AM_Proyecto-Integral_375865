import { supabase } from '../supabase/cliente';
import {
  cambiarMiNombre,
  ErrorNombreInvalido,
  guardarEquipoFavorito,
  obtenerEquiposTorneoActual,
  marcarInsigniasVistas,
  obtenerMiCarta,
  obtenerMisInsignias,
  obtenerMiPerfil,
  obtenerMiRacha,
  obtenerMiRol,
} from './datos';

jest.mock('../supabase/cliente', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(async () => ({ data: 0, error: null, status: 200 })),
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

describe('perfil, equipo y nombre (F28, F18)', () => {
  /** Cadena de supabase-js que anota las llamadas y responde `fin`. */
  function cadena(fin: { data: unknown; error: { message: string } | null; status: number }) {
    const llamadas: unknown[][] = [];
    const c: Record<string, unknown> = {};
    for (const metodo of ['select', 'eq', 'update']) {
      c[metodo] = (...a: unknown[]) => (llamadas.push([metodo, ...a]), c);
    }
    c.single = async () => fin;
    c.then = (resolver: (v: unknown) => unknown) => Promise.resolve(fin).then(resolver);
    return { c, llamadas };
  }

  const equipo = {
    id: 1,
    nombre_corto: 'América',
    escudo_url: 'https://x.mx/1.png',
    color_primario: '#FFD100',
    color_texto: '#0B2341',
  };

  it('F28 R7: lee mi perfil con el equipo favorito, validado con Zod', async () => {
    const perfil = { nombre: 'Chucho', foto_url: null, rol: 'USUARIO', equipo };
    const { c, llamadas } = cadena({ data: perfil, error: null, status: 200 });
    desde.mockReturnValue(c);

    expect(await obtenerMiPerfil()).toEqual(perfil);
    expect(llamadas).toContainEqual(['eq', 'id', 'usuario-1']);
    expect(String(llamadas.find((l) => l[0] === 'select')?.[1])).toContain('usuario_equipo_favorito_id_fkey');
  });

  it('un perfil con forma inválida es un error (D54)', async () => {
    const { c } = cadena({ data: { nombre: null, foto_url: null, rol: 'USUARIO', equipo: null }, error: null, status: 200 });
    desde.mockReturnValue(c);

    await expect(obtenerMiPerfil()).rejects.toThrow('forma inválida');
  });

  it('F18 R1: los equipos del torneo actual llegan ordenados por nombre corto', async () => {
    const { c } = cadena({
      data: [{ ...equipo, id: 3, nombre_corto: 'Pumas' }, { ...equipo, id: 4, nombre_corto: 'Atlas' }, equipo],
      error: null,
      status: 200,
    });
    desde.mockReturnValue(c);

    expect((await obtenerEquiposTorneoActual()).map((e) => e.nombre_corto)).toEqual(['América', 'Atlas', 'Pumas']);
    expect(desde).toHaveBeenCalledWith('equipos_torneo_actual');
  });

  it('F18 R2: guarda y quita el equipo de mi propio registro', async () => {
    const { c, llamadas } = cadena({ data: null, error: null, status: 204 });
    desde.mockReturnValue(c);

    await guardarEquipoFavorito(null);
    expect(llamadas).toContainEqual(['update', { equipo_favorito_id: null }]);
    expect(llamadas).toContainEqual(['eq', 'id', 'usuario-1']);
  });

  it('F28 R4: el nombre inválido del servidor llega como ErrorNombreInvalido', async () => {
    const { c } = cadena({ data: null, error: { message: 'NOMBRE_INVALIDO' }, status: 400 });
    desde.mockReturnValue(c);

    await expect(cambiarMiNombre('Al')).rejects.toBeInstanceOf(ErrorNombreInvalido);
  });

  it('F28 R4: devuelve el nombre como lo guardó el servidor', async () => {
    const { c, llamadas } = cadena({ data: { nombre: 'Chucho 10' }, error: null, status: 200 });
    desde.mockReturnValue(c);

    expect(await cambiarMiNombre('  Chucho   10 ')).toBe('Chucho 10');
    expect(llamadas).toContainEqual(['update', { nombre: '  Chucho   10 ' }]);
  });
});

describe('mi carta (F20 R5)', () => {
  function respuesta(data: unknown) {
    const cadena = { select: () => cadena, single: async () => ({ data, error: null, status: 200 }) };
    return cadena;
  }
  const fila = {
    calificadas: 6,
    precision: 89,
    punteria: 67,
    analisis: null,
    constancia: 64,
    media: 73,
    nivel: 'PLATA',
    incluye_simulados: false,
  };

  it('F20 CA3: lee la fila de mi_carta', async () => {
    desde.mockReturnValue(respuesta(fila));

    expect(await obtenerMiCarta()).toEqual(fila);
    expect(desde).toHaveBeenCalledWith('mi_carta');
  });

  it('un nivel desconocido es un error, no un dato (D54)', async () => {
    desde.mockReturnValue(respuesta({ ...fila, nivel: 'DIAMANTE' }));

    await expect(obtenerMiCarta()).rejects.toThrow('forma inválida');
  });
});

describe('Vitrina (F14 R8)', () => {
  const fila = {
    codigo: 'TOP_JORNADA',
    nombre: 'Top de la jornada',
    descripcion: 'Queda 1.º.',
    nivel: 'ORO',
    icono: 'trofeo',
    repetible: true,
    orden: 6,
    veces: 2,
    nueva: true,
    ultima_en: '2026-11-20T03:00:00Z',
    ultima_simulada: false,
    ultimo_grupo: 'Los compas',
    ultima_jornada: 'Jornada 17',
  };

  it('F14 CA4: lee mis_insignias en el orden de la Vitrina', async () => {
    const llamadas: unknown[][] = [];
    const cadena = {
      select: () => cadena,
      order: async (...a: unknown[]) => (llamadas.push(['order', ...a]), { data: [fila], error: null, status: 200 }),
    };
    desde.mockReturnValue(cadena);

    expect(await obtenerMisInsignias()).toEqual([fila]);
    expect(desde).toHaveBeenCalledWith('mis_insignias');
    expect(llamadas).toContainEqual(['order', 'orden']);
  });

  it('F14 R7: marcar como vistas llama a la función del servidor', async () => {
    await marcarInsigniasVistas();

    expect(supabase.rpc).toHaveBeenCalledWith('marcar_insignias_vistas');
  });
});
