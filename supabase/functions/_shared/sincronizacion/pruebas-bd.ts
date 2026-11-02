import postgres from 'postgres';

import { esquemaRespuestaEquipos, esquemaRespuestaPartidos } from '../api-football/esquemas.ts';
import partidos2024 from '../ejemplos-api-football/fixtures-262-2024.json' with { type: 'json' };
import equipos2024 from '../ejemplos-api-football/teams-262-2024.json' with { type: 'json' };
import { armarCargaTorneo, type CargaTorneo, type ParametrosCarga } from './sincronizacion-torneo.ts';

// Utilidades de las pruebas contra la base LOCAL de Docker (`*.bd-test.ts`, `deno task test:bd`).
// Requieren `npx supabase db start` (y `db reset --local` tras una migración).

export const URL_BD_LOCAL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

export type Sql = postgres.TransactionSql;

const equipos = esquemaRespuestaEquipos.parse(equipos2024).response;
const partidos = esquemaRespuestaPartidos.parse(partidos2024).response;

export function cargaDe(parametros: ParametrosCarga): CargaTorneo {
  const armado = armarCargaTorneo(parametros, equipos, partidos, new Date('2026-11-01T13:00:00Z'));
  if (armado.tipo === 'error') throw new Error(armado.mensaje);
  return armado.carga;
}

export const apertura = cargaDe({
  temporada: 2024,
  prefijoRondas: 'Apertura',
  nombre: 'Apertura 2024',
  esActual: true,
});

class Deshacer extends Error {}

/** Corre `prueba` como `service_role` dentro de una transacción que siempre se deshace. */
export async function enTransaccion(prueba: (sql: Sql) => Promise<void>) {
  const sql = postgres(URL_BD_LOCAL, { max: 1, onnotice: () => {} });
  try {
    await sql.begin(async (tx) => {
      await tx`set local role service_role`;
      await prueba(tx);
      throw new Deshacer();
    });
  } catch (error) {
    if (!(error instanceof Deshacer)) throw error;
  } finally {
    await sql.end();
  }
}

/** Llama a una función SQL que recibe `jsonb`. */
export async function llamar(sql: Sql, funcion: string, datos: unknown) {
  // Como texto y convertido en SQL: con `::jsonb` directo, `postgres` lo serializa dos veces.
  const [fila] = await sql.unsafe(`select public.${funcion}(($1::text)::jsonb) as resultado`, [
    JSON.stringify(datos),
  ]);
  return fila?.resultado;
}

export function guardar(sql: Sql, carga: CargaTorneo) {
  return llamar(sql, 'guardar_carga_inicial', carga);
}

/** Consulta como `postgres` (sin cambiar de rol ni escribir), p. ej. para leer `cron.job`. */
export async function comoPostgres<T>(consulta: (sql: postgres.Sql) => Promise<T>): Promise<T> {
  const sql = postgres(URL_BD_LOCAL, { max: 1, onnotice: () => {} });
  try {
    return await consulta(sql);
  } finally {
    await sql.end();
  }
}
