import { supabase } from '../supabase/cliente';
import type { Database } from '../supabase/tipos-db';

// Lecturas de S02. La app solo lee de Supabase (F02 B-R1); los datos de fútbol son de solo lectura
// para el usuario (B-R2) y la jornada actual la decide el servidor (`jornada_actual`, Q4, D52).

export type EstadoPartido = Database['public']['Enums']['estado_partido'];

/** Error de una lectura; `sinConexion` distingue la falta de red de una falla del servidor. */
export class ErrorDatos extends Error {
  constructor(
    mensaje: string,
    readonly sinConexion: boolean,
  ) {
    super(mensaje);
    this.name = 'ErrorDatos';
  }
}

// Sin red, supabase-js no lanza: devuelve el error con `status` 0.
function comoErrorDatos(error: { message: string }, status: number): ErrorDatos {
  return new ErrorDatos(error.message, status === 0);
}

export type JornadaDeLista = { id: number; orden: number; nombre: string };

export type TorneoActual = {
  nombre: string;
  /** Ordenadas por `orden`. */
  jornadas: JornadaDeLista[];
  /** `orden` de la jornada actual; null si el torneo no tiene partidos. */
  ordenActual: number | null;
};

/** Torneo actual con sus jornadas, o null si no hay torneo actual. */
export async function obtenerTorneoActual(): Promise<TorneoActual | null> {
  const torneo = await supabase.from('torneo').select('id, nombre').eq('es_actual', true).maybeSingle();
  if (torneo.error) throw comoErrorDatos(torneo.error, torneo.status);
  if (torneo.data === null) return null;

  const [jornadas, actual] = await Promise.all([
    supabase
      .from('jornada')
      .select('id, orden, nombre')
      .eq('torneo_id', torneo.data.id)
      .order('orden'),
    supabase.rpc('jornada_actual'),
  ]);
  if (jornadas.error) throw comoErrorDatos(jornadas.error, jornadas.status);
  if (actual.error) throw comoErrorDatos(actual.error, actual.status);

  return { nombre: torneo.data.nombre, jornadas: jornadas.data, ordenActual: actual.data };
}

export type EquipoDePartido = { nombre_corto: string; escudo_url: string };

export type PartidoDeLista = {
  id: number;
  inicio: string;
  estado: EstadoPartido;
  goles_local: number | null;
  goles_visitante: number | null;
  local: EquipoDePartido;
  visitante: EquipoDePartido;
};

// Un solo literal: supabase-js deduce el tipo del resultado a partir de este texto.
const COLUMNAS_PARTIDO =
  'id, inicio, estado, goles_local, goles_visitante, local:equipo!partido_equipo_local_id_fkey(nombre_corto, escudo_url), visitante:equipo!partido_equipo_visitante_id_fkey(nombre_corto, escudo_url)';

/** Partidos de una jornada con sus dos equipos, por hora de inicio. */
export async function obtenerPartidosDeJornada(jornadaId: number): Promise<PartidoDeLista[]> {
  const { data, error, status } = await supabase
    .from('partido')
    .select(COLUMNAS_PARTIDO)
    .eq('jornada_id', jornadaId)
    .order('inicio')
    .order('id');
  if (error) throw comoErrorDatos(error, status);
  return data;
}
