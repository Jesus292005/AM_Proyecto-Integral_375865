import { z } from 'zod';

import type { RespuestaHttp } from '../api-football/cliente.ts';

// Servicio de push de Expo (F11a R6). Solo hace la petición HTTP; validar la respuesta le toca a
// quien llama. Sin token de acceso: el proyecto no activó la seguridad de push de Expo.

const URL_ENVIO = 'https://exp.host/--/api/v2/push/send';
const TIEMPO_LIMITE_MS = 30_000;
// Límite de Expo por petición.
export const MENSAJES_POR_PETICION = 100;

export type MensajeExpo = {
  to: string;
  title: string;
  body: string;
  data: { ruta: string };
  channelId: string;
  sound: 'default';
  priority: 'high';
};

export type EnviarAExpo = (mensajes: readonly MensajeExpo[]) => Promise<RespuestaHttp>;

// Un ticket por mensaje, en el mismo orden. `details.error` trae p. ej. "DeviceNotRegistered".
const esquemaTicket = z.discriminatedUnion('status', [
  z.object({ status: z.literal('ok'), id: z.string() }),
  z.object({
    status: z.literal('error'),
    message: z.string(),
    details: z.looseObject({ error: z.string().optional() }).optional(),
  }),
]);

export const esquemaRespuestaExpo = z.object({ data: z.array(esquemaTicket) });

export type TicketExpo = z.infer<typeof esquemaTicket>;

export function crearClienteExpo(hacerFetch: typeof fetch = fetch): EnviarAExpo {
  return async (mensajes) => {
    try {
      const respuesta = await hacerFetch(URL_ENVIO, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(mensajes),
        signal: AbortSignal.timeout(TIEMPO_LIMITE_MS),
      });
      if (!respuesta.ok) return { tipo: 'error', mensaje: `Expo respondió ${respuesta.status}` };
      return { tipo: 'ok', cuerpo: await respuesta.json() };
    } catch (error) {
      const motivo = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      return { tipo: 'error', mensaje: `Sin respuesta válida de Expo (${motivo})` };
    }
  };
}
