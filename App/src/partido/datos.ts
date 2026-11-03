import { comoErrorDatos } from '../datos/errores';
import { idUsuarioActual } from '../datos/sesionActual';
import { supabase } from '../supabase/cliente';
import type { EleccionPrediccion, EstadoPartido, Prediccion } from './eleccion';

// Lecturas y escrituras de S03 (F03). El cierre lo aplica el servidor (R1): la app solo distingue
// su error (`PREDICCIONES_CERRADAS`, R6) de una falla.

/** El servidor rechazó el cambio porque el partido ya cerró (F03 R6). */
export class ErrorPrediccionesCerradas extends Error {
  constructor() {
    super('PREDICCIONES_CERRADAS');
    this.name = 'ErrorPrediccionesCerradas';
  }
}

function comoErrorEscritura(error: { message: string }, status: number): Error {
  return error.message === 'PREDICCIONES_CERRADAS'
    ? new ErrorPrediccionesCerradas()
    : comoErrorDatos(error, status);
}

export type EquipoDeEncabezado = { nombre_corto: string; color_primario: string | null };

export type PartidoDetalle = {
  id: number;
  inicio: string;
  cierre_predicciones: string;
  estado: EstadoPartido;
  es_simulado: boolean;
  goles_local: number | null;
  goles_visitante: number | null;
  local: EquipoDeEncabezado;
  visitante: EquipoDeEncabezado;
};

// Un solo literal: supabase-js deduce el tipo del resultado a partir de este texto.
const COLUMNAS_PARTIDO =
  'id, inicio, cierre_predicciones, estado, es_simulado, goles_local, goles_visitante, local:equipo!partido_equipo_local_id_fkey(nombre_corto, color_primario), visitante:equipo!partido_equipo_visitante_id_fkey(nombre_corto, color_primario)';

const COLUMNAS_PREDICCION =
  'resultado, rango_goles, marcador_local, marcador_visitante, justificacion, actualizada_en';

/** El partido con sus equipos, o null si no existe. */
export async function obtenerPartido(partidoId: number): Promise<PartidoDetalle | null> {
  const { data, error, status } = await supabase
    .from('partido')
    .select(COLUMNAS_PARTIDO)
    .eq('id', partidoId)
    .maybeSingle();
  if (error) throw comoErrorDatos(error, status);
  return data;
}

/** Mi predicción del partido, o null. */
export async function obtenerMiPrediccion(partidoId: number): Promise<Prediccion | null> {
  const usuarioId = await idUsuarioActual();
  const { data, error, status } = await supabase
    .from('prediccion')
    .select(COLUMNAS_PREDICCION)
    .eq('partido_id', partidoId)
    .eq('usuario_id', usuarioId)
    .maybeSingle();
  if (error) throw comoErrorDatos(error, status);
  return data;
}

/** Crea o reemplaza mi predicción (R4); el usuario y las fechas los pone el servidor. */
export async function guardarPrediccion(
  partidoId: number,
  eleccion: EleccionPrediccion,
): Promise<Prediccion> {
  const { data, error, status } = await supabase
    .from('prediccion')
    .upsert({ partido_id: partidoId, ...eleccion }, { onConflict: 'usuario_id,partido_id' })
    .select(COLUMNAS_PREDICCION)
    .single();
  if (error) throw comoErrorEscritura(error, status);
  return data;
}

/** Quita mi predicción del partido (decisión 1, D90). */
export async function quitarPrediccion(partidoId: number): Promise<void> {
  const { error, status } = await supabase.from('prediccion').delete().eq('partido_id', partidoId);
  if (error) throw comoErrorEscritura(error, status);
}
