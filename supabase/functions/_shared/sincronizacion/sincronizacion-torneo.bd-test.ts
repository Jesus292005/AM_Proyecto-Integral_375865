import { deepStrictEqual, equal, ok, rejects } from 'node:assert/strict';

import {
  apertura,
  cargaDe,
  comoPostgres,
  enTransaccion,
  guardar,
  type Sql,
} from './pruebas-bd.ts';
import type { CargaTorneo } from './sincronizacion-torneo.ts';

// Pruebas de `guardar_carga_inicial` contra la base LOCAL de Docker (CA1, CA2, R7, R9). No corren
// con `deno task test`: se corren con `deno task test:bd` (ver pruebas-bd.ts). Cada prueba trabaja
// en una transacción que se deshace.

const clausura = cargaDe({
  temporada: 2024,
  prefijoRondas: 'Clausura',
  nombre: 'Clausura 2025',
  esActual: true,
});

/** Lo que hay en la base del torneo de `carga`, con los ids (para ver que no cambian). */
async function foto(sql: Sql, carga: CargaTorneo) {
  const ids = carga.equipos.map((e) => e.proveedor_id);
  const [torneo] = await sql<{ id: number; es_actual: boolean }[]>`
    select t.id::int, t.es_actual
    from public.torneo t join public.liga l on l.id = t.liga_id
    where l.proveedor_id = ${carga.liga.proveedor_id}
      and t.temporada_proveedor = ${carga.torneo.temporada_proveedor}
      and t.prefijo_rondas = ${carga.torneo.prefijo_rondas}
  `;
  if (torneo === undefined) throw new Error('No se guardó el torneo');
  const equiposGuardados = await sql`
    select id::int, proveedor_id, nombre_corto from public.equipo
    where proveedor_id = any(${ids}) order by proveedor_id
  `;
  const jornadas = await sql`
    select id::int, orden, fase from public.jornada where torneo_id = ${torneo.id} order by orden
  `;
  const partidosGuardados = await sql`
    select p.id::int, p.proveedor_id, p.estado, p.inicio, j.fase
    from public.partido p join public.jornada j on j.id = p.jornada_id
    where p.torneo_id = ${torneo.id} order by p.proveedor_id
  `;
  return { torneo, equipos: equiposGuardados, jornadas, partidos: partidosGuardados };
}

Deno.test('BD: la carga del Apertura 2024 crea 18 equipos, 17 + 4 jornadas y 170 partidos (CA1)', async () => {
  await enTransaccion(async (sql) => {
    const resumen = await guardar(sql, apertura);
    deepStrictEqual(resumen, { equipos: 18, jornadas: 21, partidos: 170 });

    const guardado = await foto(sql, apertura);
    equal(guardado.torneo.es_actual, true);
    equal(guardado.equipos.length, 18);
    equal(guardado.jornadas.length, 21);
    equal(guardado.jornadas.filter((j) => j.fase === 'REGULAR').length, 17);
    equal(guardado.partidos.length, 170);
    equal(guardado.partidos.filter((p) => p.fase === 'REGULAR').length, 153);
    ok(guardado.partidos.every((p) => p.estado === 'TERMINADO'));
    equal(guardado.equipos.find((e) => e.proveedor_id === 2287)?.nombre_corto, 'América');
  });
});

Deno.test('BD: repetir la carga no duplica nada ni cambia los ids (CA2, R1)', async () => {
  await enTransaccion(async (sql) => {
    await guardar(sql, apertura);
    const antes = await foto(sql, apertura);
    const [conteoAntes] = await sql`
      select (select count(*) from public.liga)::int as ligas,
             (select count(*) from public.torneo)::int as torneos,
             (select count(*) from public.equipo)::int as equipos,
             (select count(*) from public.jornada)::int as jornadas,
             (select count(*) from public.partido)::int as partidos
    `;

    await guardar(sql, apertura);
    const despues = await foto(sql, apertura);
    const [conteoDespues] = await sql`
      select (select count(*) from public.liga)::int as ligas,
             (select count(*) from public.torneo)::int as torneos,
             (select count(*) from public.equipo)::int as equipos,
             (select count(*) from public.jornada)::int as jornadas,
             (select count(*) from public.partido)::int as partidos
    `;

    deepStrictEqual(conteoDespues, conteoAntes);
    deepStrictEqual(despues, antes);
  });
});

Deno.test('BD: una nueva carga actualiza el horario y un estado desconocido no cambia el estado (A6)', async () => {
  await enTransaccion(async (sql) => {
    await guardar(sql, apertura);
    const [primero, segundo, ...resto] = apertura.partidos;
    if (primero === undefined || segundo === undefined) throw new Error('Faltan partidos');
    const nuevaHora = '2024-07-06T02:00:00.000Z';
    await guardar(sql, {
      ...apertura,
      partidos: [
        { ...primero, inicio: nuevaHora, estado: null },
        { ...segundo, estado: 'POSPUESTO' },
        ...resto,
      ],
    });

    const filas = await sql<{ proveedor_id: number; estado: string; inicio: Date }[]>`
      select proveedor_id, estado, inicio from public.partido
      where proveedor_id in (${primero.proveedor_id}, ${segundo.proveedor_id})
      order by proveedor_id
    `;
    const fila = (id: number) => filas.find((f) => f.proveedor_id === id);
    equal(fila(primero.proveedor_id)?.estado, 'TERMINADO');
    equal(fila(primero.proveedor_id)?.inicio.toISOString(), nuevaHora);
    equal(fila(segundo.proveedor_id)?.estado, 'POSPUESTO');
  });
});

Deno.test('BD: una carga que falla no deja nada a medias (R5, R7)', async () => {
  await enTransaccion(async (sql) => {
    await guardar(sql, apertura);
    const antes = await foto(sql, apertura);
    const [primero, ...resto] = apertura.partidos;
    if (primero === undefined) throw new Error('Faltan partidos');

    // Liga renombrada (se escribe primero) + un partido con un equipo que no existe (falla al final).
    const invalida: CargaTorneo = {
      ...apertura,
      liga: { ...apertura.liga, nombre: 'Liga cambiada' },
      partidos: [...resto, { ...primero, equipo_local_proveedor_id: 999999 }],
    };
    await rejects(sql.savepoint((sp) => guardar(sp, invalida)), /not-null|null value/);

    const [liga] = await sql`select nombre from public.liga where proveedor_id = 262`;
    equal(liga?.nombre, 'Liga MX');
    deepStrictEqual(await foto(sql, apertura), antes);
  });
});

Deno.test('BD: marcar otro torneo como actual desmarca el anterior', async () => {
  await enTransaccion(async (sql) => {
    await guardar(sql, apertura);
    await guardar(sql, clausura);
    equal((await foto(sql, apertura)).torneo.es_actual, false);
    equal((await foto(sql, clausura)).torneo.es_actual, true);

    // Recargar el Apertura sin marcarlo como actual no le quita la marca al Clausura.
    await guardar(sql, { ...apertura, torneo: { ...apertura.torneo, es_actual: false } });
    equal((await foto(sql, apertura)).torneo.es_actual, false);
    equal((await foto(sql, clausura)).torneo.es_actual, true);
  });
});

Deno.test('BD: los usuarios no pueden ejecutar la carga', async () => {
  await enTransaccion(async (sql) => {
    // El permiso de la función en sí: sin él, la tabla negaría el acceso de todos modos.
    const [permisos] = await sql`
      select
        has_function_privilege('authenticated', 'public.guardar_carga_inicial(jsonb)', 'execute')
          as authenticated,
        has_function_privilege('anon', 'public.guardar_carga_inicial(jsonb)', 'execute') as anon,
        has_function_privilege('service_role', 'public.guardar_carga_inicial(jsonb)', 'execute')
          as service_role
    `;
    deepStrictEqual(permisos, { authenticated: false, anon: false, service_role: true });
  });
  for (const rol of ['authenticated', 'anon']) {
    await enTransaccion(async (sql) => {
      await sql.unsafe(`set local role ${rol}`);
      await rejects(guardar(sql, apertura), /permission denied for function/);
    });
  }
});

// --- T24: cierre de predicciones (R9, D46, D82), liguilla nueva y tarea programada ---

/** Inicio y cierre de predicciones de un partido. */
async function horario(sql: Sql, proveedorId: number) {
  const [fila] = await sql<{ inicio: Date; cierre_predicciones: Date }[]>`
    select inicio, cierre_predicciones from public.partido where proveedor_id = ${proveedorId}
  `;
  if (fila === undefined) throw new Error(`No existe el partido ${proveedorId}`);
  return { inicio: fila.inicio.toISOString(), cierre: fila.cierre_predicciones.toISOString() };
}

function primeroYResto(carga: CargaTorneo) {
  const [primero, ...resto] = carga.partidos;
  if (primero === undefined) throw new Error('Faltan partidos');
  return { primero, resto };
}

// Una carga "anterior" al torneo: todas sus predicciones siguen abiertas.
const aperturaAntes: CargaTorneo = { ...apertura, sincronizado_en: '2024-07-01T00:00:00.000Z' };

Deno.test('BD: el cierre de predicciones nace igual al inicio (D82)', async () => {
  await enTransaccion(async (sql) => {
    await guardar(sql, aperturaAntes);
    const [distintos] = await sql`
      select count(*)::int as total from public.partido where cierre_predicciones <> inicio
    `;
    equal(distintos?.total, 0);
  });
});

Deno.test('BD: un cambio de horario ANTES del cierre mueve también el cierre (R9)', async () => {
  await enTransaccion(async (sql) => {
    await guardar(sql, aperturaAntes);
    const { primero, resto } = primeroYResto(aperturaAntes);
    const nuevaHora = '2024-07-06T03:00:00.000Z';

    // Primer partido: 2024-07-05 22:45 UTC; se sincroniza el 2 de julio, con todo abierto.
    await guardar(sql, {
      ...aperturaAntes,
      sincronizado_en: '2024-07-02T00:00:00.000Z',
      partidos: [{ ...primero, inicio: nuevaHora }, ...resto],
    });

    deepStrictEqual(await horario(sql, primero.proveedor_id), {
      inicio: nuevaHora,
      cierre: nuevaHora,
    });
  });
});

Deno.test('BD: un cambio de horario DESPUÉS del cierre no reabre las predicciones (R9, D46)', async () => {
  await enTransaccion(async (sql) => {
    await guardar(sql, aperturaAntes);
    const { primero, resto } = primeroYResto(aperturaAntes);
    const nuevaHora = '2024-07-08T02:00:00.000Z';

    // Se sincroniza el 6 de julio, ya pasado el inicio original (5 de julio, 22:45 UTC).
    await guardar(sql, {
      ...aperturaAntes,
      sincronizado_en: '2024-07-06T00:00:00.000Z',
      partidos: [{ ...primero, inicio: nuevaHora, estado: 'POSPUESTO' }, ...resto],
    });

    deepStrictEqual(await horario(sql, primero.proveedor_id), {
      inicio: nuevaHora,
      cierre: primero.inicio,
    });
  });
});

Deno.test('BD: una ronda de liguilla publicada después crea su jornada y sus partidos', async () => {
  await enTransaccion(async (sql) => {
    // Antes de que se publique la final (jornada 21).
    await guardar(sql, {
      ...apertura,
      jornadas: apertura.jornadas.filter((j) => j.orden !== 21),
      partidos: apertura.partidos.filter((p) => p.jornada_orden !== 21),
    });
    equal((await foto(sql, apertura)).jornadas.length, 20);

    await guardar(sql, apertura);
    const guardado = await foto(sql, apertura);
    equal(guardado.jornadas.length, 21);
    equal(guardado.partidos.length, 170);
  });
});

Deno.test('BD: la actualización diaria está programada a las 14:00 UTC y lee la clave de Vault (D83)', async () => {
  // `cron.job` solo la lee `postgres`; esta prueba no cambia nada.
  await comoPostgres(async (sql) => {
    const [tarea] = await sql<{ schedule: string; command: string; active: boolean }[]>`
      select schedule, command, active from cron.job where jobname = 'actualizacion-diaria'
    `;
    if (tarea === undefined) throw new Error('No está programada la actualización diaria');
    equal(tarea.schedule, '0 14 * * *');
    equal(tarea.active, true);
    ok(tarea.command.includes("'/functions/v1/actualizacion-diaria'"));
    ok(tarea.command.includes("name = 'clave_secreta'"));
    equal(tarea.command.includes('sb_secret_'), false);
  });
});
