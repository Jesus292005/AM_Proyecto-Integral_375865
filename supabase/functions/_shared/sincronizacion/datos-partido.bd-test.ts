import { deepStrictEqual, equal, ok, rejects } from 'node:assert/strict';

import {
  esquemaRespuestaEstadisticas,
  esquemaRespuestaEventos,
} from '../api-football/esquemas.ts';
import eventos1206057 from '../ejemplos-api-football/events-1206057.json' with { type: 'json' };
import estadisticas1206057 from '../ejemplos-api-football/statistics-1206057.json' with {
  type: 'json',
};
import { armarDatosPartido, type DatosPartido } from './datos-partido.ts';
import { apertura, comoPostgres, enTransaccion, guardar, llamar, type Sql } from './pruebas-bd.ts';
import type { CargaTorneo } from './sincronizacion-torneo.ts';

// Pruebas de P3/P4 contra la base LOCAL de Docker (CA7, D84, D85); `deno task test:bd`.

const ID = 1206057; // Puebla 2-1 Querétaro (D29).
const SINCRONIZADO = '2026-11-02T15:00:00.000Z';

const datos1206057: DatosPartido = armarDatosPartido(
  ID,
  esquemaRespuestaEstadisticas.parse(estadisticas1206057).response,
  esquemaRespuestaEventos.parse(eventos1206057).response,
  new Date(SINCRONIZADO),
).datos;

const partido1206057 = apertura.partidos.find((p) => p.proveedor_id === ID);
if (partido1206057 === undefined) throw new Error('El Apertura 2024 no trae el partido 1206057');
const INICIO = new Date(partido1206057.inicio);

/** El Apertura 2024 con el 1206057 todavía sin jugar. */
const aperturaSinJugar: CargaTorneo = {
  ...apertura,
  partidos: apertura.partidos.map((p) =>
    p.proveedor_id === ID
      ? {
        ...p,
        estado: 'PROGRAMADO',
        goles_local: null,
        goles_visitante: null,
        goles_local_medio_tiempo: null,
        goles_visitante_medio_tiempo: null,
      }
      : p
  ),
};

function masHoras(fecha: Date, horas: number): string {
  return new Date(fecha.getTime() + horas * 3_600_000).toISOString();
}

async function pendiente(sql: Sql, ahora: string) {
  const filas = await sql<{ proveedor_id: number; estado: string }[]>`
    select proveedor_id, estado from public.partidos_pendientes_de_final(${ahora}::timestamptz)
    where proveedor_id = ${ID}
  `;
  return filas[0] ?? null;
}

async function guardado(sql: Sql) {
  const estadisticas = await sql<{ equipo: number; tipo: string; valor: string | null }[]>`
    select e.proveedor_id as equipo, s.tipo, s.valor
    from public.estadistica_partido s
    join public.partido p on p.id = s.partido_id
    join public.equipo e on e.id = s.equipo_id
    where p.proveedor_id = ${ID}
  `;
  const eventos = await sql<{ tipo: string; minuto: number; minuto_agregado: number | null }[]>`
    select v.tipo, v.minuto, v.minuto_agregado
    from public.evento_partido v join public.partido p on p.id = v.partido_id
    where p.proveedor_id = ${ID}
    order by v.minuto, v.id
  `;
  const [partido] = await sql<{ listo_para_calificar_en: Date | null }[]>`
    select listo_para_calificar_en from public.partido where proveedor_id = ${ID}
  `;
  return { estadisticas, eventos, listo: partido?.listo_para_calificar_en?.toISOString() ?? null };
}

Deno.test('BD: P4 guarda las estadísticas y eventos del partido terminado (CA7)', async () => {
  await enTransaccion(async (sql) => {
    await guardar(sql, apertura);

    deepStrictEqual(await llamar(sql, 'guardar_datos_partido', datos1206057), {
      estadisticas: 36,
      eventos: 15,
    });

    const { estadisticas, eventos, listo } = await guardado(sql);
    equal(estadisticas.length, 36);
    const valor = (equipo: number, tipo: string) =>
      estadisticas.find((e) => e.equipo === equipo && e.tipo === tipo)?.valor;
    equal(valor(2291, 'Total Shots'), '17');
    equal(valor(2291, 'Ball Possession'), '49%');
    // Sin dato: null, nunca 0 (D29).
    equal(valor(2291, 'Red Cards'), null);
    equal(valor(2290, 'Red Cards'), null);
    equal(valor(2290, 'goals_prevented'), null);

    equal(eventos.length, 15);
    equal(eventos.filter((e) => e.tipo === 'GOL').length, 3);
    ok(eventos.some((e) => e.tipo === 'GOL' && e.minuto === 45 && e.minuto_agregado === 1));
    equal(listo, SINCRONIZADO);
  });
});

Deno.test('BD: repetir P4 no duplica estadísticas ni eventos y actualiza los valores', async () => {
  await enTransaccion(async (sql) => {
    await guardar(sql, apertura);
    await llamar(sql, 'guardar_datos_partido', datos1206057);

    const corregido: DatosPartido = {
      ...datos1206057,
      estadisticas: datos1206057.estadisticas.map((e) =>
        e.equipo_proveedor_id === 2291 && e.tipo === 'Total Shots' ? { ...e, valor: '18' } : e
      ),
    };
    await llamar(sql, 'guardar_datos_partido', corregido);

    const { estadisticas, eventos } = await guardado(sql);
    equal(estadisticas.length, 36);
    equal(eventos.length, 15);
    equal(estadisticas.find((e) => e.equipo === 2291 && e.tipo === 'Total Shots')?.valor, '18');
  });
});

Deno.test('BD: P4 rechaza un partido que no está TERMINADO o que no existe, sin guardar nada', async () => {
  await enTransaccion(async (sql) => {
    await guardar(sql, aperturaSinJugar);

    await rejects(
      sql.savepoint((sp) => llamar(sp, 'guardar_datos_partido', datos1206057)),
      /no está TERMINADO/,
    );
    await rejects(
      sql.savepoint((sp) =>
        llamar(sp, 'guardar_datos_partido', { ...datos1206057, partido_proveedor_id: 999999 })
      ),
      /No existe el partido 999999/,
    );

    const { estadisticas, eventos, listo } = await guardado(sql);
    deepStrictEqual([estadisticas.length, eventos.length, listo], [0, 0, null]);
  });
});

Deno.test('BD: P3 actualiza estado y marcador; un estado desconocido no cambia el estado (A6)', async () => {
  await enTransaccion(async (sql) => {
    await guardar(sql, aperturaSinJugar);
    const marcador = {
      goles_local: 2,
      goles_visitante: 1,
      goles_local_medio_tiempo: 1,
      goles_visitante_medio_tiempo: 0,
    };

    await llamar(sql, 'actualizar_estados_partidos', {
      sincronizado_en: SINCRONIZADO,
      partidos: [{ proveedor_id: ID, estado: null, ...marcador }],
    });
    const [sinCambio] = await sql`select estado from public.partido where proveedor_id = ${ID}`;
    equal(sinCambio?.estado, 'PROGRAMADO');

    equal(
      await llamar(sql, 'actualizar_estados_partidos', {
        sincronizado_en: SINCRONIZADO,
        partidos: [{ proveedor_id: ID, estado: 'TERMINADO', ...marcador }],
      }),
      1,
    );
    const [fila] = await sql`
      select estado, goles_local, goles_visitante, sincronizado_en
      from public.partido where proveedor_id = ${ID}
    `;
    equal(fila?.estado, 'TERMINADO');
    deepStrictEqual([fila?.goles_local, fila?.goles_visitante], [2, 1]);
    equal(fila?.sincronizado_en.toISOString(), SINCRONIZADO);
  });
});

Deno.test('BD: P3 revisa un partido sin terminar solo entre 115 min y 6 h después del inicio (D85)', async () => {
  await enTransaccion(async (sql) => {
    await guardar(sql, aperturaSinJugar);
    equal(await pendiente(sql, masHoras(INICIO, 1.9)), null);
    deepStrictEqual(await pendiente(sql, masHoras(INICIO, 2)), { proveedor_id: ID, estado: 'PROGRAMADO' });
    deepStrictEqual(await pendiente(sql, masHoras(INICIO, 6)), { proveedor_id: ID, estado: 'PROGRAMADO' });
    equal(await pendiente(sql, masHoras(INICIO, 6.1)), null);
  });
});

Deno.test('BD: P4 baja un terminado sin datos solo en los 3 días siguientes y una sola vez (D84, D85)', async () => {
  await enTransaccion(async (sql) => {
    await guardar(sql, apertura);
    deepStrictEqual(await pendiente(sql, masHoras(INICIO, 48)), { proveedor_id: ID, estado: 'TERMINADO' });
    equal(await pendiente(sql, masHoras(INICIO, 73)), null);

    await llamar(sql, 'guardar_datos_partido', datos1206057);
    equal(await pendiente(sql, masHoras(INICIO, 48)), null);
  });
});

Deno.test('BD: los usuarios no pueden ejecutar las funciones de P3/P4', async () => {
  await enTransaccion(async (sql) => {
    for (const funcion of [
      'public.partidos_pendientes_de_final(timestamptz)',
      'public.actualizar_estados_partidos(jsonb)',
      'public.guardar_datos_partido(jsonb)',
    ]) {
      const [permisos] = await sql`
        select
          has_function_privilege('authenticated', ${funcion}, 'execute') as authenticated,
          has_function_privilege('anon', ${funcion}, 'execute') as anon,
          has_function_privilege('service_role', ${funcion}, 'execute') as service_role
      `;
      deepStrictEqual(permisos, { authenticated: false, anon: false, service_role: true }, funcion);
    }
  });
});

Deno.test('BD: la detección de finales está programada cada 15 min y solo llama si hay pendientes', async () => {
  await comoPostgres(async (sql) => {
    const [tarea] = await sql<{ schedule: string; command: string; active: boolean }[]>`
      select schedule, command, active from cron.job where jobname = 'detectar-finales'
    `;
    if (tarea === undefined) throw new Error('No está programada la detección de finales');
    equal(tarea.schedule, '*/15 * * * *');
    equal(tarea.active, true);
    ok(tarea.command.includes("'/functions/v1/detectar-finales'"));
    ok(tarea.command.includes('where exists (select 1 from public.partidos_pendientes_de_final(now()))'));
    ok(tarea.command.includes("name = 'clave_secreta'"));
    equal(tarea.command.includes('sb_secret_'), false);
  });
});
