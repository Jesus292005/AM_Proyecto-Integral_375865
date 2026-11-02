import { deepStrictEqual, equal, ok } from 'node:assert/strict';

import type { RespuestaHttp } from '../api-football/cliente.ts';
import { esquemaRespuestaEquipos, esquemaRespuestaPartidos } from '../api-football/esquemas.ts';
import errorTemporada2026 from '../ejemplos-api-football/error-temporada-2026.json' with {
  type: 'json',
};
import partidos2024 from '../ejemplos-api-football/fixtures-262-2024.json' with { type: 'json' };
import equipos2024 from '../ejemplos-api-football/teams-262-2024.json' with { type: 'json' };
import {
  armarCargaTorneo,
  type CargaTorneo,
  type DependenciasActualizacion,
  ejecutarActualizacionDiaria,
  ejecutarCargaInicial,
  type ParametrosCarga,
  type ResumenCarga,
  type TorneoActual,
} from './sincronizacion-torneo.ts';

const equipos = esquemaRespuestaEquipos.parse(equipos2024).response;
const partidos = esquemaRespuestaPartidos.parse(partidos2024).response;

const apertura: ParametrosCarga = {
  temporada: 2024,
  prefijoRondas: 'Apertura',
  nombre: 'Apertura 2024',
  esActual: true,
};
const AHORA = new Date('2026-11-01T13:00:00Z');

function armar(parametros = apertura, equiposApi = equipos, partidosApi = partidos) {
  const resultado = armarCargaTorneo(parametros, equiposApi, partidosApi, AHORA);
  if (resultado.tipo === 'error') throw new Error(resultado.mensaje);
  return resultado;
}

function buscar<T>(lista: readonly T[], condicion: (elemento: T) => boolean): T {
  const elemento = lista.find(condicion);
  if (elemento === undefined) throw new Error('No se encontró el elemento buscado');
  return elemento;
}

function primerPartido() {
  const partido = partidos[0];
  if (partido === undefined) throw new Error('El ejemplo no trae partidos');
  return partido;
}

// --- Armado (puro) ---

Deno.test('armado: el Apertura 2024 da 18 equipos, 21 jornadas y 170 partidos (CA1)', () => {
  const { carga, omitidos } = armar();
  deepStrictEqual(omitidos, []);
  equal(carga.equipos.length, 18);
  equal(carga.jornadas.length, 21);
  equal(carga.jornadas.filter((j) => j.fase === 'REGULAR').length, 17);
  equal(carga.partidos.length, 170);
  const regulares = new Set(carga.jornadas.filter((j) => j.fase === 'REGULAR').map((j) => j.orden));
  equal(carga.partidos.filter((p) => regulares.has(p.jornada_orden)).length, 153);
  deepStrictEqual(
    carga.jornadas.map((j) => j.orden),
    Array.from({ length: 21 }, (_, i) => i + 1),
  );
});

Deno.test('armado: liga, torneo y fecha de sincronización', () => {
  const { carga } = armar();
  deepStrictEqual(carga.liga, { proveedor_id: 262, nombre: 'Liga MX', pais: 'Mexico' });
  deepStrictEqual(carga.torneo, {
    nombre: 'Apertura 2024',
    temporada_proveedor: 2024,
    prefijo_rondas: 'Apertura',
    fecha_inicio: '2024-07-05T22:45:00.000Z',
    fecha_fin: '2024-12-16T01:00:00.000Z',
    es_actual: true,
  });
  equal(carga.sincronizado_en, '2026-11-01T13:00:00.000Z');
});

Deno.test('armado: el Clausura de la misma temporada es otro torneo con sus 170 partidos', () => {
  const { carga } = armar({ ...apertura, prefijoRondas: 'Clausura', nombre: 'Clausura 2025' });
  equal(carga.partidos.length, 170);
  equal(carga.torneo.fecha_inicio, '2025-01-11T01:00:00.000Z');
  equal(carga.torneo.fecha_fin, '2025-05-26T01:00:00.000Z');
});

Deno.test('armado: cada equipo lleva su nombre corto', () => {
  const { carga } = armar();
  deepStrictEqual(buscar(carga.equipos, (e) => e.proveedor_id === 2287), {
    proveedor_id: 2287,
    nombre: 'Club America',
    nombre_corto: 'América',
    escudo_url: 'https://media.api-sports.io/football/teams/2287.png',
  });
  equal(buscar(carga.equipos, (e) => e.proveedor_id === 14002).nombre_corto, 'Mazatlán');
});

Deno.test('armado: la jornada del play-in agrupa las dos rondas de la API con sus fechas', () => {
  const { carga } = armar();
  deepStrictEqual(buscar(carga.jornadas, (j) => j.orden === 18), {
    orden: 18,
    nombre: 'Liguilla · Play-in',
    fase: 'LIGUILLA',
    nombres_proveedor: ['Apertura - Play-offs', 'Apertura - Reclasificación'],
    fecha_inicio: '2024-11-22T01:05:00.000Z',
    fecha_fin: '2024-11-25T03:00:00.000Z',
  });
});

Deno.test('armado: un partido trae estado, marcador de 90 minutos y fechas en UTC', () => {
  const { carga } = armar();
  deepStrictEqual(buscar(carga.partidos, (p) => p.proveedor_id === 1315387), {
    proveedor_id: 1315387,
    jornada_orden: 18,
    equipo_local_proveedor_id: 2280,
    equipo_visitante_proveedor_id: 2287,
    inicio: '2024-11-22T03:00:00.000Z', // La API lo manda como "2024-11-22T03:00:00+00:00".
    estado: 'TERMINADO',
    goles_local: 2,
    goles_visitante: 2,
    goles_local_medio_tiempo: 1,
    goles_visitante_medio_tiempo: 0,
  });
  for (const partido of carga.partidos) ok(partido.inicio.endsWith('.000Z'), partido.inicio);
});

Deno.test('armado: un equipo que no vino en /teams se crea con los datos del partido (A8)', () => {
  const sinAmerica = equipos.filter((e) => e.team.id !== 2287);
  const { carga } = armar(apertura, sinAmerica);
  equal(carga.equipos.length, 18);
  deepStrictEqual(buscar(carga.equipos, (e) => e.proveedor_id === 2287), {
    proveedor_id: 2287,
    nombre: 'Club America',
    nombre_corto: 'América',
    escudo_url: 'https://media.api-sports.io/football/teams/2287.png',
  });
});

Deno.test('armado: un equipo sin nombre corto registrado usa el nombre de la API', () => {
  const nuevo = { team: { id: 99999, name: 'Equipo Nuevo FC', code: null, logo: 'https://x.mx/e.png' } };
  const { carga } = armar(apertura, [...equipos, nuevo]);
  equal(buscar(carga.equipos, (e) => e.proveedor_id === 99999).nombre_corto, 'Equipo Nuevo FC');
});

Deno.test('armado: un partido con ronda desconocida no se guarda y queda anotado (A7)', () => {
  const base = primerPartido();
  const raro = { ...base, league: { ...base.league, round: 'Apertura - Ronda nueva' } };
  const { carga, omitidos } = armar(apertura, equipos, [raro, ...partidos.slice(1)]);
  equal(carga.partidos.length, 169);
  equal(carga.partidos.some((p) => p.proveedor_id === base.fixture.id), false);
  deepStrictEqual(omitidos, [
    `Partido ${base.fixture.id}: ronda desconocida "Apertura - Ronda nueva"; no se guardó (A7).`,
  ]);
});

Deno.test('armado: un partido con estado desconocido se guarda sin estado y queda anotado (A6)', () => {
  const base = primerPartido();
  const raro = {
    ...base,
    fixture: { ...base.fixture, status: { ...base.fixture.status, short: 'XYZ' } },
  };
  const { carga, omitidos } = armar(apertura, equipos, [raro, ...partidos.slice(1)]);
  equal(carga.partidos.length, 170);
  equal(buscar(carga.partidos, (p) => p.proveedor_id === base.fixture.id).estado, null);
  equal(omitidos.length, 1);
  ok(omitidos[0]?.includes('estado desconocido "XYZ"'));
});

Deno.test('armado: sin partidos del torneo es un error', () => {
  const resultado = armarCargaTorneo(
    { ...apertura, prefijoRondas: 'Guardianes' },
    equipos,
    partidos,
    AHORA,
  );
  deepStrictEqual(resultado, {
    tipo: 'error',
    mensaje: 'No hay partidos de "Guardianes" en la temporada 2024.',
  });
});

// --- Ejecución, con dobles de prueba (R4–R8, CA5, CA6) ---

type Final = { estado: string; error: string | null };

const torneoApertura2024: TorneoActual = {
  nombre: 'Apertura 2024',
  temporada_proveedor: 2024,
  prefijo_rondas: 'Apertura',
};

function crearDobles(opciones: {
  respuestas: Record<string, RespuestaHttp>;
  consultasPrevias?: number;
  guardarFalla?: boolean;
  torneoActual?: TorneoActual | null;
}) {
  const registro = {
    consultasApi: [] as { ruta: string; parametros: Readonly<Record<string, string>> }[],
    contadoDesde: [] as Date[],
    tiposIniciados: [] as string[],
    consultasAnotadas: [] as number[],
    cargasGuardadas: [] as CargaTorneo[],
    finales: [] as Final[],
    ligasBuscadas: [] as number[],
  };
  const resumen: ResumenCarga = { equipos: 18, jornadas: 21, partidos: 170 };
  const dependencias: DependenciasActualizacion = {
    buscarTorneoActual: (proveedorIdLiga) => {
      registro.ligasBuscadas.push(proveedorIdLiga);
      return Promise.resolve(
        opciones.torneoActual === undefined ? torneoApertura2024 : opciones.torneoActual,
      );
    },
    consultarApi: (ruta, parametros) => {
      registro.consultasApi.push({ ruta, parametros });
      const respuesta = opciones.respuestas[ruta];
      if (respuesta === undefined) throw new Error(`Consulta inesperada: ${ruta}`);
      return Promise.resolve(respuesta);
    },
    contarConsultasDelDia: (desde) => {
      registro.contadoDesde.push(desde);
      return Promise.resolve(opciones.consultasPrevias ?? 0);
    },
    iniciarRegistro: (tipo) => {
      registro.tiposIniciados.push(tipo);
      return Promise.resolve(7);
    },
    anotarConsultas: (idRegistro, consultas) => {
      equal(idRegistro, 7);
      registro.consultasAnotadas.push(consultas);
      return Promise.resolve();
    },
    terminarRegistro: (idRegistro, final) => {
      equal(idRegistro, 7);
      registro.finales.push(final);
      return Promise.resolve();
    },
    guardarCarga: (carga) => {
      registro.cargasGuardadas.push(carga);
      if (opciones.guardarFalla) return Promise.reject(new Error('conexión perdida'));
      return Promise.resolve(resumen);
    },
    ahora: () => AHORA,
  };
  return { dependencias, registro, resumen };
}

const respuestasReales: Record<string, RespuestaHttp> = {
  '/teams': { tipo: 'ok', cuerpo: equipos2024 },
  '/fixtures': { tipo: 'ok', cuerpo: partidos2024 },
};

Deno.test('ejecución: con respuestas válidas guarda la carga y registra EXITO (R8)', async () => {
  const { dependencias, registro, resumen } = crearDobles({ respuestas: respuestasReales });

  const resultado = await ejecutarCargaInicial(apertura, dependencias);

  deepStrictEqual(resultado, { estado: 'EXITO', consultas: 2, error: null, resumen });
  deepStrictEqual(registro.tiposIniciados, ['CARGA_INICIAL']);
  deepStrictEqual(registro.consultasApi, [
    { ruta: '/teams', parametros: { league: '262', season: '2024' } },
    { ruta: '/fixtures', parametros: { league: '262', season: '2024' } },
  ]);
  deepStrictEqual(registro.consultasAnotadas, [1, 2]);
  equal(registro.cargasGuardadas.length, 1);
  equal(registro.cargasGuardadas[0]?.partidos.length, 170);
  deepStrictEqual(registro.finales, [{ estado: 'EXITO', error: null }]);
});

Deno.test('ejecución: cuenta las consultas desde las 00:00 UTC del día (R4)', async () => {
  const { dependencias, registro } = crearDobles({ respuestas: respuestasReales });
  await ejecutarCargaInicial(apertura, dependencias);
  deepStrictEqual(registro.contadoDesde, [new Date('2026-11-01T00:00:00Z')]);
});

Deno.test('ejecución: una respuesta con `errors` no guarda nada y registra ERROR (R6, CA6)', async () => {
  const { dependencias, registro } = crearDobles({
    respuestas: { ...respuestasReales, '/fixtures': { tipo: 'ok', cuerpo: errorTemporada2026 } },
  });

  const resultado = await ejecutarCargaInicial(apertura, dependencias);

  equal(resultado.estado, 'ERROR');
  equal(resultado.consultas, 2);
  ok(resultado.error?.includes('Free plans do not have access to this season'), resultado.error ?? '');
  equal(registro.cargasGuardadas.length, 0);
  deepStrictEqual(registro.finales, [{ estado: 'ERROR', error: resultado.error }]);
});

Deno.test('ejecución: una respuesta con forma inválida no guarda nada y registra ERROR (R5, CA6)', async () => {
  const { dependencias, registro } = crearDobles({
    respuestas: {
      ...respuestasReales,
      '/fixtures': { tipo: 'ok', cuerpo: { errors: [], response: [{ fixture: { id: 'x' } }] } },
    },
  });

  const resultado = await ejecutarCargaInicial(apertura, dependencias);

  equal(resultado.estado, 'ERROR');
  ok(resultado.error?.includes('forma inesperada de /fixtures'), resultado.error ?? '');
  equal(registro.cargasGuardadas.length, 0);
  equal(registro.finales[0]?.estado, 'ERROR');
});

Deno.test('ejecución: si falla la primera consulta no hace la segunda (A8)', async () => {
  const { dependencias, registro } = crearDobles({
    respuestas: { '/teams': { tipo: 'error', mensaje: 'API-Football respondió 503 en /teams' } },
  });

  const resultado = await ejecutarCargaInicial(apertura, dependencias);

  deepStrictEqual(resultado, {
    estado: 'ERROR',
    consultas: 1,
    error: 'API-Football respondió 503 en /teams',
    resumen: null,
  });
  equal(registro.consultasApi.length, 1);
  equal(registro.cargasGuardadas.length, 0);
});

Deno.test('ejecución: con 90 consultas en el día no consulta y registra la alerta (R4, CA5)', async () => {
  const { dependencias, registro } = crearDobles({
    respuestas: respuestasReales,
    consultasPrevias: 90,
  });

  const resultado = await ejecutarCargaInicial(apertura, dependencias);

  equal(resultado.estado, 'DETENIDA_POR_TOPE');
  equal(resultado.consultas, 0);
  ok(resultado.error?.includes('Tope de 90 consultas diarias'), resultado.error ?? '');
  equal(registro.consultasApi.length, 0);
  equal(registro.cargasGuardadas.length, 0);
  deepStrictEqual(registro.finales, [{ estado: 'DETENIDA_POR_TOPE', error: resultado.error }]);
});

Deno.test('ejecución: con 89 consultas hace una y se detiene antes de la segunda (R4)', async () => {
  const { dependencias, registro } = crearDobles({
    respuestas: respuestasReales,
    consultasPrevias: 89,
  });

  const resultado = await ejecutarCargaInicial(apertura, dependencias);

  equal(resultado.estado, 'DETENIDA_POR_TOPE');
  equal(resultado.consultas, 1);
  deepStrictEqual(registro.consultasApi.map((c) => c.ruta), ['/teams']);
  equal(registro.cargasGuardadas.length, 0);
});

Deno.test('ejecución: si falla el guardado registra ERROR (R7)', async () => {
  const { dependencias, registro } = crearDobles({
    respuestas: respuestasReales,
    guardarFalla: true,
  });

  const resultado = await ejecutarCargaInicial(apertura, dependencias);

  equal(resultado.estado, 'ERROR');
  equal(resultado.error, 'Error inesperado: conexión perdida');
  deepStrictEqual(registro.finales, [{ estado: 'ERROR', error: 'Error inesperado: conexión perdida' }]);
});

Deno.test('ejecución: los partidos omitidos quedan en el registro aunque la carga sea EXITO', async () => {
  const base = primerPartido();
  const raro = { ...base, league: { ...base.league, round: 'Apertura - Ronda nueva' } };
  const { dependencias, registro } = crearDobles({
    respuestas: {
      ...respuestasReales,
      '/fixtures': { tipo: 'ok', cuerpo: { ...partidos2024, response: [raro, ...partidos2024.response.slice(1)] } },
    },
  });

  const resultado = await ejecutarCargaInicial(apertura, dependencias);

  equal(resultado.estado, 'EXITO');
  ok(resultado.error?.includes('ronda desconocida "Apertura - Ronda nueva"'), resultado.error ?? '');
  equal(registro.cargasGuardadas[0]?.partidos.length, 169);
});

Deno.test('ejecución: sin partidos del torneo no guarda nada y registra ERROR', async () => {
  const { dependencias, registro } = crearDobles({ respuestas: respuestasReales });

  const resultado = await ejecutarCargaInicial(
    { ...apertura, prefijoRondas: 'Guardianes' },
    dependencias,
  );

  equal(resultado.estado, 'ERROR');
  equal(registro.cargasGuardadas.length, 0);
});

// --- P2: actualización diaria (CA8, R4–R8) ---

const soloPartidos: Record<string, RespuestaHttp> = {
  '/fixtures': { tipo: 'ok', cuerpo: partidos2024 },
};

Deno.test('P2: actualiza el torneo actual con una sola consulta, sin /teams', async () => {
  const { dependencias, registro, resumen } = crearDobles({ respuestas: soloPartidos });

  const resultado = await ejecutarActualizacionDiaria(dependencias);

  deepStrictEqual(resultado, { estado: 'EXITO', consultas: 1, error: null, resumen });
  deepStrictEqual(registro.tiposIniciados, ['ACTUALIZACION_DIARIA']);
  deepStrictEqual(registro.ligasBuscadas, [262]);
  deepStrictEqual(registro.consultasApi, [
    { ruta: '/fixtures', parametros: { league: '262', season: '2024' } },
  ]);
  deepStrictEqual(registro.finales, [{ estado: 'EXITO', error: null }]);
});

Deno.test('P2: guarda el torneo actual sin cambiar su marca y con los equipos de los partidos', async () => {
  const { dependencias, registro } = crearDobles({ respuestas: soloPartidos });

  await ejecutarActualizacionDiaria(dependencias);

  const carga = registro.cargasGuardadas[0];
  if (carga === undefined) throw new Error('No se guardó la carga');
  equal(carga.torneo.nombre, 'Apertura 2024');
  equal(carga.torneo.prefijo_rondas, 'Apertura');
  equal(carga.torneo.es_actual, false); // `false` no desmarca el torneo (T23).
  equal(carga.partidos.length, 170);
  equal(carga.equipos.length, 18);
  equal(carga.equipos.find((e) => e.proveedor_id === 2287)?.nombre_corto, 'América');
});

Deno.test('P2: un cambio de horario en la API llega a lo que se guarda (CA8)', async () => {
  const [primero, ...resto] = partidos2024.response;
  if (primero === undefined) throw new Error('El ejemplo no trae partidos');
  const cambiado = { ...primero, fixture: { ...primero.fixture, date: '2024-07-06T03:00:00+00:00' } };
  const { dependencias, registro } = crearDobles({
    respuestas: {
      '/fixtures': { tipo: 'ok', cuerpo: { ...partidos2024, response: [cambiado, ...resto] } },
    },
  });

  await ejecutarActualizacionDiaria(dependencias);

  const partido = registro.cargasGuardadas[0]?.partidos.find(
    (p) => p.proveedor_id === primero.fixture.id,
  );
  equal(partido?.inicio, '2024-07-06T03:00:00.000Z');
});

Deno.test('P2: sin torneo actual no consulta la API y registra ERROR', async () => {
  const { dependencias, registro } = crearDobles({ respuestas: soloPartidos, torneoActual: null });

  const resultado = await ejecutarActualizacionDiaria(dependencias);

  equal(resultado.estado, 'ERROR');
  ok(resultado.error?.includes('No hay torneo actual'), resultado.error ?? '');
  equal(resultado.consultas, 0);
  equal(registro.consultasApi.length, 0);
  equal(registro.cargasGuardadas.length, 0);
  deepStrictEqual(registro.tiposIniciados, ['ACTUALIZACION_DIARIA']);
});

Deno.test('P2: con 90 consultas en el día no consulta y registra la alerta (R4, CA5)', async () => {
  const { dependencias, registro } = crearDobles({ respuestas: soloPartidos, consultasPrevias: 90 });

  const resultado = await ejecutarActualizacionDiaria(dependencias);

  equal(resultado.estado, 'DETENIDA_POR_TOPE');
  equal(registro.consultasApi.length, 0);
  equal(registro.cargasGuardadas.length, 0);
});

Deno.test('P2: una respuesta con `errors` no guarda nada y registra ERROR (R6, CA6)', async () => {
  const { dependencias, registro } = crearDobles({
    respuestas: { '/fixtures': { tipo: 'ok', cuerpo: errorTemporada2026 } },
  });

  const resultado = await ejecutarActualizacionDiaria(dependencias);

  equal(resultado.estado, 'ERROR');
  equal(registro.cargasGuardadas.length, 0);
});
