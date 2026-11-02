import { z } from 'zod';

import type { ConsultarApi } from '../api-football/cliente.ts';
import type { ErroresApi } from '../api-football/esquemas.ts';
import type { Database } from '../tipos-db.ts';
import {
  inicioDelDiaDeConsultas,
  puedeConsultar,
  TOPE_CONSULTAS_DIARIAS,
} from './tope-consultas.ts';

// Núcleo común de P1–P4: cada ejecución deja su registro en `sincronizacion` (R8), cuenta sus
// consultas y revisa el tope antes de cada una (R4), y valida cada respuesta (R5, R6).

export type EstadoSincronizacion = Database['public']['Enums']['estado_sincronizacion'];
export type TipoSincronizacion = Database['public']['Enums']['tipo_sincronizacion'];

/** Lo que una ejecución necesita de afuera; se reemplaza por dobles en las pruebas. */
export type DependenciasEjecucion = {
  consultarApi: ConsultarApi;
  /** Suma de `consultas_usadas` de los registros de `sincronizacion` desde `desde` (R4). */
  contarConsultasDelDia: (desde: Date) => Promise<number>;
  iniciarRegistro: (tipo: TipoSincronizacion) => Promise<number>;
  anotarConsultas: (idRegistro: number, consultas: number) => Promise<void>;
  terminarRegistro: (
    idRegistro: number,
    final: { estado: EstadoSincronizacion; error: string | null },
  ) => Promise<void>;
  ahora: () => Date;
};

export type ResultadoConsulta<T> =
  | { tipo: 'ok'; elementos: T[] }
  | { tipo: 'tope' }
  | { tipo: 'error'; mensaje: string };

export type Consultar = <T>(
  ruta: string,
  parametros: Readonly<Record<string, string>>,
  esquema: z.ZodType<{ errors: ErroresApi; response: T[] }>,
) => Promise<ResultadoConsulta<T>>;

/** Cómo terminó el trabajo de una ejecución. */
export type Desenlace<R> = { estado: EstadoSincronizacion; error: string | null; resumen: R | null };

export type ResultadoEjecucion<R> = Desenlace<R> & { consultas: number };

const LARGO_MAXIMO_ERROR = 2000;

function recortar(texto: string): string {
  return texto.length <= LARGO_MAXIMO_ERROR ? texto : `${texto.slice(0, LARGO_MAXIMO_ERROR)}…`;
}

function tieneErrores(errores: ErroresApi): boolean {
  return !Array.isArray(errores) && Object.keys(errores).length > 0;
}

/** Desenlace de una consulta que no se pudo hacer o falló. */
export function desenlaceDeFallo(
  resultado: { tipo: 'tope' } | { tipo: 'error'; mensaje: string },
): Desenlace<never> {
  return resultado.tipo === 'tope'
    ? {
      estado: 'DETENIDA_POR_TOPE',
      error: `Tope de ${TOPE_CONSULTAS_DIARIAS} consultas diarias alcanzado (R4); se reintenta mañana.`,
      resumen: null,
    }
    : { estado: 'ERROR', error: resultado.mensaje, resumen: null };
}

/**
 * Corre `trabajo` con su registro: lo abre, le da `consultar` y lo cierra con el desenlace (o con
 * ERROR si algo lanza una excepción). `contexto` se antepone a los errores (p. ej. el partido).
 */
export async function ejecutarConRegistro<R>(
  tipo: TipoSincronizacion,
  dependencias: DependenciasEjecucion,
  trabajo: (consultar: Consultar) => Promise<Desenlace<R>>,
  contexto?: string,
): Promise<ResultadoEjecucion<R>> {
  const idRegistro = await dependencias.iniciarRegistro(tipo);
  let consultas = 0;
  let consultasPrevias: number | null = null;

  // R4 antes de cada consulta; la consulta se cuenta aunque falle.
  const consultar: Consultar = async (ruta, parametros, esquema) => {
    consultasPrevias ??= await dependencias.contarConsultasDelDia(
      inicioDelDiaDeConsultas(dependencias.ahora()),
    );
    if (!puedeConsultar(consultasPrevias + consultas, tipo)) return { tipo: 'tope' };
    consultas++;
    await dependencias.anotarConsultas(idRegistro, consultas);

    const respuesta = await dependencias.consultarApi(ruta, parametros);
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

  let desenlace: Desenlace<R>;
  try {
    desenlace = await trabajo(consultar);
  } catch (error) {
    const motivo = error instanceof Error ? error.message : String(error);
    desenlace = { estado: 'ERROR', error: `Error inesperado: ${motivo}`, resumen: null };
  }

  const conContexto = desenlace.error !== null && contexto !== undefined
    ? `${contexto}: ${desenlace.error}`
    : desenlace.error;
  const error = conContexto === null ? null : recortar(conContexto);
  await dependencias.terminarRegistro(idRegistro, { estado: desenlace.estado, error });
  return { ...desenlace, error, consultas };
}
