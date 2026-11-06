import { deepStrictEqual, equal, ok } from 'node:assert/strict';
import postgres from 'postgres';

import { comoPostgres, URL_BD_LOCAL } from '../sincronizacion/pruebas-bd.ts';

// F06 CA6 contra la base LOCAL de Docker (`deno task test:bd`): dos `tomar_evaluaciones` en
// paralelo, cada una con su conexión, nunca reservan la misma evaluación (`skip locked` + reserva).
// Los datos se confirman y se borran al final.

const USUARIOS = Array.from({ length: 6 }, (_, i) => `00000000-0000-0000-0000-0000000000e${i}`);
const TEMPORADA = 2096;

async function preparar(sql: postgres.Sql): Promise<number[]> {
  await sql`
    insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
    select u, u || '@example.com', '{"provider": "google"}',
      jsonb_build_object('provider_id', 'google-' || u, 'full_name', 'Usuario ' || u)
    from unnest(${USUARIOS}::uuid[]) as u
  `;
  const [liga] = await sql`
    insert into public.liga (proveedor_id, nombre, pais) values (996262, 'Liga', 'Mexico') returning id
  `;
  const [torneo] = await sql`
    insert into public.torneo (liga_id, nombre, temporada_proveedor, prefijo_rondas, fecha_inicio, fecha_fin)
    values (${liga?.id}, 'Apertura 2096', ${TEMPORADA}, 'Apertura', '2096-07-01', '2096-12-31')
    returning id
  `;
  const [jornada] = await sql`
    insert into public.jornada (torneo_id, orden, nombre, nombres_proveedor, fase, fecha_inicio, fecha_fin)
    values (${torneo?.id}, 1, 'Jornada 1', array['Apertura - 1'], 'REGULAR', '2096-07-01', '2096-07-31')
    returning id
  `;
  const equipos = await sql`
    insert into public.equipo (proveedor_id, nombre, nombre_corto, escudo_url)
    values (996001, 'L', 'L', 'https://x.mx/l.png'), (996002, 'V', 'V', 'https://x.mx/v.png')
    returning id
  `;
  const [partido] = await sql`
    insert into public.partido (proveedor_id, torneo_id, jornada_id, equipo_local_id,
      equipo_visitante_id, inicio, cierre_predicciones, sincronizado_en)
    values (996101, ${torneo?.id}, ${jornada?.id}, ${equipos[0]?.id}, ${equipos[1]?.id},
      now() + interval '1 day', now() + interval '1 day', now())
    returning id
  `;
  const predicciones = await sql`
    insert into public.prediccion (usuario_id, partido_id, resultado, justificacion)
    select u, ${Number(partido?.id)}, 'LOCAL', 'Habrá muchos tiros.'
    from unnest(${USUARIOS}::uuid[]) as u
    returning id
  `;
  await sql`
    insert into public.calificacion (prediccion_id, puntos_resultado, puntos_rango_goles, puntos_marcador, es_simulada)
    select unnest(${predicciones.map((p) => Number(p.id))}::bigint[]), 100, 0, 0, false
  `;
  return predicciones.map((p) => Number(p.id));
}

async function limpiar(sql: postgres.Sql) {
  // Borrar los usuarios borra sus predicciones, calificaciones y evaluaciones en cascada.
  await sql`delete from auth.users where id = any(${USUARIOS}::uuid[])`;
  for (const tabla of ['partido', 'jornada'] as const) {
    await sql`
      delete from ${sql('public.' + tabla)} where torneo_id in (
        select id from public.torneo where temporada_proveedor = ${TEMPORADA})
    `;
  }
  await sql`delete from public.torneo where temporada_proveedor = ${TEMPORADA}`;
  await sql`delete from public.liga where proveedor_id = 996262`;
  await sql`delete from public.equipo where proveedor_id in (996001, 996002)`;
}

async function conexionServicio() {
  const sql = postgres(URL_BD_LOCAL, { max: 1, onnotice: () => {} });
  await sql`set role service_role`;
  return sql;
}

Deno.test('F06 CA6: dos tomar_evaluaciones en paralelo no reservan la misma evaluación', async () => {
  const admin = postgres(URL_BD_LOCAL, { max: 1, onnotice: () => {} });
  const [s1, s2] = await Promise.all([conexionServicio(), conexionServicio()]);
  try {
    await limpiar(admin);
    const predicciones = await preparar(admin);

    const [r1, r2] = await Promise.all([
      s1`select prediccion_id from public.tomar_evaluaciones(4)`,
      s2`select prediccion_id from public.tomar_evaluaciones(4)`,
    ]);
    const tomadas = [...r1, ...r2].map((f) => Number(f.prediccion_id)).filter((id) => predicciones.includes(id));

    equal(new Set(tomadas).size, tomadas.length, `Repetidas: ${tomadas.join(', ')}`);
    ok(tomadas.length >= 4 && tomadas.length <= 6);
    const [cuenta] = await admin`
      select count(*)::int as n, max(intentos)::int as max from public.evaluacion_ia
      where prediccion_id = any(${predicciones}::bigint[])
    `;
    equal(cuenta?.n, 6);
    equal(cuenta?.max, 1);
  } finally {
    await limpiar(admin);
    await Promise.all([admin.end(), s1.end(), s2.end()]);
  }
});

Deno.test('F06 R14: la evaluación está programada cada minuto y solo llama si hay algo por hacer', async () => {
  await comoPostgres(async (sql) => {
    const [tarea] = await sql<{ schedule: string; command: string; active: boolean }[]>`
      select schedule, command, active from cron.job where jobname = 'evaluar'
    `;
    if (tarea === undefined) throw new Error('No está programada la evaluación');
    deepStrictEqual([tarea.schedule, tarea.active], ['* * * * *', true]);
    ok(tarea.command.includes("'/functions/v1/evaluar'"));
    ok(tarea.command.includes('where public.hay_evaluaciones_por_hacer(now(), 150)'));
    ok(tarea.command.includes("name = 'clave_secreta'"));
    equal(tarea.command.includes('sk-ant'), false);
  });
});
