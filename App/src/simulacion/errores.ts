/** Errores identificables de las funciones de simulación (F09 Flujo). */
export const CODIGOS_SIMULACION = [
  'SOLO_ADMIN',
  'ORIGEN_INVALIDO',
  'ESTADO_INVALIDO',
  'AUN_NO_CIERRA',
  'SIN_TORNEO_ACTUAL',
  'MINUTOS_INVALIDOS',
  'NO_ES_SIMULADO',
] as const;

export type CodigoSimulacion = (typeof CODIGOS_SIMULACION)[number];

export class ErrorSimulacion extends Error {
  constructor(readonly codigo: CodigoSimulacion) {
    super(codigo);
    this.name = 'ErrorSimulacion';
  }
}

export function esCodigoSimulacion(mensaje: string): mensaje is CodigoSimulacion {
  return (CODIGOS_SIMULACION as readonly string[]).includes(mensaje);
}
