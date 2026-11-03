import { comoErrorDatos } from '../datos/errores';
import { supabase } from '../supabase/cliente';
import type { Database } from '../supabase/tipos-db';
import { esCodigoSimulacion, ErrorSimulacion } from './errores';

// Lecturas y acciones de S10 (F09). Las acciones son funciones del servidor que verifican el rol y
// sus precondiciones (R1–R5, R9); la app solo muestra y traduce sus errores.

type EstadoPartido = Database['public']['Enums']['estado_partido'];

function comoErrorAccion(error: { message: string }, status: number): Error {
  return esCodigoSimulacion(error.message) ? new ErrorSimulacion(error.message) : comoErrorDatos(error, status);
}

export type PartidoDeSimulacion = {
  id: number;
  inicio: string;
  cierre_predicciones: string;
  estado: EstadoPartido;
  goles_local: number | null;
  goles_visitante: number | null;
  local: { nombre_corto: string };
  visitante: { nombre_corto: string };
};

// Un solo literal: supabase-js deduce el tipo del resultado a partir de este texto.
const COLUMNAS =
  'id, inicio, cierre_predicciones, estado, goles_local, goles_visitante, local:equipo!partido_equipo_local_id_fkey(nombre_corto), visitante:equipo!partido_equipo_visitante_id_fkey(nombre_corto)';

const TERMINADOS_A_MOSTRAR = 5;

/** "En curso": simulados sin terminar, por hora de cierre (Flujo 2). */
export async function obtenerSimuladosEnCurso(): Promise<PartidoDeSimulacion[]> {
  const { data, error, status } = await supabase
    .from('partido')
    .select(COLUMNAS)
    .eq('es_simulado', true)
    .neq('estado', 'TERMINADO')
    .order('cierre_predicciones')
    .order('id');
  if (error) throw comoErrorDatos(error, status);
  return data;
}

/** Los últimos simulados terminados, con su marcador (Flujo 2). */
export async function obtenerSimuladosTerminados(): Promise<PartidoDeSimulacion[]> {
  const { data, error, status } = await supabase
    .from('partido')
    .select(COLUMNAS)
    .eq('es_simulado', true)
    .eq('estado', 'TERMINADO')
    .order('listo_para_calificar_en', { ascending: false })
    .order('id', { ascending: false })
    .limit(TERMINADOS_A_MOSTRAR);
  if (error) throw comoErrorDatos(error, status);
  return data;
}

/** Orígenes válidos (R2): reales, terminados y con datos listos, por fecha. */
export async function obtenerOrigenes(): Promise<PartidoDeSimulacion[]> {
  const { data, error, status } = await supabase
    .from('partido')
    .select(COLUMNAS)
    .eq('es_simulado', false)
    .eq('estado', 'TERMINADO')
    .not('listo_para_calificar_en', 'is', null)
    .order('inicio')
    .order('id');
  if (error) throw comoErrorDatos(error, status);
  return data;
}

export async function crearSimulado(origen: number, minutos: number): Promise<number> {
  const { data, error, status } = await supabase.rpc('simulacion_crear', { origen, minutos });
  if (error) throw comoErrorAccion(error, status);
  return data;
}

export async function iniciarSimulado(partido: number): Promise<void> {
  const { error, status } = await supabase.rpc('simulacion_iniciar', { partido });
  if (error) throw comoErrorAccion(error, status);
}

export async function terminarSimulado(partido: number): Promise<void> {
  const { error, status } = await supabase.rpc('simulacion_terminar', { partido });
  if (error) throw comoErrorAccion(error, status);
}
