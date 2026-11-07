import { esSinConexion } from '../datos/errores';

/** Errores identificables de crear, unirse y salir (F07 R4, R12). */
export const CODIGOS_GRUPO = [
  'SIN_SESION',
  'NOMBRE_INVALIDO',
  'LIMITE_GRUPOS',
  'CODIGO_INVALIDO',
  'CODIGO_NO_EXISTE',
  'GRUPO_LLENO',
  'NO_MIEMBRO',
  'JORNADA_INVALIDA',
  'SIN_TORNEO_ACTUAL',
] as const;

export type CodigoGrupo = (typeof CODIGOS_GRUPO)[number];

export class ErrorGrupo extends Error {
  constructor(readonly codigo: CodigoGrupo) {
    super(codigo);
    this.name = 'ErrorGrupo';
  }
}

export function esCodigoGrupo(mensaje: string): mensaje is CodigoGrupo {
  return (CODIGOS_GRUPO as readonly string[]).includes(mensaje);
}

export const mensajesGrupo = {
  // Mismo texto que F01 §10.
  sinConexion: 'Sin conexión. Revisa tu internet e inténtalo de nuevo.',
  errorMisGrupos: 'No pudimos cargar tus grupos. Inténtalo de nuevo.',
  errorGrupo: 'No pudimos cargar el grupo. Inténtalo de nuevo.',
  errorPredicciones: 'No pudimos cargar las predicciones de tus grupos.',
  sinGrupos: 'Aún no estás en ningún grupo.',
  nombreInvalido: 'Escribe un nombre de 3 a 30 caracteres.',
  limiteCrear: 'Ya estás en 10 grupos; sal de uno para crear otro.',
  limiteUnirse: 'Ya estás en 10 grupos; sal de uno para unirte a otro.',
  codigoMalEscrito: 'El código tiene 8 letras y números, como ABCD-EFGH.',
  codigoNoExiste: 'No encontramos un grupo con ese código.',
  grupoLleno: 'Ese grupo ya tiene 30 miembros.',
  yaEraMiembro: 'Ya eras miembro de este grupo.',
  noMiembro: 'No perteneces a este grupo.',
  nadiePredijo: 'Nadie de tus grupos predijo este partido.',
  errorRanking: 'No pudimos cargar el ranking. Inténtalo de nuevo.',
  sinTorneo: 'No hay un torneo en curso.',
  sinPuntosTorneo: 'Aún no hay partidos calificados en este torneo.',
  sinPuntosJornada: 'Aún no hay partidos calificados en esta jornada.',
  jornadaSinPartidos: 'Esta jornada no tiene partidos.',
  notaRanking: 'Base + bono de la IA. Desempate: marcadores exactos y bono.',
  incluyeSimulados: 'Incluye partidos simulados',
  fallaCrear: 'No se pudo crear el grupo. Inténtalo de nuevo.',
  fallaUnirse: 'No pudimos unirte al grupo. Inténtalo de nuevo.',
  fallaSalir: 'No pudimos sacarte del grupo. Inténtalo de nuevo.',
} as const;

function mensajeDeFalla(error: Error, porCodigo: Partial<Record<CodigoGrupo, string>>, falla: string): string {
  if (error instanceof ErrorGrupo) return porCodigo[error.codigo] ?? falla;
  return esSinConexion(error) ? mensajesGrupo.sinConexion : falla;
}

export const mensajeAlCrear = (error: Error) =>
  mensajeDeFalla(
    error,
    { NOMBRE_INVALIDO: mensajesGrupo.nombreInvalido, LIMITE_GRUPOS: mensajesGrupo.limiteCrear },
    mensajesGrupo.fallaCrear,
  );

export const mensajeAlUnirse = (error: Error) =>
  mensajeDeFalla(
    error,
    {
      CODIGO_INVALIDO: mensajesGrupo.codigoMalEscrito,
      CODIGO_NO_EXISTE: mensajesGrupo.codigoNoExiste,
      GRUPO_LLENO: mensajesGrupo.grupoLleno,
      LIMITE_GRUPOS: mensajesGrupo.limiteUnirse,
    },
    mensajesGrupo.fallaUnirse,
  );

export const mensajeAlSalir = (error: Error) =>
  mensajeDeFalla(error, { NO_MIEMBRO: mensajesGrupo.noMiembro }, mensajesGrupo.fallaSalir);
