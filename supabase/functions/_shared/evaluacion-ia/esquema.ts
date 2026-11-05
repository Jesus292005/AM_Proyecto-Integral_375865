import { z } from 'zod';

// F06 R6: salida del modelo. El esquema JSON va en `output_config.format` (salidas estructuradas,
// que no admiten límites de longitud ni de cantidad) y Zod la valida otra vez al recibirla. No
// tiene campo de bono: lo calcula el servidor (D94, decisión 1).

export const VEREDICTOS = ['ACERTADA', 'CERCANA', 'FALLADA', 'NO_VERIFICABLE'] as const;
export type Veredicto = (typeof VEREDICTOS)[number];

export const MAX_AFIRMACIONES = 5;
export const MAX_TEXTO_AFIRMACION = 200;
export const MAX_EXPLICACION = 300;

export const esquemaSalidaIA = z.strictObject({
  afirmaciones: z.array(
    z.strictObject({
      texto: z.string().trim().min(1),
      veredicto: z.enum(VEREDICTOS),
      motivo: z.string().trim().min(1),
      evidencia: z.array(z.string()),
    }),
  ),
  explicacion: z.string().trim().min(1),
});

export type SalidaIA = z.infer<typeof esquemaSalidaIA>;
export type Afirmacion = SalidaIA['afirmaciones'][number];

export const ESQUEMA_JSON_SALIDA = {
  type: 'object',
  properties: {
    afirmaciones: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          texto: { type: 'string' },
          veredicto: { type: 'string', enum: [...VEREDICTOS] },
          motivo: { type: 'string' },
          evidencia: { type: 'array', items: { type: 'string' } },
        },
        required: ['texto', 'veredicto', 'motivo', 'evidencia'],
        additionalProperties: false,
      },
    },
    explicacion: { type: 'string' },
  },
  required: ['afirmaciones', 'explicacion'],
  additionalProperties: false,
} as const;

function recortar(texto: string, maximo: number): string {
  return texto.length <= maximo ? texto : `${texto.slice(0, maximo - 1).trimEnd()}…`;
}

/**
 * Aplica los límites de R4 que el esquema JSON no puede imponer: las primeras 5 afirmaciones y los
 * textos recortados. Recortar no cambia veredictos ni evidencia.
 */
export function normalizarSalida(salida: SalidaIA): SalidaIA {
  return {
    afirmaciones: salida.afirmaciones.slice(0, MAX_AFIRMACIONES).map((a) => ({
      ...a,
      texto: recortar(a.texto, MAX_TEXTO_AFIRMACION),
      motivo: recortar(a.motivo, MAX_TEXTO_AFIRMACION),
    })),
    explicacion: recortar(salida.explicacion, MAX_EXPLICACION),
  };
}
