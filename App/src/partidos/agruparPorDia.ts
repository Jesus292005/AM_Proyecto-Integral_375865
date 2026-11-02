import { claveDia, formatearDia } from '../formato/fechas';
import type { JornadaDeLista, PartidoDeLista } from './datos';

export type DiaDePartidos = { clave: string; titulo: string; data: PartidoDeLista[] };

/**
 * Partidos agrupados por día y ordenados por hora, en la zona del teléfono (F02 B4, CA9).
 * `zonaHoraria` solo se pasa en las pruebas.
 */
export function agruparPorDia(
  partidos: readonly PartidoDeLista[],
  zonaHoraria?: string,
): DiaDePartidos[] {
  const ordenados = [...partidos].sort(
    (a, b) => Date.parse(a.inicio) - Date.parse(b.inicio) || a.id - b.id,
  );
  const dias: DiaDePartidos[] = [];
  for (const partido of ordenados) {
    const inicio = new Date(partido.inicio);
    const clave = claveDia(inicio, zonaHoraria);
    const ultimo = dias.at(-1);
    if (ultimo?.clave === clave) ultimo.data.push(partido);
    else dias.push({ clave, titulo: formatearDia(inicio, zonaHoraria), data: [partido] });
  }
  return dias;
}

/**
 * Jornada a mostrar: la de la ruta (`?jornada=` es el `orden`), si existe; si no, la actual (B3, Q4);
 * si tampoco, la última.
 */
export function elegirJornada(
  jornadas: readonly JornadaDeLista[],
  ordenRuta: string | undefined,
  ordenActual: number | null,
): JornadaDeLista | undefined {
  const pedida = ordenRuta === undefined ? Number.NaN : Number(ordenRuta);
  return (
    jornadas.find((j) => j.orden === pedida) ??
    jornadas.find((j) => j.orden === ordenActual) ??
    jornadas.at(-1)
  );
}
