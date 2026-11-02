// Cliente de API-Football: solo hace la consulta HTTP. Validar la respuesta (R5, R6) y contar las
// consultas (R4) le toca a quien llama. La clave nunca aparece en los mensajes de error (D14).

const URL_BASE = 'https://v3.football.api-sports.io';
const TIEMPO_LIMITE_MS = 30_000;

export type RespuestaHttp = { tipo: 'ok'; cuerpo: unknown } | { tipo: 'error'; mensaje: string };

export type ConsultarApi = (
  ruta: string,
  parametros: Readonly<Record<string, string>>,
) => Promise<RespuestaHttp>;

export function crearClienteApi(clave: string, hacerFetch: typeof fetch = fetch): ConsultarApi {
  return async (ruta, parametros) => {
    const url = new URL(ruta, URL_BASE);
    for (const [nombre, valor] of Object.entries(parametros)) url.searchParams.set(nombre, valor);
    const consulta = `${url.pathname}${url.search}`;

    try {
      const respuesta = await hacerFetch(url, {
        headers: { 'x-apisports-key': clave },
        signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
      });
      if (respuesta.status === 429) {
        return { tipo: 'error', mensaje: `Límite de consultas de API-Football agotado (429) en ${consulta}` };
      }
      if (!respuesta.ok) {
        return { tipo: 'error', mensaje: `API-Football respondió ${respuesta.status} en ${consulta}` };
      }
      return { tipo: 'ok', cuerpo: await respuesta.json() };
    } catch (error) {
      const motivo = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      return { tipo: 'error', mensaje: `Sin respuesta válida de API-Football en ${consulta} (${motivo})` };
    }
  };
}
