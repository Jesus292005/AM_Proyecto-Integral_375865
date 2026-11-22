import { z } from 'zod';

import { comoErrorDatos } from '../datos/errores';
import { columnasEquipos, equipos } from '../datos/equipos';
import type { EquipoDePartido } from '../partidos/datos';
import { supabase } from '../supabase/cliente';
import { COLORES_GRUPO, type ColorGrupo } from '../tema';
import { ErrorGrupo, esCodigoGrupo } from './errores';

// Lecturas y acciones de grupos (F07) y su ranking (F08). Crear, unirse y salir son funciones del servidor que usan
// `auth.uid()` y validan los límites (R3–R5, R12); las lecturas pasan por las RLS (R04, R12). Las
// vistas devuelven columnas que pueden venir vacías: Zod valida su forma (D54).

const entero = z.number().int();
const esquemaColor = z.enum(COLORES_GRUPO);
const esquemaRol = z.enum(['ADMIN', 'MIEMBRO']);

// F08 R8: `mi_posicion` en el ranking del torneo actual; vacía sin torneo actual. F17 R8:
// `mi_posicion_antes`, la misma sin la jornada de referencia; vacía si no hay un "antes".
const esquemaMiGrupo = z.object({
  id: entero,
  nombre: z.string(),
  miembros: entero,
  mi_posicion: entero.nullable(),
  mi_posicion_antes: entero.nullable(),
  // F26 R2, R5: color resuelto y el 1.º del ranking del torneo (vacíos si nadie tiene puntos).
  color: esquemaColor,
  lider_nombre: z.string().nullable(),
  lider_es_yo: z.boolean().nullable(),
  lideres: entero.nullable(),
});
// S08 y S15: el grupo con mi rol (F26 R6, R7). El código sale de `grupo`; lo demás, de `mis_grupos`.
const esquemaGrupoDetalle = z.object({
  id: entero,
  nombre: z.string(),
  color: esquemaColor,
  rol: esquemaRol,
  miembros: entero,
});
// F08 R6: una fila por miembro actual; de otros, solo nombre, foto y puntos.
const esquemaFilaRanking = z.object({
  posicion: entero,
  usuario_id: z.string(),
  nombre: z.string(),
  foto_url: z.string().nullable(),
  puntos_total: entero,
  puntos_base: entero,
  puntos_bono: entero,
  marcadores_exactos: entero,
  es_yo: z.boolean(),
  incluye_simulados: z.boolean(),
  ultima_calificacion: z.string().nullable(),
});
const esquemaPrediccionAjena = z.object({
  usuario_id: z.string(),
  nombre: z.string(),
  foto_url: z.string().nullable(),
  resultado: z.enum(['LOCAL', 'EMPATE', 'VISITANTE']).nullable(),
  rango_goles: z.enum(['G0_1', 'G2', 'G3', 'G4_MAS']).nullable(),
  marcador_local: entero.nullable(),
  marcador_visitante: entero.nullable(),
  justificacion: z.string().nullable(),
});
// F26 R11, R13: el muro de una jornada, con conteos de reacciones y la mía.
export const TIPOS_REACCION = ['BIEN_VISTO', 'BUEN_ANALISIS', 'LA_CLAVO', 'ME_RIO'] as const;
export type TipoReaccion = (typeof TIPOS_REACCION)[number];
const esquemaFilaMuro = z.object({
  prediccion_id: entero,
  partido_id: entero,
  inicio: z.string(),
  estado: z.enum(['PROGRAMADO', 'EN_JUEGO', 'TERMINADO', 'POSPUESTO', 'CANCELADO']),
  goles_local: entero.nullable(),
  goles_visitante: entero.nullable(),
  ...columnasEquipos,
  usuario_id: z.string(),
  nombre: z.string(),
  foto_url: z.string().nullable(),
  es_yo: z.boolean(),
  resultado: z.enum(['LOCAL', 'EMPATE', 'VISITANTE']).nullable(),
  rango_goles: z.enum(['G0_1', 'G2', 'G3', 'G4_MAS']).nullable(),
  marcador_local: entero.nullable(),
  marcador_visitante: entero.nullable(),
  justificacion: z.string(),
  estado_evaluacion: z.enum(['PENDIENTE', 'EVALUADA', 'ERROR']),
  puntos_bono: entero.nullable(),
  explicacion: z.string().nullable(),
  es_simulada: z.boolean(),
  reacciones_bien_visto: entero,
  reacciones_buen_analisis: entero,
  reacciones_la_clavo: entero,
  reacciones_me_rio: entero,
  mi_reaccion: z.enum(TIPOS_REACCION).nullable(),
});
// F26 R15: cuántos partidos abiertos de la jornada actual le faltan a cada miembro.
const esquemaFaltan = z.object({
  usuario_id: z.string(),
  faltan: entero,
  abiertos: entero,
  jornada_nombre: z.string().nullable(),
});
// S08 Miembros (F07 R10): el rol de cada miembro; nombre, foto y posición vienen del ranking.
const esquemaMiembro = z.object({ usuario_id: z.string(), rol: esquemaRol });
const esquemaUnion = z.array(z.object({ grupo_id: entero, ya_era_miembro: z.boolean() })).length(1);

export type MiGrupo = z.infer<typeof esquemaMiGrupo>;
export type FilaRanking = z.infer<typeof esquemaFilaRanking>;
export type Ranking = { filas: FilaRanking[]; incluyeSimulados: boolean };
export type PrediccionAjena = z.infer<typeof esquemaPrediccionAjena>;
export type GrupoDetalle = z.infer<typeof esquemaGrupoDetalle> & { codigo_invitacion: string };
export type Union = { grupoId: number; yaEraMiembro: boolean };
export type PartidoDelMuro = {
  id: number;
  inicio: string;
  estado: z.infer<typeof esquemaFilaMuro>['estado'];
  goles_local: number | null;
  goles_visitante: number | null;
  local: EquipoDePartido;
  visitante: EquipoDePartido;
};
export type AnalisisDelMuro = {
  prediccionId: number;
  partido: PartidoDelMuro;
  autor: { usuario_id: string; nombre: string; foto_url: string | null; es_yo: boolean };
  prediccion: Pick<PrediccionAjena, 'resultado' | 'rango_goles' | 'marcador_local' | 'marcador_visitante'>;
  justificacion: string;
  evaluacion: { estado: 'PENDIENTE' | 'EVALUADA' | 'ERROR'; puntos_bono: number | null; explicacion: string | null };
  esSimulada: boolean;
  reacciones: Record<TipoReaccion, number>;
  miReaccion: TipoReaccion | null;
};
export type Faltan = { porMiembro: Map<string, number>; abiertos: number; jornada: string | null };
export type MiembroConRol = z.infer<typeof esquemaMiembro>;

function validar<T>(esquema: z.ZodType<T>, datos: unknown, que: string): T {
  const resultado = esquema.safeParse(datos);
  if (!resultado.success) throw new Error(`${que} con forma inválida: ${z.prettifyError(resultado.error)}`);
  return resultado.data;
}

function comoErrorAccion(error: { message: string }, status: number): Error {
  return esCodigoGrupo(error.message) ? new ErrorGrupo(error.message) : comoErrorDatos(error, status);
}

/** S04: mis grupos, del más reciente al que me uní (R9). */
export async function obtenerMisGrupos(): Promise<MiGrupo[]> {
  const { data, error, status } = await supabase
    .from('mis_grupos')
    .select('id, nombre, miembros, mi_posicion, mi_posicion_antes, color, lider_nombre, lider_es_yo, lideres')
    .order('unido_en', { ascending: false })
    .order('id', { ascending: false });
  if (error) throw comoErrorDatos(error, status);
  return validar(z.array(esquemaMiGrupo), data, 'Mis grupos');
}

/** S08 y S15: el grupo con su código, color y mi rol, o null si no existe o no soy miembro (RLS). */
export async function obtenerGrupo(grupoId: number): Promise<GrupoDetalle | null> {
  const [codigo, mio] = await Promise.all([
    supabase.from('grupo').select('codigo_invitacion').eq('id', grupoId).maybeSingle(),
    supabase.from('mis_grupos').select('id, nombre, color, rol, miembros').eq('id', grupoId).maybeSingle(),
  ]);
  if (codigo.error) throw comoErrorDatos(codigo.error, codigo.status);
  if (mio.error) throw comoErrorDatos(mio.error, mio.status);
  if (codigo.data === null || mio.data === null) return null;
  const grupo = validar(esquemaGrupoDetalle, mio.data, 'Grupo');
  return { ...grupo, codigo_invitacion: codigo.data.codigo_invitacion };
}

/**
 * S08: ranking del grupo en el torneo actual (`jornadaId` null) o en una jornada (F08 R6). Una sola
 * llamada; el servidor suma, ordena y desempata (D52).
 */
export async function obtenerRanking(grupoId: number, jornadaId: number | null): Promise<Ranking> {
  const { data, error, status } = await supabase.rpc(
    'ranking_grupo',
    jornadaId === null ? { id_grupo: grupoId } : { id_grupo: grupoId, id_jornada: jornadaId },
  );
  if (error) throw comoErrorAccion(error, status);
  const filas = validar(z.array(esquemaFilaRanking), data, 'Ranking');
  return { filas, incluyeSimulados: filas.some((f) => f.incluye_simulados) };
}

/** S03 cerrado: predicciones de quienes comparten grupo conmigo (R6, R7), por nombre. */
export async function obtenerPrediccionesDelGrupo(partidoId: number): Promise<PrediccionAjena[]> {
  const { data, error, status } = await supabase
    .from('predicciones_grupo')
    .select(
      'usuario_id, nombre, foto_url, resultado, rango_goles, marcador_local, marcador_visitante, justificacion',
    )
    .eq('partido_id', partidoId)
    .order('nombre');
  if (error) throw comoErrorDatos(error, status);
  return validar(z.array(esquemaPrediccionAjena), data, 'Predicciones del grupo');
}

/** S08 Jornada: el muro de esa jornada en una sola llamada (F26 R11, R19); ya viene ordenado. */
export async function obtenerMuro(grupoId: number, jornadaId: number): Promise<AnalisisDelMuro[]> {
  const { data, error, status } = await supabase.rpc('muro_jornada', { id_grupo: grupoId, id_jornada: jornadaId });
  if (error) throw comoErrorAccion(error, status);
  return validar(z.array(esquemaFilaMuro), data, 'Muro').map((f) => ({
    prediccionId: f.prediccion_id,
    partido: {
      id: f.partido_id,
      inicio: f.inicio,
      estado: f.estado,
      goles_local: f.goles_local,
      goles_visitante: f.goles_visitante,
      ...equipos(f),
    },
    autor: { usuario_id: f.usuario_id, nombre: f.nombre, foto_url: f.foto_url, es_yo: f.es_yo },
    prediccion: {
      resultado: f.resultado,
      rango_goles: f.rango_goles,
      marcador_local: f.marcador_local,
      marcador_visitante: f.marcador_visitante,
    },
    justificacion: f.justificacion,
    evaluacion: { estado: f.estado_evaluacion, puntos_bono: f.puntos_bono, explicacion: f.explicacion },
    esSimulada: f.es_simulada,
    reacciones: {
      BIEN_VISTO: f.reacciones_bien_visto,
      BUEN_ANALISIS: f.reacciones_buen_analisis,
      LA_CLAVO: f.reacciones_la_clavo,
      ME_RIO: f.reacciones_me_rio,
    },
    miReaccion: f.mi_reaccion,
  }));
}

/** Poner, cambiar (otro tipo) o quitar (null) mi reacción a un análisis del muro (F26 R13). */
export async function reaccionar(grupoId: number, prediccionId: number, tipo: TipoReaccion | null): Promise<void> {
  const { error, status } = await supabase.rpc('reaccionar', {
    id_grupo: grupoId,
    id_prediccion: prediccionId,
    // Vacío = quitar; los tipos generados lo marcan como texto.
    tipo: tipo as string,
  });
  if (error) throw comoErrorAccion(error, status);
}

/** S08 Miembros: cuántos partidos abiertos de la jornada actual le faltan a cada uno (F26 R15). */
export async function obtenerFaltan(grupoId: number): Promise<Faltan> {
  const { data, error, status } = await supabase.rpc('faltan_por_predecir', { id_grupo: grupoId });
  if (error) throw comoErrorAccion(error, status);
  const filas = validar(z.array(esquemaFaltan), data, 'Quién falta');
  return {
    porMiembro: new Map(filas.map((f) => [f.usuario_id, f.faltan])),
    abiertos: filas[0]?.abiertos ?? 0,
    jornada: filas[0]?.jornada_nombre ?? null,
  };
}

/** S08 Miembros: el rol de cada miembro (F07 R10). */
export async function obtenerRoles(grupoId: number): Promise<MiembroConRol[]> {
  const { data, error, status } = await supabase
    .from('miembros_grupo')
    .select('usuario_id, rol')
    .eq('grupo_id', grupoId);
  if (error) throw comoErrorDatos(error, status);
  return validar(z.array(esquemaMiembro), data, 'Miembros');
}

export async function crearGrupo(nombre: string): Promise<number> {
  const { data, error, status } = await supabase.rpc('crear_grupo', { nombre });
  if (error) throw comoErrorAccion(error, status);
  return data;
}

/** Un solo camino para el código escrito y el QR (R4, F12). `codigo` ya viene validado. */
export async function unirseAGrupo(codigo: string): Promise<Union> {
  const { data, error, status } = await supabase.rpc('unirse_grupo', { codigo });
  if (error) throw comoErrorAccion(error, status);
  const [fila] = validar(esquemaUnion, data, 'Respuesta de unirse');
  if (fila === undefined) throw new Error('Respuesta de unirse vacía');
  return { grupoId: fila.grupo_id, yaEraMiembro: fila.ya_era_miembro };
}

/** S15: solo el `ADMIN` (F26 R6). El servidor recorta y valida el nombre y el color. */
export async function editarGrupo(grupoId: number, nombre: string, color: ColorGrupo): Promise<void> {
  const { error, status } = await supabase.rpc('editar_grupo', { id_grupo: grupoId, nombre, color });
  if (error) throw comoErrorAccion(error, status);
}

export async function salirDeGrupo(grupoId: number): Promise<void> {
  const { error, status } = await supabase.rpc('salir_grupo', { id_grupo: grupoId });
  if (error) throw comoErrorAccion(error, status);
}
