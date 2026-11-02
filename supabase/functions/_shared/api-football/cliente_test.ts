import { deepStrictEqual, equal, ok } from 'node:assert/strict';

import { crearClienteApi } from './cliente.ts';

const CLAVE = 'clave-de-prueba-123';

type Llamada = { url: string; clave: string | null };

/** `fetch` falso que responde con `respuesta` (o lanza `error`) y anota cada llamada. */
function fetchFalso(respuesta: () => Response) {
  const llamadas: Llamada[] = [];
  const hacerFetch: typeof fetch = (entrada, opciones) => {
    const encabezados = new Headers(opciones?.headers);
    llamadas.push({ url: String(entrada), clave: encabezados.get('x-apisports-key') });
    return Promise.resolve(respuesta());
  };
  return { llamadas, hacerFetch };
}

Deno.test('cliente: consulta la ruta con sus parámetros y la clave en el encabezado', async () => {
  const { llamadas, hacerFetch } = fetchFalso(() => Response.json({ errors: [], response: [] }));
  const consultar = crearClienteApi(CLAVE, hacerFetch);

  const respuesta = await consultar('/fixtures', { league: '262', season: '2024' });

  deepStrictEqual(respuesta, { tipo: 'ok', cuerpo: { errors: [], response: [] } });
  deepStrictEqual(llamadas, [
    { url: 'https://v3.football.api-sports.io/fixtures?league=262&season=2024', clave: CLAVE },
  ]);
});

Deno.test('cliente: un error HTTP o 429 es una falla sin la clave en el mensaje', async () => {
  for (const [status, texto] of [[500, '500'], [429, '429']] as const) {
    const { hacerFetch } = fetchFalso(() => new Response('error', { status }));
    const respuesta = await crearClienteApi(CLAVE, hacerFetch)('/teams', { league: '262' });
    equal(respuesta.tipo, 'error');
    if (respuesta.tipo !== 'error') continue;
    ok(respuesta.mensaje.includes(texto), respuesta.mensaje);
    ok(respuesta.mensaje.includes('/teams?league=262'), respuesta.mensaje);
    equal(respuesta.mensaje.includes(CLAVE), false);
  }
});

Deno.test('cliente: sin red o con un cuerpo que no es JSON es una falla', async () => {
  const casos: (() => Response)[] = [
    () => {
      throw new TypeError('error de red');
    },
    () => new Response('<html>no es json</html>', { status: 200 }),
  ];
  for (const respuesta of casos) {
    const { hacerFetch } = fetchFalso(respuesta);
    const resultado = await crearClienteApi(CLAVE, hacerFetch)('/teams', {});
    equal(resultado.tipo, 'error');
    if (resultado.tipo === 'error') equal(resultado.mensaje.includes(CLAVE), false);
  }
});
