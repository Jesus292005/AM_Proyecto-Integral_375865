import type { Database, Tables } from '../tipos-db.ts';
import type { PartidoApi } from './esquemas.ts';

type EstadoPartido = Database['public']['Enums']['estado_partido'];
type FaseJornada = Database['public']['Enums']['fase_jornada'];

// --- Estados (F02 A6) ---

// Un Map y no un objeto: así "toString" u otra clave heredada no pasa por un estado válido.
const estadosApi: ReadonlyMap<string, EstadoPartido> = new Map([
  ['TBD', 'PROGRAMADO'],
  ['NS', 'PROGRAMADO'],
  ['1H', 'EN_JUEGO'],
  ['HT', 'EN_JUEGO'],
  ['2H', 'EN_JUEGO'],
  ['ET', 'EN_JUEGO'],
  ['BT', 'EN_JUEGO'],
  ['P', 'EN_JUEGO'],
  ['LIVE', 'EN_JUEGO'],
  ['SUSP', 'EN_JUEGO'],
  ['INT', 'EN_JUEGO'],
  ['FT', 'TERMINADO'],
  ['AET', 'TERMINADO'],
  ['PEN', 'TERMINADO'],
  // Q2: partido ganado por resolución, con el marcador que reporte la API.
  ['AWD', 'TERMINADO'],
  ['WO', 'TERMINADO'],
  ['PST', 'POSPUESTO'],
  ['CANC', 'CANCELADO'],
  ['ABD', 'CANCELADO'],
]);

export type ResultadoEstado =
  | { tipo: 'ok'; estado: EstadoPartido }
  | { tipo: 'desconocido'; valor: string };

/**
 * Convierte `fixture.status.short`. Un estado desconocido se registra como error y el partido
 * no cambia de estado (A6); eso le toca a quien llama.
 */
export function convertirEstado(estadoApi: string): ResultadoEstado {
  const estado = estadosApi.get(estadoApi);
  return estado === undefined ? { tipo: 'desconocido', valor: estadoApi } : { tipo: 'ok', estado };
}

// --- Rondas (F02 A7) ---

export type JornadaDeRonda = { orden: number; nombre: string; fase: FaseJornada };

export type ResultadoRonda =
  | { tipo: 'ok'; jornada: JornadaDeRonda }
  // La temporada de la API trae los dos torneos (Apertura y Clausura): P1 ignora los del otro.
  | { tipo: 'otroTorneo' }
  | { tipo: 'desconocida'; valor: string };

const RONDAS_FASE_REGULAR = 17;

// `orden` fijo por ronda para que nunca cambie al repetir la carga; en 2026 no hay play-in y la
// liguilla empieza en 19.
const rondasLiguilla: ReadonlyMap<string, JornadaDeRonda> = new Map(
  (
    [
      ['reclasificacion', 18, 'Liguilla · Play-in'],
      ['play-offs', 18, 'Liguilla · Play-in'],
      ['quarter-finals', 19, 'Liguilla · Cuartos'],
      ['semi-finals', 20, 'Liguilla · Semifinales'],
      ['final', 21, 'Liguilla · Final'],
    ] as const
  ).map(([ronda, orden, nombre]) => [ronda, { orden, nombre, fase: 'LIGUILLA' }]),
);

/** Sin acentos, en minúsculas y sin espacios sobrantes: la API no es consistente con los acentos. */
export function normalizarNombre(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

/**
 * Convierte `league.round` ("Apertura - 10", "Clausura - Reclasificacion") en la jornada del
 * torneo cuyo `prefijoRondas` se indica. Una ronda desconocida se registra como error y el partido
 * no se guarda (A7); eso le toca a quien llama.
 */
export function convertirRonda(rondaApi: string, prefijoRondas: string): ResultadoRonda {
  const desconocida: ResultadoRonda = { tipo: 'desconocida', valor: rondaApi };
  // El prefijo va separado por " - " con espacios; el guion de "Play-offs" no lo separa.
  const partes = normalizarNombre(rondaApi).split(/\s+-\s+/);
  if (partes.length !== 2) return desconocida;
  const [prefijo = '', ronda = ''] = partes;
  if (prefijo !== normalizarNombre(prefijoRondas)) return { tipo: 'otroTorneo' };

  if (/^\d{1,2}$/.test(ronda)) {
    const orden = Number(ronda);
    if (orden < 1 || orden > RONDAS_FASE_REGULAR) return desconocida;
    return { tipo: 'ok', jornada: { orden, nombre: `Jornada ${orden}`, fase: 'REGULAR' } };
  }

  const jornada = rondasLiguilla.get(ronda);
  return jornada === undefined ? desconocida : { tipo: 'ok', jornada };
}

// --- Marcador (F02 R2) ---

export type MarcadorPartido = Pick<
  Tables<'partido'>,
  'goles_local' | 'goles_visitante' | 'goles_local_medio_tiempo' | 'goles_visitante_medio_tiempo'
>;

/**
 * Marcador de 90 minutos (`score.fulltime`) y de medio tiempo, nunca el que incluye tiempo extra o
 * penales (D43). `null` mientras no se juega.
 */
export function marcadorDePartido(partido: PartidoApi): MarcadorPartido {
  const { fulltime, halftime } = partido.score;
  return {
    goles_local: fulltime.home,
    goles_visitante: fulltime.away,
    goles_local_medio_tiempo: halftime.home,
    goles_visitante_medio_tiempo: halftime.away,
  };
}
