import { z } from 'zod';

import { type EnviarAExpo, esquemaRespuestaExpo, MENSAJES_POR_PETICION, type MensajeExpo } from './expo.ts';

// Envío compartido por los avisos (F11a R6, F11b R5): bloques de 100, la respuesta de Expo validada
// con Zod y los tokens `DeviceNotRegistered` borrados. Un envío fallido no se reintenta: el aviso ya
// quedó escrito en `notificacion_enviada` y se pierde (queda en el resumen).

export type ResultadoEnvio = {
  enviados: number;
  fallidos: number;
  tokensBorrados: number;
  errores: string[];
};

export async function enviarMensajes(
  mensajes: readonly MensajeExpo[],
  enviarAExpo: EnviarAExpo,
  borrarTokens: (tokens: readonly string[]) => Promise<void>,
): Promise<ResultadoEnvio> {
  const resultado: ResultadoEnvio = { enviados: 0, fallidos: 0, tokensBorrados: 0, errores: [] };
  const noRegistrados: string[] = [];

  for (let i = 0; i < mensajes.length; i += MENSAJES_POR_PETICION) {
    const bloque = mensajes.slice(i, i + MENSAJES_POR_PETICION);
    const respuesta = await enviarAExpo(bloque);
    if (respuesta.tipo === 'error') {
      resultado.fallidos += bloque.length;
      resultado.errores.push(respuesta.mensaje);
      continue;
    }
    const tickets = esquemaRespuestaExpo.safeParse(respuesta.cuerpo);
    if (!tickets.success || tickets.data.data.length !== bloque.length) {
      resultado.fallidos += bloque.length;
      resultado.errores.push(
        tickets.success
          ? `Expo devolvió ${tickets.data.data.length} tickets para ${bloque.length} mensajes`
          : `Respuesta de Expo con forma inválida: ${z.prettifyError(tickets.error)}`,
      );
      continue;
    }
    tickets.data.data.forEach((ticket, j) => {
      if (ticket.status === 'ok') {
        resultado.enviados += 1;
        return;
      }
      resultado.fallidos += 1;
      resultado.errores.push(ticket.message);
      const mensaje = bloque[j];
      if (ticket.details?.error === 'DeviceNotRegistered' && mensaje) noRegistrados.push(mensaje.to);
    });
  }

  if (noRegistrados.length > 0) {
    await borrarTokens(noRegistrados);
    resultado.tokensBorrados = noRegistrados.length;
  }
  return resultado;
}
