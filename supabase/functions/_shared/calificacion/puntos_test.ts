import { deepStrictEqual, throws } from 'node:assert/strict';

import { marcadorDePartido } from '../api-football/conversiones.ts';
import { esquemaRespuestaPartidos } from '../api-football/esquemas.ts';
import partidos2024 from '../ejemplos-api-football/fixtures-262-2024.json' with { type: 'json' };
import {
  calificarPrediccion,
  type Marcador,
  type PrediccionACalificar,
  type PuntosPrediccion,
  type RangoGoles,
  type Resultado,
} from './puntos.ts';

const VALORES = { resultado: 100, rango_goles: 150, marcador_exacto: 350 };

function forma(resultado: Resultado | null, rango: RangoGoles | null): PrediccionACalificar {
  return { id: 1, resultado, rango_goles: rango, marcador_local: null, marcador_visitante: null };
}

function marcador(local: number, visitante: number): PrediccionACalificar {
  return { id: 1, resultado: null, rango_goles: null, marcador_local: local, marcador_visitante: visitante };
}

function esperado(resultado: number, rango: number, exacto: number): PuntosPrediccion {
  return {
    puntos_resultado: resultado,
    puntos_rango_goles: rango,
    puntos_marcador: exacto,
    puntos_base: resultado + rango + exacto,
  };
}

const m = (local: number, visitante: number): Marcador => ({ local, visitante });

// Tabla de R05 de la spec, fila por fila. Real 2-1 (LOCAL, G3) en la forma (a).
const casos: [string, PrediccionACalificar, Marcador, PuntosPrediccion][] = [
  ['a1 solo resultado, acierta', forma('LOCAL', null), m(2, 1), esperado(100, 0, 0)],
  ['a2 solo resultado, falla', forma('EMPATE', null), m(2, 1), esperado(0, 0, 0)],
  ['a3 solo rango, acierta', forma(null, 'G3'), m(2, 1), esperado(0, 150, 0)],
  ['a4 solo rango, falla', forma(null, 'G2'), m(2, 1), esperado(0, 0, 0)],
  ['a5 resultado y rango aciertan', forma('LOCAL', 'G3'), m(2, 1), esperado(100, 150, 0)],
  ['a6 resultado acierta, rango falla', forma('LOCAL', 'G4_MAS'), m(2, 1), esperado(100, 0, 0)],
  ['a7 resultado falla, rango acierta', forma('VISITANTE', 'G3'), m(2, 1), esperado(0, 150, 0)],
  ['a8 resultado y rango fallan', forma('EMPATE', 'G0_1'), m(2, 1), esperado(0, 0, 0)],
  ['b1 marcador exacto 2-1 → 2-1', marcador(2, 1), m(2, 1), esperado(0, 0, 350)],
  ['b2 fallado con resultado y rango 2-1 → 3-0', marcador(2, 1), m(3, 0), esperado(100, 150, 0)],
  ['b3 fallado con solo resultado 2-1 → 1-0', marcador(2, 1), m(1, 0), esperado(100, 0, 0)],
  ['b4 fallado con solo rango 2-1 → 1-2', marcador(2, 1), m(1, 2), esperado(0, 150, 0)],
  ['b5 fallado sin nada 2-1 → 0-0', marcador(2, 1), m(0, 0), esperado(0, 0, 0)],
  ['b6 empate fallado sin rango 1-1 → 0-0', marcador(1, 1), m(0, 0), esperado(100, 0, 0)],
  ['b7 empate fallado con rango 2-2 → 3-3', marcador(2, 2), m(3, 3), esperado(100, 150, 0)],
  ['b8 fallado con rango G4_MAS 3-2 → 4-1', marcador(3, 2), m(4, 1), esperado(100, 150, 0)],
  ['b9 fallado con rango G0_1 y resultado contrario 1-0 → 0-1', marcador(1, 0), m(0, 1), esperado(0, 150, 0)],
];

for (const [nombre, prediccion, real, puntos] of casos) {
  Deno.test(`F05 CA1: ${nombre}`, () => {
    deepStrictEqual(calificarPrediccion(prediccion, real, VALORES), puntos);
  });
}

Deno.test('F05 CA1: un marcador fallado nunca pasa de resultado + rango (D27)', () => {
  for (let l = 0; l <= 6; l++) {
    for (let v = 0; v <= 6; v++) {
      const { puntos_base, puntos_marcador } = calificarPrediccion(marcador(l, v), m(3, 2), VALORES);
      if (puntos_marcador === 0 && puntos_base > 250) throw new Error(`${l}-${v} dio ${puntos_base}`);
    }
  }
});

Deno.test('F05 R2: usa los valores de la base, no constantes', () => {
  const otros = { resultado: 10, rango_goles: 20, marcador_exacto: 50 };
  deepStrictEqual(calificarPrediccion(forma('LOCAL', 'G3'), m(2, 1), otros), esperado(10, 20, 0));
  deepStrictEqual(calificarPrediccion(marcador(2, 1), m(2, 1), otros), esperado(0, 0, 50));
});

Deno.test('F05 R02: rechaza una predicción vacía o con marcador incompleto', () => {
  throws(() => calificarPrediccion(forma(null, null), m(1, 0), VALORES), /R02/);
  throws(
    () => calificarPrediccion({ ...marcador(1, 0), marcador_visitante: null }, m(1, 0), VALORES),
    /R02/,
  );
});

Deno.test('F05 CA2: un partido de liguilla definido en penales se califica con el 2-2 de 90 min', () => {
  // 1315387 (liguilla 2024, `PEN`): 2-2 a los 90 min y se definió en penales.
  const partido = esquemaRespuestaPartidos
    .parse(partidos2024)
    .response.find((p) => p.fixture.id === 1315387);
  if (partido === undefined) throw new Error('Falta el partido 1315387 en los ejemplos');
  const { goles_local, goles_visitante } = marcadorDePartido(partido);
  if (goles_local === null || goles_visitante === null) throw new Error('Sin marcador');
  const real = m(goles_local, goles_visitante);

  deepStrictEqual(calificarPrediccion(marcador(2, 2), real, VALORES), esperado(0, 0, 350));
  deepStrictEqual(calificarPrediccion(forma('EMPATE', null), real, VALORES), esperado(100, 0, 0));
  deepStrictEqual(calificarPrediccion(forma('LOCAL', null), real, VALORES), esperado(0, 0, 0));
});
