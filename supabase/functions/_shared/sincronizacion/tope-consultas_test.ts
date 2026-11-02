import { equal } from 'node:assert/strict';

import {
  inicioDelDiaDeConsultas,
  puedeConsultar,
  TOPE_CONSULTAS_DIARIAS,
} from './tope-consultas.ts';

Deno.test('tope: es de 90 consultas al día (R4)', () => {
  equal(TOPE_CONSULTAS_DIARIAS, 90);
});

Deno.test('tope: con 90 consultas en el día, P1 y P2 ya no consultan (CA5)', () => {
  for (const proceso of ['CARGA_INICIAL', 'ACTUALIZACION_DIARIA'] as const) {
    equal(puedeConsultar(0, proceso), true, proceso);
    equal(puedeConsultar(89, proceso), true, proceso);
    equal(puedeConsultar(90, proceso), false, proceso);
    equal(puedeConsultar(91, proceso), false, proceso);
  }
});

Deno.test('tope: P3 y P4 siguen consultando con el tope alcanzado (R4)', () => {
  for (const proceso of ['DETECCION_FINALES', 'DATOS_PARTIDO'] as const) {
    equal(puedeConsultar(89, proceso), true, proceso);
    equal(puedeConsultar(90, proceso), true, proceso);
    equal(puedeConsultar(95, proceso), true, proceso);
  }
});

Deno.test('día de consultas: empieza a las 00:00 UTC', () => {
  const inicio = (fecha: string) => inicioDelDiaDeConsultas(new Date(fecha)).toISOString();
  equal(inicio('2026-11-01T00:00:00Z'), '2026-11-01T00:00:00.000Z');
  equal(inicio('2026-11-01T13:00:00Z'), '2026-11-01T00:00:00.000Z');
  equal(inicio('2026-11-01T23:59:59.999Z'), '2026-11-01T00:00:00.000Z');
  // Tijuana en horario de verano (UTC-7): el día de consultas cambia a las 17:00.
  equal(inicio('2026-10-31T16:59:00-07:00'), '2026-10-31T00:00:00.000Z');
  equal(inicio('2026-10-31T17:00:00-07:00'), '2026-11-01T00:00:00.000Z');
  // Tijuana en horario de invierno (UTC-8): cambia a las 16:00.
  equal(inicio('2026-11-01T15:59:00-08:00'), '2026-11-01T00:00:00.000Z');
  equal(inicio('2026-11-01T16:00:00-08:00'), '2026-11-02T00:00:00.000Z');
});
