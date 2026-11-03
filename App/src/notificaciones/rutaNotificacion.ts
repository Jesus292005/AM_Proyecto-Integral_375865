import type { Href } from 'expo-router';
import { z } from 'zod';

// La notificación trae su destino (F11a R8); llega de fuera de la app, así que se valida (D54).
// Solo dos formas: un partido o la lista de una jornada.
const esquemaDatos = z.object({
  ruta: z.string().regex(/^\/partido\/\d+$|^\/partidos\?jornada=\d+$/),
});

/** La ruta de la notificación, o null si sus datos no son válidos (se ignora, CA7). */
export function rutaDeNotificacion(datos: unknown): Href | null {
  const resultado = esquemaDatos.safeParse(datos);
  // Las dos formas existen en la app (rutas tipadas); el texto ya está validado.
  return resultado.success ? (resultado.data.ruta as Href) : null;
}
