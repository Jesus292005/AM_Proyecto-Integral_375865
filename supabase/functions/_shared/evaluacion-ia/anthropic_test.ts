import { deepStrictEqual, equal, ok } from 'node:assert/strict';

import { armarPeticion, costoUsd, crearClienteAnthropic, interpretarRespuesta } from './anthropic.ts';
import { MAX_EXPLICACION } from './esquema.ts';

function respuesta(texto: string, stop_reason = 'end_turn') {
  return {
    model: 'claude-haiku-5-5',
    stop_reason,
    content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: texto }],
    usage: { input_tokens: 2600, output_tokens: 700 },
  };
}

const SALIDA = {
  afirmaciones: [{ texto: 'Puebla tira más', veredicto: 'ACERTADA', motivo: '17 contra 10.', evidencia: ['S2'] }],
  explicacion: 'Leíste bien los tiros.',
};

Deno.test('F06 R10, R13: Haiku 5.5 con esfuerzo medium, salida estructurada y sin temperature', () => {
  const peticion = armarPeticion('claude-haiku-5-5', 'sistema', 'usuario');
  equal(peticion.model, 'claude-haiku-5-5');
  equal(peticion.max_tokens, 2000);
  equal(peticion.output_config.effort, 'medium');
  equal(peticion.output_config.format.type, 'json_schema');
  equal('temperature' in peticion, false);
  deepStrictEqual(peticion.messages, [{ role: 'user', content: 'usuario' }]);
});

Deno.test('F06 R13: Haiku 4.5 (comparación de T48) va sin effort', () => {
  equal('effort' in armarPeticion('claude-haiku-4-5', 's', 'u').output_config, false);
});

Deno.test('F06 R6: una salida válida se acepta y se cuentan los tokens', () => {
  const resultado = interpretarRespuesta(respuesta(JSON.stringify(SALIDA)));
  deepStrictEqual(resultado, { tipo: 'ok', salida: SALIDA, tokens: { entrada: 2600, salida: 700 } });
});

Deno.test('F06 R8: rechazo, respuesta cortada, JSON roto o fuera del esquema son intentos fallidos', () => {
  const casos: [unknown, string][] = [
    [respuesta(JSON.stringify(SALIDA), 'refusal'), 'rechazó'],
    [respuesta('{"afirmaciones": [', 'max_tokens'), 'max_tokens'],
    [respuesta('no es json'), 'no es JSON'],
    [respuesta(JSON.stringify({ ...SALIDA, bono: 100 })), 'fuera del esquema'],
    [respuesta(JSON.stringify({ afirmaciones: [{ ...SALIDA.afirmaciones[0], veredicto: 'PERFECTA' }], explicacion: 'x' })), 'fuera del esquema'],
    [{ error: { type: 'overloaded_error' } }, 'forma inválida'],
  ];
  for (const [cuerpo, motivo] of casos) {
    const resultado = interpretarRespuesta(cuerpo);
    equal(resultado.tipo, 'fallo');
    if (resultado.tipo === 'fallo') ok(resultado.motivo.includes(motivo), resultado.motivo);
  }
});

Deno.test('F06 R4: más de 5 afirmaciones o textos largos se recortan, no fallan', () => {
  const larga = { ...SALIDA.afirmaciones[0], texto: 'x'.repeat(250) };
  const resultado = interpretarRespuesta(respuesta(JSON.stringify({
    afirmaciones: Array.from({ length: 7 }, () => larga),
    explicacion: 'y'.repeat(400),
  })));
  if (resultado.tipo !== 'ok') throw new Error(resultado.motivo);
  equal(resultado.salida.afirmaciones.length, 5);
  equal(resultado.salida.afirmaciones[0]?.texto.length, 200);
  equal(resultado.salida.explicacion.length, MAX_EXPLICACION);
});

Deno.test('F06 R8: el cliente distingue estado HTTP y falla de red', async () => {
  const conEstado = crearClienteAnthropic('clave', () =>
    Promise.resolve(new Response('{"error": "invalid x-api-key"}', { status: 401 })));
  const red = crearClienteAnthropic('clave', () => Promise.reject(new TypeError('sin red')));
  const peticion = armarPeticion('claude-haiku-5-5', 's', 'u');

  const r401 = await conEstado(peticion);
  equal(r401.tipo === 'error' && r401.estado, 401);
  const rRed = await red(peticion);
  equal(rRed.tipo === 'error' && rRed.estado, null);
});

Deno.test('F06 R8: el cliente manda la clave y la versión de la API en los encabezados', async () => {
  let encabezados = new Headers();
  const llamar = crearClienteAnthropic('sk-prueba', (_url, init) => {
    encabezados = new Headers(init?.headers);
    return Promise.resolve(Response.json(respuesta(JSON.stringify(SALIDA))));
  });
  const r = await llamar(armarPeticion('claude-haiku-5-5', 's', 'u'));
  equal(r.tipo, 'ok');
  equal(encabezados.get('x-api-key'), 'sk-prueba');
  equal(encabezados.get('anthropic-version'), '2026-10-21');
});

Deno.test('F06 R10: costo por modelo', () => {
  equal(costoUsd('claude-haiku-5-5', { entrada: 1_000_000, salida: 1_000_000 }), 0.6);
  equal(costoUsd('claude-haiku-4-5', { entrada: 2000, salida: 500 }), 0.0045);
});
