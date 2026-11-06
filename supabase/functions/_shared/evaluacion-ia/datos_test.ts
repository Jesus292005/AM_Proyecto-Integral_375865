import { deepStrictEqual, equal, ok } from 'node:assert/strict';

import { armarEvidencias, textoDatos, textoPrediccion } from './datos.ts';
import { datosDeEjemplo } from './ejemplos.ts';

const datos = datosDeEjemplo();

Deno.test('F06 R2: el partido 1206057 llega con nombres cortos, marcador de 90 min y medio tiempo', () => {
  equal(datos.local, 'Puebla');
  equal(datos.visitante, 'Querétaro');
  deepStrictEqual(datos.marcador, { local: 2, visitante: 1 });
  deepStrictEqual(datos.medioTiempo, { local: 1, visitante: 0 });
});

Deno.test('F06 R2: cada estadística y cada evento lleva un id, en orden fijo, con el nombre de cada equipo', () => {
  const { estadisticas, eventos } = armarEvidencias(datos);
  equal(estadisticas[0]?.texto, 'Posesión: Puebla 49% · Querétaro 51%');
  equal(estadisticas[0]?.id, 'S1');
  ok(estadisticas.some((e) => e.texto === 'Faltas: Puebla 9 · Querétaro 17'));
  equal(eventos[0]?.texto, "27' Puebla: Tarjeta amarilla");
  ok(eventos.some((e) => e.texto === "45+1' Puebla: Gol"));
  ok(eventos.some((e) => e.texto === "73' Puebla: VAR: penal confirmado"));
  ok(eventos.some((e) => e.texto === "77' Puebla: Gol de penal"));
  ok(eventos.some((e) => e.texto === "65' Querétaro: Gol"));
});

Deno.test('F06 R2: una estadística vacía se manda como "sin dato" (D29)', () => {
  const { estadisticas } = armarEvidencias(datos);
  ok(estadisticas.some((e) => e.texto === 'Tarjetas rojas: Puebla sin dato · Querétaro sin dato'));
});

Deno.test('F06 R7: los ids válidos son exactamente los que se mandan', () => {
  const { texto, ids } = textoDatos(datos);
  for (const id of ids) ok(texto.includes(`\n${id} `), id);
  equal(ids.has('S99'), false);
});

Deno.test('F06 R2: la predicción se describe en palabras', () => {
  const base = { id: 1, resultado: null, rango_goles: null, marcador_local: null, marcador_visitante: null };
  equal(textoPrediccion({ ...base, marcador_local: 1, marcador_visitante: 1 }, 'Puebla', 'Querétaro'),
    'Marcador exacto: Puebla 1-1 Querétaro');
  equal(textoPrediccion({ ...base, resultado: 'VISITANTE', rango_goles: 'G4_MAS' }, 'Puebla', 'Querétaro'),
    'Resultado: gana Querétaro · Goles en total: 4 o más');
  equal(textoPrediccion({ ...base, resultado: 'EMPATE' }, 'Puebla', 'Querétaro'), 'Resultado: empate');
});
