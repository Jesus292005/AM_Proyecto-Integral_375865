import { deepStrictEqual } from 'node:assert/strict';

import { enTransaccion, type Sql } from '../sincronizacion/pruebas-bd.ts';

// F11a R6 contra la base LOCAL de Docker (`deno task test:bd`): el reclamo de avisos de
// `repositorio.ts` (`upsert` con `ignoreDuplicates` de PostgREST = `insert … on conflict do
// nothing returning`) devuelve solo los pares nuevos, así un aviso nunca sale dos veces.

const A = '00000000-0000-0000-0000-0000000000a1';

async function prepararPartido(sql: Sql): Promise<number> {
  await sql`reset role`;
  await sql`
    insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
    values (${A}, 'a1@example.com', '{"provider": "google"}',
      '{"provider_id": "google-a1", "full_name": "Usuario A1"}')
  `;
  const [liga] = await sql`
    insert into public.liga (proveedor_id, nombre, pais) values (999263, 'Liga', 'Mexico')
    returning id
  `;
  const [torneo] = await sql`
    insert into public.torneo (liga_id, nombre, temporada_proveedor, prefijo_rondas, fecha_inicio, fecha_fin)
    values (${liga?.id}, 'Apertura 2098', 2098, 'Apertura', '2098-07-01', '2098-12-31') returning id
  `;
  const [jornada] = await sql`
    insert into public.jornada (torneo_id, orden, nombre, nombres_proveedor, fase, fecha_inicio, fecha_fin)
    values (${torneo?.id}, 1, 'Jornada 1', array['Apertura - 1'], 'REGULAR', '2098-07-01', '2098-07-31')
    returning id
  `;
  const equipos = await sql`
    insert into public.equipo (proveedor_id, nombre, nombre_corto, escudo_url)
    values (998001, 'L', 'L', 'https://x.mx/l.png'), (998002, 'V', 'V', 'https://x.mx/v.png')
    returning id
  `;
  const [partido] = await sql`
    insert into public.partido (proveedor_id, torneo_id, jornada_id, equipo_local_id,
      equipo_visitante_id, inicio, cierre_predicciones, sincronizado_en)
    values (998101, ${torneo?.id}, ${jornada?.id}, ${equipos[0]?.id}, ${equipos[1]?.id},
      now() + interval '30 minutes', now() + interval '30 minutes', now())
    returning id
  `;
  await sql`set local role service_role`;
  return Number(partido?.id);
}

function reclamar(sql: Sql, partido: number) {
  return sql`
    insert into public.notificacion_enviada (usuario_id, tipo, partido_id)
    values (${A}, 'RECORDATORIO', ${partido})
    on conflict (usuario_id, tipo, partido_id) do nothing
    returning usuario_id, partido_id
  `;
}

Deno.test('F11a R6: reclamar un aviso devuelve el par la primera vez y nada la segunda', async () => {
  await enTransaccion(async (sql) => {
    const partido = await prepararPartido(sql);

    const primera = await reclamar(sql, partido);
    const segunda = await reclamar(sql, partido);

    deepStrictEqual(primera.map((f) => [f.usuario_id, Number(f.partido_id)]), [[A, partido]]);
    deepStrictEqual(segunda.length, 0);
  });
});
