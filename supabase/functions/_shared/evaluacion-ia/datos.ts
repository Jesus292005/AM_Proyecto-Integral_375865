import type { PrediccionACalificar } from '../calificacion/puntos.ts';
import type { Enums } from '../tipos-db.ts';

// F06 R2: los datos del partido que recibe el modelo, y nada más. Cada estadística y cada evento
// lleva un id (`S1`, `E4`…) que el modelo cita como evidencia (R7). Sin datos personales.

export type DatosPartidoIA = {
  local: string;
  visitante: string;
  /** "Apertura 2024 · Jornada 7". */
  contexto: string;
  marcador: { local: number; visitante: number };
  medioTiempo: { local: number; visitante: number } | null;
  /** Un renglón por tipo; `null` = sin dato (D29). */
  estadisticas: { tipo: string; local: string | null; visitante: string | null }[];
  eventos: {
    minuto: number;
    minutoAgregado: number | null;
    lado: 'local' | 'visitante';
    tipo: Enums<'tipo_evento'>;
    detalle: string;
  }[];
};

export type Evidencia = { id: string; texto: string };

const ESTADISTICAS: Record<string, string> = {
  'Ball Possession': 'Posesión',
  'Total Shots': 'Tiros totales',
  'Shots on Goal': 'Tiros a gol',
  'Shots off Goal': 'Tiros desviados',
  'Blocked Shots': 'Tiros bloqueados',
  'Shots insidebox': 'Tiros dentro del área',
  'Shots outsidebox': 'Tiros fuera del área',
  'Goalkeeper Saves': 'Atajadas del portero',
  'Corner Kicks': 'Tiros de esquina',
  Offsides: 'Fueras de lugar',
  Fouls: 'Faltas',
  'Yellow Cards': 'Tarjetas amarillas',
  'Red Cards': 'Tarjetas rojas',
  'Total passes': 'Pases totales',
  'Passes accurate': 'Pases precisos',
  'Passes %': 'Precisión de pases',
  expected_goals: 'Goles esperados (xG)',
  goals_prevented: 'Goles evitados por el portero',
};

const ORDEN_ESTADISTICAS = Object.keys(ESTADISTICAS);

const EVENTOS: Record<string, string> = {
  'Normal Goal': 'Gol',
  Penalty: 'Gol de penal',
  'Own Goal': 'Autogol',
  'Missed Penalty': 'Penal fallado',
  'Yellow Card': 'Tarjeta amarilla',
  'Red Card': 'Tarjeta roja',
  'Second Yellow card': 'Segunda amarilla (expulsión)',
  'Penalty confirmed': 'VAR: penal confirmado',
  'Penalty cancelled': 'VAR: penal anulado',
  'Goal cancelled': 'VAR: gol anulado',
  'Goal confirmed': 'VAR: gol confirmado',
  'Goal Disallowed - offside': 'VAR: gol anulado por fuera de lugar',
  'Card upgrade': 'VAR: tarjeta cambiada',
};

const TIPOS_EVENTO: Record<Enums<'tipo_evento'>, string> = {
  GOL: 'Gol',
  TARJETA: 'Tarjeta',
  CAMBIO: 'Cambio',
  VAR: 'VAR',
};

function etiquetaEvento(tipo: Enums<'tipo_evento'>, detalle: string): string {
  if (tipo === 'CAMBIO') return 'Cambio';
  return EVENTOS[detalle] ?? `${TIPOS_EVENTO[tipo]} (${detalle})`;
}

function minuto(evento: DatosPartidoIA['eventos'][number]): string {
  return evento.minutoAgregado === null
    ? `${evento.minuto}'`
    : `${evento.minuto}+${evento.minutoAgregado}'`;
}

function ordenEstadistica(tipo: string): number {
  const posicion = ORDEN_ESTADISTICAS.indexOf(tipo);
  return posicion === -1 ? ORDEN_ESTADISTICAS.length : posicion;
}

/** Estadísticas en un orden fijo (las desconocidas al final, por nombre) y eventos por minuto. */
export function armarEvidencias(datos: DatosPartidoIA): {
  estadisticas: Evidencia[];
  eventos: Evidencia[];
} {
  const estadisticas = datos.estadisticas
    .toSorted((a, b) => ordenEstadistica(a.tipo) - ordenEstadistica(b.tipo) || a.tipo.localeCompare(b.tipo))
    // v3: el nombre de cada equipo va junto a su valor; con solo el orden en un encabezado, Haiku
    // 5.5 invertía las columnas (T48).
    .map((e, i) => ({
      id: `S${i + 1}`,
      texto: `${ESTADISTICAS[e.tipo] ?? e.tipo}: ${datos.local} ${e.local ?? 'sin dato'} · ` +
        `${datos.visitante} ${e.visitante ?? 'sin dato'}`,
    }));
  const eventos = datos.eventos
    .toSorted((a, b) => a.minuto - b.minuto || (a.minutoAgregado ?? 0) - (b.minutoAgregado ?? 0))
    .map((e, i) => ({
      id: `E${i + 1}`,
      texto: `${minuto(e)} ${e.lado === 'local' ? datos.local : datos.visitante}: ${etiquetaEvento(e.tipo, e.detalle)}`,
    }));
  return { estadisticas, eventos };
}

/** Bloque de texto con el partido y sus evidencias, y los ids válidos para R7. */
export function textoDatos(datos: DatosPartidoIA): { texto: string; ids: Set<string> } {
  const { estadisticas, eventos } = armarEvidencias(datos);
  const { local, visitante, marcador, medioTiempo } = datos;
  const lineas = [
    'PARTIDO',
    `${local} (local) vs ${visitante} (visitante) · ${datos.contexto}`,
    `Marcador a los 90 minutos: ${local} ${marcador.local}-${marcador.visitante} ${visitante}` +
      (medioTiempo ? ` · Medio tiempo: ${medioTiempo.local}-${medioTiempo.visitante}` : ''),
    '',
    'ESTADÍSTICAS ("sin dato" = la fuente no lo trae)',
    ...(estadisticas.length > 0 ? estadisticas.map((e) => `${e.id} ${e.texto}`) : ['Sin estadísticas.']),
    '',
    'EVENTOS (minuto, equipo y qué pasó; los datos no incluyen nombres de jugadores)',
    ...(eventos.length > 0 ? eventos.map((e) => `${e.id} ${e.texto}`) : ['Sin eventos.']),
  ];
  return {
    texto: lineas.join('\n'),
    ids: new Set([...estadisticas, ...eventos].map((e) => e.id)),
  };
}

const RANGOS: Record<Enums<'rango_goles'>, string> = {
  G0_1: '0 o 1',
  G2: '2',
  G3: '3',
  G4_MAS: '4 o más',
};

/** La predicción en palabras, solo como contexto para el modelo (R2). */
export function textoPrediccion(
  prediccion: PrediccionACalificar,
  local: string,
  visitante: string,
): string {
  if (prediccion.marcador_local !== null && prediccion.marcador_visitante !== null) {
    return `Marcador exacto: ${local} ${prediccion.marcador_local}-${prediccion.marcador_visitante} ${visitante}`;
  }
  const partes: string[] = [];
  if (prediccion.resultado === 'LOCAL') partes.push(`Resultado: gana ${local}`);
  if (prediccion.resultado === 'VISITANTE') partes.push(`Resultado: gana ${visitante}`);
  if (prediccion.resultado === 'EMPATE') partes.push('Resultado: empate');
  if (prediccion.rango_goles !== null) {
    partes.push(`Goles en total: ${RANGOS[prediccion.rango_goles]}`);
  }
  return partes.join(' · ');
}
