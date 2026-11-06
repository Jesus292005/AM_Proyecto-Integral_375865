import type { EstadoIndicador } from '../componentes';
import type { AfirmacionIA, PuntosPrediccion } from './datos';

// F10: cómo se ve cada estado que da el servidor. Solo traduce estados a textos e indicadores;
// los números vienen ya calculados (D52).

export type EstadoCalificado = 'ACERTADA' | 'PARCIAL' | 'FALLADA';

export const indicadorPrediccion: Record<EstadoCalificado, EstadoIndicador> = {
  ACERTADA: 'acertada',
  PARCIAL: 'parcial',
  FALLADA: 'fallada',
};

export const textoPrediccion: Record<EstadoCalificado, string> = {
  ACERTADA: 'Acertada',
  PARCIAL: 'Parcial',
  FALLADA: 'Fallada',
};

export const indicadorAfirmacion: Record<AfirmacionIA['veredicto'], EstadoIndicador> = {
  ACERTADA: 'acertada',
  CERCANA: 'parcial',
  FALLADA: 'fallada',
  NO_VERIFICABLE: 'noVerificable',
};

export const textoAfirmacion: Record<AfirmacionIA['veredicto'], string> = {
  ACERTADA: 'Acertada',
  CERCANA: 'Cercana',
  FALLADA: 'Fallada',
  NO_VERIFICABLE: 'No verificable',
};

export type PuntosCalificados = PuntosPrediccion & {
  estado_prediccion: EstadoCalificado;
  puntos_total: number;
};

export function esCalificada(puntos: PuntosPrediccion): puntos is PuntosCalificados {
  return puntos.estado_prediccion !== 'ANULADA' && puntos.estado_prediccion !== 'SIN_CALIFICAR'
    && puntos.puntos_total !== null;
}

export const textos = {
  calificando: 'Calificando…',
  anulado: 'Anulado',
  bonoPendienteCorto: 'bono pendiente',
  bonoPendiente: 'Bono pendiente: la IA está revisando tu análisis.',
  bonoError: 'Bono no disponible para este partido.',
  anuladoDetalle: 'Partido cancelado: tu predicción se anuló y no cuenta.',
  calificandoDetalle: 'Calificando tus puntos…',
  marcadorFallado: 'Marcador fallado: sumaste las partes que acertaste.',
  errorPuntos: 'No se pudieron cargar tus puntos.',
} as const;
