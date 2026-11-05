import { deepStrictEqual, equal, ok } from 'node:assert/strict';
import postgres from 'postgres';

import { comoPostgres, URL_BD_LOCAL } from '../sincronizacion/pruebas-bd.ts';
import { type DependenciasCalificar, ejecutarCalificacion } from './calificar.ts';

// F05 CA3 contra la base LOCAL de Docker (`deno task test:bd`): dos ejecuciones de `calificar` en
// paralelo, cada una con su conexión y sus transacciones reales, dejan una sola calificación por
// predicción. Los datos se confirman (no caben en una transacción que se deshace) y se borran al final.

const USUARIOS = ['00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2'];
const TEMPORADA = 2097;

async function preparar(sql: postgres.Sql): Promise<number> {
  await sql`
    insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
    select u, u || '@example.com', '{"provider": "google"}',
      jsonb_build_object('provider_id', 'google-' || u, 'full_name', 'Usuario ' || u)
    from unnest(${USUARIOS}::uuid[]) as u
  `;
  const [liga] = await sql`
    insert into public.liga (proveedor_id, nombre, pais) values (997262, 'Liga', 'Mexico') returning id
  `;
  const [torneo] = await sql`
    insert into public.torneo (liga_id, nombre, temporada_proveedor, prefijo_rondas, fecha_inicio, fecha_fin)
    values (${liga?.id}, 'Apertura 2097', ${TEMPORADA}, 'Apertura', '2097-07-01', '2097-12-31')
    returning id
  `;
  const [jornada] = await sql`
    insert into public.jornada (torneo_id, orden, nombre, nombres_proveedor, fase, fecha_inicio, fecha_fin)
    values (${torneo?.id}, 1, 'Jornada 1', array['Apertura - 1'], 'REGULAR', '2097-07-01', '2097-07-31')
    returning id
  `;
  const equipos = await sql`
    insert into public.equipo (proveedor_id, nombre, nombre_corto, escudo_url)
    values (997001, 'L', 'L', 'https://x.mx/l.png'), (997002, 'V', 'V', 'https://x.mx/v.png')
    returning id
  `;
  const [partido] = await sql`
    insert into public.partido (proveedor_id, torneo_id, jornada_id, equipo_local_id,
      equipo_visitante_id, inicio, cierre_predicciones, sincronizado_en)
    values (997101, ${torneo?.id}, ${jornada?.id}, ${equipos[0]?.id}, ${equipos[1]?.id},
      now() + interval '1 day', now() + interval '1 day', now())
    returning id
  `;
  const id = Number(partido?.id);
  await sql`
    insert into public.prediccion (usuario_id, partido_id, marcador_local, marcador_visitante)
    values (${USUARIOS[0] ?? ''}, ${id}, 2, 1), (${USUARIOS[1] ?? ''}, ${id}, 3, 0)
  `;
  await sql`
    update public.partido
    set estado = 'TERMINADO', goles_local = 2, goles_visitante = 1, listo_para_calificar_en = now()
    where id = ${id}
  `;
  return id;
}

async function limpiar(sql: postgres.Sql) {
  // Borrar los usuarios borra en cascada sus predicciones (F03 R6) y sus calificaciones.
  await sql`delete from auth.users where id = any(${USUARIOS}::uuid[])`;
  await sql`
    delete from public.partido where torneo_id in (
      select id from public.torneo where temporada_proveedor = ${TEMPORADA})
  `;
  await sql`
    delete from public.jornada where torneo_id in (
      select id from public.torneo where temporada_proveedor = ${TEMPORADA})
  `;
  await sql`delete from public.torneo where temporada_proveedor = ${TEMPORADA}`;
  await sql`delete from public.liga where proveedor_id = 997262`;
  await sql`delete from public.equipo where proveedor_id in (997001, 997002)`;
}

/** Las mismas llamadas que `repositorio.ts`, como `service_role` y solo para el partido de prueba. */
function dependenciasCon(sql: postgres.Sql, partido: number): DependenciasCalificar {
  return {
    buscarPartidos: async (limite) => {
      const filas = await sql`
        select partido_id, goles_local, goles_visitante
        from public.partidos_por_calificar(${limite}) where partido_id = ${partido}
      `;
      return filas.map((f) => ({
        partido_id: Number(f.partido_id),
        goles_local: Number(f.goles_local),
        goles_visitante: Number(f.goles_visitante),
      }));
    },
    leerValores: async () => {
      const [fila] = await sql`select resultado, rango_goles, marcador_exacto from public.valor_puntos`;
      return {
        resultado: Number(fila?.resultado),
        rango_goles: Number(fila?.rango_goles),
        marcador_exacto: Number(fila?.marcador_exacto),
      };
    },
    leerPredicciones: async (id) => {
      const filas = await sql`
        select id, resultado, rango_goles, marcador_local, marcador_visitante
        from public.prediccion where partido_id = ${id} order by id
      `;
      return filas.map((f) => ({
        id: Number(f.id),
        resultado: f.resultado,
        rango_goles: f.rango_goles,
        marcador_local: f.marcador_local,
        marcador_visitante: f.marcador_visitante,
      }));
    },
    registrar: async (id, calificaciones) => {
      const [fila] = await sql`
        select public.registrar_calificaciones(${id}, (${JSON.stringify(calificaciones)}::text)::jsonb)
          as desenlace
      `;
      const desenlace = fila?.desenlace;
      if (desenlace !== 'CALIFICADO' && desenlace !== 'YA_CALIFICADO') {
        throw new Error(`Desenlace inesperado: ${desenlace}`);
      }
      return desenlace;
    },
  };
}

/** Una conexión propia que trabaja como `service_role`, igual que la función desplegada. */
async function conexionServicio() {
  const sql = postgres(URL_BD_LOCAL, { max: 1, onnotice: () => {} });
  await sql`set role service_role`;
  return sql;
}

Deno.test('F05 CA3: dos ejecuciones en paralelo dejan una calificación por predicción', async () => {
  const admin = postgres(URL_BD_LOCAL, { max: 1, onnotice: () => {} });
  const [s1, s2] = await Promise.all([conexionServicio(), conexionServicio()]);
  try {
    await limpiar(admin);
    const partido = await preparar(admin);

    const resumenes = await Promise.all([
      ejecutarCalificacion(dependenciasCon(s1, partido)),
      ejecutarCalificacion(dependenciasCon(s2, partido)),
    ]);

    deepStrictEqual(resumenes.flatMap((r) => r.errores), []);
    equal(resumenes.reduce((total, r) => total + r.partidos, 0), 1);
    const filas = await admin`
      select pr.marcador_local, pr.marcador_visitante, c.puntos_base
      from public.calificacion c join public.prediccion pr on pr.id = c.prediccion_id
      where pr.partido_id = ${partido} order by pr.id
    `;
    deepStrictEqual(
      filas.map((f) => [f.marcador_local, f.marcador_visitante, f.puntos_base]),
      [[2, 1, 350], [3, 0, 250]],
    );
  } finally {
    await limpiar(admin);
    await Promise.all([admin.end(), s1.end(), s2.end()]);
  }
});

Deno.test('F05 CA3: la segunda llamada espera el bloqueo de la primera y responde YA_CALIFICADO', async () => {
  const admin = postgres(URL_BD_LOCAL, { max: 1, onnotice: () => {} });
  const [s1, s2] = await Promise.all([conexionServicio(), conexionServicio()]);
  try {
    await limpiar(admin);
    const partido = await preparar(admin);
    const predicciones = await admin`select id from public.prediccion where partido_id = ${partido}`;
    const calificaciones = JSON.stringify(predicciones.map((p) => ({
      prediccion_id: Number(p.id),
      puntos_resultado: 0,
      puntos_rango_goles: 0,
      puntos_marcador: 0,
    })));

    let segunda: Promise<string> | undefined;
    await s1.begin(async (tx) => {
      const [primera] = await tx`
        select public.registrar_calificaciones(${partido}, (${calificaciones}::text)::jsonb) as d
      `;
      equal(primera?.d, 'CALIFICADO');
      // Con la fila del partido bloqueada por la primera transacción, la segunda queda esperando.
      segunda = s2`
        select public.registrar_calificaciones(${partido}, (${calificaciones}::text)::jsonb) as d
      `.then(([fila]) => String(fila?.d));
      await new Promise((resolver) => setTimeout(resolver, 300));
    });
    equal(await segunda, 'YA_CALIFICADO');

    const [cuenta] = await admin`
      select count(*)::int as n from public.calificacion c
      join public.prediccion pr on pr.id = c.prediccion_id where pr.partido_id = ${partido}
    `;
    equal(cuenta?.n, 2);
  } finally {
    await limpiar(admin);
    await Promise.all([admin.end(), s1.end(), s2.end()]);
  }
});

Deno.test('F05 R8: la calificación está programada cada minuto y solo llama si hay partidos', async () => {
  await comoPostgres(async (sql) => {
    const [tarea] = await sql<{ schedule: string; command: string; active: boolean }[]>`
      select schedule, command, active from cron.job where jobname = 'calificar'
    `;
    if (tarea === undefined) throw new Error('No está programada la calificación');
    equal(tarea.schedule, '* * * * *');
    equal(tarea.active, true);
    ok(tarea.command.includes("'/functions/v1/calificar'"));
    ok(tarea.command.includes('where exists (select 1 from public.partidos_por_calificar(1))'));
    ok(tarea.command.includes("name = 'clave_secreta'"));
    equal(tarea.command.includes('sb_secret_'), false);
  });
});
