import { deepStrictEqual, equal, ok } from 'node:assert/strict';

import type { RespuestaHttp } from '../api-football/cliente.ts';
import {
  esquemaRespuestaEstadisticas,
  esquemaRespuestaEventos,
  esquemaRespuestaPartidos,
} from '../api-football/esquemas.ts';
import errorTemporada2026 from '../ejemplos-api-football/error-temporada-2026.json' with {
  type: 'json',
};
import eventos1206057 from '../ejemplos-api-football/events-1206057.json' with { type: 'json' };
import partidos2024 from '../ejemplos-api-football/fixtures-262-2024.json' with { type: 'json' };
import estadisticas1206057 from '../ejemplos-api-football/statistics-1206057.json' with {
  type: 'json',
};
import {
  armarDatosPartido,
  armarEstadosPartidos,
  type DatosPartido,
  type DependenciasFinales,
  type EstadosPartidos,
  ejecutarDeteccionFinales,
  type PendienteDeFinal,
} from './datos-partido.ts';

const AHORA = new Date('2026-11-02T15:00:00Z');
const estadisticas = esquemaRespuestaEstadisticas.parse(estadisticas1206057).response;
const eventos = esquemaRespuestaEventos.parse(eventos1206057).response;
const partidos = esquemaRespuestaPartidos.parse(partidos2024).response;

function buscar<T>(lista: readonly T[], condicion: (elemento: T) => boolean): T {
  const elemento = lista.find(condicion);
  if (elemento === undefined) throw new Error('No se encontró el elemento buscado');
  return elemento;
}

// --- Armado (puro) ---

Deno.test('datos: las estadísticas del 1206057 quedan como texto y null = sin dato (CA7, D29)', () => {
  const { datos, omitidos } = armarDatosPartido(1206057, estadisticas, eventos, AHORA);
  deepStrictEqual(omitidos, []);
  equal(datos.partido_proveedor_id, 1206057);
  equal(datos.sincronizado_en, '2026-11-02T15:00:00.000Z');
  equal(datos.estadisticas.length, 36);
  const valor = (equipo: number, tipo: string) =>
    buscar(datos.estadisticas, (e) => e.equipo_proveedor_id === equipo && e.tipo === tipo).valor;
  equal(valor(2291, 'Total Shots'), '17');
  equal(valor(2291, 'Ball Possession'), '49%');
  equal(valor(2291, 'Red Cards'), null);
  equal(valor(2290, 'expected_goals'), null);
});

Deno.test('datos: los 15 eventos del 1206057 se convierten con su minuto agregado (CA7)', () => {
  const { datos } = armarDatosPartido(1206057, estadisticas, eventos, AHORA);
  equal(datos.eventos.length, 15);
  const porTipo = Object.groupBy(datos.eventos, (e) => e.tipo);
  equal(porTipo.GOL?.length, 3);
  equal(porTipo.TARJETA?.length, 2);
  equal(porTipo.CAMBIO?.length, 9);
  equal(porTipo.VAR?.length, 1);
  deepStrictEqual(buscar(datos.eventos, (e) => e.minuto_agregado !== null), {
    equipo_proveedor_id: buscar(eventos, (e) => e.time.extra !== null).team.id,
    minuto: 45,
    minuto_agregado: 1,
    tipo: 'GOL',
    detalle: 'Normal Goal',
  });
});

Deno.test('datos: un evento de tipo desconocido se omite y queda anotado', () => {
  const [primero, ...resto] = eventos;
  if (primero === undefined) throw new Error('El ejemplo no trae eventos');
  const raro = { ...primero, type: 'Penalty shootout', detail: 'Missed' };
  const { datos, omitidos } = armarDatosPartido(1206057, estadisticas, [raro, ...resto], AHORA);
  equal(datos.eventos.length, 14);
  deepStrictEqual(omitidos, [
    `Evento "Penalty shootout" (Missed, min ${primero.time.elapsed}): tipo desconocido; no se guardó.`,
  ]);
});

Deno.test('datos: sin estadísticas el partido igual queda listo y se anota', () => {
  const { datos, omitidos } = armarDatosPartido(1206057, [], eventos, AHORA);
  deepStrictEqual(datos.estadisticas, []);
  equal(datos.eventos.length, 15);
  deepStrictEqual(omitidos, ['La API no trajo estadísticas; el partido queda listo sin ellas.']);
});

Deno.test('estados: P3 guarda estado y marcador de 90 minutos; un estado desconocido no cambia (A6)', () => {
  const penales = buscar(partidos, (p) => p.fixture.id === 1315387);
  const raro = { ...penales, fixture: { ...penales.fixture, id: 1, status: { short: 'XYZ' } } };
  const { datos, omitidos } = armarEstadosPartidos([penales, raro], AHORA);
  deepStrictEqual(datos.partidos[0], {
    proveedor_id: 1315387,
    estado: 'TERMINADO',
    goles_local: 2,
    goles_visitante: 2,
    goles_local_medio_tiempo: 1,
    goles_visitante_medio_tiempo: 0,
  });
  equal(datos.partidos[1]?.estado, null);
  deepStrictEqual(omitidos, ['Partido 1: estado desconocido "XYZ"; conserva su estado (A6).']);
});

// --- Ejecución, con dobles de prueba ---

const base = buscar(partidos2024.response, (p) => p.fixture.id === 1206057);

/** Respuesta de `/fixtures?ids=` con cada id como partido terminado (o en juego). */
function partidosPorIds(ids: string, enJuego: ReadonlySet<number> = new Set()) {
  return {
    ...partidos2024,
    response: ids.split('-').map(Number).map((id) => ({
      ...base,
      fixture: {
        ...base.fixture,
        id,
        status: { ...base.fixture.status, short: enJuego.has(id) ? '2H' : 'FT' },
      },
    })),
  };
}

function crearDobles(opciones: {
  pendientes?: PendienteDeFinal[][];
  consultasPrevias?: number;
  respuesta?: (ruta: string, parametros: Readonly<Record<string, string>>) => RespuestaHttp;
  guardarFalla?: string;
}) {
  const registro = {
    consultasApi: [] as { ruta: string; parametros: Readonly<Record<string, string>> }[],
    busquedas: 0,
    tipos: [] as string[],
    finales: [] as { estado: string; error: string | null }[],
    estadosGuardados: [] as EstadosPartidos[],
    datosGuardados: [] as DatosPartido[],
  };
  const respuestaPorDefecto = (
    ruta: string,
    parametros: Readonly<Record<string, string>>,
  ): RespuestaHttp => {
    if (ruta === '/fixtures') return { tipo: 'ok', cuerpo: partidosPorIds(parametros.ids ?? '') };
    if (ruta === '/fixtures/statistics') return { tipo: 'ok', cuerpo: estadisticas1206057 };
    if (ruta === '/fixtures/events') return { tipo: 'ok', cuerpo: eventos1206057 };
    throw new Error(`Consulta inesperada: ${ruta}`);
  };
  let siguienteRegistro = 1;
  const dependencias: DependenciasFinales = {
    consultarApi: (ruta, parametros) => {
      registro.consultasApi.push({ ruta, parametros });
      return Promise.resolve((opciones.respuesta ?? respuestaPorDefecto)(ruta, parametros));
    },
    contarConsultasDelDia: () => Promise.resolve(opciones.consultasPrevias ?? 0),
    iniciarRegistro: (tipo) => {
      registro.tipos.push(tipo);
      return Promise.resolve(siguienteRegistro++);
    },
    anotarConsultas: () => Promise.resolve(),
    terminarRegistro: (_id, final) => {
      registro.finales.push(final);
      return Promise.resolve();
    },
    buscarPendientesDeFinal: (ahora) => {
      equal(ahora, AHORA);
      const lista = opciones.pendientes?.[registro.busquedas] ?? opciones.pendientes?.at(-1) ?? [];
      registro.busquedas++;
      return Promise.resolve(lista);
    },
    actualizarEstados: (datos) => {
      registro.estadosGuardados.push(datos);
      return Promise.resolve(datos.partidos.length);
    },
    guardarDatosPartido: (datos) => {
      if (opciones.guardarFalla) return Promise.reject(new Error(opciones.guardarFalla));
      registro.datosGuardados.push(datos);
      return Promise.resolve({ estadisticas: datos.estadisticas.length, eventos: datos.eventos.length });
    },
    ahora: () => AHORA,
  };
  return { dependencias, registro };
}

const terminado = (proveedor_id: number): PendienteDeFinal => ({ proveedor_id, estado: 'TERMINADO' });
const enJuego = (proveedor_id: number): PendienteDeFinal => ({ proveedor_id, estado: 'EN_JUEGO' });

Deno.test('ejecución: sin pendientes no consulta ni deja registros', async () => {
  const { dependencias, registro } = crearDobles({ pendientes: [[]] });

  const resultado = await ejecutarDeteccionFinales(dependencias);

  deepStrictEqual(resultado, { estados: null, datos: [] });
  equal(registro.consultasApi.length, 0);
  equal(registro.tipos.length, 0);
});

Deno.test('ejecución: P3 consulta los pendientes de 20 en 20 y guarda sus estados', async () => {
  const ids = Array.from({ length: 25 }, (_, i) => 1000 + i);
  const { dependencias, registro } = crearDobles({ pendientes: [ids.map(enJuego), []] });

  const resultado = await ejecutarDeteccionFinales(dependencias);

  deepStrictEqual(registro.consultasApi.map((c) => c.parametros.ids), [
    ids.slice(0, 20).join('-'),
    ids.slice(20).join('-'),
  ]);
  deepStrictEqual(resultado.estados, {
    estado: 'EXITO',
    error: null,
    resumen: { partidos: 25 },
    consultas: 2,
  });
  deepStrictEqual(registro.tipos, ['DETECCION_FINALES']);
  equal(registro.estadosGuardados[0]?.partidos.length, 25);
  ok(registro.estadosGuardados[0]?.partidos.every((p) => p.estado === 'TERMINADO'));
});

Deno.test('ejecución: P4 descarga los datos del partido que P3 acaba de ver terminar (CA7)', async () => {
  const { dependencias, registro } = crearDobles({
    pendientes: [[enJuego(1206057)], [terminado(1206057)]],
  });

  const resultado = await ejecutarDeteccionFinales(dependencias);

  equal(resultado.estados?.estado, 'EXITO');
  deepStrictEqual(resultado.datos, [
    {
      partido: 1206057,
      estado: 'EXITO',
      error: null,
      resumen: { estadisticas: 36, eventos: 15 },
      consultas: 2,
    },
  ]);
  deepStrictEqual(registro.tipos, ['DETECCION_FINALES', 'DATOS_PARTIDO']);
  deepStrictEqual(registro.consultasApi.slice(1), [
    { ruta: '/fixtures/statistics', parametros: { fixture: '1206057' } },
    { ruta: '/fixtures/events', parametros: { fixture: '1206057' } },
  ]);
  equal(registro.datosGuardados[0]?.partido_proveedor_id, 1206057);
});

Deno.test('ejecución: P4 baja como máximo 5 partidos por ejecución (D85)', async () => {
  const ids = [1, 2, 3, 4, 5, 6, 7];
  const { dependencias, registro } = crearDobles({ pendientes: [ids.map(terminado)] });

  const resultado = await ejecutarDeteccionFinales(dependencias);

  equal(resultado.estados, null);
  deepStrictEqual(resultado.datos.map((d) => d.partido), [1, 2, 3, 4, 5]);
  equal(registro.consultasApi.length, 10);
});

Deno.test('ejecución: un partido con error en P4 no impide los demás (R6)', async () => {
  const { dependencias, registro } = crearDobles({
    pendientes: [[terminado(11), terminado(12)]],
    respuesta: (ruta, parametros) => {
      if (ruta === '/fixtures/statistics' && parametros.fixture === '11') {
        return { tipo: 'ok', cuerpo: errorTemporada2026 };
      }
      return ruta === '/fixtures/statistics'
        ? { tipo: 'ok', cuerpo: estadisticas1206057 }
        : { tipo: 'ok', cuerpo: eventos1206057 };
    },
  });

  const resultado = await ejecutarDeteccionFinales(dependencias);

  equal(resultado.datos[0]?.estado, 'ERROR');
  ok(resultado.datos[0]?.error?.startsWith('Partido 11: API-Football respondió con errores'));
  equal(resultado.datos[0]?.consultas, 1);
  equal(resultado.datos[1]?.estado, 'EXITO');
  deepStrictEqual(registro.datosGuardados.map((d) => d.partido_proveedor_id), [12]);
});

Deno.test('ejecución: si la base rechaza los datos el registro queda en ERROR', async () => {
  const { dependencias } = crearDobles({
    pendientes: [[terminado(13)]],
    guardarFalla: 'El partido 13 no está TERMINADO (EN_JUEGO)',
  });

  const resultado = await ejecutarDeteccionFinales(dependencias);

  deepStrictEqual(resultado.datos[0], {
    partido: 13,
    estado: 'ERROR',
    error: 'Partido 13: Error inesperado: El partido 13 no está TERMINADO (EN_JUEGO)',
    resumen: null,
    consultas: 2,
  });
});

Deno.test('ejecución: P3 anota los partidos que la API no devolvió', async () => {
  const { dependencias } = crearDobles({
    pendientes: [[enJuego(21), enJuego(22)], []],
    respuesta: () => ({ tipo: 'ok', cuerpo: partidosPorIds('21') }),
  });

  const resultado = await ejecutarDeteccionFinales(dependencias);

  equal(resultado.estados?.estado, 'EXITO');
  equal(resultado.estados?.error, 'Partido 22: la API no lo devolvió.');
});

Deno.test('ejecución: P3 y P4 siguen consultando con el tope alcanzado (R4)', async () => {
  const { dependencias, registro } = crearDobles({
    pendientes: [[enJuego(31)], [terminado(31)]],
    consultasPrevias: 95,
  });

  const resultado = await ejecutarDeteccionFinales(dependencias);

  equal(resultado.estados?.estado, 'EXITO');
  equal(resultado.datos[0]?.estado, 'EXITO');
  equal(registro.consultasApi.length, 3);
});

Deno.test('ejecución: forzar partidos solo hace P4 de esos, sin buscar pendientes', async () => {
  const { dependencias, registro } = crearDobles({ pendientes: [[enJuego(41)]] });

  const resultado = await ejecutarDeteccionFinales(dependencias, [1206057, 1206057]);

  equal(registro.busquedas, 0);
  equal(resultado.estados, null);
  deepStrictEqual(resultado.datos.map((d) => [d.partido, d.estado]), [[1206057, 'EXITO']]);
  deepStrictEqual(registro.tipos, ['DATOS_PARTIDO']);
});
