import { z } from 'zod';

import { comoErrorDatos } from '../datos/errores';
import { idUsuarioActual } from '../datos/sesionActual';
import { supabase } from '../supabase/cliente';
import type { Database } from '../supabase/tipos-db';

export type Rol = Database['public']['Enums']['rol_usuario'];

/** Mi rol (F01 V3: cada usuario lee su propio registro). */
export async function obtenerMiRol(): Promise<Rol> {
  const usuarioId = await idUsuarioActual();
  const { data, error, status } = await supabase
    .from('usuario')
    .select('rol')
    .eq('id', usuarioId)
    .single();
  if (error) throw comoErrorDatos(error, status);
  return data.rol;
}

/** Si quiero recordatorios antes del cierre (F11a R4, `Usuario.recordatoriosActivos`). */
export async function obtenerRecordatoriosActivos(): Promise<boolean> {
  const usuarioId = await idUsuarioActual();
  const { data, error, status } = await supabase
    .from('usuario')
    .select('recordatorios_activos')
    .eq('id', usuarioId)
    .single();
  if (error) throw comoErrorDatos(error, status);
  return data.recordatorios_activos;
}

export async function guardarRecordatoriosActivos(activos: boolean): Promise<void> {
  const usuarioId = await idUsuarioActual();
  const { error, status } = await supabase
    .from('usuario')
    .update({ recordatorios_activos: activos })
    .eq('id', usuarioId);
  if (error) throw comoErrorDatos(error, status);
}

// F13 R6: la vista `mi_racha` siempre devuelve una fila; sus columnas pueden venir vacías en los
// tipos de la vista, así que Zod valida la forma (D54).
const esquemaRacha = z.object({
  racha_actual: z.number().int(),
  mejor_racha: z.number().int(),
  incluye_simulados: z.boolean(),
  ultima_calificacion: z.string().nullable(),
});

export type MiRacha = z.infer<typeof esquemaRacha>;

/** Mi racha de aciertos, actual y mejor (F13). */
export async function obtenerMiRacha(): Promise<MiRacha> {
  const { data, error, status } = await supabase
    .from('mi_racha')
    .select('racha_actual, mejor_racha, incluye_simulados, ultima_calificacion')
    .single();
  if (error) throw comoErrorDatos(error, status);
  const racha = esquemaRacha.safeParse(data);
  if (!racha.success) throw new Error(`Racha con forma inválida: ${z.prettifyError(racha.error)}`);
  return racha.data;
}

// ---------------------------------------------------------------------------
// Perfil propio (F28 R7), equipo favorito (F18) y nombre visible (F28 R3–R4)
// ---------------------------------------------------------------------------

function validar<T>(esquema: z.ZodType<T>, datos: unknown, que: string): T {
  const resultado = esquema.safeParse(datos);
  if (!resultado.success) throw new Error(`${que} con forma inválida: ${z.prettifyError(resultado.error)}`);
  return resultado.data;
}

const esquemaEquipo = z.object({
  id: z.number().int(),
  nombre_corto: z.string(),
  escudo_url: z.string(),
  color_primario: z.string().nullable(),
  color_texto: z.string().nullable(),
});

export type EquipoFavorito = z.infer<typeof esquemaEquipo>;

const esquemaPerfil = z.object({
  nombre: z.string(),
  foto_url: z.string().nullable(),
  rol: z.enum(['USUARIO', 'ADMIN']),
  equipo: esquemaEquipo.nullable(),
});

export type MiPerfil = z.infer<typeof esquemaPerfil>;

/** Mi fila de `usuario` con el equipo favorito; la comparten S09 y la barra superior (F25 R4). */
export async function obtenerMiPerfil(): Promise<MiPerfil> {
  const usuarioId = await idUsuarioActual();
  const { data, error, status } = await supabase
    .from('usuario')
    .select(
      'nombre, foto_url, rol, equipo:equipo!usuario_equipo_favorito_id_fkey(id, nombre_corto, escudo_url, color_primario, color_texto)',
    )
    .eq('id', usuarioId)
    .single();
  if (error) throw comoErrorDatos(error, status);
  return validar(esquemaPerfil, data, 'Perfil');
}

/** Equipos del torneo actual para S12 (F18 R1, R3), por nombre corto. */
export async function obtenerEquiposTorneoActual(): Promise<EquipoFavorito[]> {
  const { data, error, status } = await supabase
    .from('equipos_torneo_actual')
    .select('id, nombre_corto, escudo_url, color_primario, color_texto');
  if (error) throw comoErrorDatos(error, status);
  return validar(z.array(esquemaEquipo), data, 'Equipos').sort((a, b) =>
    a.nombre_corto.localeCompare(b.nombre_corto, 'es'),
  );
}

/** Guarda o quita (null) mi equipo favorito (F18 R2; permiso de F01 V3). */
export async function guardarEquipoFavorito(equipoId: number | null): Promise<void> {
  const usuarioId = await idUsuarioActual();
  const { error, status } = await supabase
    .from('usuario')
    .update({ equipo_favorito_id: equipoId })
    .eq('id', usuarioId);
  if (error) throw comoErrorDatos(error, status);
}

/** El servidor rechazó el nombre (F28 R4). */
export class ErrorNombreInvalido extends Error {
  constructor() {
    super('NOMBRE_INVALIDO');
    this.name = 'ErrorNombreInvalido';
  }
}

/** Cambia mi nombre visible; el servidor lo normaliza y valida (F28 R4–R5). Devuelve el guardado. */
export async function cambiarMiNombre(nombre: string): Promise<string> {
  const usuarioId = await idUsuarioActual();
  const { data, error, status } = await supabase
    .from('usuario')
    .update({ nombre })
    .eq('id', usuarioId)
    .select('nombre')
    .single();
  if (error) {
    throw error.message === 'NOMBRE_INVALIDO' ? new ErrorNombreInvalido() : comoErrorDatos(error, status);
  }
  return data.nombre;
}

// ---------------------------------------------------------------------------
// Carta de jugador (F20 R5)
// ---------------------------------------------------------------------------

const esquemaNivel = z.enum(['BRONCE', 'PLATA', 'ORO']);
export type Nivel = z.infer<typeof esquemaNivel>;

const atributo = z.number().int().nullable();
const esquemaCarta = z.object({
  calificadas: z.number().int(),
  precision: atributo,
  punteria: atributo,
  analisis: atributo,
  constancia: atributo,
  media: atributo,
  nivel: esquemaNivel.nullable(),
  incluye_simulados: z.boolean(),
});

export type MiCarta = z.infer<typeof esquemaCarta>;

/** Mi carta: atributos, media y nivel calculados por el servidor (F20 R1–R5, D52). */
export async function obtenerMiCarta(): Promise<MiCarta> {
  const { data, error, status } = await supabase
    .from('mi_carta')
    .select('calificadas, precision, punteria, analisis, constancia, media, nivel, incluye_simulados')
    .single();
  if (error) throw comoErrorDatos(error, status);
  return validar(esquemaCarta, data, 'Carta');
}

// ---------------------------------------------------------------------------
// Vitrina de insignias (F14 R6–R8)
// ---------------------------------------------------------------------------

const esquemaInsignia = z.object({
  codigo: z.string(),
  nombre: z.string(),
  descripcion: z.string(),
  nivel: esquemaNivel,
  icono: z.string(),
  repetible: z.boolean(),
  orden: z.number().int(),
  veces: z.number().int(),
  nueva: z.boolean(),
  ultima_en: z.string().nullable(),
  ultima_simulada: z.boolean().nullable(),
  ultimo_grupo: z.string().nullable(),
  ultima_jornada: z.string().nullable(),
});

export type InsigniaDeVitrina = z.infer<typeof esquemaInsignia>;

/** Todo el catálogo con lo mío, en el orden de la Vitrina (F14 R6, R8). */
export async function obtenerMisInsignias(): Promise<InsigniaDeVitrina[]> {
  const { data, error, status } = await supabase
    .from('mis_insignias')
    .select(
      'codigo, nombre, descripcion, nivel, icono, repetible, orden, veces, nueva, ultima_en, ultima_simulada, ultimo_grupo, ultima_jornada',
    )
    .order('orden');
  if (error) throw comoErrorDatos(error, status);
  return validar(z.array(esquemaInsignia), data, 'Insignias');
}

/** Marca como vistas mis insignias nuevas (F14 R7). */
export async function marcarInsigniasVistas(): Promise<void> {
  const { error, status } = await supabase.rpc('marcar_insignias_vistas');
  if (error) throw comoErrorDatos(error, status);
}
