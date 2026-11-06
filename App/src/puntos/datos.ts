import { z } from 'zod';

import { comoErrorDatos } from '../datos/errores';
import { supabase } from '../supabase/cliente';

// F10: mis puntos por partido desde la vista `mis_puntos` (R2). Todo número y todo estado viene del
// servidor (D52); la app no suma ni deduce. Zod valida los estados y las afirmaciones de la IA
// (D54): en la vista son texto y JSON.

const entero = z.number().int();

const esquemaAfirmacion = z.object({
  texto: z.string(),
  veredicto: z.enum(['ACERTADA', 'CERCANA', 'FALLADA', 'NO_VERIFICABLE']),
  motivo: z.string(),
  evidencia: z.array(z.string()),
});

const esquemaPuntos = z.object({
  partido_id: entero,
  estado_prediccion: z.enum(['ACERTADA', 'PARCIAL', 'FALLADA', 'ANULADA', 'SIN_CALIFICAR']),
  estado_bono: z.enum(['SIN_JUSTIFICACION', 'PENDIENTE', 'EVALUADA', 'ERROR']),
  puntos_resultado: entero.nullable(),
  puntos_rango_goles: entero.nullable(),
  puntos_marcador: entero.nullable(),
  puntos_base: entero.nullable(),
  puntos_bono: entero.nullable(),
  puntos_total: entero.nullable(),
  explicacion: z.string().nullable(),
  afirmaciones: z.array(esquemaAfirmacion).nullable(),
});

export type PuntosPrediccion = z.infer<typeof esquemaPuntos>;
export type AfirmacionIA = z.infer<typeof esquemaAfirmacion>;

const COLUMNAS =
  'partido_id, estado_prediccion, estado_bono, puntos_resultado, puntos_rango_goles, puntos_marcador, puntos_base, puntos_bono, puntos_total, explicacion, afirmaciones';

function validar(filas: unknown): PuntosPrediccion[] {
  const resultado = z.array(esquemaPuntos).safeParse(filas);
  if (!resultado.success) throw new Error(`Puntos con forma inválida: ${z.prettifyError(resultado.error)}`);
  return resultado.data;
}

/** Mis puntos de varios partidos (S02), por partido. Sin predicción, el partido no aparece. */
export async function obtenerMisPuntos(partidoIds: number[]): Promise<Map<number, PuntosPrediccion>> {
  if (partidoIds.length === 0) return new Map();
  const { data, error, status } = await supabase.from('mis_puntos').select(COLUMNAS).in('partido_id', partidoIds);
  if (error) throw comoErrorDatos(error, status);
  return new Map(validar(data).map((fila) => [fila.partido_id, fila]));
}

/** Mis puntos de un partido (S03), o null si no lo predije. */
export async function obtenerMisPuntosDePartido(partidoId: number): Promise<PuntosPrediccion | null> {
  const { data, error, status } = await supabase
    .from('mis_puntos')
    .select(COLUMNAS)
    .eq('partido_id', partidoId)
    .maybeSingle();
  if (error) throw comoErrorDatos(error, status);
  return data === null ? null : (validar([data])[0] ?? null);
}
