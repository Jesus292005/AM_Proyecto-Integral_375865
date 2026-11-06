import { z } from 'zod';

import { ESQUEMA_JSON_SALIDA, esquemaSalidaIA, normalizarSalida, type SalidaIA } from './esquema.ts';

// F06 R13: Messages API de Anthropic con `fetch` + Zod, como API-Football y Expo (sin dependencia
// nueva). Salidas estructuradas (`output_config.format`) y sin `temperature`: la versión de la API
// 2026-10-21 la rechaza. La clave vive solo en el servidor (R12, D14).

const URL_MENSAJES = 'https://api.anthropic.com/v1/messages';
const VERSION_API = '2026-10-21';
const TIEMPO_LIMITE_MS = 30_000;
export const MAX_TOKENS = 2_000;

/** D94, decisión 2: Haiku 5.5. Haiku 4.5 solo para la comparación de T48. */
export const MODELOS = {
  'claude-haiku-5-5': { entradaUsdPorMillon: 0.1, salidaUsdPorMillon: 0.5, esfuerzo: true },
  'claude-haiku-4-5': { entradaUsdPorMillon: 1, salidaUsdPorMillon: 5, esfuerzo: false },
} as const;

export type ModeloIA = keyof typeof MODELOS;
export const MODELO_IA: ModeloIA = 'claude-haiku-5-5';

export function esModeloIA(valor: string): valor is ModeloIA {
  return Object.hasOwn(MODELOS, valor);
}

export type PeticionMensajes = {
  model: ModeloIA;
  max_tokens: number;
  system: string;
  messages: { role: 'user'; content: string }[];
  output_config: {
    effort?: 'medium';
    format: { type: 'json_schema'; schema: typeof ESQUEMA_JSON_SALIDA };
  };
};

/** R10: esfuerzo `medium` en Haiku 5.5 (Jesús, T49; Haiku 4.5 no acepta `effort`). */
export function armarPeticion(modelo: ModeloIA, sistema: string, usuario: string): PeticionMensajes {
  return {
    model: modelo,
    max_tokens: MAX_TOKENS,
    system: sistema,
    messages: [{ role: 'user', content: usuario }],
    output_config: {
      ...(MODELOS[modelo].esfuerzo ? { effort: 'medium' as const } : {}),
      format: { type: 'json_schema', schema: ESQUEMA_JSON_SALIDA },
    },
  };
}

export type RespuestaAnthropic =
  | { tipo: 'ok'; cuerpo: unknown }
  | { tipo: 'error'; estado: number | null; mensaje: string };

export type LlamarAnthropic = (peticion: PeticionMensajes) => Promise<RespuestaAnthropic>;

export function crearClienteAnthropic(clave: string, hacerFetch: typeof fetch = fetch): LlamarAnthropic {
  return async (peticion) => {
    try {
      const respuesta = await hacerFetch(URL_MENSAJES, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': clave,
          'anthropic-version': VERSION_API,
        },
        body: JSON.stringify(peticion),
        signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
      });
      if (!respuesta.ok) {
        const detalle = (await respuesta.text()).slice(0, 300);
        return { tipo: 'error', estado: respuesta.status, mensaje: `Anthropic respondió ${respuesta.status}: ${detalle}` };
      }
      return { tipo: 'ok', cuerpo: await respuesta.json() };
    } catch (error) {
      const motivo = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      return { tipo: 'error', estado: null, mensaje: `Sin respuesta válida de Anthropic (${motivo})` };
    }
  };
}

const esquemaRespuestaMensajes = z.object({
  model: z.string(),
  stop_reason: z.string().nullable(),
  content: z.array(z.looseObject({ type: z.string(), text: z.string().optional() })),
  usage: z.looseObject({ input_tokens: z.int().nonnegative(), output_tokens: z.int().nonnegative() }),
});

export type Tokens = { entrada: number; salida: number };

export type ResultadoLlamada =
  | { tipo: 'ok'; salida: SalidaIA; tokens: Tokens }
  | { tipo: 'fallo'; motivo: string; tokens: Tokens | null };

/**
 * Valida la respuesta y extrae la salida (R6). Rechazo, respuesta cortada, JSON roto o fuera del
 * esquema son intentos fallidos (R8).
 */
export function interpretarRespuesta(cuerpo: unknown): ResultadoLlamada {
  const respuesta = esquemaRespuestaMensajes.safeParse(cuerpo);
  if (!respuesta.success) {
    return { tipo: 'fallo', motivo: `Respuesta con forma inválida: ${z.prettifyError(respuesta.error)}`, tokens: null };
  }
  const { stop_reason, content, usage } = respuesta.data;
  const tokens = { entrada: usage.input_tokens, salida: usage.output_tokens };
  if (stop_reason === 'refusal') return { tipo: 'fallo', motivo: 'El modelo rechazó la petición.', tokens };
  if (stop_reason === 'max_tokens') return { tipo: 'fallo', motivo: 'Respuesta cortada (max_tokens).', tokens };

  const texto = content.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('');
  let json: unknown;
  try {
    json = JSON.parse(texto);
  } catch {
    return { tipo: 'fallo', motivo: 'La salida no es JSON.', tokens };
  }
  const salida = esquemaSalidaIA.safeParse(json);
  if (!salida.success) {
    return { tipo: 'fallo', motivo: `Salida fuera del esquema: ${z.prettifyError(salida.error)}`, tokens };
  }
  return { tipo: 'ok', salida: normalizarSalida(salida.data), tokens };
}

export function costoUsd(modelo: ModeloIA, tokens: Tokens): number {
  const precio = MODELOS[modelo];
  return (tokens.entrada * precio.entradaUsdPorMillon + tokens.salida * precio.salidaUsdPorMillon) / 1e6;
}
