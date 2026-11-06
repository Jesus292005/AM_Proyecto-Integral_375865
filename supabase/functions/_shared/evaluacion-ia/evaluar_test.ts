import { deepStrictEqual, equal, ok } from 'node:assert/strict';

import type { PeticionMensajes, RespuestaAnthropic } from './anthropic.ts';
import { datosDeEjemplo } from './ejemplos.ts';
import {
  type DependenciasEvaluar,
  ejecutarEvaluaciones,
  EVALUACIONES_POR_EJECUCION,
  type EvaluacionGuardada,
  LLAMADAS_POR_DIA,
  type RegistroLlamada,
  TIEMPO_MAXIMO_MS,
  type Tomada,
} from './evaluar.ts';
import { VERSION_PROMPT } from './prompt.ts';

const DATOS = datosDeEjemplo();

function respuestaIA(salida: unknown, stop_reason = 'end_turn'): RespuestaAnthropic {
  return {
    tipo: 'ok',
    cuerpo: {
      model: 'claude-haiku-5-5',
      stop_reason,
      content: [{ type: 'text', text: JSON.stringify(salida) }],
      usage: { input_tokens: 2900, output_tokens: 600 },
    },
  };
}

const BUENA = {
  afirmaciones: [
    { texto: 'Puebla tira más a gol', veredicto: 'ACERTADA', motivo: '7 contra 2.', evidencia: ['S3'] },
    { texto: 'Habrá roja', veredicto: 'FALLADA', motivo: 'Inventada.', evidencia: ['S99'] },
  ],
  explicacion: 'Leíste bien los tiros a gol.',
};

function tomadas(n: number): Tomada[] {
  return Array.from({ length: n }, (_, i) => ({
    evaluacion_id: 100 + i,
    prediccion_id: 200 + i,
    partido_id: 1,
    intentos: 1,
  }));
}

function dobles(opciones: {
  llamadasHoy?: number;
  tomadas?: Tomada[];
  respuestas?: RespuestaAnthropic[];
  estadoFallo?: 'PENDIENTE' | 'ERROR';
}) {
  const registro = {
    limites: [] as number[],
    peticiones: [] as PeticionMensajes[],
    llamadas: [] as RegistroLlamada[],
    guardadas: [] as [number, EvaluacionGuardada][],
    fallos: [] as [number, string][],
    liberadas: [] as number[][],
    partidosLeidos: 0,
  };
  const respuestas = [...(opciones.respuestas ?? [])];
  const dependencias: DependenciasEvaluar = {
    ahora: () => new Date('2026-11-06T18:00:00Z'),
    llamadasHoy: () => Promise.resolve(opciones.llamadasHoy ?? 0),
    tomar: (limite) => {
      registro.limites.push(limite);
      return Promise.resolve((opciones.tomadas ?? []).slice(0, limite));
    },
    leerPrediccion: (id) =>
      Promise.resolve({
        id,
        resultado: 'LOCAL',
        rango_goles: null,
        marcador_local: null,
        marcador_visitante: null,
        justificacion: 'Puebla va a tirar más a gol.',
      }),
    leerDatosPartido: () => {
      registro.partidosLeidos += 1;
      return Promise.resolve(DATOS);
    },
    llamarIA: (peticion) => {
      registro.peticiones.push(peticion);
      return Promise.resolve(respuestas.shift() ?? respuestaIA(BUENA));
    },
    registrarLlamada: (llamada) => {
      registro.llamadas.push(llamada);
      return Promise.resolve();
    },
    guardar: (id, evaluacion) => {
      registro.guardadas.push([id, evaluacion]);
      return Promise.resolve(true);
    },
    registrarFallo: (id, motivo) => {
      registro.fallos.push([id, motivo]);
      return Promise.resolve(opciones.estadoFallo ?? 'PENDIENTE');
    },
    liberar: (ids) => {
      registro.liberadas.push(ids);
      return Promise.resolve();
    },
  };
  return { dependencias, registro };
}

Deno.test('F06 Flujo 3: evalúa, aplica la evidencia y la rúbrica y guarda con modelo y versión', async () => {
  const { dependencias, registro } = dobles({ tomadas: tomadas(1) });
  const resumen = await ejecutarEvaluaciones(dependencias);

  equal(resumen.evaluadas, 1);
  const [[id, guardada] = [0, undefined]] = registro.guardadas;
  equal(id, 100);
  if (guardada === undefined) throw new Error('No se guardó');
  // S99 no existe: la fallada pasa a NO_VERIFICABLE (R7) y no baja la precisión → 80.
  equal(guardada.puntos_bono, 80);
  equal(guardada.afirmaciones[1]?.veredicto, 'NO_VERIFICABLE');
  equal(guardada.modelo, 'claude-haiku-5-5');
  equal(guardada.version_prompt, VERSION_PROMPT);
  deepStrictEqual(registro.llamadas, [{
    evaluacion_id: 100,
    modelo: 'claude-haiku-5-5',
    tokens_entrada: 2900,
    tokens_salida: 600,
    resultado: 'OK',
    detalle: null,
  }]);
  ok(registro.peticiones[0]?.messages[0]?.content.includes('<justificacion>\nPuebla va a tirar más a gol.\n</justificacion>'));
});

Deno.test('F06 CA5: una ejecución toma máximo 5 y lee cada partido una sola vez', async () => {
  const { dependencias, registro } = dobles({ tomadas: tomadas(8) });
  const resumen = await ejecutarEvaluaciones(dependencias);
  deepStrictEqual(registro.limites, [EVALUACIONES_POR_EJECUCION]);
  equal(resumen.llamadas, 5);
  equal(registro.partidosLeidos, 1);
});

Deno.test('F06 CA5: con 150 llamadas en el día no toma nada ni llama a la IA', async () => {
  const { dependencias, registro } = dobles({ llamadasHoy: LLAMADAS_POR_DIA, tomadas: tomadas(3) });
  const resumen = await ejecutarEvaluaciones(dependencias);
  equal(resumen.topeDiario, true);
  deepStrictEqual(registro.limites, []);
  equal(registro.peticiones.length, 0);
});

Deno.test('F06 CA5: cerca del tope solo toma las que caben', async () => {
  const { dependencias, registro } = dobles({ llamadasHoy: LLAMADAS_POR_DIA - 2, tomadas: tomadas(5) });
  await ejecutarEvaluaciones(dependencias);
  deepStrictEqual(registro.limites, [2]);
});

Deno.test('F06 CA3: salida inválida, rechazo, max_tokens, 429 y 5xx son intentos fallidos', async () => {
  const { dependencias, registro } = dobles({
    tomadas: tomadas(5),
    respuestas: [
      respuestaIA({ afirmaciones: [], explicacion: 'x', bono: 100 }),
      respuestaIA(BUENA, 'refusal'),
      respuestaIA(BUENA, 'max_tokens'),
      { tipo: 'error', estado: 429, mensaje: 'Anthropic respondió 429' },
      { tipo: 'error', estado: 529, mensaje: 'Anthropic respondió 529' },
    ],
  });
  const resumen = await ejecutarEvaluaciones(dependencias);
  equal(resumen.evaluadas, 0);
  equal(resumen.reintentos, 5);
  deepStrictEqual(registro.fallos.map(([id]) => id), [100, 101, 102, 103, 104]);
  ok(registro.fallos[0]?.[1].includes('fuera del esquema'));
  ok(registro.fallos[1]?.[1].includes('rechazó'));
  ok(registro.fallos[2]?.[1].includes('max_tokens'));
  equal(registro.guardadas.length, 0);
  equal(registro.llamadas.length, 5);
  ok(registro.llamadas.every((l) => l.resultado === 'FALLO'));
});

Deno.test('F06 CA3: cuando el servidor deja ERROR, se cuenta como error final', async () => {
  const { dependencias } = dobles({
    tomadas: tomadas(1),
    respuestas: [respuestaIA(BUENA, 'refusal')],
    estadoFallo: 'ERROR',
  });
  const resumen = await ejecutarEvaluaciones(dependencias);
  equal(resumen.conError, 1);
  equal(resumen.reintentos, 0);
});

Deno.test('F06 CA3: una clave inválida (401) no gasta intentos y detiene la ejecución', async () => {
  const { dependencias, registro } = dobles({
    tomadas: tomadas(3),
    respuestas: [{ tipo: 'error', estado: 401, mensaje: 'Anthropic respondió 401' }],
  });
  const resumen = await ejecutarEvaluaciones(dependencias);
  equal(resumen.sinClave, true);
  deepStrictEqual(registro.liberadas, [[100, 101, 102]]);
  equal(registro.fallos.length, 0);
  equal(registro.peticiones.length, 1);
});

Deno.test('F06 R8, R11: una falla de la base es un intento fallido con su motivo y no detiene las demás', async () => {
  const { dependencias, registro } = dobles({ tomadas: tomadas(2) });
  let primera = true;
  const resumen = await ejecutarEvaluaciones({
    ...dependencias,
    leerPrediccion: (id) => {
      if (primera) {
        primera = false;
        return Promise.reject(new Error('sin conexión'));
      }
      return dependencias.leerPrediccion(id);
    },
  });
  equal(resumen.evaluadas, 1);
  equal(resumen.reintentos, 1);
  deepStrictEqual(registro.fallos, [[100, 'sin conexión']]);
  deepStrictEqual(resumen.errores, ['Evaluación 100: sin conexión']);
  equal(registro.guardadas[0]?.[0], 101);
});

Deno.test('F06 R11: si tampoco se puede registrar el fallo, queda en el resumen y sigue', async () => {
  const { dependencias, registro } = dobles({ tomadas: tomadas(2) });
  let primera = true;
  const resumen = await ejecutarEvaluaciones({
    ...dependencias,
    leerPrediccion: (id) => {
      if (primera) {
        primera = false;
        return Promise.reject(new Error('sin conexión'));
      }
      return dependencias.leerPrediccion(id);
    },
    registrarFallo: () => Promise.reject(new Error('base caída')),
  });
  equal(resumen.evaluadas, 1);
  deepStrictEqual(resumen.errores, ['Evaluación 100: sin conexión', 'Evaluación 100: base caída']);
  equal(registro.guardadas[0]?.[0], 101);
});

Deno.test('F06 R10: pasado el tiempo máximo libera las que faltan sin gastar intento', async () => {
  const { dependencias, registro } = dobles({ tomadas: tomadas(4) });
  let reloj = Date.parse('2026-11-06T18:00:00Z');
  const resumen = await ejecutarEvaluaciones({
    ...dependencias,
    ahora: () => new Date(reloj),
    llamarIA: (peticion) => {
      reloj += 50_000; // cada llamada tarda 50 s
      return dependencias.llamarIA(peticion);
    },
  });
  // 0 s, 50 s y 100 s: la tercera ya no empieza (> 90 s).
  equal(TIEMPO_MAXIMO_MS, 90_000);
  equal(resumen.evaluadas, 2);
  equal(resumen.liberadasPorTiempo, 2);
  deepStrictEqual(registro.liberadas, [[102, 103]]);
});
