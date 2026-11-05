import type { Enums, Tables } from '../tipos-db.ts';

// Motor de puntos de F05 (tabla de R05 de la spec): función pura, sin acceso a la base. Los valores
// vienen de `valor_puntos` (R2) y el marcador real es el de 90 minutos (R3, D43).

export type Resultado = Enums<'resultado_prediccion'>;
export type RangoGoles = Enums<'rango_goles'>;

export type PrediccionACalificar = Pick<
  Tables<'prediccion'>,
  'id' | 'resultado' | 'rango_goles' | 'marcador_local' | 'marcador_visitante'
>;

export type Marcador = { local: number; visitante: number };

export type ValoresPuntos = Pick<Tables<'valor_puntos'>, 'resultado' | 'rango_goles' | 'marcador_exacto'>;

export type PuntosPrediccion = {
  puntos_resultado: number;
  puntos_rango_goles: number;
  puntos_marcador: number;
  puntos_base: number;
};

export function resultadoDe({ local, visitante }: Marcador): Resultado {
  if (local > visitante) return 'LOCAL';
  if (local < visitante) return 'VISITANTE';
  return 'EMPATE';
}

/** Rango del total de goles (D48): 0–1, 2, 3, 4 o más. */
export function rangoDe({ local, visitante }: Marcador): RangoGoles {
  const total = local + visitante;
  if (total <= 1) return 'G0_1';
  if (total === 2) return 'G2';
  if (total === 3) return 'G3';
  return 'G4_MAS';
}

function puntos(resultado: number, rango: number, marcador: number): PuntosPrediccion {
  return {
    puntos_resultado: resultado,
    puntos_rango_goles: rango,
    puntos_marcador: marcador,
    puntos_base: resultado + rango + marcador,
  };
}

/**
 * Forma (a): cada parte elegida que acierta suma su valor. Forma (b): el marcador exacto vale
 * `marcador_exacto`; si falla, suman el resultado y el rango deducidos de él que acierten (D27), sin
 * sumar doble (D19). Fallar = 0 (D07).
 */
export function calificarPrediccion(
  prediccion: PrediccionACalificar,
  real: Marcador,
  valores: ValoresPuntos,
): PuntosPrediccion {
  const { marcador_local, marcador_visitante } = prediccion;
  const resultadoReal = resultadoDe(real);
  const rangoReal = rangoDe(real);

  if (marcador_local !== null || marcador_visitante !== null) {
    if (marcador_local === null || marcador_visitante === null) {
      throw new Error(`Predicción ${prediccion.id}: marcador incompleto (R02).`);
    }
    const predicho = { local: marcador_local, visitante: marcador_visitante };
    if (predicho.local === real.local && predicho.visitante === real.visitante) {
      return puntos(0, 0, valores.marcador_exacto);
    }
    return puntos(
      resultadoDe(predicho) === resultadoReal ? valores.resultado : 0,
      rangoDe(predicho) === rangoReal ? valores.rango_goles : 0,
      0,
    );
  }

  if (prediccion.resultado === null && prediccion.rango_goles === null) {
    throw new Error(`Predicción ${prediccion.id}: sin resultado, rango ni marcador (R02).`);
  }
  return puntos(
    prediccion.resultado === resultadoReal ? valores.resultado : 0,
    prediccion.rango_goles === rangoReal ? valores.rango_goles : 0,
    0,
  );
}
