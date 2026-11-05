import type { Afirmacion } from './esquema.ts';

// F06 R3 y R7 con la rúbrica aprobada (D94, decisión 1): la IA solo da veredictos; el bono lo
// calcula el servidor. Funciones puras.

export const MOTIVO_SIN_EVIDENCIA = 'Sin evidencia en los datos del partido.';

/**
 * R7: se quedan solo los ids que existen en los datos enviados. Un veredicto distinto de
 * `NO_VERIFICABLE` sin ningún id válido pasa a `NO_VERIFICABLE`.
 */
export function aplicarEvidencia(
  afirmaciones: readonly Afirmacion[],
  idsValidos: ReadonlySet<string>,
): Afirmacion[] {
  return afirmaciones.map((afirmacion) => {
    const evidencia = [...new Set(afirmacion.evidencia.filter((id) => idsValidos.has(id)))];
    if (afirmacion.veredicto === 'NO_VERIFICABLE') return { ...afirmacion, evidencia: [] };
    if (evidencia.length === 0) {
      return { ...afirmacion, veredicto: 'NO_VERIFICABLE', motivo: MOTIVO_SIN_EVIDENCIA, evidencia };
    }
    return { ...afirmacion, evidencia };
  });
}

/**
 * Precisión (70) = 70 × (acertadas + ½ cercanas) / verificables. Alcance (30) = 10 por acertada y 5
 * por cercana, máx. 30. Sin verificables = 0. Entero en 0–100 (R07: nunca resta).
 */
export function calcularBono(afirmaciones: readonly Afirmacion[]): number {
  const verificables = afirmaciones.filter((a) => a.veredicto !== 'NO_VERIFICABLE');
  if (verificables.length === 0) return 0;
  const acertadas = verificables.filter((a) => a.veredicto === 'ACERTADA').length;
  const cercanas = verificables.filter((a) => a.veredicto === 'CERCANA').length;
  const precision = (70 * (acertadas + cercanas / 2)) / verificables.length;
  const alcance = Math.min(30, 10 * acertadas + 5 * cercanas);
  return Math.min(100, Math.max(0, Math.round(precision + alcance)));
}
