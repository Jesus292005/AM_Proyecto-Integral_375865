import { deepStrictEqual, equal } from 'node:assert/strict';

import {
  type CalificacionNueva,
  type DependenciasCalificar,
  type DesenlaceRegistro,
  ejecutarCalificacion,
  PARTIDOS_POR_EJECUCION,
  type PartidoPorCalificar,
} from './calificar.ts';
import type { PrediccionACalificar } from './puntos.ts';

const VALORES = { resultado: 100, rango_goles: 150, marcador_exacto: 350 };

const PARTIDO_21: PartidoPorCalificar = { partido_id: 10, goles_local: 2, goles_visitante: 1 };
const PARTIDO_00: PartidoPorCalificar = { partido_id: 20, goles_local: 0, goles_visitante: 0 };

const PREDICCIONES: Record<number, PrediccionACalificar[]> = {
  10: [
    { id: 1, resultado: null, rango_goles: null, marcador_local: 2, marcador_visitante: 1 },
    { id: 2, resultado: 'LOCAL', rango_goles: 'G2', marcador_local: null, marcador_visitante: null },
  ],
  20: [{ id: 3, resultado: 'EMPATE', rango_goles: null, marcador_local: null, marcador_visitante: null }],
};

function dobles(
  partidos: PartidoPorCalificar[],
  registrar: (id: number, c: CalificacionNueva[]) => Promise<DesenlaceRegistro> = () =>
    Promise.resolve('CALIFICADO'),
) {
  const registros: [number, CalificacionNueva[]][] = [];
  const limites: number[] = [];
  const dependencias: DependenciasCalificar = {
    buscarPartidos: (limite) => {
      limites.push(limite);
      return Promise.resolve(partidos);
    },
    leerValores: () => Promise.resolve(VALORES),
    leerPredicciones: (id) => Promise.resolve(PREDICCIONES[id] ?? []),
    registrar: (id, calificaciones) => {
      registros.push([id, calificaciones]);
      return registrar(id, calificaciones);
    },
  };
  return { dependencias, registros, limites };
}

Deno.test('F05 R4: registra todas las predicciones de cada partido con sus puntos', async () => {
  const { dependencias, registros, limites } = dobles([PARTIDO_21, PARTIDO_00]);

  const resumen = await ejecutarCalificacion(dependencias);

  deepStrictEqual(limites, [PARTIDOS_POR_EJECUCION]);
  deepStrictEqual(registros, [
    [10, [
      { prediccion_id: 1, puntos_resultado: 0, puntos_rango_goles: 0, puntos_marcador: 350 },
      { prediccion_id: 2, puntos_resultado: 100, puntos_rango_goles: 0, puntos_marcador: 0 },
    ]],
    [20, [{ prediccion_id: 3, puntos_resultado: 100, puntos_rango_goles: 0, puntos_marcador: 0 }]],
  ]);
  deepStrictEqual(resumen, { partidos: 2, yaCalificados: 0, predicciones: 3, errores: [] });
});

Deno.test('F05 R4: un partido sin predicciones también se registra (vacío)', async () => {
  const { dependencias, registros } = dobles([{ partido_id: 30, goles_local: 1, goles_visitante: 0 }]);
  const resumen = await ejecutarCalificacion(dependencias);
  deepStrictEqual(registros, [[30, []]]);
  equal(resumen.partidos, 1);
});

Deno.test('F05 CA3: YA_CALIFICADO cuenta como éxito sin cambios', async () => {
  const { dependencias } = dobles([PARTIDO_21], () => Promise.resolve('YA_CALIFICADO'));
  const resumen = await ejecutarCalificacion(dependencias);
  deepStrictEqual(resumen, { partidos: 0, yaCalificados: 1, predicciones: 0, errores: [] });
});

Deno.test('F05 R9: un error en un partido no detiene a los demás y queda en el resumen', async () => {
  const { dependencias } = dobles([PARTIDO_21, PARTIDO_00], (id) =>
    id === 10 ? Promise.reject(new Error('CALIFICACION_INCOMPLETA')) : Promise.resolve('CALIFICADO'));
  const resumen = await ejecutarCalificacion(dependencias);
  deepStrictEqual(resumen, {
    partidos: 1,
    yaCalificados: 0,
    predicciones: 1,
    errores: ['Partido 10: CALIFICACION_INCOMPLETA'],
  });
});

Deno.test('F05 R8: sin partidos no lee nada más', async () => {
  let leyoValores = false;
  const { dependencias } = dobles([]);
  const resumen = await ejecutarCalificacion({
    ...dependencias,
    leerValores: () => {
      leyoValores = true;
      return Promise.resolve(VALORES);
    },
  });
  equal(leyoValores, false);
  deepStrictEqual(resumen, { partidos: 0, yaCalificados: 0, predicciones: 0, errores: [] });
});
