import { deepStrictEqual, equal } from 'node:assert/strict';

import partidos2024 from '../ejemplos-api-football/fixtures-262-2024.json' with { type: 'json' };
import {
  convertirEstado,
  convertirRonda,
  marcadorDePartido,
  normalizarNombre,
} from './conversiones.ts';
import { esquemaPartidoApi, esquemaRespuestaPartidos } from './esquemas.ts';

const partidos = esquemaRespuestaPartidos.parse(partidos2024).response;

function buscarPartido(id: number) {
  const partido = partidos.find((p) => p.fixture.id === id);
  if (partido === undefined) throw new Error(`El ejemplo no trae el partido ${id}`);
  return partido;
}

// --- Estados (A6, CA3) ---

Deno.test('estados: cada estado de la tabla A6 se convierte (CA3)', () => {
  const tabla = {
    PROGRAMADO: ['TBD', 'NS'],
    EN_JUEGO: ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE', 'SUSP', 'INT'],
    TERMINADO: ['FT', 'AET', 'PEN', 'AWD', 'WO'],
    POSPUESTO: ['PST'],
    CANCELADO: ['CANC', 'ABD'],
  } as const;
  for (const [estado, estadosApi] of Object.entries(tabla)) {
    for (const estadoApi of estadosApi) {
      deepStrictEqual(convertirEstado(estadoApi), { tipo: 'ok', estado }, estadoApi);
    }
  }
});

Deno.test('estados: uno que no está en la tabla es desconocido (A6)', () => {
  for (const estadoApi of ['XYZ', '', 'ft', ' FT', 'toString', 'constructor']) {
    deepStrictEqual(
      convertirEstado(estadoApi),
      { tipo: 'desconocido', valor: estadoApi },
      estadoApi,
    );
  }
});

Deno.test('estados: los 340 partidos reales de 2024 quedan TERMINADO', () => {
  for (const partido of partidos) {
    deepStrictEqual(convertirEstado(partido.fixture.status.short), {
      tipo: 'ok',
      estado: 'TERMINADO',
    });
  }
});

// --- Rondas (A7) ---

Deno.test('rondas: la fase regular va de la jornada 1 a la 17', () => {
  deepStrictEqual(convertirRonda('Apertura - 1', 'Apertura'), {
    tipo: 'ok',
    jornada: { orden: 1, nombre: 'Jornada 1', fase: 'REGULAR' },
  });
  deepStrictEqual(convertirRonda('Clausura - 17', 'Clausura'), {
    tipo: 'ok',
    jornada: { orden: 17, nombre: 'Jornada 17', fase: 'REGULAR' },
  });
});

Deno.test('rondas: la liguilla es una jornada por ronda con orden fijo (D57)', () => {
  const casos = [
    ['Apertura - Reclasificación', 18, 'Liguilla · Play-in'],
    ['Apertura - Play-offs', 18, 'Liguilla · Play-in'],
    ['Apertura - Quarter-finals', 19, 'Liguilla · Cuartos'],
    ['Apertura - Semi-finals', 20, 'Liguilla · Semifinales'],
    ['Apertura - Final', 21, 'Liguilla · Final'],
  ] as const;
  for (const [ronda, orden, nombre] of casos) {
    deepStrictEqual(
      convertirRonda(ronda, 'Apertura'),
      { tipo: 'ok', jornada: { orden, nombre, fase: 'LIGUILLA' } },
      ronda,
    );
  }
});

Deno.test('rondas: "Reclasificación" con y sin acento es la misma jornada', () => {
  deepStrictEqual(
    convertirRonda('Clausura - Reclasificacion', 'Clausura'),
    convertirRonda('Apertura - Reclasificación', 'Apertura'),
  );
});

Deno.test('rondas: se comparan sin acentos, mayúsculas ni espacios sobrantes', () => {
  deepStrictEqual(
    convertirRonda('  APERTURA  -  Quarter-Finals ', 'apertura'),
    convertirRonda('Apertura - Quarter-finals', 'Apertura'),
  );
  equal(normalizarNombre(' Reclasificación '), 'reclasificacion');
});

Deno.test('rondas: una ronda de otro torneo de la temporada no es error', () => {
  deepStrictEqual(convertirRonda('Clausura - 1', 'Apertura'), { tipo: 'otroTorneo' });
  deepStrictEqual(convertirRonda('Apertura - Final', 'Clausura'), { tipo: 'otroTorneo' });
});

Deno.test('rondas: una ronda que no está en la tabla es desconocida (A7)', () => {
  const rondas = [
    'Apertura - 0',
    'Apertura - 18',
    'Apertura - 100',
    'Apertura - Round of 16',
    'Apertura - Final - Vuelta',
    'Final',
    'Play-offs',
    'Apertura',
    '',
  ];
  for (const ronda of rondas) {
    const resultado = convertirRonda(ronda, 'Apertura');
    deepStrictEqual(resultado, { tipo: 'desconocida', valor: ronda }, ronda);
  }
});

Deno.test('rondas: el Apertura 2024 real da 17 jornadas de 9 partidos y su liguilla (CA1)', () => {
  const partidosPorJornada = new Map<string, number>();
  let otroTorneo = 0;
  for (const partido of partidos) {
    const resultado = convertirRonda(partido.league.round, 'Apertura');
    if (resultado.tipo === 'desconocida') throw new Error(`Ronda desconocida: ${resultado.valor}`);
    if (resultado.tipo === 'otroTorneo') {
      otroTorneo++;
      continue;
    }
    const clave = `${resultado.jornada.orden} ${resultado.jornada.nombre}`;
    partidosPorJornada.set(clave, (partidosPorJornada.get(clave) ?? 0) + 1);
  }
  equal(otroTorneo, 170);
  const esperado = new Map<string, number>();
  for (let orden = 1; orden <= 17; orden++) esperado.set(`${orden} Jornada ${orden}`, 9);
  esperado.set('18 Liguilla · Play-in', 3);
  esperado.set('19 Liguilla · Cuartos', 8);
  esperado.set('20 Liguilla · Semifinales', 4);
  esperado.set('21 Liguilla · Final', 2);
  deepStrictEqual(partidosPorJornada, esperado);
});

// --- Marcador de 90 minutos (R2, CA4) ---

Deno.test('marcador: un partido normal guarda el de 90 minutos y el de medio tiempo', () => {
  deepStrictEqual(marcadorDePartido(buscarPartido(1206004)), {
    goles_local: 1,
    goles_visitante: 0,
    goles_local_medio_tiempo: 0,
    goles_visitante_medio_tiempo: 0,
  });
});

Deno.test('marcador: un partido con penales guarda el de 90 minutos (CA4)', () => {
  // Tijuana 2-2 América, 2-3 en penales (reclasificación del Apertura 2024).
  deepStrictEqual(marcadorDePartido(buscarPartido(1315387)), {
    goles_local: 2,
    goles_visitante: 2,
    goles_local_medio_tiempo: 1,
    goles_visitante_medio_tiempo: 0,
  });
});

Deno.test('marcador: un partido con tiempo extra guarda el de 90 minutos (CA4)', () => {
  // No hay partidos AET en 2024: se arma uno a partir del real 1206004 (1-0 a los 90 min).
  const real = partidos2024.response.find((p) => p.fixture.id === 1206004);
  if (real === undefined) throw new Error('El ejemplo no trae el partido 1206004');
  const conTiempoExtra = esquemaPartidoApi.parse({
    ...real,
    fixture: { ...real.fixture, status: { ...real.fixture.status, short: 'AET' } },
    goals: { home: 2, away: 1 },
    score: { ...real.score, extratime: { home: 1, away: 1 } },
  });
  deepStrictEqual(marcadorDePartido(conTiempoExtra), {
    goles_local: 1,
    goles_visitante: 0,
    goles_local_medio_tiempo: 0,
    goles_visitante_medio_tiempo: 0,
  });
});

Deno.test('marcador: un partido sin jugar no tiene marcador', () => {
  const real = buscarPartido(1206004);
  const sinJugar = {
    ...real,
    score: {
      halftime: { home: null, away: null },
      fulltime: { home: null, away: null },
    },
  };
  deepStrictEqual(marcadorDePartido(sinJugar), {
    goles_local: null,
    goles_visitante: null,
    goles_local_medio_tiempo: null,
    goles_visitante_medio_tiempo: null,
  });
});
