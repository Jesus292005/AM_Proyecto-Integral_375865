import { deepStrictEqual, equal } from 'node:assert/strict';

import { aplicarEvidencia, calcularBono, MOTIVO_SIN_EVIDENCIA } from './bono.ts';
import type { Afirmacion, Veredicto } from './esquema.ts';

function af(veredicto: Veredicto, evidencia: string[] = ['S1']): Afirmacion {
  return { texto: 'Algo del partido', veredicto, motivo: 'Por un dato.', evidencia };
}

const A = af('ACERTADA');
const C = af('CERCANA');
const F = af('FALLADA');
const N = af('NO_VERIFICABLE', []);

// Rúbrica de D94 (decisión 1): Precisión 70 × (A + ½C) / verificables + Alcance min(30, 10A + 5C).
const casos: [string, Afirmacion[], number][] = [
  ['una acertada = 80', [A], 80],
  ['tres acertadas = 100', [A, A, A], 100],
  ['cinco acertadas = 100 (tope)', [A, A, A, A, A], 100],
  ['dos acertadas y una fallada = 67', [A, A, F], 67],
  ['tres acertadas y una cercana = 91', [A, A, A, C], 91],
  ['una cercana = 40', [C], 40],
  ['una acertada y una cercana = 68', [A, C], 68],
  ['todo fallado = 0', [F, F], 0],
  ['solo NO_VERIFICABLE = 0', [N, N, N], 0],
  ['sin afirmaciones = 0', [], 0],
  ['las NO_VERIFICABLE no bajan la precisión: A + N = 80', [A, N, N], 80],
  ['mezcla A, C, F, N = 50', [A, C, F, N], 50],
];

for (const [nombre, afirmaciones, bono] of casos) {
  Deno.test(`F06 CA1: ${nombre}`, () => {
    equal(calcularBono(afirmaciones), bono);
  });
}

Deno.test('F06 CA1: el bono siempre es un entero entre 0 y 100 (R07)', () => {
  const veredictos: Veredicto[] = ['ACERTADA', 'CERCANA', 'FALLADA', 'NO_VERIFICABLE'];
  for (const a of veredictos) {
    for (const b of veredictos) {
      for (const c of veredictos) {
        const bono = calcularBono([af(a), af(b), af(c)]);
        equal(Number.isInteger(bono) && bono >= 0 && bono <= 100, true, `${a} ${b} ${c} = ${bono}`);
      }
    }
  }
});

Deno.test('F06 CA2: un veredicto sin evidencia pasa a NO_VERIFICABLE', () => {
  deepStrictEqual(aplicarEvidencia([af('ACERTADA', [])], new Set(['S1'])), [
    { texto: 'Algo del partido', veredicto: 'NO_VERIFICABLE', motivo: MOTIVO_SIN_EVIDENCIA, evidencia: [] },
  ]);
});

Deno.test('F06 CA2: un id que no existe en los datos no cuenta como evidencia', () => {
  const [falsa, mixta] = aplicarEvidencia(
    [af('FALLADA', ['S99', 'E42']), af('CERCANA', ['S99', 'E2', 'E2'])],
    new Set(['S1', 'E2']),
  );
  equal(falsa?.veredicto, 'NO_VERIFICABLE');
  deepStrictEqual(falsa?.evidencia, []);
  equal(mixta?.veredicto, 'CERCANA');
  deepStrictEqual(mixta?.evidencia, ['E2']);
});

Deno.test('F06 CA2: una NO_VERIFICABLE queda sin evidencia y una inventada no suma bono', () => {
  const ids = new Set(['S1']);
  deepStrictEqual(aplicarEvidencia([af('NO_VERIFICABLE', ['S1'])], ids)[0]?.evidencia, []);
  equal(calcularBono(aplicarEvidencia([af('ACERTADA', ['S7'])], ids)), 0);
});
