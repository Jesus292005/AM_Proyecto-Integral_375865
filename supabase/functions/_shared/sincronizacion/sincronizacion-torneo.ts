import { z } from 'zod';

import type { ConsultarApi } from '../api-football/cliente.ts';
import {
  convertirEstado,
  convertirRonda,
  type JornadaDeRonda,
  marcadorDePartido,
  type MarcadorPartido,
} from '../api-football/conversiones.ts';
import {
  type EquipoApi,
  type ErroresApi,
  esquemaRespuestaEquipos,
  esquemaRespuestaPartidos,
  type PartidoApi,
} from '../api-football/esquemas.ts';
import { nombreCortoDeEquipo } from '../datos-equipos.ts';
import type { Database, Tables } from '../tipos-db.ts';
import {
  inicioDelDiaDeConsultas,
  puedeConsultar,
  TOPE_CONSULTAS_DIARIAS,
} from './tope-consultas.ts';

// Sincronización de un torneo completo con API-Football (F02):
// - P1 carga inicial (manual, una vez por torneo): `/teams` y `/fixtures`.
// - P2 actualización diaria del torneo actual: solo `/fixtures` (horarios, pospuestos, cancelados,
//   marcadores y los partidos de liguilla que se publican después); los equipos salen de los
//   partidos (A8).
// Si una consulta falla no se guarda nada (R5–R7); lo que sí se guarda va en una sola transacción
// (`guardar_carga_inicial`, que ambos procesos usan).

type EstadoPartido = Database['public']['Enums']['estado_partido'];
type EstadoSincronizacion = Database['public']['Enums']['estado_sincronizacion'];
type TipoSincronizacion = Database['public']['Enums']['tipo_sincronizacion'];

/** Liga MX en API-Football (03-data-model). */
export const ID_LIGA_MX = 262;

/** Cuerpo de la petición de P1 (D54). */
export const esquemaParametrosCarga = z.object({
  temporada: z.int().min(2000).max(2100),
  prefijoRondas: z.string().trim().min(1),
  nombre: z.string().trim().min(1),
  // `true` lo marca como torneo actual (y desmarca el anterior); `false` no cambia la marca.
  esActual: z.boolean(),
});

export type ParametrosCarga = z.infer<typeof esquemaParametrosCarga>;

// --- Armado (puro) ---

/** Lo que recibe `guardar_carga_inicial`, con los nombres de las columnas. */
export type CargaTorneo = {
  liga: Pick<Tables<'liga'>, 'proveedor_id' | 'nombre' | 'pais'>;
  torneo: Pick<
    Tables<'torneo'>,
    'nombre' | 'temporada_proveedor' | 'prefijo_rondas' | 'fecha_inicio' | 'fecha_fin' | 'es_actual'
  >;
  equipos: Pick<Tables<'equipo'>, 'proveedor_id' | 'nombre' | 'nombre_corto' | 'escudo_url'>[];
  jornadas: Pick<
    Tables<'jornada'>,
    'orden' | 'nombre' | 'nombres_proveedor' | 'fase' | 'fecha_inicio' | 'fecha_fin'
  >[];
  partidos: PartidoDeCarga[];
  /** También es el "ahora" con el que la base decide si mueve el cierre de predicciones (R9). */
  sincronizado_en: string;
};

type PartidoDeCarga = MarcadorPartido & {
  proveedor_id: number;
  jornada_orden: number;
  equipo_local_proveedor_id: number;
  equipo_visitante_proveedor_id: number;
  inicio: string;
  // null = estado desconocido (A6): uno nuevo entra como PROGRAMADO y uno existente no cambia.
  estado: EstadoPartido | null;
};

export type ResultadoArmado =
  | { tipo: 'ok'; carga: CargaTorneo; omitidos: string[] }
  | { tipo: 'error'; mensaje: string };

/** Fecha de la API en UTC con formato ISO (R3). */
function enUtc(fecha: string): string {
  return new Date(fecha).toISOString();
}

export function armarCargaTorneo(
  parametros: ParametrosCarga,
  equiposApi: readonly EquipoApi[],
  partidosApi: readonly PartidoApi[],
  ahora: Date,
): ResultadoArmado {
  const omitidos: string[] = [];

  const delTorneo: { partido: PartidoApi; jornada: JornadaDeRonda }[] = [];
  for (const partido of partidosApi) {
    const ronda = convertirRonda(partido.league.round, parametros.prefijoRondas);
    if (ronda.tipo === 'otroTorneo') continue;
    if (ronda.tipo === 'desconocida') {
      omitidos.push(
        `Partido ${partido.fixture.id}: ronda desconocida "${ronda.valor}"; no se guardó (A7).`,
      );
      continue;
    }
    delTorneo.push({ partido, jornada: ronda.jornada });
  }

  const primero = delTorneo[0];
  if (primero === undefined) {
    return {
      tipo: 'error',
      mensaje: `No hay partidos de "${parametros.prefijoRondas}" en la temporada ${parametros.temporada}.`,
    };
  }

  // Equipos de `/teams` y, si un partido trae uno que no está ahí, se crea con sus datos (A8).
  const equipos = new Map<number, CargaTorneo['equipos'][number]>();
  const agregarEquipo = (proveedorId: number, nombre: string, escudoUrl: string) => {
    if (equipos.has(proveedorId)) return;
    equipos.set(proveedorId, {
      proveedor_id: proveedorId,
      nombre,
      nombre_corto: nombreCortoDeEquipo(proveedorId, nombre),
      escudo_url: escudoUrl,
    });
  };
  for (const { team } of equiposApi) agregarEquipo(team.id, team.name, team.logo);

  const jornadas = new Map<number, CargaTorneo['jornadas'][number]>();
  const partidos: PartidoDeCarga[] = [];
  for (const { partido, jornada } of delTorneo) {
    const { home, away } = partido.teams;
    agregarEquipo(home.id, home.name, home.logo);
    agregarEquipo(away.id, away.name, away.logo);

    const inicio = enUtc(partido.fixture.date);
    const existente = jornadas.get(jornada.orden);
    if (existente === undefined) {
      jornadas.set(jornada.orden, {
        ...jornada,
        nombres_proveedor: [partido.league.round],
        fecha_inicio: inicio,
        fecha_fin: inicio,
      });
    } else {
      if (!existente.nombres_proveedor.includes(partido.league.round)) {
        existente.nombres_proveedor.push(partido.league.round);
        existente.nombres_proveedor.sort();
      }
      if (inicio < existente.fecha_inicio) existente.fecha_inicio = inicio;
      if (inicio > existente.fecha_fin) existente.fecha_fin = inicio;
    }

    const estado = convertirEstado(partido.fixture.status.short);
    if (estado.tipo === 'desconocido') {
      omitidos.push(
        `Partido ${partido.fixture.id}: estado desconocido "${estado.valor}"; conserva su estado` +
          ' (si es nuevo, PROGRAMADO) (A6).',
      );
    }

    partidos.push({
      proveedor_id: partido.fixture.id,
      jornada_orden: jornada.orden,
      equipo_local_proveedor_id: home.id,
      equipo_visitante_proveedor_id: away.id,
      inicio,
      estado: estado.tipo === 'ok' ? estado.estado : null,
      ...marcadorDePartido(partido),
    });
  }

  // ISO en UTC: el orden de los textos es el de las fechas.
  const inicios = partidos.map((p) => p.inicio).sort();
  const { league } = primero.partido;

  return {
    tipo: 'ok',
    omitidos,
    carga: {
      liga: { proveedor_id: league.id, nombre: league.name, pais: league.country },
      torneo: {
        nombre: parametros.nombre,
        temporada_proveedor: parametros.temporada,
        prefijo_rondas: parametros.prefijoRondas,
        fecha_inicio: inicios[0] ?? primero.partido.fixture.date,
        fecha_fin: inicios.at(-1) ?? primero.partido.fixture.date,
        es_actual: parametros.esActual,
      },
      equipos: [...equipos.values()],
      jornadas: [...jornadas.values()].sort((a, b) => a.orden - b.orden),
      partidos,
      sincronizado_en: ahora.toISOString(),
    },
  };
}

// --- Ejecución ---

export const esquemaResumenCarga = z.object({
  equipos: z.int().nonnegative(),
  jornadas: z.int().nonnegative(),
  partidos: z.int().nonnegative(),
});

export type ResumenCarga = z.infer<typeof esquemaResumenCarga>;

export type TorneoActual = Pick<Tables<'torneo'>, 'nombre' | 'temporada_proveedor' | 'prefijo_rondas'>;

/** Lo que la ejecución necesita de afuera; se reemplaza por dobles en las pruebas. */
export type DependenciasSincronizacion = {
  consultarApi: ConsultarApi;
  /** Suma de `consultas_usadas` de los registros de `sincronizacion` desde `desde` (R4). */
  contarConsultasDelDia: (desde: Date) => Promise<number>;
  iniciarRegistro: (tipo: TipoSincronizacion) => Promise<number>;
  anotarConsultas: (idRegistro: number, consultas: number) => Promise<void>;
  terminarRegistro: (
    idRegistro: number,
    final: { estado: EstadoSincronizacion; error: string | null },
  ) => Promise<void>;
  guardarCarga: (carga: CargaTorneo) => Promise<ResumenCarga>;
  ahora: () => Date;
};

export type DependenciasActualizacion = DependenciasSincronizacion & {
  /** Torneo con `es_actual` de la liga indicada, o null si no hay. */
  buscarTorneoActual: (proveedorIdLiga: number) => Promise<TorneoActual | null>;
};

export type ResultadoSincronizacion = {
  estado: EstadoSincronizacion;
  consultas: number;
  error: string | null;
  resumen: ResumenCarga | null;
};

type ResultadoConsulta<T> =
  | { tipo: 'ok'; elementos: T[] }
  | { tipo: 'tope' }
  | { tipo: 'error'; mensaje: string };

const LARGO_MAXIMO_ERROR = 2000;

function recortar(texto: string): string {
  return texto.length <= LARGO_MAXIMO_ERROR ? texto : `${texto.slice(0, LARGO_MAXIMO_ERROR)}…`;
}

function tieneErrores(errores: ErroresApi): boolean {
  return !Array.isArray(errores) && Object.keys(errores).length > 0;
}

type ConfiguracionSincronizacion = {
  tipo: 'CARGA_INICIAL' | 'ACTUALIZACION_DIARIA';
  consultarEquipos: boolean;
  /** Torneo a sincronizar; null = no hay (se registra como error). */
  obtenerParametros: () => Promise<ParametrosCarga | null>;
};

/** Núcleo de P1 y P2, con su registro en `sincronizacion` (R8). */
async function sincronizarTorneo(
  configuracion: ConfiguracionSincronizacion,
  dependencias: DependenciasSincronizacion,
): Promise<ResultadoSincronizacion> {
  const idRegistro = await dependencias.iniciarRegistro(configuracion.tipo);
  let consultas = 0;

  const terminar = async (
    estado: EstadoSincronizacion,
    error: string | null,
    resumen: ResumenCarga | null = null,
  ): Promise<ResultadoSincronizacion> => {
    const errorRecortado = error === null ? null : recortar(error);
    await dependencias.terminarRegistro(idRegistro, { estado, error: errorRecortado });
    return { estado, consultas, error: errorRecortado, resumen };
  };

  try {
    const parametros = await configuracion.obtenerParametros();
    if (parametros === null) {
      return await terminar(
        'ERROR',
        'No hay torneo actual de la Liga MX (`es_actual`); primero se corre la carga inicial (P1).',
      );
    }

    const consultasPrevias = await dependencias.contarConsultasDelDia(
      inicioDelDiaDeConsultas(dependencias.ahora()),
    );

    // R4 antes de cada consulta; la consulta se cuenta aunque falle.
    const consultar = async <T>(
      ruta: string,
      esquema: z.ZodType<{ errors: ErroresApi; response: T[] }>,
    ): Promise<ResultadoConsulta<T>> => {
      if (!puedeConsultar(consultasPrevias + consultas, configuracion.tipo)) return { tipo: 'tope' };
      consultas++;
      await dependencias.anotarConsultas(idRegistro, consultas);

      const parametrosRuta = { league: String(ID_LIGA_MX), season: String(parametros.temporada) };
      const respuesta = await dependencias.consultarApi(ruta, parametrosRuta);
      if (respuesta.tipo === 'error') return respuesta;

      const datos = esquema.safeParse(respuesta.cuerpo);
      if (!datos.success) {
        return {
          tipo: 'error',
          mensaje: `Respuesta con forma inesperada de ${ruta} (R5):\n${z.prettifyError(datos.error)}`,
        };
      }
      if (tieneErrores(datos.data.errors)) {
        return {
          tipo: 'error',
          mensaje: `API-Football respondió con errores en ${ruta} (R6): ${JSON.stringify(datos.data.errors)}`,
        };
      }
      return { tipo: 'ok', elementos: datos.data.response };
    };

    const fallo = (resultado: { tipo: 'tope' } | { tipo: 'error'; mensaje: string }) =>
      resultado.tipo === 'tope'
        ? terminar(
          'DETENIDA_POR_TOPE',
          `Tope de ${TOPE_CONSULTAS_DIARIAS} consultas diarias alcanzado (R4); se reintenta mañana.`,
        )
        : terminar('ERROR', resultado.mensaje);

    const equipos: ResultadoConsulta<EquipoApi> = configuracion.consultarEquipos
      ? await consultar('/teams', esquemaRespuestaEquipos)
      : { tipo: 'ok', elementos: [] };
    if (equipos.tipo !== 'ok') return await fallo(equipos);
    const partidos = await consultar('/fixtures', esquemaRespuestaPartidos);
    if (partidos.tipo !== 'ok') return await fallo(partidos);

    const armado = armarCargaTorneo(
      parametros,
      equipos.elementos,
      partidos.elementos,
      dependencias.ahora(),
    );
    if (armado.tipo === 'error') return await terminar('ERROR', armado.mensaje);

    const resumen = await dependencias.guardarCarga(armado.carga);
    const omitidos = armado.omitidos.length > 0 ? armado.omitidos.join('\n') : null;
    return await terminar('EXITO', omitidos, resumen);
  } catch (error) {
    const motivo = error instanceof Error ? error.message : String(error);
    return await terminar('ERROR', `Error inesperado: ${motivo}`);
  }
}

/** P1: carga inicial del torneo indicado. */
export function ejecutarCargaInicial(
  parametros: ParametrosCarga,
  dependencias: DependenciasSincronizacion,
): Promise<ResultadoSincronizacion> {
  return sincronizarTorneo(
    {
      tipo: 'CARGA_INICIAL',
      consultarEquipos: true,
      obtenerParametros: () => Promise.resolve(parametros),
    },
    dependencias,
  );
}

/** P2: actualización diaria del torneo actual (sin cambiar su marca de actual). */
export function ejecutarActualizacionDiaria(
  dependencias: DependenciasActualizacion,
): Promise<ResultadoSincronizacion> {
  return sincronizarTorneo(
    {
      tipo: 'ACTUALIZACION_DIARIA',
      consultarEquipos: false,
      obtenerParametros: async () => {
        const torneo = await dependencias.buscarTorneoActual(ID_LIGA_MX);
        if (torneo === null) return null;
        return {
          temporada: torneo.temporada_proveedor,
          prefijoRondas: torneo.prefijo_rondas,
          nombre: torneo.nombre,
          esActual: false,
        };
      },
    },
    dependencias,
  );
}
