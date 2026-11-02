import { z } from 'zod';

import {
  convertirEstado,
  convertirTipoEvento,
  marcadorDePartido,
  type MarcadorPartido,
} from '../api-football/conversiones.ts';
import {
  esquemaRespuestaEstadisticas,
  esquemaRespuestaEventos,
  esquemaRespuestaPartidos,
  type EstadisticasEquipoApi,
  type EventoApi,
  type PartidoApi,
} from '../api-football/esquemas.ts';
import type { Database } from '../tipos-db.ts';
import {
  type DependenciasEjecucion,
  desenlaceDeFallo,
  ejecutarConRegistro,
  type ResultadoEjecucion,
} from './ejecucion.ts';

// F02 P3 y P4 (tarea cada 15 min, D85):
// - P3 revisa el estado de los partidos que ya debieron terminar (hasta 20 por consulta).
// - P4 descarga estadísticas y eventos de los terminados y los marca como listos para calificar
//   (CA7, D84): 2 consultas por partido, máximo 5 partidos por ejecución.
// Qué partidos están pendientes lo decide la base (`partidos_pendientes_de_final`), con las mismas
// ventanas que usa la tarea programada para decidir si llama a la función.

type EstadoPartido = Database['public']['Enums']['estado_partido'];
type TipoEvento = Database['public']['Enums']['tipo_evento'];

/** Límite de API-Football para `/fixtures?ids=`. */
export const PARTIDOS_POR_CONSULTA = 20;
/** P4: partidos por ejecución (10 consultas); el resto queda para la siguiente (D85). */
export const DATOS_POR_EJECUCION = 5;

// --- Armado (puro) ---

/** Lo que recibe `actualizar_estados_partidos`. */
export type EstadosPartidos = {
  sincronizado_en: string;
  // `estado` null = estado desconocido (A6): el partido conserva el suyo.
  partidos: (MarcadorPartido & { proveedor_id: number; estado: EstadoPartido | null })[];
};

/** Lo que recibe `guardar_datos_partido`. */
export type DatosPartido = {
  partido_proveedor_id: number;
  sincronizado_en: string;
  estadisticas: { equipo_proveedor_id: number; tipo: string; valor: string | null }[];
  eventos: {
    equipo_proveedor_id: number;
    minuto: number;
    minuto_agregado: number | null;
    tipo: TipoEvento;
    detalle: string;
  }[];
};

export function armarEstadosPartidos(
  partidosApi: readonly PartidoApi[],
  ahora: Date,
): { datos: EstadosPartidos; omitidos: string[] } {
  const omitidos: string[] = [];
  const partidos = partidosApi.map((partido) => {
    const estado = convertirEstado(partido.fixture.status.short);
    if (estado.tipo === 'desconocido') {
      omitidos.push(
        `Partido ${partido.fixture.id}: estado desconocido "${estado.valor}"; conserva su estado (A6).`,
      );
    }
    return {
      proveedor_id: partido.fixture.id,
      estado: estado.tipo === 'ok' ? estado.estado : null,
      ...marcadorDePartido(partido),
    };
  });
  return { datos: { sincronizado_en: ahora.toISOString(), partidos }, omitidos };
}

export function armarDatosPartido(
  partidoProveedorId: number,
  estadisticasApi: readonly EstadisticasEquipoApi[],
  eventosApi: readonly EventoApi[],
  ahora: Date,
): { datos: DatosPartido; omitidos: string[] } {
  const omitidos: string[] = [];

  // Un tipo repetido para el mismo equipo se queda con el último valor.
  const estadisticas = new Map<string, DatosPartido['estadisticas'][number]>();
  for (const { team, statistics } of estadisticasApi) {
    for (const { type, value } of statistics) {
      estadisticas.set(`${team.id}|${type}`, {
        equipo_proveedor_id: team.id,
        tipo: type,
        // Como texto, tal como lo manda la API ("17", "49%"); null = sin dato (D29).
        valor: value === null ? null : String(value),
      });
    }
  }
  if (estadisticas.size === 0) {
    omitidos.push('La API no trajo estadísticas; el partido queda listo sin ellas.');
  }

  const eventos: DatosPartido['eventos'] = [];
  for (const evento of eventosApi) {
    const tipo = convertirTipoEvento(evento.type);
    if (tipo.tipo === 'desconocido') {
      omitidos.push(
        `Evento "${tipo.valor}" (${evento.detail}, min ${evento.time.elapsed}): tipo desconocido; no se guardó.`,
      );
      continue;
    }
    eventos.push({
      equipo_proveedor_id: evento.team.id,
      minuto: evento.time.elapsed,
      minuto_agregado: evento.time.extra,
      tipo: tipo.evento,
      detalle: evento.detail,
    });
  }

  return {
    datos: {
      partido_proveedor_id: partidoProveedorId,
      sincronizado_en: ahora.toISOString(),
      estadisticas: [...estadisticas.values()],
      eventos,
    },
    omitidos,
  };
}

// --- Ejecución ---

export const esquemaResumenDatos = z.object({
  estadisticas: z.int().nonnegative(),
  eventos: z.int().nonnegative(),
});

export type ResumenDatos = z.infer<typeof esquemaResumenDatos>;
export type ResumenEstados = { partidos: number };

export type PendienteDeFinal = { proveedor_id: number; estado: EstadoPartido };

export type DependenciasFinales = DependenciasEjecucion & {
  /** Resultado de `partidos_pendientes_de_final(ahora)`. */
  buscarPendientesDeFinal: (ahora: Date) => Promise<PendienteDeFinal[]>;
  actualizarEstados: (datos: EstadosPartidos) => Promise<number>;
  guardarDatosPartido: (datos: DatosPartido) => Promise<ResumenDatos>;
};

export type ResultadoFinales = {
  /** P3; null si no había partidos por revisar. */
  estados: ResultadoEjecucion<ResumenEstados> | null;
  /** P4, uno por partido. */
  datos: (ResultadoEjecucion<ResumenDatos> & { partido: number })[];
};

function enGrupos<T>(lista: readonly T[], tamano: number): T[][] {
  const grupos: T[][] = [];
  for (let i = 0; i < lista.length; i += tamano) grupos.push(lista.slice(i, i + tamano));
  return grupos;
}

/** P3: estado y marcador de los partidos indicados. */
function revisarEstados(
  proveedorIds: readonly number[],
  dependencias: DependenciasFinales,
): Promise<ResultadoEjecucion<ResumenEstados>> {
  return ejecutarConRegistro('DETECCION_FINALES', dependencias, async (consultar) => {
    const partidos: PartidoApi[] = [];
    for (const grupo of enGrupos(proveedorIds, PARTIDOS_POR_CONSULTA)) {
      const respuesta = await consultar(
        '/fixtures',
        { ids: grupo.join('-') },
        esquemaRespuestaPartidos,
      );
      if (respuesta.tipo !== 'ok') return desenlaceDeFallo(respuesta);
      partidos.push(...respuesta.elementos);
    }

    const { datos, omitidos } = armarEstadosPartidos(partidos, dependencias.ahora());
    const recibidos = new Set(partidos.map((p) => p.fixture.id));
    for (const id of proveedorIds) {
      if (!recibidos.has(id)) omitidos.push(`Partido ${id}: la API no lo devolvió.`);
    }

    const total = await dependencias.actualizarEstados(datos);
    return {
      estado: 'EXITO',
      error: omitidos.length > 0 ? omitidos.join('\n') : null,
      resumen: { partidos: total },
    };
  });
}

/** P4: estadísticas y eventos de un partido terminado. */
async function descargarDatos(
  proveedorId: number,
  dependencias: DependenciasFinales,
): Promise<ResultadoEjecucion<ResumenDatos> & { partido: number }> {
  const parametros = { fixture: String(proveedorId) };
  const resultado = await ejecutarConRegistro(
    'DATOS_PARTIDO',
    dependencias,
    async (consultar) => {
      const estadisticas = await consultar(
        '/fixtures/statistics',
        parametros,
        esquemaRespuestaEstadisticas,
      );
      if (estadisticas.tipo !== 'ok') return desenlaceDeFallo(estadisticas);
      const eventos = await consultar('/fixtures/events', parametros, esquemaRespuestaEventos);
      if (eventos.tipo !== 'ok') return desenlaceDeFallo(eventos);

      const { datos, omitidos } = armarDatosPartido(
        proveedorId,
        estadisticas.elementos,
        eventos.elementos,
        dependencias.ahora(),
      );
      const resumen = await dependencias.guardarDatosPartido(datos);
      return {
        estado: 'EXITO',
        error: omitidos.length > 0 ? omitidos.join('\n') : null,
        resumen,
      };
    },
    `Partido ${proveedorId}`,
  );
  return { ...resultado, partido: proveedorId };
}

/**
 * Tarea de cada 15 min: P3 de los pendientes sin terminar y luego P4 de los terminados sin datos
 * (incluidos los que P3 acaba de ver terminar). Con `forzarPartidos` (administrador) solo hace P4
 * de esos partidos, sin ventanas ni límite por ejecución.
 */
export async function ejecutarDeteccionFinales(
  dependencias: DependenciasFinales,
  forzarPartidos?: readonly number[],
): Promise<ResultadoFinales> {
  const datos: ResultadoFinales['datos'] = [];

  if (forzarPartidos !== undefined) {
    for (const id of new Set(forzarPartidos)) datos.push(await descargarDatos(id, dependencias));
    return { estados: null, datos };
  }

  let pendientes = await dependencias.buscarPendientesDeFinal(dependencias.ahora());
  const porRevisar = pendientes.filter((p) => p.estado !== 'TERMINADO').map((p) => p.proveedor_id);

  let estados: ResultadoFinales['estados'] = null;
  if (porRevisar.length > 0) {
    estados = await revisarEstados(porRevisar, dependencias);
    pendientes = await dependencias.buscarPendientesDeFinal(dependencias.ahora());
  }

  const terminados = pendientes.filter((p) => p.estado === 'TERMINADO').slice(0, DATOS_POR_EJECUCION);
  for (const { proveedor_id } of terminados) {
    datos.push(await descargarDatos(proveedor_id, dependencias));
  }
  return { estados, datos };
}
