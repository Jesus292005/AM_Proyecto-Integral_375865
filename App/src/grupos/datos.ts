import { z } from 'zod';

import { comoErrorDatos } from '../datos/errores';
import { supabase } from '../supabase/cliente';
import { ErrorGrupo, esCodigoGrupo } from './errores';

// Lecturas y acciones de grupos (F07). Crear, unirse y salir son funciones del servidor que usan
// `auth.uid()` y validan los límites (R3–R5, R12); las lecturas pasan por las RLS (R04, R12). Las
// vistas devuelven columnas que pueden venir vacías: Zod valida su forma (D54).

const entero = z.number().int();

const esquemaMiGrupo = z.object({ id: entero, nombre: z.string(), miembros: entero });
const esquemaMiembro = z.object({
  usuario_id: z.string(),
  nombre: z.string(),
  foto_url: z.string().nullable(),
  rol: z.enum(['ADMIN', 'MIEMBRO']),
  es_yo: z.boolean(),
});
const esquemaPrediccionAjena = z.object({
  usuario_id: z.string(),
  nombre: z.string(),
  foto_url: z.string().nullable(),
  resultado: z.enum(['LOCAL', 'EMPATE', 'VISITANTE']).nullable(),
  rango_goles: z.enum(['G0_1', 'G2', 'G3', 'G4_MAS']).nullable(),
  marcador_local: entero.nullable(),
  marcador_visitante: entero.nullable(),
  justificacion: z.string().nullable(),
});
const esquemaUnion = z.array(z.object({ grupo_id: entero, ya_era_miembro: z.boolean() })).length(1);

export type MiGrupo = z.infer<typeof esquemaMiGrupo>;
export type Miembro = z.infer<typeof esquemaMiembro>;
export type PrediccionAjena = z.infer<typeof esquemaPrediccionAjena>;
export type GrupoDetalle = { id: number; nombre: string; codigo_invitacion: string };
export type Union = { grupoId: number; yaEraMiembro: boolean };

function validar<T>(esquema: z.ZodType<T>, datos: unknown, que: string): T {
  const resultado = esquema.safeParse(datos);
  if (!resultado.success) throw new Error(`${que} con forma inválida: ${z.prettifyError(resultado.error)}`);
  return resultado.data;
}

function comoErrorAccion(error: { message: string }, status: number): Error {
  return esCodigoGrupo(error.message) ? new ErrorGrupo(error.message) : comoErrorDatos(error, status);
}

/** S04: mis grupos, del más reciente al que me uní (R9). */
export async function obtenerMisGrupos(): Promise<MiGrupo[]> {
  const { data, error, status } = await supabase
    .from('mis_grupos')
    .select('id, nombre, miembros')
    .order('unido_en', { ascending: false })
    .order('id', { ascending: false });
  if (error) throw comoErrorDatos(error, status);
  return validar(z.array(esquemaMiGrupo), data, 'Mis grupos');
}

/** S08: el grupo con su código, o null si no existe o no soy miembro (RLS). */
export async function obtenerGrupo(grupoId: number): Promise<GrupoDetalle | null> {
  const { data, error, status } = await supabase
    .from('grupo')
    .select('id, nombre, codigo_invitacion')
    .eq('id', grupoId)
    .maybeSingle();
  if (error) throw comoErrorDatos(error, status);
  return data;
}

/** S08: miembros del grupo por nombre (R10). */
export async function obtenerMiembros(grupoId: number): Promise<Miembro[]> {
  const { data, error, status } = await supabase
    .from('miembros_grupo')
    .select('usuario_id, nombre, foto_url, rol, es_yo')
    .eq('grupo_id', grupoId)
    .order('nombre');
  if (error) throw comoErrorDatos(error, status);
  return validar(z.array(esquemaMiembro), data, 'Miembros');
}

/** S03 cerrado: predicciones de quienes comparten grupo conmigo (R6, R7), por nombre. */
export async function obtenerPrediccionesDelGrupo(partidoId: number): Promise<PrediccionAjena[]> {
  const { data, error, status } = await supabase
    .from('predicciones_grupo')
    .select(
      'usuario_id, nombre, foto_url, resultado, rango_goles, marcador_local, marcador_visitante, justificacion',
    )
    .eq('partido_id', partidoId)
    .order('nombre');
  if (error) throw comoErrorDatos(error, status);
  return validar(z.array(esquemaPrediccionAjena), data, 'Predicciones del grupo');
}

export async function crearGrupo(nombre: string): Promise<number> {
  const { data, error, status } = await supabase.rpc('crear_grupo', { nombre });
  if (error) throw comoErrorAccion(error, status);
  return data;
}

/** Un solo camino para el código escrito y el QR (R4, F12). `codigo` ya viene validado. */
export async function unirseAGrupo(codigo: string): Promise<Union> {
  const { data, error, status } = await supabase.rpc('unirse_grupo', { codigo });
  if (error) throw comoErrorAccion(error, status);
  const [fila] = validar(esquemaUnion, data, 'Respuesta de unirse');
  if (fila === undefined) throw new Error('Respuesta de unirse vacía');
  return { grupoId: fila.grupo_id, yaEraMiembro: fila.ya_era_miembro };
}

export async function salirDeGrupo(grupoId: number): Promise<void> {
  const { error, status } = await supabase.rpc('salir_grupo', { id_grupo: grupoId });
  if (error) throw comoErrorAccion(error, status);
}
