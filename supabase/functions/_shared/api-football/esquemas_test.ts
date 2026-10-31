import { deepStrictEqual, equal, ok } from 'node:assert/strict';

import errorTemporada2026 from '../ejemplos-api-football/error-temporada-2026.json' with {
  type: 'json',
};
import eventos1206057 from '../ejemplos-api-football/events-1206057.json' with { type: 'json' };
import partidos2024 from '../ejemplos-api-football/fixtures-262-2024.json' with { type: 'json' };
import estadisticas1206057 from '../ejemplos-api-football/statistics-1206057.json' with {
  type: 'json',
};
import equipos2024 from '../ejemplos-api-football/teams-262-2024.json' with { type: 'json' };
import {
  esquemaRespuestaEquipos,
  esquemaRespuestaEstadisticas,
  esquemaRespuestaEventos,
  esquemaRespuestaPartidos,
} from './esquemas.ts';

function primero<T>(lista: readonly T[]): T {
  const elemento = lista[0];
  if (elemento === undefined) throw new Error('El ejemplo no trae elementos');
  return elemento;
}

function buscar<T>(lista: readonly T[], condicion: (elemento: T) => boolean): T {
  const elemento = lista.find(condicion);
  if (elemento === undefined) throw new Error('El ejemplo no trae el elemento buscado');
  return elemento;
}

const partidoValido = primero(partidos2024.response);

/** Respuesta de `/fixtures` con un solo partido. */
function respuestaConPartido(partido: unknown) {
  return { ...partidos2024, response: [partido] };
}

// --- Ejemplos reales (T20) ---

Deno.test('partidos: la temporada 2024 completa cumple el esquema', () => {
  const datos = esquemaRespuestaPartidos.parse(partidos2024);
  deepStrictEqual(datos.errors, []);
  equal(datos.response.length, 340);
  const partido = primero(datos.response);
  equal(partido.fixture.id, 1206004);
  equal(partido.fixture.date, '2024-07-05T22:45:00+00:00');
  equal(partido.fixture.status.short, 'FT');
  equal(partido.league.round, 'Apertura - 1');
  deepStrictEqual(partido.score.fulltime, { home: 1, away: 0 });
});

Deno.test('partidos: un partido con penales conserva el marcador de 90 minutos (R2)', () => {
  const datos = esquemaRespuestaPartidos.parse(partidos2024);
  const partido = buscar(datos.response, (p) => p.fixture.id === 1315387);
  equal(partido.fixture.status.short, 'PEN');
  deepStrictEqual(partido.score.fulltime, { home: 2, away: 2 });
  deepStrictEqual(partido.score.halftime, { home: 1, away: 0 });
});

Deno.test('partidos: se descartan los campos que no se usan', () => {
  const partido = primero(esquemaRespuestaPartidos.parse(partidos2024).response);
  equal('venue' in partido.fixture, false);
  equal('goals' in partido, false);
  equal('penalty' in partido.score, false);
});

Deno.test('equipos: los 18 equipos cumplen el esquema y `code` puede ser null', () => {
  const datos = esquemaRespuestaEquipos.parse(equipos2024);
  deepStrictEqual(datos.errors, []);
  equal(datos.response.length, 18);
  const juarez = buscar(datos.response, (e) => e.team.name === 'FC Juarez');
  equal(juarez.team.code, null);
  equal('venue' in primero(datos.response), false);
});

Deno.test('estadísticas: los valores vacíos quedan como null, no como 0 (D29)', () => {
  const datos = esquemaRespuestaEstadisticas.parse(estadisticas1206057);
  deepStrictEqual(datos.errors, []);
  equal(datos.response.length, 2);
  const puebla = primero(datos.response);
  equal(puebla.team.id, 2291);
  const valor = (tipo: string) => buscar(puebla.statistics, (s) => s.type === tipo).value;
  equal(valor('Red Cards'), null);
  equal(valor('expected_goals'), null);
  equal(valor('Ball Possession'), '49%');
  equal(valor('Total Shots'), 17);
});

Deno.test('eventos: los 15 eventos cumplen el esquema con su minuto agregado', () => {
  const datos = esquemaRespuestaEventos.parse(eventos1206057);
  deepStrictEqual(datos.errors, []);
  equal(datos.response.length, 15);
  const golAgregado = buscar(datos.response, (e) => e.time.extra !== null);
  deepStrictEqual(golAgregado.time, { elapsed: 45, extra: 1 });
  equal(golAgregado.type, 'Goal');
  equal(primero(datos.response).time.extra, null);
});

Deno.test('errores: una respuesta con `errors` no vacío cumple el esquema y lo conserva (R6)', () => {
  const datos = esquemaRespuestaPartidos.parse(errorTemporada2026);
  deepStrictEqual(datos.errors, {
    plan: 'Free plans do not have access to this season, try from 2022 to 2024.',
  });
  equal(datos.response.length, 0);
});

// --- Valores de texto libre: se manejan al convertirlos (A6, A7), no aquí ---

Deno.test('partidos: un estado o una ronda desconocidos no rechazan la respuesta', () => {
  const partido = {
    ...partidoValido,
    fixture: { ...partidoValido.fixture, status: { ...partidoValido.fixture.status, short: 'XYZ' } },
    league: { ...partidoValido.league, round: 'Apertura - Ronda nueva' },
  };
  ok(esquemaRespuestaPartidos.safeParse(respuestaConPartido(partido)).success);
});

// --- Formas inválidas (R5) ---

Deno.test('partidos: sin `fixture.id` no cumple el esquema', () => {
  const { id: _id, ...sinId } = partidoValido.fixture;
  const partido = { ...partidoValido, fixture: sinId };
  equal(esquemaRespuestaPartidos.safeParse(respuestaConPartido(partido)).success, false);
});

Deno.test('partidos: goles como texto no cumplen el esquema', () => {
  const partido = {
    ...partidoValido,
    score: { ...partidoValido.score, fulltime: { home: '1', away: 0 } },
  };
  equal(esquemaRespuestaPartidos.safeParse(respuestaConPartido(partido)).success, false);
});

Deno.test('partidos: goles negativos no cumplen el esquema', () => {
  const partido = {
    ...partidoValido,
    score: { ...partidoValido.score, fulltime: { home: -1, away: 0 } },
  };
  equal(esquemaRespuestaPartidos.safeParse(respuestaConPartido(partido)).success, false);
});

Deno.test('partidos: una fecha que no es ISO con zona horaria no cumple el esquema', () => {
  for (const date of ['2024-07-05 22:45', '2024-07-05T22:45:00', 'mañana']) {
    const partido = { ...partidoValido, fixture: { ...partidoValido.fixture, date } };
    equal(esquemaRespuestaPartidos.safeParse(respuestaConPartido(partido)).success, false, date);
  }
});

Deno.test('partidos: un solo partido inválido rechaza toda la respuesta (R5)', () => {
  const invalido = { ...partidoValido, teams: { ...partidoValido.teams, home: null } };
  const respuesta = { ...partidos2024, response: [...partidos2024.response, invalido] };
  equal(esquemaRespuestaPartidos.safeParse(respuesta).success, false);
});

Deno.test('respuesta: `errors` como texto no cumple el esquema', () => {
  const respuesta = { ...partidos2024, errors: 'error' };
  equal(esquemaRespuestaPartidos.safeParse(respuesta).success, false);
});

Deno.test('respuesta: `response` que no es lista no cumple el esquema', () => {
  const respuesta = { ...partidos2024, response: partidoValido };
  equal(esquemaRespuestaPartidos.safeParse(respuesta).success, false);
});

Deno.test('estadísticas: un valor que no es número, texto ni null no cumple el esquema', () => {
  const equipo = primero(estadisticas1206057.response);
  const respuesta = {
    ...estadisticas1206057,
    response: [{ ...equipo, statistics: [{ type: 'Total Shots', value: { total: 17 } }] }],
  };
  equal(esquemaRespuestaEstadisticas.safeParse(respuesta).success, false);
});

Deno.test('eventos: sin minuto no cumple el esquema', () => {
  const evento = primero(eventos1206057.response);
  const respuesta = {
    ...eventos1206057,
    response: [{ ...evento, time: { extra: null } }],
  };
  equal(esquemaRespuestaEventos.safeParse(respuesta).success, false);
});
