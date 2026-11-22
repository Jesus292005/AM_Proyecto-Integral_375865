import { z } from 'zod';

import { comoErrorDatos } from '../datos/errores';
import type { EquipoDePartido } from '../partidos/datos';
import { supabase } from '../supabase/cliente';

// Lecturas de S11 Inicio (F17). Todo lo decide el servidor (D52): qué está pendiente, el próximo
// partido de mi equipo, la jornada de referencia, mis puntos de esa jornada y el mejor análisis de
// mis grupos. Las vistas devuelven columnas que pueden venir vacías en sus tipos: Zod valida su
// forma (D54). La posición antes de la jornada viaja en `mis_grupos` (`grupos/datos`).

export { ErrorDatos } from '../datos/errores';

const entero = z.number().int();
const estadoPartido = z.enum(['PROGRAMADO', 'EN_JUEGO', 'TERMINADO', 'POSPUESTO', 'CANCELADO']);

function validar<T>(esquema: z.ZodType<T>, datos: unknown, que: string): T {
  const resultado = esquema.safeParse(datos);
  if (!resultado.success) throw new Error(`${que} con forma inválida: ${z.prettifyError(resultado.error)}`);
  return resultado.data;
}

// Los equipos llegan en columnas planas `local_*` / `visitante_*`.
const columnasEquipos = {
  local_nombre_corto: z.string(),
  local_escudo_url: z.string(),
  local_color_primario: z.string().nullable(),
  local_color_texto: z.string().nullable(),
  visitante_nombre_corto: z.string(),
  visitante_escudo_url: z.string(),
  visitante_color_primario: z.string().nullable(),
  visitante_color_texto: z.string().nullable(),
};
const COLUMNAS_EQUIPOS =
  'local_nombre_corto, local_escudo_url, local_color_primario, local_color_texto, visitante_nombre_corto, visitante_escudo_url, visitante_color_primario, visitante_color_texto';

type FilaEquipos = { [K in keyof typeof columnasEquipos]: z.infer<(typeof columnasEquipos)[K]> };

function equipos(fila: FilaEquipos): { local: EquipoDePartido; visitante: EquipoDePartido } {
  return {
    local: {
      nombre_corto: fila.local_nombre_corto,
      escudo_url: fila.local_escudo_url,
      color_primario: fila.local_color_primario,
      color_texto: fila.local_color_texto,
    },
    visitante: {
      nombre_corto: fila.visitante_nombre_corto,
      escudo_url: fila.visitante_escudo_url,
      color_primario: fila.visitante_color_primario,
      color_texto: fila.visitante_color_texto,
    },
  };
}

export type JornadaDePartido = { id: number; orden: number; nombre: string };

// ---------------------------------------------------------------------------
// Bloque 1 · Pendientes (R4)
// ---------------------------------------------------------------------------

const esquemaPendiente = z.object({
  id: entero,
  jornada_id: entero,
  jornada_orden: entero,
  jornada_nombre: z.string(),
  inicio: z.string(),
  cierre_predicciones: z.string(),
  estado: estadoPartido,
  es_simulado: z.boolean(),
  ...columnasEquipos,
});

export type Pendiente = {
  id: number;
  jornada: JornadaDePartido;
  inicio: string;
  cierre_predicciones: string;
  estado: z.infer<typeof estadoPartido>;
  es_simulado: boolean;
  local: EquipoDePartido;
  visitante: EquipoDePartido;
};

/** Partidos abiertos sin mi predicción de la jornada actual y la siguiente, por cierre (R4). */
export async function obtenerPendientes(): Promise<Pendiente[]> {
  const { data, error, status } = await supabase
    .from('mis_pendientes')
    .select(
      `id, jornada_id, jornada_orden, jornada_nombre, inicio, cierre_predicciones, estado, es_simulado, ${COLUMNAS_EQUIPOS}`,
    )
    .order('cierre_predicciones')
    .order('inicio')
    .order('id');
  if (error) throw comoErrorDatos(error, status);
  return validar(z.array(esquemaPendiente), data, 'Pendientes').map((fila) => ({
    id: fila.id,
    jornada: { id: fila.jornada_id, orden: fila.jornada_orden, nombre: fila.jornada_nombre },
    inicio: fila.inicio,
    cierre_predicciones: fila.cierre_predicciones,
    estado: fila.estado,
    es_simulado: fila.es_simulado,
    ...equipos(fila),
  }));
}

// ---------------------------------------------------------------------------
// Bloque 2 · Tu equipo (R6)
// ---------------------------------------------------------------------------

const esquemaProximo = z.object({
  id: entero,
  jornada_id: entero,
  jornada_orden: entero,
  jornada_nombre: z.string(),
  inicio: z.string(),
  cierre_predicciones: z.string(),
  estado: estadoPartido,
  tengo_prediccion: z.boolean(),
  ...columnasEquipos,
});

export type ProximoPartido = Omit<Pendiente, 'es_simulado'> & { tengo_prediccion: boolean };

/** El partido en juego o el siguiente de mi equipo favorito; null sin equipo o sin más partidos. */
export async function obtenerProximoPartidoEquipo(): Promise<ProximoPartido | null> {
  const { data, error, status } = await supabase
    .from('proximo_partido_equipo')
    .select(
      `id, jornada_id, jornada_orden, jornada_nombre, inicio, cierre_predicciones, estado, tengo_prediccion, ${COLUMNAS_EQUIPOS}`,
    )
    .maybeSingle();
  if (error) throw comoErrorDatos(error, status);
  if (data === null) return null;
  const fila = validar(esquemaProximo, data, 'Próximo partido');
  return {
    id: fila.id,
    jornada: { id: fila.jornada_id, orden: fila.jornada_orden, nombre: fila.jornada_nombre },
    inicio: fila.inicio,
    cierre_predicciones: fila.cierre_predicciones,
    estado: fila.estado,
    tengo_prediccion: fila.tengo_prediccion,
    ...equipos(fila),
  };
}

// ---------------------------------------------------------------------------
// Bloque 3 · Mi última jornada (R8)
// ---------------------------------------------------------------------------

const esquemaUltimaJornada = z.object({
  jornada_id: entero,
  jornada_orden: entero,
  jornada_nombre: z.string(),
  en_curso: z.boolean(),
  predicciones_calificadas: entero,
  puntos_base: entero,
  puntos_bono: entero,
  puntos_total: entero,
  bonos_pendientes: entero,
  mejor_analisis_partido_id: entero.nullable(),
  mejor_analisis_bono: entero.nullable(),
  incluye_simulados: z.boolean(),
});

export type UltimaJornada = z.infer<typeof esquemaUltimaJornada>;

/** Mis puntos de la jornada de referencia (R3); null si no hay partidos calificados en el torneo. */
export async function obtenerMiUltimaJornada(): Promise<UltimaJornada | null> {
  const { data, error, status } = await supabase
    .from('mi_ultima_jornada')
    .select(
      'jornada_id, jornada_orden, jornada_nombre, en_curso, predicciones_calificadas, puntos_base, puntos_bono, puntos_total, bonos_pendientes, mejor_analisis_partido_id, mejor_analisis_bono, incluye_simulados',
    )
    .maybeSingle();
  if (error) throw comoErrorDatos(error, status);
  return data === null ? null : validar(esquemaUltimaJornada, data, 'Última jornada');
}

// ---------------------------------------------------------------------------
// Bloque 4 · Mejor análisis (R10)
// ---------------------------------------------------------------------------

const esquemaMejorAnalisis = z.object({
  partido_id: entero,
  goles_local: entero.nullable(),
  goles_visitante: entero.nullable(),
  usuario_id: z.string(),
  nombre: z.string(),
  foto_url: z.string().nullable(),
  es_yo: z.boolean(),
  justificacion: z.string(),
  puntos_bono: entero,
  explicacion: z.string(),
  grupo_id: entero,
  grupo_nombre: z.string(),
  jornada_id: entero,
  jornada_nombre: z.string(),
  en_curso: z.boolean(),
  es_simulada: z.boolean(),
  ...columnasEquipos,
});

type FilaMejorAnalisis = z.infer<typeof esquemaMejorAnalisis>;

export type MejorAnalisis = Omit<FilaMejorAnalisis, keyof FilaEquipos> & {
  local: EquipoDePartido;
  visitante: EquipoDePartido;
};

/** El mayor bono (≥ 50) de la jornada entre mis grupos (R10); null si no hay. */
export async function obtenerMejorAnalisis(): Promise<MejorAnalisis | null> {
  const { data, error, status } = await supabase.rpc('mejor_analisis_jornada');
  if (error) throw comoErrorDatos(error, status);
  const filas = validar(z.array(esquemaMejorAnalisis).max(1), data, 'Mejor análisis');
  const fila = filas[0];
  if (fila === undefined) return null;
  return {
    partido_id: fila.partido_id,
    goles_local: fila.goles_local,
    goles_visitante: fila.goles_visitante,
    usuario_id: fila.usuario_id,
    nombre: fila.nombre,
    foto_url: fila.foto_url,
    es_yo: fila.es_yo,
    justificacion: fila.justificacion,
    puntos_bono: fila.puntos_bono,
    explicacion: fila.explicacion,
    grupo_id: fila.grupo_id,
    grupo_nombre: fila.grupo_nombre,
    jornada_id: fila.jornada_id,
    jornada_nombre: fila.jornada_nombre,
    en_curso: fila.en_curso,
    es_simulada: fila.es_simulada,
    ...equipos(fila),
  };
}
